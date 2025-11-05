# mr-mcp

Minimalny serwer MCP napisany w TypeScript, dostarczający zestaw narzędzi HTTP do pracy z plikami i arkuszami CSV.

## Funkcje
- Endpoint manifestu `/.well-known/mcp/manifest` opisujący serwer i dostępne narzędzia.
- Endpoint `POST /tools/call` uruchamiający narzędzia MCP (`ping`, operacje na plikach, analiza danych i infografiki).
- Dedykowany endpoint `POST /infographics` wspierający szybkie generowanie infografik HTML.
- Walidacja wejścia oraz wyjścia narzędzi przy pomocy Zod.
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
- `src/server.ts` – Fastify server MCP z obsługą endpointów narzędzi i GUI.
- `src/tools/index.ts` – rejestr narzędzi i manifesty wejścia.
- `src/tools/ping.ts` – implementacja narzędzia `ping`.
- `src/tools/read_file.ts` – odczytywanie plików tekstowych.
- `src/tools/write_file.ts` – zapisywanie treści do plików.
- `src/tools/list_files.ts` – listowanie zawartości katalogów.
- `src/tools/parse_csv.ts` – parser CSV zwracający nagłówki i wiersze.
- `src/tools/analyze_data.ts` – analiza statystyk CSV oraz informacji o kolumnach.
- `src/tools/generate_infographic.ts` – generowanie infografik HTML z danych CSV.
- `manifest.json` – manifest MCP serwera z opisem dostępnych narzędzi.
- `tests/server.test.ts` – testy integracyjne manifestu i narzędzia `ping`.
- `tests/tools.test.ts` – testy narzędzi plikowych i generowania infografik.
- `data/`, `output/` – katalogi robocze (utrzymywane przy pomocy `.gitkeep`).
- `Dockerfile`, `docker-compose.yml` – obrazy kontenerowe.
- `eslint.config.js`, `tsconfig.json`, `vitest.config.ts` – konfiguracja narzędzi developerskich.

## 🎨 Generowanie infografik z Google Sheets

### Workflow
1. **Pobierz dane z Google Sheets:**
   - Otwórz formularz Google → *Responses* → *Open in Sheets*.
   - *File* → *Download* → *.csv*.
   - Zapisz jako `data/responses.csv`.
2. **Uruchom serwer:**
   ```bash
   pnpm dev
   ```
3. **Otwórz GUI:**
   ```
   http://localhost:8765/
   ```
4. **Wywołaj narzędzie infografiki:**
   ```bash
   curl -X POST http://localhost:8765/tools/call \
     -H "Content-Type: application/json" \
     -d '{
       "tool": "generate_infographic",
       "input": {
         "csvPath": "data/responses.csv",
         "outputPath": "output/infographic.html",
         "title": "Wyniki ankiety 2024"
       }
     }'
   ```

Wygenerowany plik HTML znajdziesz w katalogu `output/` i możesz otworzyć w przeglądarce, aby obejrzeć infografikę.
