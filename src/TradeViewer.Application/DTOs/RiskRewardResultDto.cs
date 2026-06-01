namespace TradeViewer.Application.DTOs;

public record HeatMapCell(
    decimal WinRate,
    decimal RiskRewardRatio,
    decimal FinalCapital,
    decimal ReturnPercent,
    bool IsProfitable
);

public record CapitalGrowthSeries(
    decimal RiskRewardRatio,
    decimal WinRate,
    IEnumerable<decimal> CapitalByTrade
);

public record RiskRewardResultDto(
    IEnumerable<HeatMapCell> HeatMap,
    IEnumerable<CapitalGrowthSeries> GrowthSeries,
    IEnumerable<decimal> WinRates,
    IEnumerable<decimal> RiskRewardRatios
);
