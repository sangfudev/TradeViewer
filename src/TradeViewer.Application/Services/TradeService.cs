using TradeViewer.Application.DTOs;
using TradeViewer.Application.Interfaces;
using TradeViewer.Domain.Entities;

namespace TradeViewer.Application.Services;

public class TradeService(ITradeRepository repository, IEnumerable<ITradeFileParser> parsers, ChartService chartService)
{
    public async Task<IEnumerable<TradeDto>> GetTradesByYearAsync(int year)
    {
        var trades = await repository.GetByYearAsync(year);
        return trades.Select(MapToDto);
    }

    public async Task<IEnumerable<int>> GetAvailableYearsAsync()
        => await repository.GetAvailableYearsAsync();

    public async Task<IEnumerable<PositionDto>> GetPositionsByYearAsync(int year)
    {
        var trades = await repository.GetAllForSymbolsActiveInYearAsync(year);
        return BuildPositions(trades, year);
    }

    // ── Position grouping ─────────────────────────────────────────────────────────

    private static List<PositionDto> BuildPositions(IEnumerable<Trade> allTrades, int year)
    {
        var result = new List<PositionDto>();

        var bySymbol = allTrades
            .GroupBy(t => t.Symbol)
            .ToDictionary(g => g.Key, g => g
                .OrderBy(t => t.TradeDateTime ?? (DateTime?)t.TradeDate)
                .ThenBy(t => t.Action == "BUY" ? 0 : 1)
                .ToList());

        foreach (var (_, symbolTrades) in bySymbol)
        {
            decimal openQty = 0;
            var batch = new List<Trade>();

            foreach (var trade in symbolTrades)
            {
                // Skip orphaned sells that have no matching buy in our dataset.
                if (batch.Count == 0 && trade.Action == "SELL")
                    continue;

                batch.Add(trade);
                openQty += trade.Action == "BUY" ? trade.Quantity : -trade.Quantity;

                // Tolerance handles fractional shares (e.g. HLIT 0.6774 shares).
                if (openQty < 0.0001m)
                {
                    result.Add(BuildPosition(batch));
                    batch = [];
                    openQty = 0;
                }
            }

            // Any remaining open position
            if (batch.Any(t => t.Action == "BUY"))
                result.Add(BuildPosition(batch));
        }

        // Only show positions that had at least one execution in the requested year
        // (avoids surfacing stale cross-year data that belongs to a different year view).
        return result
            .Where(p => p.OpenDate.Year == year || (p.CloseDate?.Year == year))
            .OrderBy(p => p.OpenDate)
            .ToList();
    }

    private static PositionDto BuildPosition(List<Trade> trades)
    {
        var buys  = trades.Where(t => t.Action == "BUY").ToList();
        var sells = trades.Where(t => t.Action == "SELL").ToList();

        var totalBuyQty      = buys.Sum(t => t.Quantity);
        var totalBuyCost     = buys.Sum(t => t.EntryPrice * t.Quantity);
        var totalSellQty     = sells.Sum(t => t.Quantity);
        var totalSellProceeds = sells.Sum(t => (t.ExitPrice ?? 0m) * t.Quantity);

        var isClosed = totalSellQty >= totalBuyQty - 0.001m;

        // Prefer the pre-calculated P&L stored on each SELL trade (set by FIFO at import time).
        // Fall back to a proportional calculation if those values are missing.
        decimal? pnl = null;
        if (sells.Any())
        {
            if (sells.All(t => t.PnL.HasValue))
                pnl = sells.Sum(t => t.PnL!.Value);
            else if (totalBuyQty > 0 && totalSellQty > 0)
            {
                var proportionalBuyCost = totalBuyCost * (totalSellQty / totalBuyQty);
                var totalBuyComm  = buys.Sum(t => Math.Abs(t.Commission)) * (totalSellQty / totalBuyQty);
                var totalSellComm = sells.Sum(t => Math.Abs(t.Commission));
                pnl = totalSellProceeds - proportionalBuyCost - totalBuyComm - totalSellComm;
            }
        }

        var totalCommission = trades.Sum(t => Math.Abs(t.Commission));

        // Net cash impact in the account's base currency: SELL netCashInBase values are
        // positive (cash in) and BUY values negative (cash out), so their sum is the
        // realized P&L in base currency including commissions and FX.
        decimal? netBasePnl = sells.Any()
            ? buys.Sum(t => t.NetCashInBase) + sells.Sum(t => t.NetCashInBase)
            : null;

        return new PositionDto
        {
            Symbol           = trades.First().Symbol,
            Description      = trades.First().Description,
            Currency         = trades.First().Currency,
            OpenDate         = buys.Min(t => t.TradeDateTime ?? t.TradeDate),
            CloseDate        = sells.Any() ? sells.Max(t => (DateTime?)(t.TradeDateTime ?? t.TradeDate)) : null,
            Quantity         = totalBuyQty,
            AvgEntryPrice    = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0m,
            AvgExitPrice     = totalSellQty > 0 ? totalSellProceeds / totalSellQty : null,
            PnL              = pnl,
            NetBasePnL       = netBasePnl,
            TotalCommission  = totalCommission,
            IsClosed         = isClosed,
            Industry         = trades.FirstOrDefault(t => !string.IsNullOrEmpty(t.Industry))?.Industry,
        };
    }

    public async Task<ImportResultDto> ImportFileAsync(Stream stream, string fileName)
    {
        var parser = parsers.FirstOrDefault(p => p.CanParse(fileName));
        if (parser is null)
            return new ImportResultDto(0, "Unsupported file format. Use .csv or .xml.", []);

        IEnumerable<Trade> parsed;
        try
        {
            parsed = await parser.ParseAsync(stream);
        }
        catch (Exception ex)
        {
            return new ImportResultDto(0, "Failed to parse file.", [ex.Message]);
        }

        var tradeList = parsed.ToList();
        if (tradeList.Count == 0)
            return new ImportResultDto(0, "No trades found in file.", []);

        // Replace any records that were previously imported with the same TransactionId
        // so re-importing corrects stale data instead of creating duplicates.
        var txIds = tradeList
            .Where(t => !string.IsNullOrEmpty(t.TransactionId))
            .Select(t => t.TransactionId!)
            .ToList();
        if (txIds.Count > 0)
            await repository.DeleteByTransactionIdsAsync(txIds);

        // Calculate FIFO P&L for SELL records using existing BUY lots in the database
        // plus any BUY records in the current batch.
        await ApplyFifoPnLAsync(tradeList);

        await repository.AddRangeAsync(tradeList);

        // Build industry map: use cached DB values first, only call Alpha Vantage for unknowns.
        var symbols = tradeList.Select(t => t.Symbol).Distinct().ToList();
        var industries = await repository.GetKnownIndustriesAsync(symbols);

        var unknown = symbols.Where(s => !industries.ContainsKey(s)).ToList();
        var fetchTasks = unknown.Select(async s => (Symbol: s, Industry: await chartService.GetIndustryAsync(s)));
        foreach (var (sym, ind) in await Task.WhenAll(fetchTasks))
            if (ind != null) industries[sym] = ind;

        foreach (var trade in tradeList)
            if (industries.TryGetValue(trade.Symbol, out var industry))
                trade.Industry = industry;

        await repository.SaveChangesAsync();

        return new ImportResultDto(tradeList.Count, $"Successfully imported {tradeList.Count} trade(s).", []);
    }

    /// <summary>
    /// Re-fetches the industry for every symbol that currently has none stored and
    /// writes it back. Used to repair data imported while the industry lookup was
    /// failing. Returns the number of symbols that were updated.
    /// </summary>
    public async Task<int> BackfillIndustriesAsync()
    {
        var symbols = await repository.GetSymbolsMissingIndustryAsync();

        // Limit concurrency so the bulk lookup doesn't get rate-limited.
        using var gate = new SemaphoreSlim(6);
        var lookups = symbols.Select(async symbol =>
        {
            await gate.WaitAsync();
            try { return (Symbol: symbol, Industry: await chartService.GetIndustryAsync(symbol)); }
            finally { gate.Release(); }
        });

        var updated = 0;
        foreach (var (symbol, industry) in await Task.WhenAll(lookups))
        {
            if (string.IsNullOrWhiteSpace(industry)) continue;
            await repository.SetIndustryAsync(symbol, industry);
            updated++;
        }

        return updated;
    }

    // ── FIFO P&L ─────────────────────────────────────────────────────────────────

    private async Task ApplyFifoPnLAsync(List<Trade> newTrades)
    {
        var symbols = newTrades.Select(t => t.Symbol).Distinct().ToList();

        // Pull existing trades for these symbols so cross-batch imports work correctly.
        var existing = await repository.GetBySymbolsAsync(symbols);

        // Combine existing (already in DB) + new (being imported), sorted chronologically
        // with BUYs before SELLs when timestamps tie.
        var allBySymbol = existing
            .Concat(newTrades)
            .GroupBy(t => t.Symbol)
            .ToDictionary(g => g.Key, g => g
                .OrderBy(t => t.TradeDateTime ?? (DateTime?)t.TradeDate)
                .ThenBy(t => t.Action == "BUY" ? 0 : 1)
                .ToList());

        // Use reference equality to identify which records are new so we only mutate those.
        var newSet = new HashSet<Trade>(ReferenceEqualityComparer.Instance);
        foreach (var t in newTrades) newSet.Add(t);

        foreach (var (_, trades) in allBySymbol)
            RunFifo(trades, newSet);
    }

    private static void RunFifo(List<Trade> sortedTrades, HashSet<Trade> updateTargets)
    {
        // Each lot: (price per share, remaining qty, commission per share)
        var lots = new List<(decimal Price, decimal Qty, decimal CommPerShare)>();

        foreach (var trade in sortedTrades)
        {
            if (trade.Action == "BUY" && trade.EntryPrice > 0)
            {
                decimal commPerShare = trade.Quantity > 0
                    ? Math.Abs(trade.Commission) / trade.Quantity
                    : 0m;
                lots.Add((trade.EntryPrice, trade.Quantity, commPerShare));
            }
            else if (trade.Action == "SELL" && trade.ExitPrice.HasValue && updateTargets.Contains(trade))
            {
                decimal remaining   = trade.Quantity;
                decimal totalCost   = 0m;
                decimal totalBuyComm = 0m;
                decimal matched     = 0m;
                int i = 0;

                while (i < lots.Count && remaining > 0)
                {
                    var (p, q, cps) = lots[i];
                    decimal use = Math.Min(q, remaining);

                    totalCost    += p   * use;
                    totalBuyComm += cps * use;
                    matched      += use;
                    remaining    -= use;

                    if (use >= q)
                        lots.RemoveAt(i);   // lot fully consumed — don't advance i
                    else
                        lots[i] = (p, q - use, cps);   // lot partially consumed — stop here
                }

                if (matched > 0)
                {
                    trade.EntryPrice = totalCost / matched;   // weighted-average buy price
                    trade.PnL = trade.ExitPrice.Value * matched  // sell proceeds
                                - totalCost                       // buy cost
                                - totalBuyComm                    // proportional buy commission
                                - Math.Abs(trade.Commission);     // sell commission
                }
            }
        }
    }

    // ── Mapping ───────────────────────────────────────────────────────────────────

    private static TradeDto MapToDto(Trade t) => new()
    {
        Id             = t.Id,
        TradeDate      = t.TradeDate,
        Symbol         = t.Symbol,
        Action         = t.Action,
        Quantity       = t.Quantity,
        EntryPrice     = t.EntryPrice,
        ExitPrice      = t.ExitPrice,
        PnL            = t.PnL,
        ImportedAt     = t.ImportedAt,
        AccountId      = t.AccountId,
        Currency       = t.Currency,
        Description    = t.Description,
        TradeId        = t.TradeId,
        TransactionId  = t.TransactionId,
        TradeDateTime  = t.TradeDateTime,
        ReportDate     = t.ReportDate,
        TradeMoney     = t.TradeMoney,
        Commission     = t.Commission,
        NetCash        = t.NetCash,
        NetCashInBase  = t.NetCashInBase,
        Cost           = t.Cost,
        FifoPnlRealized  = t.FifoPnlRealized,
        CapitalGainsPnl  = t.CapitalGainsPnl,
        FxPnl            = t.FxPnl,
    };
}
