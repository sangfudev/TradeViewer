namespace TradeViewer.Application.DTOs;

public record TradeDto
{
    public int Id { get; init; }
    public DateTime TradeDate { get; init; }
    public string Symbol { get; init; } = string.Empty;
    public string Action { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public decimal EntryPrice { get; init; }
    public decimal? ExitPrice { get; init; }
    public decimal? PnL { get; init; }
    public DateTime ImportedAt { get; init; }

    // IB-specific fields
    public string AccountId { get; init; } = string.Empty;
    public string Currency { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? TradeId { get; init; }
    public string? TransactionId { get; init; }
    public DateTime? TradeDateTime { get; init; }
    public DateTime? ReportDate { get; init; }
    public decimal TradeMoney { get; init; }
    public decimal Commission { get; init; }
    public decimal NetCash { get; init; }
    public decimal NetCashInBase { get; init; }
    public decimal Cost { get; init; }
    public decimal FifoPnlRealized { get; init; }
    public decimal CapitalGainsPnl { get; init; }
    public decimal FxPnl { get; init; }
}
