using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddIsAdminToAllowedUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "AllowedUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "AllowedUsers");
        }
    }
}
