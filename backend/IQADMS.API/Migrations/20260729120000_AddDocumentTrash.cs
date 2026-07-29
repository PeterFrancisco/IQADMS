using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations;

public partial class AddDocumentTrash : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "DeletedAt",
            table: "Submissions",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "TrashedFromFolderPath",
            table: "Submissions",
            type: "character varying(300)",
            maxLength: 300,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "DeletedAt",
            table: "DocumentLibraryFolders",
            type: "timestamp with time zone",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "DeletedAt", table: "Submissions");
        migrationBuilder.DropColumn(name: "TrashedFromFolderPath", table: "Submissions");
        migrationBuilder.DropColumn(name: "DeletedAt", table: "DocumentLibraryFolders");
    }
}
