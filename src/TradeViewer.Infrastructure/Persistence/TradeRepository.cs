using Microsoft.EntityFrameworkCore;
using TradeViewer.Application.Interfaces;
using TradeViewer.Domain.Entities;

namespace TradeViewer.Infrastructure.Persistence;

public class TradeRepository(AppDbContext context) : ITradeRepository
{
    public async Task<IEnumerable<Trade>> GetByYearAsync(int year)
        => await context.Trades
            .Where(t => t.TradeDate.Year == year)
            .OrderBy(t => t.TradeDate)
            .ThenBy(t => t.Symbol)
            .ToListAsync();

    public async Task<IEnumerable<int>> GetAvailableYearsAsync()
        => await context.Trades
            .Select(t => t.TradeDate.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToListAsync();

    public async Task<IEnumerable<Trade>> GetAllForSymbolsActiveInYearAsync(int year)
    {
        // First find every symbol that had any execution in the requested year,
        // then return ALL executions for those symbols across all years so that
        // cross-year positions (opened in Dec, closed in Jan) are built correctly.
        var symbols = await context.Trades
            .Where(t => t.TradeDate.Year == year)
            .Select(t => t.Symbol)
            .Distinct()
            .ToListAsync();

        return await context.Trades
            .Where(t => symbols.Contains(t.Symbol))
            .OrderBy(t => t.Symbol)
            .ThenBy(t => t.TradeDateTime ?? (DateTime?)t.TradeDate)
            .ThenBy(t => t.Action == "BUY" ? 0 : 1)
            .ToListAsync();
    }

    public async Task<IEnumerable<Trade>> GetBySymbolsAsync(IEnumerable<string> symbols)
        => await context.Trades
            .Where(t => symbols.Contains(t.Symbol))
            .OrderBy(t => t.TradeDateTime ?? (DateTime?)t.TradeDate)
            .ThenBy(t => t.Action == "BUY" ? 0 : 1)
            .ToListAsync();

    public async Task<Dictionary<string, string>> GetKnownIndustriesAsync(IEnumerable<string> symbols)
        => await context.Trades
            .Where(t => symbols.Contains(t.Symbol) && t.Industry != null)
            .GroupBy(t => t.Symbol)
            .Select(g => new { g.Key, Industry = g.First(t => t.Industry != null).Industry! })
            .ToDictionaryAsync(x => x.Key, x => x.Industry);

    public async Task DeleteByTransactionIdsAsync(IEnumerable<string> transactionIds)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0) return;
        await context.Trades
            .Where(t => t.TransactionId != null && ids.Contains(t.TransactionId))
            .ExecuteDeleteAsync();
    }

    public async Task AddRangeAsync(IEnumerable<Trade> trades)
        => await context.Trades.AddRangeAsync(trades);

    public async Task<int> SaveChangesAsync()
        => await context.SaveChangesAsync();
}
