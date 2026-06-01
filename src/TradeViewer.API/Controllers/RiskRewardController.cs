using Microsoft.AspNetCore.Mvc;
using TradeViewer.Application.DTOs;
using TradeViewer.Application.Services;

namespace TradeViewer.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RiskRewardController(RiskRewardService rrService) : ControllerBase
{
    [HttpPost("calculate")]
    public IActionResult Calculate([FromBody] RiskRewardInputDto input)
    {
        if (input.StartCapital <= 0) return BadRequest("Start capital must be positive.");
        if (input.RiskPercent is <= 0 or > 100) return BadRequest("Risk % must be between 0 and 100.");
        if (input.NumberOfTrades is <= 0 or > 1000) return BadRequest("Number of trades must be between 1 and 1000.");

        var result = rrService.Calculate(input);
        return Ok(result);
    }
}
