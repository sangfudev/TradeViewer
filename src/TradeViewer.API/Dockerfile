FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY TradeViewer.sln ./
COPY src/TradeViewer.Domain/ src/TradeViewer.Domain/
COPY src/TradeViewer.Application/ src/TradeViewer.Application/
COPY src/TradeViewer.Infrastructure/ src/TradeViewer.Infrastructure/
COPY src/TradeViewer.API/ src/TradeViewer.API/
RUN dotnet restore src/TradeViewer.API/TradeViewer.API.csproj
RUN dotnet publish src/TradeViewer.API/TradeViewer.API.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /out .
EXPOSE 5000
ENTRYPOINT ["dotnet", "TradeViewer.API.dll"]
