using System.Text.Json;
using TradeViewer.Application.DTOs;

namespace TradeViewer.Application.Services;

public class ChartService(HttpClient httpClient)
{
    private static readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    public async Task<IEnumerable<CandleDto>> GetCandlesAsync(
        string symbol, DateTime from, DateTime to)
    {
        // Pad 10 trading days of context on each side so entry/exit lines aren't at the chart edge.
        var paddedFrom = from.AddDays(-14);
        var paddedTo   = to.AddDays(14);
        if (paddedTo > DateTime.UtcNow) paddedTo = DateTime.UtcNow;

        var p1 = new DateTimeOffset(paddedFrom, TimeSpan.Zero).ToUnixTimeSeconds();
        var p2 = new DateTimeOffset(paddedTo,   TimeSpan.Zero).ToUnixTimeSeconds();

        var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(symbol)}" +
                  $"?interval=1d&period1={p1}&period2={p2}";

        using var response = await httpClient.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return [];

        using var stream = await response.Content.ReadAsStreamAsync();
        var doc = await JsonDocument.ParseAsync(stream);

        var results = doc.RootElement.GetProperty("chart").GetProperty("result");
        if (results.ValueKind != JsonValueKind.Array || results.GetArrayLength() == 0)
            return [];

        var result     = results[0];
        var timestamps = result.GetProperty("timestamp").EnumerateArray().ToList();
        var quote      = result.GetProperty("indicators").GetProperty("quote")[0];

        var opens   = quote.GetProperty("open")  .EnumerateArray().ToList();
        var highs   = quote.GetProperty("high")  .EnumerateArray().ToList();
        var lows    = quote.GetProperty("low")   .EnumerateArray().ToList();
        var closes  = quote.GetProperty("close") .EnumerateArray().ToList();
        var volumes = quote.GetProperty("volume").EnumerateArray().ToList();

        var candles = new List<CandleDto>(timestamps.Count);
        for (int i = 0; i < timestamps.Count; i++)
        {
            if (i >= closes.Count || closes[i].ValueKind == JsonValueKind.Null)
                continue;

            var date = DateTimeOffset.FromUnixTimeSeconds(timestamps[i].GetInt64()).UtcDateTime;
            candles.Add(new CandleDto
            {
                Date   = date.ToString("yyyy-MM-dd"),
                Open   = GetDecimal(opens,   i),
                High   = GetDecimal(highs,   i),
                Low    = GetDecimal(lows,    i),
                Close  = GetDecimal(closes,  i),
                Volume = GetLong(volumes, i),
            });
        }

        return candles;
    }

    private static decimal GetDecimal(List<JsonElement> arr, int i)
        => i < arr.Count && arr[i].ValueKind != JsonValueKind.Null
            ? (decimal)arr[i].GetDouble() : 0m;

    private static long GetLong(List<JsonElement> arr, int i)
        => i < arr.Count && arr[i].ValueKind != JsonValueKind.Null
            ? arr[i].GetInt64() : 0L;
}
