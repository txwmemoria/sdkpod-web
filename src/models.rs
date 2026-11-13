use serde::{Deserialize, Serialize};

use crate::i18n::Locale;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Catalog {
    pub studio_name: String,
    pub studio_tagline_zh: String,
    pub studio_tagline_en: String,
    pub studio_bio_zh: String,
    pub studio_bio_en: String,
    pub domain: String,
    pub contact_email: String,
    pub apps: Vec<App>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct App {
    pub id: String,
    pub name: String,
    pub tagline_zh: String,
    pub tagline_en: String,
    pub description_zh: String,
    pub description_en: String,
    pub platforms: Vec<String>,
    pub version: String,
    pub release_date: String,
    #[serde(default)]
    pub download_path: Option<String>,
    #[serde(default)]
    pub repo_url: Option<String>,
    #[serde(default)]
    pub size_label: Option<String>,
    #[serde(default)]
    pub install_zh: Option<String>,
    #[serde(default)]
    pub install_en: Option<String>,
    pub featured: bool,
    pub accent: String,
    pub status: String,
}

impl Catalog {
    pub fn load(path: &std::path::Path) -> anyhow::Result<Self> {
        let raw = std::fs::read_to_string(path)?;
        let catalog: Catalog = toml::from_str(&raw)?;
        Ok(catalog)
    }

    pub fn find(&self, id: &str) -> Option<&App> {
        self.apps.iter().find(|a| a.id == id)
    }

    pub fn tagline(&self, lang: Locale) -> &str {
        match lang {
            Locale::Zh => &self.studio_tagline_zh,
            Locale::En => &self.studio_tagline_en,
        }
    }

    pub fn bio(&self, lang: Locale) -> &str {
        match lang {
            Locale::Zh => &self.studio_bio_zh,
            Locale::En => &self.studio_bio_en,
        }
    }
}

impl App {
    pub fn tagline(&self, lang: Locale) -> &str {
        match lang {
            Locale::Zh => &self.tagline_zh,
            Locale::En => &self.tagline_en,
        }
    }

    pub fn description(&self, lang: Locale) -> &str {
        match lang {
            Locale::Zh => &self.description_zh,
            Locale::En => &self.description_en,
        }
    }

    pub fn platforms_joined(&self) -> String {
        self.platforms.join(" · ")
    }

    pub fn has_download(&self) -> bool {
        self.download_path
            .as_ref()
            .map(|p| !p.is_empty())
            .unwrap_or(false)
    }

    pub fn has_repo(&self) -> bool {
        self.repo_url
            .as_ref()
            .map(|p| !p.is_empty())
            .unwrap_or(false)
    }

    pub fn install(&self, lang: Locale) -> Option<&str> {
        let raw = match lang {
            Locale::Zh => self.install_zh.as_deref(),
            Locale::En => self.install_en.as_deref(),
        };
        raw.filter(|s| !s.is_empty())
    }
}

#[derive(Debug, Clone)]
pub struct AppCard {
    pub id: String,
    pub name: String,
    pub tagline: String,
    pub description: String,
    pub platforms: String,
    pub version: String,
    pub release_date: String,
    pub size_label: String,
    pub featured: bool,
    pub accent: String,
    pub status: String,
    pub status_label: String,
    pub index: String,
    pub detail_href: String,
    pub primary_href: String,
    pub primary_is_external: bool,
    pub has_download: bool,
    pub has_repo: bool,
    pub repo_url: String,
    pub download_href: String,
    pub install: String,
    pub has_install: bool,
}

impl AppCard {
    pub fn from_app(app: &App, lang: Locale, index: usize, status_label: &str) -> Self {
        let prefix = format!("/{}", lang.as_str());
        let download_href = app
            .download_path
            .as_ref()
            .filter(|p| !p.is_empty())
            .map(|p| format!("/downloads/{p}"))
            .unwrap_or_default();
        let repo_url = app.repo_url.clone().unwrap_or_default();
        let has_download = app.has_download();
        let has_repo = app.has_repo();

        let (primary_href, primary_is_external) = if has_download {
            (download_href.clone(), false)
        } else if has_repo {
            (repo_url.clone(), true)
        } else {
            (format!("{prefix}/apps/{}", app.id), false)
        };

        Self {
            id: app.id.clone(),
            name: app.name.clone(),
            tagline: app.tagline(lang).to_string(),
            description: app.description(lang).to_string(),
            platforms: app.platforms_joined(),
            version: app.version.clone(),
            release_date: app.release_date.clone(),
            size_label: app.size_label.clone().unwrap_or_default(),
            featured: app.featured,
            accent: app.accent.clone(),
            status: app.status.clone(),
            status_label: status_label.to_string(),
            index: format!("{index:02}"),
            detail_href: format!("{prefix}/apps/{}", app.id),
            primary_href,
            primary_is_external,
            has_download,
            has_repo,
            repo_url,
            download_href,
            install: app.install(lang).unwrap_or("").to_string(),
            has_install: app.install(lang).is_some(),
        }
    }
}
