use std::env;
use std::net::SocketAddr;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub domain: String,
    pub http_addr: SocketAddr,
    pub https_addr: SocketAddr,
    pub content_path: PathBuf,
    pub static_dir: PathBuf,
    pub downloads_dir: PathBuf,
    pub cert_path: PathBuf,
    pub key_path: PathBuf,
    pub auto_tls: bool,
    pub redirect_http: bool,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        let domain = env::var("SDKPODS_DOMAIN").unwrap_or_else(|_| "sdkpods.com".into());
        let http_port: u16 = env::var("SDKPODS_HTTP_PORT")
            .unwrap_or_else(|_| "80".into())
            .parse()?;
        let https_port: u16 = env::var("SDKPODS_HTTPS_PORT")
            .unwrap_or_else(|_| "443".into())
            .parse()?;
        let bind = env::var("SDKPODS_BIND").unwrap_or_else(|_| "0.0.0.0".into());

        let root = env::var("SDKPODS_ROOT")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));

        Ok(Self {
            domain,
            http_addr: format!("{bind}:{http_port}").parse()?,
            https_addr: format!("{bind}:{https_port}").parse()?,
            content_path: env::var("SDKPODS_CONTENT")
                .map(PathBuf::from)
                .unwrap_or_else(|_| root.join("content/apps.toml")),
            static_dir: env::var("SDKPODS_STATIC")
                .map(PathBuf::from)
                .unwrap_or_else(|_| root.join("static")),
            downloads_dir: env::var("SDKPODS_DOWNLOADS")
                .map(PathBuf::from)
                .unwrap_or_else(|_| root.join("downloads")),
            cert_path: env::var("SDKPODS_CERT")
                .map(PathBuf::from)
                .unwrap_or_else(|_| root.join("certs/sdkpods.com.crt")),
            key_path: env::var("SDKPODS_KEY")
                .map(PathBuf::from)
                .unwrap_or_else(|_| root.join("certs/sdkpods.com.key")),
            auto_tls: env::var("SDKPODS_AUTO_TLS")
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(true),
            redirect_http: env::var("SDKPODS_REDIRECT_HTTP")
                .map(|v| v != "0" && !v.eq_ignore_ascii_case("false"))
                .unwrap_or(true),
        })
    }
}
