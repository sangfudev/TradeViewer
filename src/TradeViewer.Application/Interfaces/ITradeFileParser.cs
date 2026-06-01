using TradeViewer.Domain.Entities;

namespace TradeViewer.Application.Interfaces;

public interface ITradeFileParser
{
    bool CanParse(string fileName);
    Task<IEnumerable<Trade>> ParseAsync(Stream stream);
}
