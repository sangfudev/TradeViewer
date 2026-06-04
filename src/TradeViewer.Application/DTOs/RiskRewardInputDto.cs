namespace TradeViewer.Application.DTOs;

public record RiskRewardInputDto(
    decimal StartCapital,
    decimal RiskPercent,
    int NumberOfTrades,
    bool Compounding = true
);
