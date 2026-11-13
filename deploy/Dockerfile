# syntax=docker/dockerfile:1.7

FROM rust:1-bookworm AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock* ./
COPY src ./src
COPY templates ./templates
RUN cargo build --release

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl tini \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin sdkpods

WORKDIR /app
COPY --from=builder /app/target/release/sdkpods /usr/local/bin/sdkpods
COPY content ./content
COPY static ./static
COPY downloads ./downloads
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && mkdir -p /app/certs /app/downloads \
  && chown -R sdkpods:sdkpods /app

ENV SDKPODS_ROOT=/app \
    SDKPODS_DOMAIN=sdkpods.com \
    SDKPODS_HTTP_PORT=80 \
    SDKPODS_HTTPS_PORT=443 \
    SDKPODS_AUTO_TLS=1 \
    SDKPODS_REDIRECT_HTTP=1 \
    SDKPODS_LOG_JSON=1 \
    RUST_LOG=info,sdkpods=info,tower_http=info

EXPOSE 80 443
USER sdkpods
HEALTHCHECK --interval=30s --timeout=3s --start-period=8s --retries=3 \
  CMD curl -fk https://127.0.0.1/healthz || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
