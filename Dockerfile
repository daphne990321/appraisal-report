# syntax=docker/dockerfile:1

# ---------- 前端：共用基底 ----------
FROM node:22-slim AS web-base
# 啟用 corepack，pnpm 版本由 frontend/package.json 的 packageManager 決定
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# ---------- 前端：開發 ----------
FROM web-base AS web-dev
# 只複製 package.json 以取得固定版本的 pnpm；原始碼與依賴由 compose 的 volume 提供
COPY frontend/package.json ./
RUN corepack install
# 執行一次 pnpm，讓 corepack 把 pnpm 執行檔存進 image，之後啟動容器不必再下載
RUN pnpm --version
ENV npm_config_store_dir=/pnpm/store
# 啟動時先依 lock 檔同步依賴；失敗只警告，讓重新產生 lock 檔的指令仍能執行
ENTRYPOINT ["sh", "-c", "pnpm install --frozen-lockfile --prefer-offline || echo 'WARNING: dependency sync failed; dependencies may be out of date. Regenerate the lock file.' >&2; exec \"$@\"", "--"]
CMD ["pnpm", "dev"]

# ---------- 後端：共用基底 ----------
FROM python:3.12-slim AS py-base
COPY --from=ghcr.io/astral-sh/uv:0.9.30 /uv /uvx /bin/
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1
WORKDIR /app

# ---------- 後端：開發（含 dev 依賴） ----------
FROM py-base AS dev
COPY backend/pyproject.toml backend/uv.lock ./
# --frozen 不檢查 lock 檔是否過期，lock 檔過期時仍能建置，再到容器中修復
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project
COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen
# 日常指令不寫檔案到 bind mount：快取都放在 /cache（dev_cache volume）
ENV PYTHONDONTWRITEBYTECODE=1 \
    UV_CACHE_DIR=/cache/uv \
    RUFF_CACHE_DIR=/cache/ruff \
    MYPY_CACHE_DIR=/cache/mypy \
    PYTEST_ADDOPTS="-o cache_dir=/cache/pytest"
# 啟動時先依 lock 檔同步依賴；失敗只警告，讓 uv lock 在 lock 檔過期時仍能執行
ENTRYPOINT ["sh", "-c", "uv sync --locked || echo 'WARNING: dependency sync failed; dependencies may be out of date. Regenerate the lock file.' >&2; exec \"$@\"", "--"]
EXPOSE 8000
CMD ["python", "-m", "appraisal.startup", "--reload", "--reload-dir", "/app/src"]

# ---------- 後端：正式環境 venv（不含 dev 依賴） ----------
FROM py-base AS py-build
COPY backend/pyproject.toml backend/uv.lock ./
# --locked：lock 檔和依賴宣告不一致時建置失敗
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project
COPY backend/src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev

# ---------- 前端：建置靜態檔 ----------
FROM web-base AS web-build
ENV npm_config_store_dir=/pnpm/store
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# ---------- 正式環境 image（預設 target，必須放在最後） ----------
FROM python:3.12-slim AS runtime
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin app
WORKDIR /app
# venv 與原始碼的路徑和 py-build 相同，editable 安裝才找得到 /app/src
COPY --from=py-build /opt/venv /opt/venv
COPY --from=py-build /app/src ./src
COPY backend/alembic.ini ./
COPY backend/alembic ./alembic
COPY --from=web-build /app/dist ./static
RUN python -m compileall -q /app/src
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static
USER app
EXPOSE 8000
CMD ["python", "-m", "appraisal.startup"]
