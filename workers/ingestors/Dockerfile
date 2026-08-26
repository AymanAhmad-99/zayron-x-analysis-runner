# ZAYRON-X Autonomous 24/7 Telegram Collector
# Multi-stage lightweight Python container with healthcheck & persistent volume

FROM python:3.11-slim as base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DATA_DIR=/data/telegram \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    sqlite3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy collector application code
COPY autonomous_collector.py .

# Create non-root user and persistent volume directory
RUN useradd -m -u 1001 -s /bin/bash zayron \
    && mkdir -p /data/telegram \
    && chown -R zayron:zayron /data/telegram /app

USER zayron
VOLUME ["/data/telegram"]

EXPOSE 8080

# Healthcheck probing the embedded HTTP server
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["python", "autonomous_collector.py"]
