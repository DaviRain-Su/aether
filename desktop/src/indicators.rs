//! Desktop series math — subset aligned with `src/lib/indicators.ts`.

#[derive(Clone, Default)]
pub struct SeriesSet {
    pub ema20: Vec<Option<f64>>,
    pub ema50: Vec<Option<f64>>,
    pub sma20: Vec<Option<f64>>,
    pub bb_mid: Vec<Option<f64>>,
    pub bb_upper: Vec<Option<f64>>,
    pub bb_lower: Vec<Option<f64>>,
    pub rsi: Vec<Option<f64>>,
    pub macd: Vec<Option<f64>>,
    pub macd_signal: Vec<Option<f64>>,
    pub macd_hist: Vec<Option<f64>>,
}

fn ema(vals: &[f64], period: usize) -> Vec<Option<f64>> {
    let mut out = vec![None; vals.len()];
    if vals.len() < period || period == 0 {
        return out;
    }
    let k = 2.0 / (period as f64 + 1.0);
    let mut prev: f64 = vals[..period].iter().sum::<f64>() / period as f64;
    out[period - 1] = Some(prev);
    for i in period..vals.len() {
        prev = vals[i] * k + prev * (1.0 - k);
        out[i] = Some(prev);
    }
    out
}

fn sma(vals: &[f64], period: usize) -> Vec<Option<f64>> {
    let mut out = vec![None; vals.len()];
    if vals.len() < period || period == 0 {
        return out;
    }
    let mut sum: f64 = vals[..period].iter().sum();
    out[period - 1] = Some(sum / period as f64);
    for i in period..vals.len() {
        sum += vals[i] - vals[i - period];
        out[i] = Some(sum / period as f64);
    }
    out
}

fn bollinger(vals: &[f64], period: usize, mult: f64) -> (Vec<Option<f64>>, Vec<Option<f64>>, Vec<Option<f64>>) {
    let mid = sma(vals, period);
    let mut upper = vec![None; vals.len()];
    let mut lower = vec![None; vals.len()];
    if vals.len() < period {
        return (mid, upper, lower);
    }
    for i in (period - 1)..vals.len() {
        let slice = &vals[i + 1 - period..=i];
        let m = mid[i].unwrap_or(0.0);
        let var = slice.iter().map(|v| (v - m).powi(2)).sum::<f64>() / period as f64;
        let sd = var.sqrt();
        upper[i] = Some(m + mult * sd);
        lower[i] = Some(m - mult * sd);
    }
    (mid, upper, lower)
}

fn rsi(vals: &[f64], period: usize) -> Vec<Option<f64>> {
    let mut out = vec![None; vals.len()];
    if vals.len() <= period {
        return out;
    }
    let mut gain = 0.0;
    let mut loss = 0.0;
    for i in 1..=period {
        let d = vals[i] - vals[i - 1];
        if d >= 0.0 {
            gain += d;
        } else {
            loss -= d;
        }
    }
    gain /= period as f64;
    loss /= period as f64;
    out[period] = Some(if loss == 0.0 {
        100.0
    } else {
        100.0 - 100.0 / (1.0 + gain / loss)
    });
    for i in period + 1..vals.len() {
        let d = vals[i] - vals[i - 1];
        let g = if d > 0.0 { d } else { 0.0 };
        let l = if d < 0.0 { -d } else { 0.0 };
        gain = (gain * (period as f64 - 1.0) + g) / period as f64;
        loss = (loss * (period as f64 - 1.0) + l) / period as f64;
        out[i] = Some(if loss == 0.0 {
            100.0
        } else {
            100.0 - 100.0 / (1.0 + gain / loss)
        });
    }
    out
}

/// MACD(12,26,9) line / signal / histogram.
fn macd(vals: &[f64]) -> (Vec<Option<f64>>, Vec<Option<f64>>, Vec<Option<f64>>) {
    let e12 = ema(vals, 12);
    let e26 = ema(vals, 26);
    let n = vals.len();
    let mut line = vec![None; n];
    let mut raw = Vec::with_capacity(n);
    for i in 0..n {
        match (e12[i], e26[i]) {
            (Some(a), Some(b)) => {
                let v = a - b;
                line[i] = Some(v);
                raw.push(v);
            }
            _ => raw.push(f64::NAN),
        }
    }
    let mut signal = vec![None; n];
    let mut hist = vec![None; n];
    let valid: Vec<(usize, f64)> = raw
        .iter()
        .enumerate()
        .filter_map(|(i, v)| if v.is_finite() { Some((i, *v)) } else { None })
        .collect();
    if valid.len() >= 9 {
        let seed: f64 = valid[..9].iter().map(|(_, v)| *v).sum::<f64>() / 9.0;
        let mut prev = seed;
        let k = 2.0 / 10.0;
        let start_idx = valid[8].0;
        signal[start_idx] = Some(prev);
        if let Some(l) = line[start_idx] {
            hist[start_idx] = Some(l - prev);
        }
        for &(i, v) in valid.iter().skip(9) {
            prev = v * k + prev * (1.0 - k);
            signal[i] = Some(prev);
            if let Some(l) = line[i] {
                hist[i] = Some(l - prev);
            }
        }
    }
    (line, signal, hist)
}

pub fn compute(rows: &[crate::okx::Candle]) -> SeriesSet {
    let c: Vec<f64> = rows.iter().map(|r| r.c).collect();
    let (bb_mid, bb_upper, bb_lower) = bollinger(&c, 20, 2.0);
    let (macd_line, macd_signal, macd_hist) = macd(&c);
    SeriesSet {
        ema20: ema(&c, 20),
        ema50: ema(&c, 50),
        sma20: sma(&c, 20),
        bb_mid,
        bb_upper,
        bb_lower,
        rsi: rsi(&c, 14),
        macd: macd_line,
        macd_signal,
        macd_hist,
    }
}

pub const INDICATOR_IDS: &[&str] = &["ema20", "ema50", "sma20", "bb", "rsi", "macd"];

pub fn default_active() -> Vec<String> {
    vec!["ema20".into(), "ema50".into(), "rsi".into()]
}

/// Compact tip string for status bar from active indicators.
pub fn status_tips(series: &SeriesSet, active: &[String]) -> String {
    let mut parts = Vec::new();
    let last = |v: &[Option<f64>]| v.iter().rev().find_map(|x| *x);
    if active.iter().any(|id| id == "ema20") {
        if let Some(v) = last(&series.ema20) {
            parts.push(format!("EMA20 {v:.2}"));
        }
    }
    if active.iter().any(|id| id == "ema50") {
        if let Some(v) = last(&series.ema50) {
            parts.push(format!("EMA50 {v:.2}"));
        }
    }
    if active.iter().any(|id| id == "sma20") {
        if let Some(v) = last(&series.sma20) {
            parts.push(format!("SMA20 {v:.2}"));
        }
    }
    if active.iter().any(|id| id == "bb") {
        if let (Some(u), Some(l)) = (last(&series.bb_upper), last(&series.bb_lower)) {
            parts.push(format!("BB {l:.2}-{u:.2}"));
        }
    }
    if active.iter().any(|id| id == "rsi") {
        if let Some(v) = last(&series.rsi) {
            parts.push(format!("RSI {v:.1}"));
        }
    }
    if active.iter().any(|id| id == "macd") {
        if let Some(v) = last(&series.macd) {
            parts.push(format!("MACD {v:.2}"));
        }
    }
    if parts.is_empty() {
        String::new()
    } else {
        format!(" · {}", parts.join(" "))
    }
}
