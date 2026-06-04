using TradeViewer.Application.DTOs;

namespace TradeViewer.Application.Services;

public class RiskRewardService
{
    private static readonly decimal[] WinRates = [0.10m, 0.20m, 0.30m, 0.35m, 0.40m, 0.45m, 0.50m, 0.55m, 0.60m, 0.65m, 0.70m];
    private static readonly decimal[] RRRatios  = [1m, 2m, 3m, 4m, 5m, 6m, 7m, 8m, 9m, 10m];

    public RiskRewardResultDto Calculate(RiskRewardInputDto input)
    {
        var heatMap = new List<HeatMapCell>();
        var growthSeries = new List<CapitalGrowthSeries>();

        foreach (var rr in RRRatios)
        {
            foreach (var wr in WinRates)
            {
                var finalCapital = SimulateCapital(input.StartCapital, input.RiskPercent / 100m, wr, rr, input.NumberOfTrades, input.Compounding);
                var returnPct = (finalCapital - input.StartCapital) / input.StartCapital * 100m;
                heatMap.Add(new HeatMapCell(wr, rr, Math.Round(finalCapital, 2), Math.Round(returnPct, 2), finalCapital > input.StartCapital));
            }

            // Growth series: track capital trade-by-trade at a fixed win rate (50%) for each R:R
            var series = SimulateGrowthSeries(input.StartCapital, input.RiskPercent / 100m, 0.50m, rr, input.NumberOfTrades, input.Compounding);
            growthSeries.Add(new CapitalGrowthSeries(rr, 0.50m, series));
        }

        // Also add growth series at fixed R:R=2 for multiple win rates
        foreach (var wr in new[] { 0.40m, 0.50m, 0.60m })
        {
            var series = SimulateGrowthSeries(input.StartCapital, input.RiskPercent / 100m, wr, 2m, input.NumberOfTrades, input.Compounding);
            growthSeries.Add(new CapitalGrowthSeries(2m, wr, series));
        }

        return new RiskRewardResultDto(heatMap, growthSeries, WinRates, RRRatios);
    }

    private static decimal SimulateCapital(decimal start, decimal risk, decimal winRate, decimal rr, int trades, bool compounding)
    {
        if (compounding)
        {
            var wins = (double)(winRate * trades);
            var losses = trades - wins;
            var result = (double)start
                * Math.Pow((double)(1 + risk * rr), wins)
                * Math.Pow((double)(1 - risk), losses);
            return (decimal)result;
        }
        else
        {
            // Flat dollar risk: always risk the same dollar amount (% of starting capital)
            var fixedRisk = start * risk;
            var wins = winRate * trades;
            var losses = trades - wins;
            return start + wins * fixedRisk * rr - losses * fixedRisk;
        }
    }

    private static IEnumerable<decimal> SimulateGrowthSeries(decimal start, decimal risk, decimal winRate, decimal rr, int trades, bool compounding)
    {
        var capital = start;
        var fixedRiskAmount = start * risk;
        var points = new List<decimal> { capital };

        var random = new Random(42); // fixed seed for reproducibility
        for (int i = 0; i < trades; i++)
        {
            bool isWin = random.NextDouble() < (double)winRate;
            if (compounding)
            {
                capital = isWin
                    ? capital * (1 + risk * rr)
                    : capital * (1 - risk);
            }
            else
            {
                capital = isWin
                    ? capital + fixedRiskAmount * rr
                    : capital - fixedRiskAmount;
            }
            points.Add(Math.Round(capital, 2));
        }
        return points;
    }
}
