use std::sync::Arc;
use std::time::Duration;

use askama::Template;
use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{header, HeaderMap, HeaderValue, StatusCode};
use axum::response::{Html, IntoResponse, Redirect, Response};
use axum::routing::get;
use axum::{Json, Router};
use chrono::{Datelike, Utc};
use serde::Serialize;
use tower_http::compression::CompressionLayer;
use tower_http::services::ServeDir;
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::timeout::TimeoutLayer;
use tower_http::trace::TraceLayer;

use crate::i18n::{Locale, Ui};
use crate::models::AppCard;
use crate::state::AppState;

#[derive(Template)]
#[template(path = "home.html")]
struct HomeTemplate<'a> {
    studio_name: &'a str,
    studio_tagline: &'a str,
    studio_bio: &'a str,
    domain: &'a str,
    contact_email: &'a str,
    apps: &'a [AppCard],
    year: i32,
    ui: Ui<'a>,
    lang: &'a str,
    html_lang: &'a str,
    home_href: &'a str,
    switch_href: &'a str,
    switch_label: &'a str,
}

#[derive(Template)]
#[template(path = "app.html")]
struct AppDetailTemplate<'a> {
    studio_name: &'a str,
    domain: &'a str,
    contact_email: &'a str,
    app: &'a AppCard,
    year: i32,
    ui: Ui<'a>,
    lang: &'a str,
    html_lang: &'a str,
    home_href: &'a str,
    switch_href: &'a str,
    switch_label: &'a str,
}

#[derive(Template)]
#[template(path = "not_found.html")]
struct NotFoundTemplate<'a> {
    studio_name: &'a str,
    domain: &'a str,
    contact_email: &'a str,
    year: i32,
    ui: Ui<'a>,
    lang: &'a str,
    html_lang: &'a str,
    home_href: &'a str,
    switch_href: &'a str,
    switch_label: &'a str,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    domain: String,
    uptime_secs: u64,
    apps: usize,
    time: String,
}

#[derive(Serialize)]
struct ReadyResponse {
    ready: bool,
    content_ok: bool,
    downloads_ok: bool,
    cert_ok: bool,
}

pub fn app_router(state: AppState) -> Router {
    let static_dir = state.inner.config.static_dir.clone();
    let downloads_dir = state.inner.config.downloads_dir.clone();

    Router::new()
        .route("/", get(root_redirect))
        .route("/:lang", get(home))
        .route("/:lang/apps/:id", get(app_detail))
        .route("/api/apps", get(api_apps))
        .route("/api/apps/:id", get(api_app))
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .route("/metrics", get(metrics))
        .nest_service("/assets", ServeDir::new(static_dir.join("assets")))
        .nest_service("/downloads", ServeDir::new(downloads_dir))
        .fallback(not_found)
        .layer(CompressionLayer::new())
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(30),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("strict-origin-when-cross-origin"),
        ))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

pub fn redirect_router(https_port: u16, domain: String) -> Router {
    let domain = Arc::new(domain);
    Router::new().fallback(move |req: axum::http::Request<Body>| {
        let domain = Arc::clone(&domain);
        async move {
            let host = req
                .headers()
                .get(header::HOST)
                .and_then(|h| h.to_str().ok())
                .unwrap_or(domain.as_str());
            let host = host.split(':').next().unwrap_or(domain.as_str());
            let path = req.uri().path_and_query().map(|p| p.as_str()).unwrap_or("/");
            let target = if https_port == 443 {
                format!("https://{host}{path}")
            } else {
                format!("https://{host}:{https_port}{path}")
            };
            Redirect::permanent(&target)
        }
    })
}

async fn root_redirect(headers: HeaderMap) -> impl IntoResponse {
    let lang = Locale::from_headers(&headers);
    let mut res = Redirect::temporary(&format!("/{}", lang.as_str())).into_response();
    if let Ok(cookie) = HeaderValue::from_str(&format!(
        "sdkpods_lang={}; Path=/; Max-Age=31536000; SameSite=Lax",
        lang.as_str()
    )) {
        res.headers_mut().insert(header::SET_COOKIE, cookie);
    }
    res
}

fn parse_lang(raw: &str) -> Option<Locale> {
    match raw {
        "zh" => Some(Locale::Zh),
        "en" => Some(Locale::En),
        _ => None,
    }
}

fn switch_path(current: &str, from: Locale, to: Locale) -> String {
    let from_p = format!("/{}", from.as_str());
    let to_p = format!("/{}", to.as_str());
    if let Some(rest) = current.strip_prefix(&from_p) {
        if rest.is_empty() || rest.starts_with('/') {
            return format!("{to_p}{rest}");
        }
    }
    to_p
}

fn build_cards(state: &AppState, lang: Locale) -> Vec<AppCard> {
    let ui = Ui::for_locale(lang);
    state
        .inner
        .catalog
        .apps
        .iter()
        .enumerate()
        .map(|(i, app)| AppCard::from_app(app, lang, i + 1, ui.status_label(&app.status)))
        .collect()
}

async fn home(
    State(state): State<AppState>,
    Path(lang_raw): Path<String>,
) -> Result<Response, AppError> {
    let Some(lang) = parse_lang(&lang_raw) else {
        return Ok(not_found_page(&state, Locale::from_headers(&HeaderMap::new())).into_response());
    };

    let c = &state.inner.catalog;
    let ui = Ui::for_locale(lang);
    let cards = build_cards(&state, lang);
    let home_href = format!("/{}", lang.as_str());
    let switch_href = switch_path(&home_href, lang, lang.alternate());
    let lang_str = lang.as_str();
    let html_lang = lang.html_lang();

    let tpl = HomeTemplate {
        studio_name: &c.studio_name,
        studio_tagline: c.tagline(lang),
        studio_bio: c.bio(lang),
        domain: &c.domain,
        contact_email: &c.contact_email,
        apps: &cards,
        year: Utc::now().year(),
        ui,
        lang: lang_str,
        html_lang,
        home_href: &home_href,
        switch_href: &switch_href,
        switch_label: ui.switch_to,
    };

    let mut res = Html(tpl.render()?).into_response();
    if let Ok(cookie) = HeaderValue::from_str(&format!(
        "sdkpods_lang={}; Path=/; Max-Age=31536000; SameSite=Lax",
        lang.as_str()
    )) {
        res.headers_mut().insert(header::SET_COOKIE, cookie);
    }
    Ok(res)
}

async fn app_detail(
    State(state): State<AppState>,
    Path((lang_raw, id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let Some(lang) = parse_lang(&lang_raw) else {
        return Ok(not_found_page(&state, Locale::Zh).into_response());
    };

    let c = &state.inner.catalog;
    let ui = Ui::for_locale(lang);
    let Some((idx, app)) = c
        .apps
        .iter()
        .enumerate()
        .find(|(_, a)| a.id == id)
    else {
        return Ok(not_found_page(&state, lang).into_response());
    };

    let card = AppCard::from_app(app, lang, idx + 1, ui.status_label(&app.status));
    let home_href = format!("/{}", lang.as_str());
    let current_path = format!("{}/apps/{}", home_href, id);
    let switch_href = switch_path(&current_path, lang, lang.alternate());
    let lang_str = lang.as_str();
    let html_lang = lang.html_lang();

    let tpl = AppDetailTemplate {
        studio_name: &c.studio_name,
        domain: &c.domain,
        contact_email: &c.contact_email,
        app: &card,
        year: Utc::now().year(),
        ui,
        lang: lang_str,
        html_lang,
        home_href: &home_href,
        switch_href: &switch_href,
        switch_label: ui.switch_to,
    };

    let mut res = Html(tpl.render()?).into_response();
    if let Ok(cookie) = HeaderValue::from_str(&format!(
        "sdkpods_lang={}; Path=/; Max-Age=31536000; SameSite=Lax",
        lang.as_str()
    )) {
        res.headers_mut().insert(header::SET_COOKIE, cookie);
    }
    Ok(res)
}

async fn api_apps(State(state): State<AppState>) -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "studio": state.inner.catalog.studio_name,
        "apps": state.inner.catalog.apps,
    }))
}

async fn api_app(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    match state.inner.catalog.find(&id) {
        Some(app) => Ok(Json(app).into_response()),
        None => Ok((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error":"not found"})),
        )
            .into_response()),
    }
}

async fn healthz(State(state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "sdkpods",
        domain: state.inner.config.domain.clone(),
        uptime_secs: state.inner.started_at.elapsed().as_secs(),
        apps: state.inner.catalog.apps.len(),
        time: Utc::now().to_rfc3339(),
    })
}

async fn readyz(State(state): State<AppState>) -> impl IntoResponse {
    let cfg = &state.inner.config;
    let content_ok = cfg.content_path.exists();
    let downloads_ok = cfg.downloads_dir.exists();
    let cert_ok = cfg.cert_path.exists() && cfg.key_path.exists();
    let ready = content_ok && downloads_ok && cert_ok;
    let body = ReadyResponse {
        ready,
        content_ok,
        downloads_ok,
        cert_ok,
    };
    let status = if ready {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    (status, Json(body))
}

async fn metrics(State(state): State<AppState>) -> impl IntoResponse {
    let uptime = state.inner.started_at.elapsed().as_secs();
    let apps = state.inner.catalog.apps.len();
    let body = format!(
        "# HELP sdkpods_up 1 if process is up\n\
         # TYPE sdkpods_up gauge\n\
         sdkpods_up 1\n\
         # HELP sdkpods_uptime_seconds Process uptime in seconds\n\
         # TYPE sdkpods_uptime_seconds counter\n\
         sdkpods_uptime_seconds {uptime}\n\
         # HELP sdkpods_apps_total Number of catalogued apps\n\
         # TYPE sdkpods_apps_total gauge\n\
         sdkpods_apps_total {apps}\n"
    );
    (
        [(header::CONTENT_TYPE, "text/plain; version=0.0.4")],
        body,
    )
}

async fn not_found(State(state): State<AppState>, headers: HeaderMap) -> Response {
    not_found_page(&state, Locale::from_headers(&headers))
}

fn not_found_page(state: &AppState, lang: Locale) -> Response {
    let c = &state.inner.catalog;
    let ui = Ui::for_locale(lang);
    let home_href = format!("/{}", lang.as_str());
    let switch_href = switch_path(&home_href, lang, lang.alternate());
    let tpl = NotFoundTemplate {
        studio_name: c.studio_name.as_str(),
        domain: c.domain.as_str(),
        contact_email: c.contact_email.as_str(),
        year: Utc::now().year(),
        ui,
        lang: lang.as_str(),
        html_lang: lang.html_lang(),
        home_href: home_href.as_str(),
        switch_href: switch_href.as_str(),
        switch_label: ui.switch_to,
    };
    match tpl.render() {
        Ok(html) => (StatusCode::NOT_FOUND, Html(html)).into_response(),
        Err(_) => (StatusCode::NOT_FOUND, "Not Found").into_response(),
    }
}

struct AppError(anyhow::Error);

impl<E: Into<anyhow::Error>> From<E> for AppError {
    fn from(err: E) -> Self {
        Self(err.into())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        tracing::error!(error = %self.0, "request failed");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Html("<h1>Something went wrong</h1>".to_string()),
        )
            .into_response()
    }
}
