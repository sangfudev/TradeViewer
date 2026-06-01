using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeViewer.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddIbTradeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountId",
                table: "Trades",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Trades",
                type: "TEXT",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Trades",
                type: "TEXT",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TradeId",
                table: "Trades",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TransactionId",
                table: "Trades",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TradeDateTime",
                table: "Trades",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReportDate",
                table: "Trades",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TradeMoney",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Commission",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NetCash",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "NetCashInBase",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "Cost",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FifoPnlRealized",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CapitalGainsPnl",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "FxPnl",
                table: "Trades",
                type: "decimal(18,6)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AccountId",       table: "Trades");
            migrationBuilder.DropColumn(name: "Currency",        table: "Trades");
            migrationBuilder.DropColumn(name: "Description",     table: "Trades");
            migrationBuilder.DropColumn(name: "TradeId",         table: "Trades");
            migrationBuilder.DropColumn(name: "TransactionId",   table: "Trades");
            migrationBuilder.DropColumn(name: "TradeDateTime",   table: "Trades");
            migrationBuilder.DropColumn(name: "ReportDate",      table: "Trades");
            migrationBuilder.DropColumn(name: "TradeMoney",      table: "Trades");
            migrationBuilder.DropColumn(name: "Commission",      table: "Trades");
            migrationBuilder.DropColumn(name: "NetCash",         table: "Trades");
            migrationBuilder.DropColumn(name: "NetCashInBase",   table: "Trades");
            migrationBuilder.DropColumn(name: "Cost",            table: "Trades");
            migrationBuilder.DropColumn(name: "FifoPnlRealized", table: "Trades");
            migrationBuilder.DropColumn(name: "CapitalGainsPnl", table: "Trades");
            migrationBuilder.DropColumn(name: "FxPnl",           table: "Trades");
        }
    }
}
