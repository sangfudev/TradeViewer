namespace TradeViewer.Application.DTOs;

public record PositionDto
{
    public string Symbol { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Currency { get; init; } = string.Empty;
    public DateTime OpenDate { get; init; }
    public DateTime? CloseDate { get; init; }
    public decimal Quantity { get; init; }
    public decimal AvgEntryPrice { get; init; }
    public decimal? AvgExitPrice { get; init; }
    public decimal? PnL { get; init; }
    public decimal TotalCommission { get; init; }
    public bool IsClosed { get; init; }
    public string? Industry { get; init; }
}
