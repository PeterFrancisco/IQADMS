using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations;

public partial class AddTaskReviewAndPasswordReset : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "AdminReviewRemark",
            table: "WorkspaceTasks",
            type: "text",
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "SubmittedAt",
            table: "WorkspaceTasks",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "PasswordResetRequests",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                UserId = table.Column<Guid>(type: "uuid", nullable: false),
                Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                ResetToken = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                TokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PasswordResetRequests", x => x.Id);
                table.ForeignKey(
                    name: "FK_PasswordResetRequests_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PasswordResetRequests_UserId",
            table: "PasswordResetRequests",
            column: "UserId");

        migrationBuilder.CreateTable(
            name: "DocumentLibraryFolders",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                Path = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_DocumentLibraryFolders", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_DocumentLibraryFolders_Path",
            table: "DocumentLibraryFolders",
            column: "Path",
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "PasswordResetRequests");
        migrationBuilder.DropTable(name: "DocumentLibraryFolders");
        migrationBuilder.DropColumn(name: "AdminReviewRemark", table: "WorkspaceTasks");
        migrationBuilder.DropColumn(name: "SubmittedAt", table: "WorkspaceTasks");
    }
}
