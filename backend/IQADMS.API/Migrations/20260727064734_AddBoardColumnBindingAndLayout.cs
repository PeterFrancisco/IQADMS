using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardColumnBindingAndLayout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Binding",
                table: "BoardColumns",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "WidthPx",
                table: "BoardColumns",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "WrapText",
                table: "BoardColumns",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Binding",
                table: "BoardColumns");

            migrationBuilder.DropColumn(
                name: "WidthPx",
                table: "BoardColumns");

            migrationBuilder.DropColumn(
                name: "WrapText",
                table: "BoardColumns");
        }
    }
}
