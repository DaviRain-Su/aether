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

#[derive(Clone, Debug, Default)]
pub struct Depth {
    pub bids: Vec<(f64, f64)>,
    pub asks: Vec<(f64, f64)>,
}

#[derive(Clone, Debug)]
pub struct Pull {
    pub tickers: Vec<Ticker>,
    pub candles: Vec<Candle>,
    pub depth: Depth,
    pub funding: Option<f64>,
    #[allow(dead_code)]
    pub source: String,
}

#[derive(Deserialize)]
struct MarketRow {
    symbol: String,
    price: f64,
    #[serde(rename = "change24h")]
    change24h: f64,
    #[serde(rename = "volume24h")]
    volume24h: Option<f64>,
    bid: Option<f64>,
    ask: Option<f64>,
}

#[derive(Deserialize)]
struct CandleRow {
    t: f64,
    o: f64,
    h: f64,
    l: f64,
    c: f64,
    v: Option<f64>,
}

#[derive(Deserialize)]
struct CandlePack {
    candles: Vec<CandleRow>,
}

#[derive(Deserialize)]
struct BookLevel {
    px: f64,
    sz: f64,
}

#[derive(Deserialize)]
struct BookBody {
    book: Option<BookInner>,
}

#[derive(Deserialize)]
struct BookInner {
    bids: Option<Vec<BookLevel>>,
    asks: Option<Vec<BookLevel>>,
}

#[derive(Deserialize)]
struct FundingBody {
    funding: Option<FundingInner>,
}

#[derive(Deserialize)]
struct FundingInner {
    rate: f64,
}

fn get_json<T: serde::de::DeserializeOwned>(url: &str) -> Result<T> {
    let env: T = ureq::get(url)
        .timeout(std::time::Duration::from_secs(6))
        .call()
        .with_context(|| url.to_string())?
        .into_json()?;
    Ok(env)
}

fn from_origin(origin: &str, source: &str, focus: &str, bar: &str, before: Option<i64>) -> Result<Pull> {
    let markets: Vec<MarketRow> = get_json(&format!("{origin}/api/markets?source={source}"))?;
    let tickers: Vec<Ticker> = markets
        .into_iter()
        .filter(|m| !m.symbol.contains("ELECT") && !m.symbol.contains("FED") && !m.symbol.contains("100K"))
        .filter(|m| {
            ["BTC", "ETH", "SOL", "HYPE", "DOGE", "XRP", "WIF", "BONK", "PUMP", "JUP", "BNB", "ADA"]
                .iter()
                .any(|s| m.symbol == *s || m.symbol == format!("{s}-PERP"))
        })
        .map(|m| Ticker {
            symbol: m.symbol,
            inst_id: String::new(),
            last: m.price,
            change24h: m.change24h,
            volume24h: m.volume24h.unwrap_or(0.0),
            bid: m.bid,
            ask: m.ask,
        })
        .collect();

    let mut candles_url = format!(
        "{origin}/api/markets?candles={focus}&bar={bar}&source={source}"
    );
    if let Some(b) = before {
        candles_url.push_str(&format!("&before={b}"));
    }
    let pack: CandlePack = get_json(&candles_url)?;
    let candles: Vec<Candle> = pack
        .candles
        .into_iter()
        .filter(|c| c.c > 0.0)
        .map(|c| Candle {
            t: c.t as i64,
            o: c.o,
            h: c.h,
            l: c.l,
            c: c.c,
            v: c.v.unwrap_or(0.0),
        })
        .collect();

    let depth = get_json::<BookBody>(&format!(
        "{origin}/api/markets?depth={focus}&source={source}"
    ))
    .ok()
    .and_then(|b| b.book)
    .map(|b| Depth {
        bids: b.bids.unwrap_or_default().into_iter().map(|l| (l.px, l.sz)).take(8).collect(),
        asks: b.asks.unwrap_or_default().into_iter().map(|l| (l.px, l.sz)).take(8).collect(),
    })
    .unwrap_or_default();

    let funding = get_json::<FundingBody>(&format!(
        "{origin}/api/markets?funding={focus}&source={source}"
    ))
    .ok()
    .and_then(|b| b.funding)
    .map(|f| f.rate);

    if tickers.is_empty() && candles.len() < 5 {
        anyhow::bail!("empty tape from origin");
    }
    Ok(Pull {
        tickers,
        candles,
        depth,
        funding,
        source: source.into(),
    })
}

/// Same tape as the web desk when origin is up. Falls back to OKX direct.
pub fn pull(source: &str, focus: &str, bar: &str) -> Pull {
    pull_before(source, focus, bar, None)
}

/// History page: candles strictly older than `before` (unix ms), for scroll-back parity with Web.
pub fn pull_before(source: &str, focus: &str, bar: &str, before: Option<i64>) -> Pull {
    let origin = pair::origin();
    if let Ok(pack) = from_origin(&origin, source, focus, bar, before) {
        return pack;
    }
    // Direct OKX fallback only for live tip (no before) — history needs origin.
    if before.is_some() {
        return Pull {
            tickers: vec![],
            candles: vec![],
            depth: Depth::default(),
            funding: None,
            source: source.into(),
        };
    }
    let limit = okx::candle_limit(bar);
    let fallback = okx::pull_tape(focus, bar, limit);
    Pull {
        tickers: fallback.tickers.unwrap_or_default(),
        candles: fallback.candles.unwrap_or_default(),
        depth: Depth::default(),
        funding: None,
        source: "okx".into(),
    }
}
