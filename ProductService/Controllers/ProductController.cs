using ManuTrack.SharedKernel.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductService.DTOs;
using ProductService.Services.Interfaces;

namespace ProductService.Controllers;

[ApiController]
[Route("api/v1/products")]
[Authorize]
public class ProductController(IProductService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<ProductViewModel>>>> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? status)
    {
        var result = await service.GetAllProductsAsync(category, status);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponse<ProductViewModel>>> GetById(int id)
    {
        var result = await service.GetProductByIdAsync(id);
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProductionPlanner")]
    public async Task<ActionResult<ApiResponse<ProductViewModel>>> Create([FromBody] CreateProductRequest request)
    {
        var result = await service.CreateProductAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.ProductID }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,ProductionPlanner")]
    public async Task<ActionResult<ApiResponse<ProductViewModel>>> Update(int id, [FromBody] UpdateProductRequest request)
    {
        var result = await service.UpdateProductAsync(id, request);
        return Ok(result);
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse<ProductViewModel>>> UpdateStatus(int id, [FromBody] UpdateProductStatusRequest request)
    {
        var result = await service.UpdateProductStatusAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ApiResponse>> Delete(int id)
    {
        var result = await service.DeleteProductAsync(id);
        return Ok(result);
    }
}
