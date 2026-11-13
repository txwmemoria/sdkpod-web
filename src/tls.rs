use std::path::Path;

use anyhow::{bail, Context};
use rcgen::{CertificateParams, DistinguishedName, DnType, KeyPair, SanType};

pub fn ensure_certs(cert_path: &Path, key_path: &Path, domain: &str, auto: bool) -> anyhow::Result<()> {
    if cert_path.exists() && key_path.exists() {
        tracing::info!(
            cert = %cert_path.display(),
            key = %key_path.display(),
            "using existing TLS certificate"
        );
        return Ok(());
    }

    if !auto {
        bail!(
            "TLS cert/key missing (cert={}, key={}). Set SDKPODS_AUTO_TLS=1 or provide files.",
            cert_path.display(),
            key_path.display()
        );
    }

    if let Some(parent) = cert_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    if let Some(parent) = key_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    tracing::warn!(domain, "generating self-signed TLS certificate for local/dev use");

    let mut params = CertificateParams::new(vec![
        domain.to_string(),
        format!("www.{domain}"),
        "localhost".to_string(),
        "127.0.0.1".to_string(),
    ])?;
    params.distinguished_name = DistinguishedName::new();
    params
        .distinguished_name
        .push(DnType::CommonName, domain);
    params
        .distinguished_name
        .push(DnType::OrganizationName, "SDK Pods");
    params.subject_alt_names = vec![
        SanType::DnsName(domain.try_into()?),
        SanType::DnsName(format!("www.{domain}").try_into()?),
        SanType::DnsName("localhost".try_into()?),
        SanType::IpAddress(std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST)),
    ];

    let key_pair = KeyPair::generate()?;
    let cert = params.self_signed(&key_pair)?;

    std::fs::write(cert_path, cert.pem()).context("write cert")?;
    std::fs::write(key_path, key_pair.serialize_pem()).context("write key")?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(key_path)?.permissions();
        perms.set_mode(0o600);
        std::fs::set_permissions(key_path, perms)?;
    }

    tracing::info!(
        cert = %cert_path.display(),
        key = %key_path.display(),
        "self-signed certificate written"
    );
    Ok(())
}
