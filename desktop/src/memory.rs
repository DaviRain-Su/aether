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
    #[serde(default)]
    pub cloud: bool,
    #[serde(default)]
    pub plan: String,
}

#[derive(Deserialize)]
struct CloudEntity {
    name: String,
    body: String,
    symbol: Option<String>,
    side: Option<String>,
    status: Option<String>,
}

#[derive(Deserialize)]
struct CloudSnap {
    entities: Option<Vec<CloudEntity>>,
    #[serde(rename = "planId")]
    plan_id: Option<String>,
    quota: Option<CloudQuota>,
}

#[derive(Deserialize)]
struct CloudQuota {
    cloud: bool,
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

    /// Pull cloud lessons when the paired vault is on Desk+. Local file still wins on conflict
    /// only if the local lesson is newer by being present — cloud fills gaps.
    pub fn pull_cloud(&mut self, origin: &str, owner_id: &str, device_id: &str) {
        let url = format!("{origin}/api/memory?ownerId={owner_id}&deviceId={device_id}");
        let snap: CloudSnap = match ureq::get(&url)
            .timeout(std::time::Duration::from_secs(6))
            .call()
            .ok()
            .and_then(|r| r.into_json().ok())
        {
            Some(s) => s,
            None => return,
        };
        self.plan = snap.plan_id.unwrap_or_else(|| "observer".into());
        self.cloud = snap.quota.map(|q| q.cloud).unwrap_or(false);
        if !self.cloud {
            return;
        }
        for e in snap.entities.unwrap_or_default() {
            if e.status.as_deref() == Some("archive") {
                continue;
            }
            if self.lessons.iter().any(|l| l.name == e.name) {
                continue;
            }
            self.lessons.push(Lesson {
                name: e.name,
                body: e.body,
                symbol: e.symbol.unwrap_or_default(),
                side: e.side.unwrap_or_else(|| "any".into()),
                live: true,
            });
        }
        self.save();
    }

    pub fn push_lesson(&self, origin: &str, owner_id: &str, device_id: &str, lesson: &Lesson) {
        if !self.cloud {
            return;
        }
        let _ = ureq::post(&format!("{origin}/api/memory"))
            .timeout(std::time::Duration::from_secs(6))
            .send_json(ureq::json!({
                "action": "remember",
                "ownerId": owner_id,
                "deviceId": device_id,
                "category": "lesson",
                "name": lesson.name,
                "body": lesson.body,
                "symbol": lesson.symbol,
                "side": lesson.side,
            }));
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
    upsert_lesson(memory, &name, &body, &symbol, side);
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
    upsert_lesson(memory, &name, &body, symbol, side);
}

fn upsert_lesson(memory: &mut Memory, name: &str, body: &str, symbol: &str, side: &str) {
    if let Some(ex) = memory.lessons.iter_mut().find(|l| l.name == name) {
        ex.body = body.into();
        ex.live = true;
    } else {
        memory.lessons.insert(
            0,
            Lesson {
                name: name.into(),
                body: body.into(),
                symbol: symbol.into(),
                side: side.into(),
                live: true,
            },
        );
    }
    memory.journal.insert(0, body.into());
    memory.save();
}
