.PHONY: build release run dev local hosts seed check fmt clippy test health docker-up docker-down clean

DOMAIN ?= sdkpods.com
HTTP_PORT ?= 80
HTTPS_PORT ?= 443

build:
	cargo build

release:
	cargo build --release

seed:
	bash scripts/seed-downloads.sh

dev: seed
	bash scripts/run-dev.sh

local: release seed
	SDKPODS_HTTP_PORT=$(HTTP_PORT) SDKPODS_HTTPS_PORT=$(HTTPS_PORT) SDKPODS_DOMAIN=$(DOMAIN) bash scripts/run-local.sh

hosts:
	bash scripts/hosts-sdkpods.sh

check:
	cargo check

fmt:
	cargo fmt

clippy:
	cargo clippy --all-targets -- -D warnings

test:
	cargo test

health:
	curl -fk https://127.0.0.1:$(HTTPS_PORT)/healthz || curl -fk https://$(DOMAIN):$(HTTPS_PORT)/healthz

docker-up:
	docker compose -f deploy/docker-compose.yml up -d --build

docker-down:
	docker compose -f deploy/docker-compose.yml down

clean:
	cargo clean
	rm -rf certs/*.crt certs/*.key
