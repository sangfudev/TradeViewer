using TradeViewer.Domain.Entities;

namespace TradeViewer.Application.Interfaces;

public interface ITradeRepository
{
    Task<IEnumerable<Trade>> GetByYearAsync(int year);
    Task<IEnumerable<Trade>> GetAllForSymbolsActiveInYearAsync(int year);
    Task<IEnumerable<int>> GetAvailableYearsAsync();
    Task<IEnumerable<Trade>> GetBySymbolsAsync(IEnumerable<string> symbols);
    Task<Dictionary<string, string>> GetKnownIndustriesAsync(IEnumerable<string> symbols);
    Task DeleteByTransactionIdsAsync(IEnumerable<string> transactionIds);
    Task AddRangeAsync(IEnumerable<Trade> trades);
    Task<int> SaveChangesAsync();
}
