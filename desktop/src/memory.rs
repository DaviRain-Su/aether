use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Lesson {
    pub name: String,
    pub body: String,
    pub symbol: String,
    pub side: String,
    pub live: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Memory {
    pub lessons: Vec<Lesson>,
    pub journal: Vec<String>,
}

impl Memory {
    pub fn load() -> Self {
        path()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    pub fn save(&self) {
        let Some(p) = path() else { return };
        let payload = serde_json::to_string_pretty(self).unwrap_or_default();
        std::thread::spawn(move || {
            if let Some(dir) = p.parent() {
                let _ = std::fs::create_dir_all(dir);
            }
            let _ = std::fs::write(p, payload);
        });
    }
}

fn path() -> Option<std::path::PathBuf> {
    dirs::home_dir().map(|h| h.join(".aether").join("memory.json"))
}

pub fn ingest(memory: &mut Memory, text: &str, focus: &str) -> bool {
    let lower = text.to_lowercase();
    let lost = ["lost", "losing", "loss", "blew", "stopped out"]
        .iter()
        .any(|w| lower.contains(w));
    let remember = lower.contains("remember");
    if !(lost || remember) {
        return false;
    }
    let side = if lower.contains("short") || lower.contains("sell") {
        "short"
    } else {
        "long"
    };
    let mut symbol = focus.to_uppercase();
    for s in crate::okx::UNIVERSE {
        if text.to_uppercase().contains(s) {
            symbol = (*s).into();
            break;
        }
    }
    let name = format!("{}:{}", symbol, side.to_uppercase());
    let body = if lost {
        format!("Lost on {side} {symbol}. Do not repeat this expression.")
    } else {
        format!("Remembered: {side} {symbol} is off the desk.")
    };
    if let Some(ex) = memory.lessons.iter_mut().find(|l| l.name == name) {
        ex.body = body.clone();
        ex.live = true;
    } else {
        memory.lessons.insert(
            0,
            Lesson {
                name: name.clone(),
                body: body.clone(),
                symbol,
                side: side.into(),
                live: true,
            },
        );
    }
    memory.journal.insert(0, body);
    memory.save();
    true
}

pub fn find_block(memory: &Memory, symbol: &str, side: &str) -> Option<String> {
    memory.lessons.iter().find(|l| {
        l.live && l.symbol.eq_ignore_ascii_case(symbol) && (l.side == "any" || l.side == side)
    }).map(|l| format!("{}: {}", l.name, l.body))
}

pub fn record_loss(memory: &mut Memory, symbol: &str, side: &str, realized: f64) {
    if realized >= -0.5 {
        return;
    }
    let name = format!("{}:{}", symbol, side.to_uppercase());
    let body = format!(
        "Lost {:.2} USD on {side} {symbol}. Do not repeat this expression.",
        realized.abs()
    );
    if let Some(ex) = memory.lessons.iter_mut().find(|l| l.name == name) {
        ex.body = body.clone();
        ex.live = true;
    } else {
        memory.lessons.insert(
            0,
            Lesson {
                name,
                body: body.clone(),
                symbol: symbol.into(),
                side: side.into(),
                live: true,
            },
        );
    }
    memory.journal.insert(0, body);
    memory.save();
}
