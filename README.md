# TradeViewer

A full-stack trade history viewer and risk/reward calculator. Mainly for imported trade reports in XML format from Interactive Brokers accounts.

**Stack:** .NET 8 (Clean Architecture) · SQLite · React 18 + Vite · Recharts

---

## Running with Docker

The easiest way to run the full stack.

**Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API / Swagger | http://localhost:5000/swagger |

The SQLite database is stored in a named Docker volume (`tradeviewer_sqlite_data`) and persists across restarts.

To stop and remove containers (data is preserved):
```bash
docker compose down
```

To also delete the database volume:
```bash
docker compose down -v
```

---

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)

---

## Getting Started

### 1 — Backend

```bash
cd src/TradeViewer.API
dotnet restore
dotnet run
```

The API will start at **http://localhost:5000** (or https://localhost:5001).  
Swagger UI is available at http://localhost:5000/swagger

SQLite database (`tradeviewer.db`) is auto-created on first run via EF Core migrations.

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

The React app starts at **http://localhost:5173**.  
The Vite dev server proxies `/api` requests to `http://localhost:5000`.

---

## Usage

### Import Trades

Go to the **Import** page and upload a `.csv` or `.xml` file.

**CSV format:**
```
Date,Symbol,Action,Quantity,EntryPrice,ExitPrice,PnL
2024-01-15,AAPL,Buy,100,150.00,165.00,1500.00
```

**XML format:**
```xml
<Trades>
  <Trade>
    <Date>2024-01-15</Date>
    <Symbol>AAPL</Symbol>
    <Action>Buy</Action>
    <Quantity>100</Quantity>
    <EntryPrice>150.00</EntryPrice>
    <ExitPrice>165.00</ExitPrice>
    <PnL>1500.00</PnL>
  </Trade>
</Trades>
```

Sample files are included: `sample-trades.csv` and `sample-trades.xml`.

### View Trades

The **Trades** page shows all trades for the selected year with:
- Sortable, filterable table
- Win/loss stats and total P&L summary

### Risk / Reward Matrix

The **Risk / Reward** page lets you input:
- **Start capital** — your initial account size
- **Risk per trade** — % of capital risked per trade  
- **Number of trades** — simulation length

**Heat Map** — colour-coded grid of final capital across all win-rate × R:R combinations  
**Capital Growth** — trade-by-trade simulation chart

---

## Project Structure

```
TradeViewer/
├── TradeViewer.sln
├── src/
│   ├── TradeViewer.Domain/          # Entities only — no dependencies
│   ├── TradeViewer.Application/     # Use cases, interfaces, DTOs, services
│   ├── TradeViewer.Infrastructure/  # EF Core + SQLite, CSV/XML parsers
│   └── TradeViewer.API/             # ASP.NET Core controllers, DI wiring
└── frontend/                        # React + Vite app
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trades/years` | List years with trades |
| GET | `/api/trades?year=2024` | Get trades for a year |
| POST | `/api/trades/import` | Upload CSV or XML file |
| POST | `/api/riskreward/calculate` | Calculate R:R matrix |
