using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    public partial class AddSocialLinkDisplayNames : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FacebookDisplayName",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GitHubDisplayName",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InstagramDisplayName",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedInDisplayName",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TwitterDisplayName",
                table: "Users",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "FacebookDisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "GitHubDisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "InstagramDisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "LinkedInDisplayName", table: "Users");
            migrationBuilder.DropColumn(name: "TwitterDisplayName", table: "Users");
        }
    }
}
