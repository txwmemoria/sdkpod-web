mod config;
mod i18n;
mod models;
mod routes;
mod state;
mod tls;

use std::net::SocketAddr;

use anyhow::Context;
use axum_server::tls_rustls::RustlsConfig;
use tracing_subscriber::{fmt, EnvFilter};

use crate::config::Config;
use crate::models::Catalog;
use crate::state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .ok();

    init_tracing();

    let config = Config::from_env().context("load config")?;
    tracing::info!(
        domain = %config.domain,
        http = %config.http_addr,
        https = %config.https_addr,
        "SDK Pods starting"
    );

    std::fs::create_dir_all(&config.downloads_dir)?;
    std::fs::create_dir_all(&config.static_dir)?;

    tls::ensure_certs(
        &config.cert_path,
        &config.key_path,
        &config.domain,
        config.auto_tls,
    )?;

    let catalog = Catalog::load(&config.content_path)
        .with_context(|| format!("load catalog {}", config.content_path.display()))?;
    tracing::info!(apps = catalog.apps.len(), "catalog loaded");

    let state = AppState::new(config.clone(), catalog);
    let app = routes::app_router(state);

    let tls = RustlsConfig::from_pem_file(&config.cert_path, &config.key_path)
        .await
        .context("load rustls config")?;

    let https_addr = config.https_addr;
    let http_addr = config.http_addr;
    let redirect = config.redirect_http;
    let domain = config.domain.clone();
    let https_port = https_addr.port();

    let https = tokio::spawn(async move {
        tracing::info!(%https_addr, "HTTPS listening");
        axum_server::bind_rustls(https_addr, tls)
            .serve(app.into_make_service())
            .await
            .context("https server")
    });

    let http = if redirect {
        Some(tokio::spawn(async move {
            let redirect_app = routes::redirect_router(https_port, domain);
            tracing::info!(%http_addr, "HTTP→HTTPS redirect listening");
            axum_server::bind(http_addr)
                .serve(redirect_app.into_make_service())
                .await
                .context("http redirect server")
        }))
    } else {
        None
    };

    tokio::select! {
        res = https => { res??; }
        res = async {
            if let Some(h) = http {
                h.await?
            } else {
                std::future::pending::<anyhow::Result<()>>().await
            }
        } => { res?; }
        _ = shutdown_signal() => {
            tracing::info!("shutdown signal received");
        }
    }

    Ok(())
}

fn init_tracing() {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,tower_http=info,sdkpods=info"));

    let json = std::env::var("SDKPODS_LOG_JSON")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if json {
        fmt().json().with_env_filter(filter).init();
    } else {
        fmt()
            .with_env_filter(filter)
            .with_target(false)
            .compact()
            .init();
    }
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

#[allow(dead_code)]
fn _addr_hint(addr: SocketAddr) -> String {
    addr.to_string()
}
