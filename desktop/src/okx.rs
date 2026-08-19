use anyhow::{Context, Result};
use serde::Deserialize;

const OKX: &str = "https://www.okx.com";
const HTTP_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(4);

#[derive(Clone, Debug)]
pub struct Ticker {
    pub symbol: String,
    #[allow(dead_code)]
    pub inst_id: String,
    pub last: f64,
    pub change24h: f64,
    #[allow(dead_code)]
    pub volume24h: f64,
    #[allow(dead_code)]
    pub bid: Option<f64>,
    #[allow(dead_code)]
    pub ask: Option<f64>,
}

#[derive(Clone, Debug)]
pub struct Candle {
    pub t: i64,
    pub o: f64,
    pub h: f64,
    pub l: f64,
    pub c: f64,
    #[allow(dead_code)]
    pub v: f64,
}

pub struct Tape {
    pub tickers: Result<Vec<Ticker>>,
    pub candles: Result<Vec<Candle>>,
}

#[derive(Deserialize)]
struct Envelope<T> {
    code: Option<String>,
    data: Option<T>,
}

#[derive(Deserialize)]
struct RawTicker {
    #[serde(rename = "instId")]
    inst_id: String,
    last: String,
    #[serde(rename = "open24h")]
    open24h: String,
    #[serde(rename = "volCcy24h")]
    vol_ccy: Option<String>,
    #[serde(rename = "bidPx")]
    bid: Option<String>,
    #[serde(rename = "askPx")]
    ask: Option<String>,
}

pub const UNIVERSE: &[&str] = &["BTC", "ETH", "SOL", "HYPE", "DOGE", "XRP"];
pub const BARS: &[&str] = &["1s", "1m", "5m", "15m", "1H", "4H", "1D"];

pub fn inst_id(symbol: &str) -> String {
    let raw = symbol.trim().to_uppercase();
    if raw.ends_with("-PERP") {
        format!("{}-USDT-SWAP", raw.trim_end_matches("-PERP"))
    } else {
        format!("{raw}-USDT")
    }
}

pub fn candle_limit(bar: &str) -> u32 {
    match bar {
        "1s" => 80,
        "1m" => 120,
        _ => 120,
    }
}

fn num(s: &str) -> f64 {
    s.parse().unwrap_or(0.0)
}

fn get_json<T: serde::de::DeserializeOwned>(path: &str) -> Result<T> {
    let url = format!("{OKX}{path}");
    let env: Envelope<T> = ureq::get(&url)
        .timeout(HTTP_TIMEOUT)
        .call()
        .with_context(|| url.clone())?
        .into_json()?;
    if env.code.as_deref().is_some_and(|c| c != "0") {
        anyhow::bail!("okx {path} code {:?}", env.code);
    }
    env.data.context("empty okx payload")
}

pub fn tickers() -> Result<Vec<Ticker>> {
    let rows: Vec<RawTicker> = get_json("/api/v5/market/tickers?instType=SPOT")?;
    let want: Vec<String> = UNIVERSE.iter().map(|s| inst_id(s)).collect();
    Ok(rows
        .into_iter()
        .filter(|r| want.iter().any(|id| id == &r.inst_id))
        .map(|r| {
            let last = num(&r.last);
            let open = num(&r.open24h);
            let change = if open > 0.0 { (last - open) / open * 100.0 } else { 0.0 };
            let symbol = r.inst_id.replace("-USDT", "");
            Ticker {
                symbol,
                inst_id: r.inst_id,
                last,
                change24h: change,
                volume24h: r.vol_ccy.as_deref().map(num).unwrap_or(0.0),
                bid: r.bid.as_deref().map(num),
                ask: r.ask.as_deref().map(num),
            }
        })
        .collect())
}

pub fn candles(symbol: &str, bar: &str, limit: u32) -> Result<Vec<Candle>> {
    let id = inst_id(symbol);
    let path = format!(
        "/api/v5/market/candles?instId={id}&bar={bar}&limit={limit}"
    );
    let rows: Vec<Vec<String>> = get_json(&path)?;
    let mut out: Vec<Candle> = rows
        .into_iter()
        .filter_map(|row| {
            let t = row.first()?.parse().ok()?;
            let o = num(row.get(1)?);
            let h = num(row.get(2)?);
            let l = num(row.get(3)?);
            let c = num(row.get(4)?);
            let v = row
                .get(7)
                .or(row.get(6))
                .or(row.get(5))
                .map(|s| num(s))
                .unwrap_or(0.0);
            if c <= 0.0 {
                return None;
            }
            Some(Candle { t, o, h, l, c, v })
        })
        .collect();
    out.sort_by_key(|c| c.t);
    Ok(out)
}

/// Tickers + candles on worker threads. Never call from the GPUI UI thread.
pub fn pull_tape(focus: &str, bar: &str, limit: u32) -> Tape {
    std::thread::scope(|s| {
        let tickers = s.spawn(tickers);
        let candles = s.spawn(|| candles(focus, bar, limit));
        Tape {
            tickers: tickers.join().unwrap_or_else(|_| Err(anyhow::anyhow!("ticker thread"))),
            candles: candles.join().unwrap_or_else(|_| Err(anyhow::anyhow!("candle thread"))),
        }
    })
}

pub fn label_time(t: i64, bar: &str) -> String {
    let secs = t / 1000;
    let dt = chrono::DateTime::from_timestamp(secs, 0).unwrap_or_else(chrono::Utc::now);
    if bar == "1s" {
        dt.format("%H:%M:%S").to_string()
    } else if bar == "1D" || bar == "4H" {
        dt.format("%m-%d %H:%M").to_string()
    } else {
        dt.format("%H:%M").to_string()
    }
}
