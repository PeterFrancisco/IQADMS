using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    public partial class AddAllowedUserInviteTracking : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastInviteError",
                table: "AllowedUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastInviteSentAt",
                table: "AllowedUsers",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "LastInviteError", table: "AllowedUsers");
            migrationBuilder.DropColumn(name: "LastInviteSentAt", table: "AllowedUsers");
        }
    }
}
