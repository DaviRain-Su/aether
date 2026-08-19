use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub code: String,
    pub owner_id: String,
    pub origin: String,
}

#[derive(Deserialize)]
struct ClaimOut {
    owner_id: Option<String>,
    #[serde(rename = "ownerId")]
    owner_id_camel: Option<String>,
    device: Option<ClaimDevice>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct ClaimDevice {
    id: String,
    name: Option<String>,
}

impl Device {
    pub fn load() -> Option<Self> {
        path()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str(&s).ok())
    }

    pub fn save(&self) {
        if let Some(p) = path() {
            if let Some(dir) = p.parent() {
                let _ = std::fs::create_dir_all(dir);
            }
            let _ = std::fs::write(p, serde_json::to_string_pretty(self).unwrap_or_default());
        }
    }
}

fn path() -> Option<std::path::PathBuf> {
    dirs::home_dir().map(|h| h.join(".aether").join("device.json"))
}

pub fn origin() -> String {
    std::env::var("AETHER_ORIGIN").unwrap_or_else(|_| "http://127.0.0.1:8080".into())
}

pub fn claim(code: &str, origin: &str) -> Result<Device> {
    let code = code.trim().to_uppercase();
    let fingerprint = format!(
        "gpui_{}_{}",
        std::env::var("USER").unwrap_or_else(|_| "desk".into()),
        std::env::consts::OS
    );
    let res = ureq::post(&format!("{origin}/api/control/claim"))
        .timeout(std::time::Duration::from_secs(8))
        .send_json(ureq::json!({
            "code": code,
            "fingerprint": fingerprint,
            "name": format!("{} desk", std::env::consts::OS),
        }))?;
    let body: ClaimOut = res.into_json().context("claim json")?;
    if let Some(err) = body.error {
        anyhow::bail!(err);
    }
    let device = body.device.context("no device on claim")?;
    let owner = body
        .owner_id
        .or(body.owner_id_camel)
        .unwrap_or_default();
    let rec = Device {
        id: device.id,
        name: device.name.unwrap_or_else(|| "Desk".into()),
        code,
        owner_id: owner,
        origin: origin.into(),
    };
    rec.save();
    Ok(rec)
}

pub fn heartbeat(device: &Device) {
    let _ = ureq::post(&format!("{}/api/control/heartbeat", device.origin))
        .timeout(std::time::Duration::from_secs(5))
        .send_json(ureq::json!({
            "deviceId": device.id,
            "ownerId": device.owner_id,
        }));
}
