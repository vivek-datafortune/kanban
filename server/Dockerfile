# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — install production dependencies
###############################################################################
FROM python:3.12-slim AS builder

# Copy uv binary from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy dependency manifests first to maximise Docker layer caching
COPY pyproject.toml uv.lock* ./

# Sync production deps into /opt/venv (no project install — we COPY source later)
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN uv sync --no-dev --no-install-project

###############################################################################
# Stage 2 — development image (includes uv + dev deps, used by docker-compose)
###############################################################################
FROM python:3.12-slim AS development

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock* ./

# Install all deps (production + dev) — no project install
RUN uv sync --no-install-project

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

###############################################################################
# Stage 3 — production runtime (default build target)
###############################################################################
FROM python:3.12-slim AS production

ENV VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Copy the pre-built venv from the builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy application source (after venv copy to maximise cache hits)
COPY . .

# Collect static files at build time
RUN python manage.py collectstatic --noinput \
    --settings=config.settings.production || true

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
