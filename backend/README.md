# dsqus Backend Service

This folder is a separate FastAPI service project.

It imports core logic from the installed `dsqus` package (`dsqus.engine`).

## Local setup

1. Create and activate a Python virtual environment from repository root.
2. Install backend dependencies:

```bash
pip install -e .
pip install -r backend/requirements.txt
```

3. Start the backend from repository root:

```bash
uvicorn backend.app:app --reload
```

## Endpoints

- `GET /health`
- `POST /upload` (multipart field name: `file`)
