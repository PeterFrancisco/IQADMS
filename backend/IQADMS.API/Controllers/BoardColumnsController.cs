using IQADMS.API.Data;
using IQADMS.API.DTOs.BoardColumns;
using IQADMS.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;

namespace IQADMS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BoardColumnsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    private static readonly HashSet<string> AllowedTypes =
        new(StringComparer.OrdinalIgnoreCase) { "text", "link", "date", "number", "dropdown" };

    public BoardColumnsController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: api/BoardColumns
    [HttpGet]
    public async Task<IActionResult> GetColumns()
    {
        var rows = await _context.BoardColumns
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        var columns = rows.Select(c => new BoardColumnResponse
        {
            Id = c.Id,
            Name = c.Name,
            ColumnType = c.ColumnType,
            SortOrder = c.SortOrder,
            Options = ParseOptions(c.OptionsJson)
        }).ToList();

        return Ok(columns);
    }

    // POST: api/BoardColumns
    [HttpPost]
    public async Task<IActionResult> CreateColumn(CreateBoardColumnRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Column name is required." });

        var columnType = (request.ColumnType ?? "text").Trim().ToLower();
        if (!AllowedTypes.Contains(columnType))
            return BadRequest(new { message = "Column type must be text, link, date, number, or dropdown." });

        var options = (request.Options ?? new List<string>())
            .Select(o => o.Trim())
            .Where(o => !string.IsNullOrWhiteSpace(o))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (columnType == "dropdown" && options.Count < 2)
            return BadRequest(new { message = "Dropdown columns need at least 2 options." });

        var maxOrder = await _context.BoardColumns
            .Where(c => !c.IsDeleted)
            .Select(c => (int?)c.SortOrder)
            .MaxAsync() ?? 0;

        var column = new BoardColumn
        {
            Name = request.Name.Trim(),
            ColumnType = columnType,
            SortOrder = maxOrder + 1,
            CreatedByUserId = GetUserId(),
            OptionsJson = columnType == "dropdown"
                ? JsonSerializer.Serialize(options)
                : null
        };

        _context.BoardColumns.Add(column);
        await _context.SaveChangesAsync();

        return Ok(new BoardColumnResponse
        {
            Id = column.Id,
            Name = column.Name,
            ColumnType = column.ColumnType,
            SortOrder = column.SortOrder,
            Options = options
        });
    }

    // DELETE: api/BoardColumns/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteColumn(Guid id)
    {
        var column = await _context.BoardColumns.FindAsync(id);
        if (column == null || column.IsDeleted)
            return NotFound();

        column.IsDeleted = true;
        column.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // GET: api/BoardColumns/cell-values
    [HttpGet("cell-values")]
    public async Task<IActionResult> GetCellValues()
    {
        var values = await _context.TaskColumnValues
            .Where(v => !v.IsDeleted)
            .Select(v => new TaskColumnValueResponse
            {
                TaskId = v.TaskId,
                ColumnId = v.ColumnId,
                Value = v.Value
            })
            .ToListAsync();

        return Ok(values);
    }

    // PUT: api/BoardColumns/cell-values
    [HttpPut("cell-values")]
    public async Task<IActionResult> UpsertCellValue(UpsertCellValueRequest request)
    {
        var taskExists = await _context.WorkspaceTasks
            .AnyAsync(t => t.Id == request.TaskId && !t.IsDeleted);
        if (!taskExists)
            return NotFound(new { message = "Task not found." });

        var columnExists = await _context.BoardColumns
            .AnyAsync(c => c.Id == request.ColumnId && !c.IsDeleted);
        if (!columnExists)
            return NotFound(new { message = "Column not found." });

        var existing = await _context.TaskColumnValues
            .FirstOrDefaultAsync(v =>
                v.TaskId == request.TaskId &&
                v.ColumnId == request.ColumnId &&
                !v.IsDeleted);

        if (existing == null)
        {
            existing = new TaskColumnValue
            {
                TaskId = request.TaskId,
                ColumnId = request.ColumnId,
                Value = request.Value
            };
            _context.TaskColumnValues.Add(existing);
        }
        else
        {
            existing.Value = request.Value;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new TaskColumnValueResponse
        {
            TaskId = existing.TaskId,
            ColumnId = existing.ColumnId,
            Value = existing.Value
        });
    }

    private static List<string> ParseOptions(string? optionsJson)
    {
        if (string.IsNullOrWhiteSpace(optionsJson))
            return new List<string>();

        try
        {
            return JsonSerializer.Deserialize<List<string>>(optionsJson) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }

    private Guid GetUserId()
    {
        var claim =
            User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.Parse(claim!);
    }
}