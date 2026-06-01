using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using TradeViewer.Application.Interfaces;
using TradeViewer.Domain.Entities;

namespace TradeViewer.Infrastructure.Parsers;

public class CsvTradeParser : ITradeFileParser
{
    public bool CanParse(string fileName)
        => fileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase);

    public async Task<IEnumerable<Trade>> ParseAsync(Stream stream)
    {
        using var reader = new StreamReader(stream);
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HeaderValidated = null,
            MissingFieldFound = null,
            PrepareHeaderForMatch = args => args.Header.Trim().ToLowerInvariant()
        };
        using var csv = new CsvReader(reader, config);
        csv.Context.RegisterClassMap<TradeCsvMap>();
        var records = new List<Trade>();
        await foreach (var record in csv.GetRecordsAsync<Trade>())
            records.Add(record);
        return records;
    }
}

public sealed class TradeCsvMap : ClassMap<Trade>
{
    public TradeCsvMap()
    {
        Map(m => m.TradeDate).Name("date", "tradedate", "trade_date");
        Map(m => m.Symbol).Name("symbol", "ticker");
        Map(m => m.Action).Name("action", "side", "type", "buysell", "buy/sell");
        Map(m => m.Quantity).Name("quantity", "qty", "shares", "size");
        Map(m => m.EntryPrice).Name("entryprice", "entry_price", "entry", "price", "buyprice");
        Map(m => m.ExitPrice).Name("exitprice", "exit_price", "exit", "sellprice").Optional();
        Map(m => m.PnL).Name("pnl", "p&l", "profit", "profitloss", "profit_loss").Optional();
    }
}
