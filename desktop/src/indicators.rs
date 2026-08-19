//! Desktop series math (subset of web indicators.ts).

#[derive(Clone, Default)]
pub struct SeriesSet {
    pub ema20: Vec<Option<f64>>,
    pub ema50: Vec<Option<f64>>,
    pub rsi: Vec<Option<f64>>,
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
    out[period] = Some(if loss == 0.0 { 100.0 } else { 100.0 - 100.0 / (1.0 + gain / loss) });
    for i in period + 1..vals.len() {
        let d = vals[i] - vals[i - 1];
        let g = if d > 0.0 { d } else { 0.0 };
        let l = if d < 0.0 { -d } else { 0.0 };
        gain = (gain * (period as f64 - 1.0) + g) / period as f64;
        loss = (loss * (period as f64 - 1.0) + l) / period as f64;
        out[i] = Some(if loss == 0.0 { 100.0 } else { 100.0 - 100.0 / (1.0 + gain / loss) });
    }
    out
}

pub fn compute(rows: &[crate::okx::Candle]) -> SeriesSet {
    let c: Vec<f64> = rows.iter().map(|r| r.c).collect();
    SeriesSet {
        ema20: ema(&c, 20),
        ema50: ema(&c, 50),
        rsi: rsi(&c, 14),
    }
}
