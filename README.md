# MCP – lokalny serwer zgodny z OpenAI Chat Completions

Ten projekt udostępnia lekką implementację serwera HTTP zgodnego z API `/v1/chat/completions`,
która działa na FastAPI i wykorzystuje lokalny silnik [Ollama](https://ollama.com/) jako
model językowy. Dzięki temu możesz korzystać z narzędzi oczekujących interfejsu OpenAI, ale
bez konieczności wysyłania danych poza własne środowisko.

## Wymagania wstępne

1. **Python 3.10+** – projekt jest pakietowany jako moduł Pythona.
2. **Ollama** – zainstaluj i uruchom Ollamę na tej samej maszynie.
   ```bash
   # macOS / Linux (curl)
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Windows (PowerShell)
   winget install Ollama.Ollama
   ```
3. **Model Ollamy** – pobierz model, który chcesz obsługiwać (domyślnie `llama3.2:3b`).
   ```bash
   ollama pull llama3.2:3b
   ```

## Instalacja środowiska

1. Sklonuj repozytorium i przejdź do katalogu projektu.
   ```bash
   git clone <adres-repozytorium>
   cd mr-mcp
   ```
2. (Opcjonalnie) utwórz i aktywuj wirtualne środowisko.
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```
3. Zainstaluj zależności serwera (oraz narzędzia developerskie, jeśli potrzebujesz testów).
   ```bash
   pip install -e .
   # lub
   pip install -e .[dev]
   ```

## Uruchomienie serwera

Upewnij się, że demon Ollamy działa (`ollama serve`) i wystawia API na `http://127.0.0.1:11434`.
Następnie uruchom FastAPI przy pomocy Uvicorna:

```bash
uvicorn mcp_server:app --reload --host 0.0.0.0 --port 8000
```

Po wystartowaniu endpoint będzie dostępny pod adresem `http://localhost:8000/v1/chat/completions`.

### Konfiguracja połączenia z innym hostem Ollamy

Jeżeli Ollama działa na innym hoście lub porcie, ustaw zmienne środowiskowe
`OLLAMA_HOST` i `OLLAMA_PORT` przed uruchomieniem serwera. Biblioteka `ollama`
wykorzysta je do zestawienia połączenia, np.:

```bash
export OLLAMA_HOST=192.168.1.42
export OLLAMA_PORT=11434
uvicorn mcp_server:app
```

## Przykładowe wywołania

### 1. Zapytanie REST (bez strumieniowania)
```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
        "model": "llama3.2:3b",
        "messages": [
          {"role": "user", "content": "Opowiedz dowcip o programistach."}
        ],
        "stream": false
      }'
```

Przykładowa odpowiedź:
```json
{
  "model": "llama3.2:3b",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      }
    }
  ]
}
```

### 2. Zapytanie strumieniowe (Server-Sent Events)
```bash
curl -N -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
        "messages": [
          {"role": "user", "content": "Wytłumacz paradoks jajka i kury."}
        ],
        "stream": true
      }'
```
Flagę `-N` (`--no-buffer`) dodaj, aby `curl` wypisywał dane na bieżąco.
Każdy fragment odpowiedzi ma format `data: {...}` zgodnie z konwencją SSE, a na końcu
pojawia się `data: [DONE]` sygnalizujące zamknięcie strumienia.

### 3. Korzystanie z narzędzi MCP przez API

Serwer automatycznie przekazuje do modelu zestaw narzędzi, które pozwalają manipulować
plikami projektu lub uruchamiać bezpieczne polecenia. Aby z nich skorzystać, poinformuj
model w wiadomości `system` lub `user`, jakie narzędzie ma wywołać i z jakimi
argumentami. Poniższy przykład instruuje model, aby użył funkcji `read_file` i odczytał
początek pliku `README.md`:

```bash
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
        "model": "llama3.2:3b",
        "messages": [
          {
            "role": "system",
            "content": "Masz dostęp do narzędzia read_file. Użyj go, gdy potrzebujesz treści pliku."
          },
          {
            "role": "user",
            "content": "Podaj pierwsze linie README.md, korzystając z read_file."
          }
        ]
      }'
```

Model odpowiada, prosząc o użycie narzędzia; serwer wywoła funkcję i prześle wynik jako
wiadomość `tool`, a następnie wróci do modelu po końcową odpowiedź. W rezultacie klient
otrzyma standardową strukturę OpenAI z wiadomością `assistant`, która zawiera treść
pliku lub komunikat o błędzie.

#### Dostępne narzędzia

| Nazwa               | Opis                                                                 |
|---------------------|----------------------------------------------------------------------|
| `read_file`         | Zwraca zawartość wskazanego pliku tekstowego w repozytorium.         |
| `write_file`        | Tworzy lub nadpisuje plik treścią dostarczoną w argumencie.          |
| `list_files`        | Wyświetla listę plików i katalogów w podanej ścieżce.                 |
| `run_shell_command` | Uruchamia bezpieczne polecenie powłoki w katalogu projektu.          |
| `search_in_files`   | Wyszukuje wzorzec regularny w plikach znajdujących się w katalogu.   |

### 4. Minimalny klient Pythona
```python
import asyncio

import httpx

API_URL = "http://localhost:8000/v1/chat/completions"

async def main() -> None:
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            API_URL,
            json={
                "model": "llama3.2:3b",
                "messages": [
                    {"role": "user", "content": "Podaj trzy zastosowania FastAPI."}
                ],
            },
        )
        response.raise_for_status()
        print(response.json()["choices"][0]["message"]["content"])

if __name__ == "__main__":
    asyncio.run(main())
```

Aby obsłużyć strumień w Pythonie, możesz wykorzystać `client.stream("POST", ...)` i iterować po
`response.aiter_text()` – logika mirroruje implementację testów w `tests/test_mcp_server.py`.

## Testy

Po zainstalowaniu zależności developerskich uruchom pakiet testów:
```bash
pytest
```
Testy pokrywają zarówno scenariusze standardowych odpowiedzi, jak i strumieniowania SSE.

## Następne kroki

Najbardziej oczywistym kolejnym usprawnieniem jest dodanie mechanizmu cache'owania konfiguracji
modeli oraz prostego interfejsu CLI do wysyłania zapytań bezpośrednio z linii poleceń.
