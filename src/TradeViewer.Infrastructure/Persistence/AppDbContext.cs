using Microsoft.EntityFrameworkCore;
using TradeViewer.Domain.Entities;

namespace TradeViewer.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Trade> Trades => Set<Trade>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trade>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Symbol).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Action).HasMaxLength(10).IsRequired();
            entity.Property(e => e.EntryPrice).HasColumnType("decimal(18,6)");
            entity.Property(e => e.ExitPrice).HasColumnType("decimal(18,6)");
            entity.Property(e => e.PnL).HasColumnType("decimal(18,6)");
            entity.Property(e => e.Quantity).HasColumnType("decimal(18,6)");

            // IB-specific fields
            entity.Property(e => e.AccountId).HasMaxLength(50);
            entity.Property(e => e.Currency).HasMaxLength(10);
            entity.Property(e => e.Description).HasMaxLength(200);
            entity.Property(e => e.TradeId).HasMaxLength(50);
            entity.Property(e => e.TransactionId).HasMaxLength(50);
            entity.Property(e => e.TradeMoney).HasColumnType("decimal(18,6)");
            entity.Property(e => e.Commission).HasColumnType("decimal(18,6)");
            entity.Property(e => e.NetCash).HasColumnType("decimal(18,6)");
            entity.Property(e => e.NetCashInBase).HasColumnType("decimal(18,6)");
            entity.Property(e => e.Cost).HasColumnType("decimal(18,6)");
            entity.Property(e => e.FifoPnlRealized).HasColumnType("decimal(18,6)");
            entity.Property(e => e.CapitalGainsPnl).HasColumnType("decimal(18,6)");
            entity.Property(e => e.FxPnl).HasColumnType("decimal(18,6)");
            entity.Property(e => e.Industry).HasMaxLength(100);
        });
    }
}
