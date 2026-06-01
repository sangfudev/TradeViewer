using System.Globalization;
using System.Xml.Linq;
using TradeViewer.Application.Interfaces;
using TradeViewer.Domain.Entities;

namespace TradeViewer.Infrastructure.Parsers;

public class XmlTradeParser : ITradeFileParser
{
    public bool CanParse(string fileName)
        => fileName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase);

    public Task<IEnumerable<Trade>> ParseAsync(Stream stream)
    {
        var doc = XDocument.Load(stream);
        var root = doc.Root ?? throw new InvalidDataException("Empty XML document.");

        // Support both <Trades><Trade .../></Trades> and flat <Trade> root
        var tradeElements = root.Name.LocalName.Equals("Trade", StringComparison.OrdinalIgnoreCase)
            ? doc.Root!.Elements()
            : root.Elements().Where(e => e.Name.LocalName.Equals("Trade", StringComparison.OrdinalIgnoreCase));

        var trades = tradeElements.Select(ParseElement).ToList();
        return Task.FromResult<IEnumerable<Trade>>(trades);
    }

    private static Trade ParseElement(XElement e)
    {
        var buySell = GetValue(e, "buySell", "BuySell", "Action", "Side", "Type")
            ?? throw new InvalidDataException("BuySell/Action is required.");
        var isBuy    = buySell.Equals("BUY", StringComparison.OrdinalIgnoreCase);
        var rawQty   = ParseDecimal(GetValue(e, "quantity", "Quantity", "Qty", "Shares", "Size"));
        var price    = ParseDecimal(GetValue(e, "tradePrice", "TradePrice", "EntryPrice", "Entry", "Price", "BuyPrice"));
        var tradeDate = ParseDate(GetValue(e, "tradeDate", "TradeDate", "Date", "trade_date"));

        // For explicit non-IB formats that supply both entry and exit on one row, honour them.
        // For IB-style (one row per execution) map buy price → EntryPrice, sell price → ExitPrice.
        var explicitExit  = TryParseDecimal(GetValue(e, "ExitPrice", "Exit", "SellPrice"));
        var explicitEntry = TryParseDecimal(GetValue(e, "EntryPrice", "Entry", "BuyPrice"));
        decimal entryPrice = explicitEntry ?? (isBuy ? price : 0m);
        decimal? exitPrice = explicitExit  ?? (isBuy ? (decimal?)null : price);

        // Only carry over a pre-computed P&L if it is non-zero; otherwise leave null so the
        // service can calculate it via FIFO matching after all trades are parsed.
        var rawPnl = TryParseDecimal(GetValue(e, "fifoPnlRealized", "FifoPnlRealized", "PnL", "P&L", "Profit", "ProfitLoss"));

        return new Trade
        {
            // Core fields
            TradeDate  = tradeDate,
            Symbol     = GetValue(e, "symbol", "Symbol", "Ticker") ?? throw new InvalidDataException("Symbol is required."),
            Action     = buySell.ToUpperInvariant(),
            Quantity   = Math.Abs(rawQty),
            EntryPrice = entryPrice,
            ExitPrice  = exitPrice,
            PnL        = rawPnl is { } p && p != 0 ? p : null,

            // IB-specific fields
            AccountId      = GetValue(e, "accountId", "AccountId") ?? string.Empty,
            Currency       = GetValue(e, "currency", "Currency") ?? string.Empty,
            Description    = GetValue(e, "description", "Description") ?? string.Empty,
            TradeId        = GetValue(e, "tradeID", "TradeID", "TradeId"),
            TransactionId  = GetValue(e, "transactionID", "TransactionID", "TransactionId"),
            TradeDateTime  = TryParseIbDateTime(GetValue(e, "dateTime", "DateTime")),
            ReportDate     = TryParseIbDate(GetValue(e, "reportDate", "ReportDate")),
            TradeMoney     = TryParseDecimal(GetValue(e, "tradeMoney", "TradeMoney")) ?? 0m,
            Commission     = TryParseDecimal(GetValue(e, "ibCommission", "Commission", "commission")) ?? 0m,
            NetCash        = TryParseDecimal(GetValue(e, "netCash", "NetCash")) ?? 0m,
            NetCashInBase  = TryParseDecimal(GetValue(e, "netCashInBase", "NetCashInBase")) ?? 0m,
            Cost           = TryParseDecimal(GetValue(e, "cost", "Cost")) ?? 0m,
            FifoPnlRealized  = TryParseDecimal(GetValue(e, "fifoPnlRealized", "FifoPnlRealized")) ?? 0m,
            CapitalGainsPnl  = TryParseDecimal(GetValue(e, "capitalGainsPnl", "CapitalGainsPnl")) ?? 0m,
            FxPnl            = TryParseDecimal(GetValue(e, "fxPnl", "FxPnl")) ?? 0m,
        };
    }

    private static string? GetValue(XElement e, params string[] names)
    {
        foreach (var name in names)
        {
            var el = e.Elements().FirstOrDefault(x => x.Name.LocalName.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (el != null) return el.Value.Trim();
            var attr = e.Attributes().FirstOrDefault(x => x.Name.LocalName.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (attr != null) return attr.Value.Trim();
        }
        return null;
    }

    // Handles: "20260415", "2026-04-15", and other standard formats
    private static DateTime ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new InvalidDataException("Date is required.");
        if (TryParseIbDate(value) is { } dt) return dt;
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)) return parsed;
        throw new InvalidDataException($"Cannot parse date: {value}");
    }

    // Parses IB compact date format "YYYYMMDD"
    private static DateTime? TryParseIbDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (DateTime.TryParseExact(value, "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            return dt;
        return null;
    }

    // Parses IB datetime format "YYYYMMDD;HHmmss"
    private static DateTime? TryParseIbDateTime(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        if (DateTime.TryParseExact(value, "yyyyMMdd;HHmmss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            return dt;
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var fallback))
            return fallback;
        return null;
    }

    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new InvalidDataException("Required numeric field is missing.");
        if (decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)) return d;
        throw new InvalidDataException($"Cannot parse number: {value}");
    }

    private static decimal? TryParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var d) ? d : null;
    }
}
