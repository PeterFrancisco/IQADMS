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

    private static readonly HashSet<string> AllowedBindings =
        new(StringComparer.OrdinalIgnoreCase) { "", "owner", "status", "due_date" };

    public BoardColumnsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetColumns()
    {
        await EnsureDefaultColumnsAsync();
        return Ok(await QueryColumnsAsync());
    }

    [HttpPost]
    public async Task<IActionResult> CreateColumn(CreateBoardColumnRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Column name is required." });

        var binding = (request.Binding ?? string.Empty).Trim().ToLower();
        if (binding == "task")
            return BadRequest(new { message = "The Task column cannot be added manually." });
        if (!AllowedBindings.Contains(binding))
            return BadRequest(new { message = "Invalid column binding." });

        if (!string.IsNullOrEmpty(binding))
        {
            var duplicate = await _context.BoardColumns
                .AnyAsync(c => !c.IsDeleted && c.Binding == binding);
            if (duplicate)
                return BadRequest(new { message = $"A column for \"{binding}\" already exists." });
        }

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

        var sortOrder = await ComputeSortOrderAsync(request.InsertAfterColumnId);

        var column = new BoardColumn
        {
            Name = request.Name.Trim(),
            ColumnType = columnType,
            Binding = binding,
            SortOrder = sortOrder,
            WidthPx = 180,
            CreatedByUserId = GetUserId(),
            OptionsJson = columnType == "dropdown"
                ? JsonSerializer.Serialize(options)
                : null
        };

        _context.BoardColumns.Add(column);
        await _context.SaveChangesAsync();

        var created = (await QueryColumnsAsync()).First(c => c.Id == column.Id);
        return Ok(created);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateColumn(Guid id, UpdateBoardColumnRequest request)
    {
        var column = await _context.BoardColumns.FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted);
        if (column == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name))
            column.Name = request.Name.Trim();

        if (request.WrapText.HasValue)
            column.WrapText = request.WrapText.Value;

        if (request.WidthPx.HasValue)
            column.WidthPx = Math.Clamp(request.WidthPx.Value, 100, 480);

        column.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var updated = (await QueryColumnsAsync()).First(c => c.Id == column.Id);
        return Ok(updated);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid id)
    {
        var column = await _context.BoardColumns.FindAsync(id);
        if (column == null || column.IsDeleted)
            return NotFound();

        if (string.Equals(column.Binding, "task", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "The Task column cannot be deleted." });

        column.IsDeleted = true;
        column.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return NoContent();
    }

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

    private async Task<List<BoardColumnResponse>> QueryColumnsAsync()
    {
        var rows = await _context.BoardColumns
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        return rows.Select(c => new BoardColumnResponse
        {
            Id = c.Id,
            Name = c.Name,
            ColumnType = c.ColumnType,
            SortOrder = c.SortOrder,
            Binding = c.Binding ?? string.Empty,
            WrapText = c.WrapText,
            WidthPx = c.WidthPx,
            IsLocked = string.Equals(c.Binding, "task", StringComparison.OrdinalIgnoreCase),
            Options = ParseOptions(c.OptionsJson)
        }).ToList();
    }

    private async Task EnsureDefaultColumnsAsync()
    {
        var hasTask = await _context.BoardColumns
            .AnyAsync(c => !c.IsDeleted && c.Binding == "task");
        if (hasTask)
            return;

        var userId = GetUserId();
        var existing = await _context.BoardColumns
            .Where(c => !c.IsDeleted)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        foreach (var col in existing)
            col.SortOrder += 4;

        var defaults = new[]
        {
            new BoardColumn { Name = "Task", Binding = "task", ColumnType = "text", SortOrder = 0, WidthPx = 260, CreatedByUserId = userId },
            new BoardColumn { Name = "Owner", Binding = "owner", ColumnType = "text", SortOrder = 1, WidthPx = 200, CreatedByUserId = userId },
            new BoardColumn { Name = "Status", Binding = "status", ColumnType = "dropdown", SortOrder = 2, WidthPx = 160, CreatedByUserId = userId },
            new BoardColumn { Name = "Due Date", Binding = "due_date", ColumnType = "date", SortOrder = 3, WidthPx = 150, CreatedByUserId = userId }
        };

        _context.BoardColumns.AddRange(defaults);
        await _context.SaveChangesAsync();
    }

    private async Task<int> ComputeSortOrderAsync(Guid? insertAfterColumnId)
    {
        if (insertAfterColumnId.HasValue)
        {
            var after = await _context.BoardColumns
                .FirstOrDefaultAsync(c => c.Id == insertAfterColumnId && !c.IsDeleted);
            if (after != null)
            {
                var sortOrder = after.SortOrder + 1;
                var toBump = await _context.BoardColumns
                    .Where(c => !c.IsDeleted && c.SortOrder >= sortOrder)
                    .ToListAsync();
                foreach (var c in toBump)
                    c.SortOrder++;
                return sortOrder;
            }
        }

        var maxOrder = await _context.BoardColumns
            .Where(c => !c.IsDeleted)
            .Select(c => (int?)c.SortOrder)
            .MaxAsync() ?? -1;
        return maxOrder + 1;
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
