using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BoardColumns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ColumnType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoardColumns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BoardColumns_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TaskColumnValues",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TaskId = table.Column<Guid>(type: "uuid", nullable: false),
                    ColumnId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskColumnValues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskColumnValues_BoardColumns_ColumnId",
                        column: x => x.ColumnId,
                        principalTable: "BoardColumns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskColumnValues_WorkspaceTasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "WorkspaceTasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BoardColumns_CreatedByUserId",
                table: "BoardColumns",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskColumnValues_ColumnId",
                table: "TaskColumnValues",
                column: "ColumnId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskColumnValues_TaskId_ColumnId",
                table: "TaskColumnValues",
                columns: new[] { "TaskId", "ColumnId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskColumnValues");

            migrationBuilder.DropTable(
                name: "BoardColumns");
        }
    }
}
