using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskAttachmentsAndWorkHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttachmentFileName",
                table: "WorkspaceTasks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentFilePath",
                table: "WorkspaceTasks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "WorkspaceTasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeliverableGoogleDriveLink",
                table: "WorkspaceTasks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "WorkspaceTasks",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UploadGoogleDriveLink",
                table: "WorkspaceTasks",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttachmentFileName",
                table: "WorkspaceTasks");

            migrationBuilder.DropColumn(
                name: "AttachmentFilePath",
                table: "WorkspaceTasks");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "WorkspaceTasks");

            migrationBuilder.DropColumn(
                name: "DeliverableGoogleDriveLink",
                table: "WorkspaceTasks");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "WorkspaceTasks");

            migrationBuilder.DropColumn(
                name: "UploadGoogleDriveLink",
                table: "WorkspaceTasks");
        }
    }
}
