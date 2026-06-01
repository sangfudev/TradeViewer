namespace TradeViewer.Application.DTOs;

public record ImportResultDto(
    int ImportedCount,
    string Message,
    IEnumerable<string> Errors
);
