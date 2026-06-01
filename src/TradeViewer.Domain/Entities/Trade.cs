namespace TradeViewer.Domain.Entities;

public class Trade
{
    public int Id { get; set; }

    // Core fields (compatible with all import formats)
    public DateTime TradeDate { get; set; }
    public string Symbol { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;   // BUY or SELL
    public decimal Quantity { get; set; }                 // absolute value
    public decimal EntryPrice { get; set; }               // trade price per share
    public decimal? ExitPrice { get; set; }
    public decimal? PnL { get; set; }
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;

    // IB-specific fields
    public string AccountId { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? TradeId { get; set; }
    public string? TransactionId { get; set; }
    public DateTime? TradeDateTime { get; set; }
    public DateTime? ReportDate { get; set; }
    public decimal TradeMoney { get; set; }
    public decimal Commission { get; set; }
    public decimal NetCash { get; set; }
    public decimal NetCashInBase { get; set; }
    public decimal Cost { get; set; }
    public decimal FifoPnlRealized { get; set; }
    public decimal CapitalGainsPnl { get; set; }
    public decimal FxPnl { get; set; }
}
