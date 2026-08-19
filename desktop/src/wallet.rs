use serde::Deserialize;

#[allow(dead_code)]
#[derive(Clone, Debug, Default, Deserialize)]
pub struct LiveWallet {
    #[serde(rename = "chainType", default)]
    pub chain_type: String,
    #[serde(default)]
    pub address: String,
    #[serde(rename = "nativeSymbol", default)]
    pub native_symbol: String,
    #[serde(default)]
    pub native: f64,
    #[serde(rename = "nativeUsd", default)]
    pub native_usd: f64,
    #[serde(default)]
    pub usdc: f64,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Default, Deserialize)]
pub struct WalletSnap {
    #[serde(default)]
    pub configured: bool,
    #[serde(default)]
    pub minted: bool,
    #[serde(default)]
    pub wallets: Vec<LiveWallet>,
    #[serde(rename = "liveUsd", default)]
    pub live_usd: f64,
    #[serde(default)]
    pub reason: Option<String>,
}

impl WalletSnap {
    pub fn pull(origin: &str, owner_id: &str, device_id: &str) -> Self {
        let url = format!("{origin}/api/wallet?ownerId={owner_id}&deviceId={device_id}");
        ureq::get(&url)
            .timeout(std::time::Duration::from_secs(6))
            .call()
            .ok()
            .and_then(|r| r.into_json().ok())
            .unwrap_or_default()
    }

    pub fn short_addr(addr: &str) -> String {
        if addr.len() <= 12 {
            addr.to_string()
        } else {
            format!("{}…{}", &addr[..6], &addr[addr.len().saturating_sub(4)..])
        }
    }
}
