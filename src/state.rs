use std::sync::Arc;
use std::time::Instant;

use crate::config::Config;
use crate::models::Catalog;

#[derive(Clone)]
pub struct AppState {
    pub inner: Arc<InnerState>,
}

pub struct InnerState {
    pub config: Config,
    pub catalog: Catalog,
    pub started_at: Instant,
}

impl AppState {
    pub fn new(config: Config, catalog: Catalog) -> Self {
        Self {
            inner: Arc::new(InnerState {
                config,
                catalog,
                started_at: Instant::now(),
            }),
        }
    }
}
