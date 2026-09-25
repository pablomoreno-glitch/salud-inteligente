# advisor

FastAPI microservice for the AI wellness advisor: builds its context from the live catalog,
calls the Anthropic Messages API, and parses/validates the structured `RECS:[...]` block.
Part of the `salud-inteligente` microservices platform (design section 4.5).

## Run locally

```
python -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
DATABASE_URL=sqlite+aiosqlite:///./advisor.db ANTHROPIC_API_KEY=sk-ant-... .venv/bin/uvicorn src.main:app --reload --port 9205
```

## Test

```
.venv/bin/python -m pytest -q
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql+asyncpg://salud:salud@postgres:5432/salud_advisor` | Async SQLAlchemy connection string |
| `INTERNAL_TOKEN` | `local-internal-token` | Shared secret required on `/stats` and sent to the catalog service |
| `CATALOG_URL` | `http://catalog:9202` | Catalog service base URL, used to build the advisor's product context |
| `ANTHROPIC_API_KEY` | (none) | Claude API key. Missing key returns `500` on `/chat` |
| `CLAUDE_MODEL` | `claude-sonnet-5` | Anthropic model name |

## Endpoints

- `POST /chat` — public. `{messages: [{role, content}]}` → `{reply, recommendations, model}`.
- `GET /stats?days=30` — internal. `{conversations, recommendations, top_recommended}`.

The catalog context (grouped by need, one line per active product) is cached in memory for 10 minutes.
