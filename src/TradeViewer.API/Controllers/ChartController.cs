using Microsoft.AspNetCore.Mvc;
using TradeViewer.Application.Services;

namespace TradeViewer.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChartController(ChartService chartService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCandles(
        [FromQuery] string symbol,
        [FromQuery] DateTime from,
        [FromQuery] DateTime to)
    {
        if (string.IsNullOrWhiteSpace(symbol))
            return BadRequest("Symbol is required.");
        if (from > to)
            return BadRequest("'from' must be before 'to'.");

        var candles = await chartService.GetCandlesAsync(symbol, from, to);
        return Ok(candles);
    }
}
