use axum::http::HeaderMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Locale {
    Zh,
    En,
}

impl Locale {
    pub fn parse(raw: &str) -> Option<Self> {
        match raw.to_ascii_lowercase().as_str() {
            "zh" | "zh-cn" | "zh-hans" | "cn" => Some(Self::Zh),
            "en" | "en-us" | "en-gb" => Some(Self::En),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Zh => "zh",
            Self::En => "en",
        }
    }

    pub fn html_lang(self) -> &'static str {
        match self {
            Self::Zh => "zh-CN",
            Self::En => "en",
        }
    }

    pub fn alternate(self) -> Self {
        match self {
            Self::Zh => Self::En,
            Self::En => Self::Zh,
        }
    }

    pub fn from_headers(headers: &HeaderMap) -> Self {
        if let Some(cookie) = headers.get(axum::http::header::COOKIE).and_then(|v| v.to_str().ok()) {
            for part in cookie.split(';') {
                let part = part.trim();
                if let Some(val) = part.strip_prefix("sdkpods_lang=") {
                    if let Some(loc) = Self::parse(val) {
                        return loc;
                    }
                }
            }
        }

        if let Some(al) = headers
            .get(axum::http::header::ACCEPT_LANGUAGE)
            .and_then(|v| v.to_str().ok())
        {
            for tag in al.split(',') {
                let tag = tag.split(';').next().unwrap_or("").trim();
                if let Some(loc) = Self::parse(tag) {
                    return loc;
                }
                if tag.to_ascii_lowercase().starts_with("zh") {
                    return Self::Zh;
                }
                if tag.to_ascii_lowercase().starts_with("en") {
                    return Self::En;
                }
            }
        }

        Self::Zh
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Ui<'a> {
    pub lang: Locale,
    pub nav_works: &'a str,
    pub nav_about: &'a str,
    pub nav_contact: &'a str,
    pub cta_works: &'a str,
    pub cta_download: &'a str,
    pub cta_download_app: &'a str,
    pub cta_source: &'a str,
    pub cta_open_source: &'a str,
    pub back_works: &'a str,
    pub section_works: &'a str,
    pub section_works_lede: &'a str,
    pub section_about: &'a str,
    pub section_about_lede: &'a str,
    pub label_domain: &'a str,
    pub label_email: &'a str,
    pub label_catalog: &'a str,
    pub label_platform: &'a str,
    pub label_version: &'a str,
    pub label_released: &'a str,
    pub label_size: &'a str,
    pub label_license: &'a str,
    pub label_source: &'a str,
    pub label_install: &'a str,
    pub label_status: &'a str,
    pub apps_count_suffix: &'a str,
    pub footer_note: &'a str,
    pub not_found_title: &'a str,
    pub not_found_lede: &'a str,
    pub not_found_cta: &'a str,
    pub lang_label: &'a str,
    pub switch_to: &'a str,
    pub status_stable: &'a str,
    pub status_beta: &'a str,
}

impl Ui<'static> {
    pub fn for_locale(lang: Locale) -> Self {
        match lang {
            Locale::Zh => Self {
                lang,
                nav_works: "作品",
                nav_about: "关于",
                nav_contact: "联系",
                cta_works: "查看作品",
                cta_download: "下载",
                cta_download_app: "下载应用",
                cta_source: "源码",
                cta_open_source: "打开 GitHub",
                back_works: "返回作品列表",
                section_works: "作品",
                section_works_lede: "工具与应用，持续小步迭代。",
                section_about: "关于",
                section_about_lede: "独立制作。本地优先。更新克制。",
                label_domain: "域名",
                label_email: "邮箱",
                label_catalog: "目录",
                label_platform: "平台",
                label_version: "版本",
                label_released: "发布",
                label_size: "大小",
                label_license: "许可",
                label_source: "源码",
                label_install: "安装",
                label_status: "状态",
                apps_count_suffix: " 个作品",
                footer_note: "为沉稳软件而做。",
                not_found_title: "页面不存在",
                not_found_lede: "这个地址没有对应内容。回到首页继续浏览。",
                not_found_cta: "返回首页",
                lang_label: "中文",
                switch_to: "EN",
                status_stable: "稳定",
                status_beta: "测试",
            },
            Locale::En => Self {
                lang,
                nav_works: "Works",
                nav_about: "About",
                nav_contact: "Contact",
                cta_works: "Browse works",
                cta_download: "Download",
                cta_download_app: "Download app",
                cta_source: "Source",
                cta_open_source: "Open GitHub",
                back_works: "Back to works",
                section_works: "Works",
                section_works_lede: "Tools and apps, iterated in small steps.",
                section_about: "About",
                section_about_lede: "Independent. Local-first. Updates kept deliberate.",
                label_domain: "Domain",
                label_email: "Email",
                label_catalog: "Catalog",
                label_platform: "Platform",
                label_version: "Version",
                label_released: "Released",
                label_size: "Size",
                label_license: "License",
                label_source: "Source",
                label_install: "Install",
                label_status: "Status",
                apps_count_suffix: " works",
                footer_note: "Made for calm software.",
                not_found_title: "Page not found",
                not_found_lede: "Nothing lives at this address. Head home to keep browsing.",
                not_found_cta: "Back home",
                lang_label: "EN",
                switch_to: "中文",
                status_stable: "Stable",
                status_beta: "Beta",
            },
        }
    }

    pub fn status_label(self, raw: &str) -> &'static str {
        match raw.to_ascii_lowercase().as_str() {
            "stable" => self.status_stable,
            "beta" => self.status_beta,
            _ => self.status_stable,
        }
    }
}
