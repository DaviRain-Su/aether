use anyhow::{Context, Result};
use serde::Deserialize;

use crate::okx::{self, Candle, Ticker};
use crate::pair;

pub const TAPES: &[&str] = &["okx", "backpack", "phoenix", "hyperliquid"];
pub const BARS: &[&str] = &["1s", "1m", "3m", "5m", "15m", "30m", "1H", "4H", "1D"];

/// Merge incoming candles into existing history by timestamp.
/// Keeps chronological order, updates matching bars, appends newer tips.
pub fn merge_candles(prev: &[Candle], next: &[Candle]) -> Vec<Candle> {
    if next.is_empty() {
        return prev.to_vec();
    }
    if prev.is_empty() {
        return next.to_vec();
    }
    let mut map: std::collections::BTreeMap<i64, Candle> =
        prev.iter().map(|c| (c.t, c.clone())).collect();
    for c in next {
        map.insert(c.t, c.clone());
    }
    map.into_values().collect()
}

pub fn label(source: &str) -> &'static str {
    match source {
        "backpack" => "Backpack",
        "phoenix" => "Phoenix",
        "hyperliquid" => "Hyperliquid",
        _ => "OKX",
    }
}

pub fn hint(source: &str) -> &'static str {
    match source {
        "backpack" => "USDC spot & perps",
        "phoenix" => "Solana perps",
        "hyperliquid" => "HL perps · HYPE native",
        _ => "USDT spot & swaps",
    }
}
