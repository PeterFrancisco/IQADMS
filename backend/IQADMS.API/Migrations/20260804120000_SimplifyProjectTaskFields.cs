using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IQADMS.API.Migrations
{
    public partial class SimplifyProjectTaskFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Projects",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaskWorkflowJson",
                table: "Projects",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "WorkspaceTasks",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RelatedDepartmentOrOrg",
                table: "WorkspaceTasks",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WorkflowOrder",
                table: "WorkspaceTasks",
                type: "integer",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Notes", table: "Projects");
            migrationBuilder.DropColumn(name: "TaskWorkflowJson", table: "Projects");
            migrationBuilder.DropColumn(name: "Notes", table: "WorkspaceTasks");
            migrationBuilder.DropColumn(name: "RelatedDepartmentOrOrg", table: "WorkspaceTasks");
            migrationBuilder.DropColumn(name: "WorkflowOrder", table: "WorkspaceTasks");
        }
    }
}
