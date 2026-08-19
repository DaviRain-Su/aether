use crate::book::Book;
use crate::memory::{find_block, ingest, Memory};
use crate::okx::Ticker;

pub struct Brief {
    pub text: String,
    pub side: Option<String>,
    pub qty: Option<f64>,
}

pub fn brief(text: &str, focus: &str, ticker: Option<&Ticker>, book: &Book, memory: &mut Memory) -> Brief {
    let wrote = ingest(memory, text, focus);
    let up = ticker.map(|t| t.change24h >= 0.0).unwrap_or(true);
    let want = regex_want(text);
    let intent_side = if text.to_lowercase().contains("short") {
        "short"
    } else if text.to_lowercase().contains("buy") || text.to_lowercase().contains("long") {
        "long"
    } else if want {
        if up { "long" } else { "short" }
    } else {
        ""
    };
    let symbol = pick_symbol(text, focus);
    let block = if intent_side.is_empty() {
        None
    } else {
        find_block(memory, &symbol, intent_side)
    };

    let mut action = "Stand aside.".to_string();
    let mut reason = "No confirmation worth paying for.".to_string();
    let mut side = None;
    let mut qty = None;

    if wrote {
        action = "Recorded.".into();
        reason = "Wrote that into book memory. It survives this chat.".into();
    } else if let Some(b) = &block {
        action = "Refuse.".into();
        reason = format!("Memory {b}");
    } else if let Some(t) = ticker {
        if t.change24h.abs() > 1.2 {
            action = if up {
                format!("Probe long {}.", t.symbol)
            } else {
                format!("Probe short {}.", t.symbol)
            };
            reason = format!("Tape expansion {:.2}%. Mechanical unit.", t.change24h);
        }
    }

    if let Some(b) = &block {
        if !wrote || text.to_lowercase().contains("again") {
            action = "Refuse.".into();
            reason = format!("Memory {b}");
        }
    }

    if want && action.starts_with("Probe") && !book.kill {
        if let Some(t) = ticker {
            let budget = (book.cash * 0.05).min(2500.0);
            let q = ((budget / t.last) * 1000.0).round() / 1000.0;
            if q > 0.0 {
                side = Some(if up { "buy".into() } else { "sell".into() });
                qty = Some(q);
            }
        }
    }

    let pos = if book.positions.is_empty() {
        "flat".into()
    } else {
        book.positions
            .iter()
            .map(|p| format!("{} {} {}", p.side, p.qty, p.symbol))
            .collect::<Vec<_>>()
            .join(", ")
    };
    let lessons: Vec<_> = memory
        .lessons
        .iter()
        .filter(|l| l.live)
        .map(|l| l.name.clone())
        .collect();

    let mark = ticker
        .map(|t| format!("{}  {:.4}  {:+.2}%", t.symbol, t.last, t.change24h))
        .unwrap_or_else(|| "No mark.".into());

    let text = format!(
        "Desk Rules / Liquidity Macro\n{mark}\nBook  cash {:.0}  {pos}\nMemory  {}\n\n{action}\n{reason}\n\nDesk Rules is local and systematic. It is not advice.",
        book.cash,
        if lessons.is_empty() {
            "empty".into()
        } else {
            lessons.join(" · ")
        }
    );

    Brief { text, side, qty }
}

fn regex_want(text: &str) -> bool {
    let t = text.to_lowercase();
    ["trade", "buy", "sell", "probe", "enter", "short", "long", "size"]
        .iter()
        .any(|w| t.contains(w))
}

fn pick_symbol(text: &str, focus: &str) -> String {
    let upper = text.to_uppercase();
    for s in crate::okx::UNIVERSE {
        if upper.split(|c: char| !c.is_ascii_alphanumeric()).any(|tok| tok == *s) {
            return (*s).into();
        }
    }
    focus.to_uppercase()
}
