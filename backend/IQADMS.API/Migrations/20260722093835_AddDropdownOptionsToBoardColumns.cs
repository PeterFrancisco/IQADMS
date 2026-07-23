using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddDropdownOptionsToBoardColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OptionsJson",
                table: "BoardColumns",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OptionsJson",
                table: "BoardColumns");
        }
    }
}
