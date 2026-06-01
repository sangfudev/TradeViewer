using TradeViewer.Application.DTOs;

namespace TradeViewer.Application.Services;

public class RiskRewardService
{
    private static readonly decimal[] WinRates = [0.30m, 0.35m, 0.40m, 0.45m, 0.50m, 0.55m, 0.60m, 0.65m, 0.70m];
    private static readonly decimal[] RRRatios  = [1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m];

    public RiskRewardResultDto Calculate(RiskRewardInputDto input)
    {
        var heatMap = new List<HeatMapCell>();
        var growthSeries = new List<CapitalGrowthSeries>();

        foreach (var rr in RRRatios)
        {
            foreach (var wr in WinRates)
            {
                var finalCapital = SimulateCapital(input.StartCapital, input.RiskPercent / 100m, wr, rr, input.NumberOfTrades);
                var returnPct = (finalCapital - input.StartCapital) / input.StartCapital * 100m;
                heatMap.Add(new HeatMapCell(wr, rr, Math.Round(finalCapital, 2), Math.Round(returnPct, 2), finalCapital > input.StartCapital));
            }

            // Growth series: track capital trade-by-trade at a fixed win rate (50%) for each R:R
            var series = SimulateGrowthSeries(input.StartCapital, input.RiskPercent / 100m, 0.50m, rr, input.NumberOfTrades);
            growthSeries.Add(new CapitalGrowthSeries(rr, 0.50m, series));
        }

        // Also add growth series at fixed R:R=2 for multiple win rates
        foreach (var wr in new[] { 0.40m, 0.50m, 0.60m })
        {
            var series = SimulateGrowthSeries(input.StartCapital, input.RiskPercent / 100m, wr, 2m, input.NumberOfTrades);
            growthSeries.Add(new CapitalGrowthSeries(2m, wr, series));
        }

        return new RiskRewardResultDto(heatMap, growthSeries, WinRates, RRRatios);
    }

    /// <summary>
    /// Simulate final capital using expected geometric growth:
    /// Each win: capital *= (1 + risk * RR)
    /// Each loss: capital *= (1 - risk)
    /// We use expected value formula: C * (1 + risk*RR)^wins * (1 - risk)^losses
    /// </summary>
    private static decimal SimulateCapital(decimal start, decimal risk, decimal winRate, decimal rr, int trades)
    {
        var wins = (double)(winRate * trades);
        var losses = trades - wins;
        var result = (double)start
            * Math.Pow((double)(1 + risk * rr), wins)
            * Math.Pow((double)(1 - risk), losses);
        return (decimal)result;
    }

    private static IEnumerable<decimal> SimulateGrowthSeries(decimal start, decimal risk, decimal winRate, decimal rr, int trades)
    {
        var capital = start;
        var points = new List<decimal> { capital };

        // Simulate trade-by-trade using deterministic alternating pattern weighted by win rate
        var random = new Random(42); // fixed seed for reproducibility
        for (int i = 0; i < trades; i++)
        {
            bool isWin = random.NextDouble() < (double)winRate;
            capital = isWin
                ? capital * (1 + risk * rr)
                : capital * (1 - risk);
            points.Add(Math.Round(capital, 2));
        }
        return points;
    }
}
