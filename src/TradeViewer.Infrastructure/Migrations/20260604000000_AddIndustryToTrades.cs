using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeViewer.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIndustryToTrades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Industry",
                table: "Trades",
                type: "TEXT",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Industry", table: "Trades");
        }
    }
}
