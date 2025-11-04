# mr-mcp

Minimalny serwer MCP napisany w TypeScript, dostarczający narzędzie `ping` działające w trybie HTTP.

## Funkcje
- Endpoint manifestu `/.well-known/mcp/manifest` opisujący serwer i dostępne narzędzia.
- Endpoint `POST /tools/call` uruchamiający narzędzia MCP (aktualnie `ping`).
- Walidacja wejścia oraz wyjścia narzędzia przy pomocy Zod.
- Health-check `GET /healthz` gotowy do użycia w środowiskach produkcyjnych.
- Testy Vitest, lintowanie ESLint oraz weryfikacja typów TypeScript.
- Gotowy Dockerfile i docker-compose do szybkiego uruchomienia.

## Wymagania
- Node.js 20+ (Corepack dla pnpm jest konfigurowany automatycznie).
- pnpm (zainstalowany przez `corepack enable`).

## Instalacja
```bash
corepack enable
pnpm install
```

## Szybki start (tryb developerski)
```bash
pnpm dev
```
Serwer zostanie uruchomiony na porcie `8765`.

## Build i start w trybie produkcyjnym
```bash
pnpm build
pnpm start
```

## Testy jakości
```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Sprawdzenie działania API
```bash
curl -s localhost:8765/.well-known/mcp/manifest | jq .
curl -s -X POST localhost:8765/tools/call \
  -H 'Content-Type: application/json' \
  -d '{"tool":"ping","input":{"message":"hello"}}' | jq .
```

## Docker
```bash
docker build -t mcp-server .
docker run -p 8765:8765 mcp-server
```

### docker-compose
```bash
docker-compose up --build
```

## Struktura projektu
- `src/server.ts` – Fastify server MCP.
- `src/tools/ping.ts` – implementacja narzędzia `ping`.
- `src/tools/index.ts` – rejestr narzędzi i pomocnicze funkcje.
- `tests/server.test.ts` – testy integracyjne manifestu i narzędzia.
- `manifest.json` – manifest MCP serwera.
- `Dockerfile`, `docker-compose.yml` – obrazy kontenerowe.
- `eslint.config.js`, `tsconfig.json`, `vitest.config.ts` – konfiguracja narzędzi developerskich.

