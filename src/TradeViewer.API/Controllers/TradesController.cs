using Microsoft.AspNetCore.Mvc;
using TradeViewer.Application.Services;

namespace TradeViewer.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TradesController(TradeService tradeService) : ControllerBase
{
    [HttpGet("years")]
    public async Task<IActionResult> GetYears()
    {
        var years = await tradeService.GetAvailableYearsAsync();
        return Ok(years);
    }

    [HttpGet]
    public async Task<IActionResult> GetByYear([FromQuery] int year)
    {
        if (year < 1900 || year > 2100)
            return BadRequest("Invalid year.");
        var trades = await tradeService.GetTradesByYearAsync(year);
        return Ok(trades);
    }

    [HttpGet("positions")]
    public async Task<IActionResult> GetPositionsByYear([FromQuery] int year)
    {
        if (year < 1900 || year > 2100)
            return BadRequest("Invalid year.");
        var positions = await tradeService.GetPositionsByYearAsync(year);
        return Ok(positions);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        await using var stream = file.OpenReadStream();
        var result = await tradeService.ImportFileAsync(stream, file.FileName);
        return result.ImportedCount > 0 ? Ok(result) : BadRequest(result);
    }

    [HttpPost("backfill-industries")]
    public async Task<IActionResult> BackfillIndustries()
    {
        var updated = await tradeService.BackfillIndustriesAsync();
        return Ok(new { updated });
    }
}
