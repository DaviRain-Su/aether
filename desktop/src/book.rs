use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Position {
    pub symbol: String,
    pub side: String,
    pub qty: f64,
    pub avg: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Fill {
    pub symbol: String,
    pub side: String,
    pub qty: f64,
    pub price: f64,
    pub realized: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Book {
    pub cash: f64,
    pub kill: bool,
    pub positions: Vec<Position>,
    pub fills: Vec<Fill>,
}

impl Default for Book {
    fn default() -> Self {
        Self {
            cash: 100_000.0,
            kill: false,
            positions: vec![],
            fills: vec![],
        }
    }
}

impl Book {
    pub fn equity(&self, marks: &[(String, f64)]) -> f64 {
        let mut eq = self.cash;
        for p in &self.positions {
            let px = marks
                .iter()
                .find(|(s, _)| s == &p.symbol)
                .map(|(_, v)| *v)
                .unwrap_or(p.avg);
            let signed = if p.side == "short" { -1.0 } else { 1.0 };
            eq += signed * (px - p.avg) * p.qty + p.avg * p.qty;
        }
        eq
    }

    pub fn apply(&mut self, symbol: &str, side: &str, qty: f64, px: f64) -> Result<Option<f64>, String> {
        if self.kill {
            return Err("Kill switch is on.".into());
        }
        if !(px > 0.0 && qty > 0.0) {
            return Err("Invalid size.".into());
        }
        if side == "buy" {
            let cost = px * qty;
            if self.cash < cost {
                return Err(format!("Need {cost:.0}, have {:.0}", self.cash));
            }
            self.cash -= cost;
            if let Some(p) = self.positions.iter_mut().find(|p| p.symbol == symbol && p.side == "long") {
                let total = p.qty + qty;
                p.avg = (p.avg * p.qty + px * qty) / total;
                p.qty = total;
            } else {
                self.positions.push(Position {
                    symbol: symbol.into(),
                    side: "long".into(),
                    qty,
                    avg: px,
                });
            }
            self.fills.insert(0, Fill {
                symbol: symbol.into(),
                side: "buy".into(),
                qty,
                price: px,
                realized: None,
            });
            return Ok(None);
        }

        if let Some(idx) = self.positions.iter().position(|p| p.symbol == symbol && p.side == "long") {
            let p = &self.positions[idx];
            let close = qty.min(p.qty);
            let realized = (px - p.avg) * close;
            self.cash += px * close;
            if close >= p.qty - 1e-10 {
                self.positions.remove(idx);
            } else {
                self.positions[idx].qty -= close;
            }
            self.fills.insert(0, Fill {
                symbol: symbol.into(),
                side: "sell".into(),
                qty: close,
                price: px,
                realized: Some(realized),
            });
            return Ok(Some(realized));
        }

        let cost = px * qty;
        if self.cash < cost {
            return Err(format!("Need {cost:.0} margin, have {:.0}", self.cash));
        }
        self.cash -= cost;
        if let Some(p) = self.positions.iter_mut().find(|p| p.symbol == symbol && p.side == "short") {
            let total = p.qty + qty;
            p.avg = (p.avg * p.qty + px * qty) / total;
            p.qty = total;
        } else {
            self.positions.push(Position {
                symbol: symbol.into(),
                side: "short".into(),
                qty,
                avg: px,
            });
        }
        self.fills.insert(0, Fill {
            symbol: symbol.into(),
            side: "sell".into(),
            qty,
            price: px,
            realized: None,
        });
        Ok(None)
    }
}
