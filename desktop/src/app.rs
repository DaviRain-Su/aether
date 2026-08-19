use std::time::Duration;

use gpui::{
    div, px, prelude::*, Context, Entity, FocusHandle, InteractiveElement, IntoElement,
    ParentElement, Render, SharedString, Styled, Window,
};
use gpui_component::{
    button::{Button, ButtonVariants as _},
    chart::CandlestickChart,
    input::{Input, InputState},
    ActiveTheme, Icon, IconName, Selectable, Sizable, StyledExt,
};

use crate::book::Book;
use crate::memory::Memory;
use crate::okx::{self, Candle, Ticker};
use crate::pair::Device;
use crate::tape;

pub struct Desk {
    focus: String,
    bar: String,
    tape: String,
    tickers: Vec<Ticker>,
    candles: Vec<Candle>,
    depth: tape::Depth,
    funding: Option<f64>,
    book: Book,
    memory: Memory,
    device: Option<Device>,
    log: Vec<String>,
    status: SharedString,
    prompt: Entity<InputState>,
    pair_input: Entity<InputState>,
    qty: String,
    tape_error: Option<String>,
    pulling: bool,
    pull_queued: bool,
    pull_gen: u64,
    local_only: bool,
    wallet: crate::wallet::WalletSnap,
    has_more: bool,
    loading_older: bool,
    _focus: FocusHandle,
}

impl Desk {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let prompt = cx.new(|cx| {
            InputState::new(window, cx).placeholder("Ask the book. Memory survives a cleared chat.")
        });
        let pair_input = cx.new(|cx| InputState::new(window, cx).placeholder("AETH-XXXX-XXXX"));
        let mut desk = Self {
            focus: "BTC".into(),
            bar: "15m".into(),
            tape: "okx".into(),
            tickers: vec![],
            candles: vec![],
            depth: tape::Depth::default(),
            funding: None,
            book: Book::default(),
            memory: Memory::load(),
            device: Device::load(),
            log: vec![
                "Aether Desk. Same tapes as the web harness.".into(),
                "Paper is a simulator. Live wallet is Privy, minted from Google on the web.".into(),
                "Local agent is on this box — no relay. Pair only if you want fleet, cloud memory, or the live wallet.".into(),
            ],
            status: "pulling tape…".into(),
            prompt,
            pair_input,
            qty: "0.01".into(),
            tape_error: None,
            pulling: false,
            pull_queued: false,
            pull_gen: 0,
            local_only: true,
            wallet: crate::wallet::WalletSnap::default(),
            has_more: true,
            loading_older: false,
            _focus: cx.focus_handle(),
        };
        desk.arm_timer(cx);
        desk.schedule_pull(cx);
        if desk.device.is_some() {
            desk.pull_wallet(cx);
        }
        desk
    }

    fn arm_timer(&self, cx: &mut Context<Self>) {
        cx.spawn(async move |this, cx| {
            loop {
                // 2s matches web live tip cadence; 1s bars need the shorter interval.
                cx.background_executor()
                    .timer(Duration::from_secs(2))
                    .await;
                this.update(cx, |this, cx| {
                    this.request_pull(cx);
                    if this.device.is_some() {
                        if !this.local_only {
                            if let Some(dev) = this.device.clone() {
                                cx.background_executor()
                                    .spawn(async move {
                                        crate::pair::heartbeat(&dev);
                                    })
                                    .detach();
                            }
                        }
                        this.pull_wallet(cx);
                    }
                })
                .ok();
            }
        })
        .detach();
    }

    fn schedule_pull(&mut self, cx: &mut Context<Self>) {
        self.pull_gen = self.pull_gen.wrapping_add(1);
        let gen = self.pull_gen;
        cx.spawn(async move |this, cx| {
            cx.background_executor()
                .timer(Duration::from_millis(80))
                .await;
            this.update(cx, |this, cx| {
                if this.pull_gen == gen {
                    this.request_pull(cx);
                }
            })
            .ok();
        })
        .detach();
    }

    fn request_pull(&mut self, cx: &mut Context<Self>) {
        if self.pulling {
            self.pull_queued = true;
            return;
        }
        self.pulling = true;
        let focus = self.focus.clone();
        let bar = self.bar.clone();
        let source = self.tape.clone();
        cx.spawn(async move |this, cx| {
            let wanted_focus = focus.clone();
            let wanted_bar = bar.clone();
            let wanted_source = source.clone();
            let pack = cx
                .background_executor()
                .spawn(async move { tape::pull(&source, &focus, &bar) })
                .await;
            this.update(cx, |this, cx| {
                this.pulling = false;
                let still_current = this.focus == wanted_focus
                    && this.bar == wanted_bar
                    && this.tape == wanted_source;
                if still_current {
                    if !pack.tickers.is_empty() {
                        this.tickers = pack.tickers;
                        this.tape_error = None;
                    }
                    if pack.candles.len() > 4 {
                        this.candles = tape::merge_candles(&this.candles, &pack.candles);
                        const MAX_CANDLES: usize = 400;
                        if this.candles.len() > MAX_CANDLES {
                            let drop = this.candles.len() - MAX_CANDLES;
                            this.candles.drain(0..drop);
                        }
                        let series = crate::indicators::compute(&this.candles);
                        let rsi = series.rsi.iter().rev().find_map(|v| *v);
                        let e20 = series.ema20.iter().rev().find_map(|v| *v);
                        let e50 = series.ema50.iter().rev().find_map(|v| *v);
                        this.status = format!(
                            "{} {}×{} · {}{}{}{}",
                            tape::label(&this.tape),
                            this.candles.len(),
                            this.bar,
                            this.focus,
                            e20.map(|v| format!(" · EMA20 {v:.2}")).unwrap_or_default(),
                            e50.map(|v| format!(" EMA50 {v:.2}")).unwrap_or_default(),
                            rsi.map(|r| format!(" · RSI {r:.1}")).unwrap_or_default()
                        )
                        .into();
                    } else if this.candles.len() <= 4 {
                        this.status = "not enough candles".into();
                    }
                    this.depth = pack.depth;
                    this.funding = pack.funding;
                }
                if this.pull_queued {
                    this.pull_queued = false;
                    this.request_pull(cx);
                }
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn ticker(&self) -> Option<&Ticker> {
        self.tickers.iter().find(|t| t.symbol == self.focus)
    }

    fn set_focus(&mut self, symbol: &str, cx: &mut Context<Self>) {
        if self.focus == symbol {
            return;
        }
        self.focus = symbol.into();
        self.has_more = true;
        self.status = format!("loading {}…", self.focus).into();
        self.schedule_pull(cx);
        cx.notify();
    }

    fn set_bar(&mut self, bar: &str, cx: &mut Context<Self>) {
        if self.bar == bar {
            return;
        }
        self.bar = bar.into();
        self.has_more = true;
        self.status = format!("loading {}…", self.bar).into();
        self.schedule_pull(cx);
        cx.notify();
    }

    fn set_tape(&mut self, source: &str, cx: &mut Context<Self>) {
        if self.tape == source {
            return;
        }
        self.tape = source.into();
        self.has_more = true;
        self.status = format!("loading {}…", tape::label(&self.tape)).into();
        self.schedule_pull(cx);
        cx.notify();
    }

    fn submit_prompt(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let text = self.prompt.read(cx).value().to_string();
        let text = text.trim().to_string();
        if text.is_empty() {
            return;
        }
        self.log.push(format!("you  {text}"));
        let ticker = self.ticker().cloned();
        let brief = crate::desk::brief(
            &text,
            &self.focus,
            ticker.as_ref(),
            &self.book,
            &mut self.memory,
        );
        self.log.push(brief.text.clone());
        if let (Some(side), Some(qty), Some(t)) = (brief.side, brief.qty, ticker) {
            match self.book.apply(&t.symbol, &side, qty, t.last) {
                Ok(realized) => {
                    if let Some(r) = realized {
                        crate::memory::record_loss(&mut self.memory, &t.symbol, "long", r);
                    }
                    self.log.push(format!("fill  {side} {qty} {} @ {:.2}", t.symbol, t.last));
                }
                Err(err) => self.log.push(format!("reject  {err}")),
            }
        }
        self.prompt.update(cx, |input, cx| {
            input.set_value("", window, cx);
        });
        if self.memory.cloud {
            if let (Some(dev), Some(lesson)) = (self.device.clone(), self.memory.lessons.first().cloned()) {
                let mem = self.memory.clone();
                cx.background_executor()
                    .spawn(async move {
                        mem.push_lesson(&dev.origin, &dev.owner_id, &dev.id, &lesson);
                    })
                    .detach();
            }
        }
        cx.notify();
    }

    fn trade(&mut self, side: &str, cx: &mut Context<Self>) {
        let Some(t) = self.ticker().cloned() else {
            self.log.push("no mark".into());
            cx.notify();
            return;
        };
        let qty: f64 = self.qty.parse().unwrap_or(0.0);
        match self.book.apply(&t.symbol, side, qty, t.last) {
            Ok(realized) => {
                if let Some(r) = realized {
                    crate::memory::record_loss(&mut self.memory, &t.symbol, "long", r);
                    self.log.push(format!("closed {:+.2}", r));
                } else {
                    self.log.push(format!("{side} {qty} {} @ {:.2}", t.symbol, t.last));
                }
            }
            Err(err) => self.log.push(err),
        }
        cx.notify();
    }

    fn pair(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let code = self.pair_input.read(cx).value().to_string();
        let origin = crate::pair::origin();
        self.status = "claiming…".into();
        self.pair_input.update(cx, |input, cx| input.set_value("", window, cx));
        cx.spawn(async move |this, cx| {
            let result = cx
                .background_executor()
                .spawn(async move { crate::pair::claim(&code, &origin) })
                .await;
            this.update(cx, |this, cx| {
                match result {
                    Ok(dev) => {
                        this.status = format!("paired {}", dev.name).into();
                        this.log.push(format!("paired as {} ({})", dev.name, dev.code));
                        let origin = dev.origin.clone();
                        let owner = dev.owner_id.clone();
                        let id = dev.id.clone();
                        this.device = Some(dev);
                        this.memory.pull_cloud(&origin, &owner, &id);
                        this.pull_wallet(cx);
                        if this.memory.cloud {
                            this.log.push(format!(
                                "cloud memory · {} · {} lessons",
                                this.memory.plan,
                                this.memory.lessons.len()
                            ));
                        } else {
                            this.log.push(
                                "Observer: memory stays on this box. Desk+ syncs the book.".into(),
                            );
                        }
                    }
                    Err(err) => {
                        this.status = format!("pair failed: {err}".into());
                        this.log.push(format!("pair  {err}"));
                    }
                }
                cx.notify();
            })
            .ok();
        })
        .detach();
        cx.notify();
    }

    fn pull_wallet(&mut self, cx: &mut Context<Self>) {
        let Some(dev) = self.device.clone() else { return };
        cx.spawn(async move |this, cx| {
            let snap = cx
                .background_executor()
                .spawn(async move {
                    crate::wallet::WalletSnap::pull(&dev.origin, &dev.owner_id, &dev.id)
                })
                .await;
            this.update(cx, |this, cx| {
                let was = this.wallet.minted;
                this.wallet = snap;
                if this.wallet.minted && !was {
                    this.log.push(format!(
                        "live wallet · ${:.2} · {} chain(s)",
                        this.wallet.live_usd,
                        this.wallet.wallets.len()
                    ));
                }
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    fn load_older(&mut self, cx: &mut Context<Self>) {
        if self.loading_older || !self.has_more || self.candles.is_empty() {
            return;
        }
        self.loading_older = true;
        let focus = self.focus.clone();
        let bar = self.bar.clone();
        let source = self.tape.clone();
        let before = self.candles.first().map(|c| c.t);
        cx.spawn(async move |this, cx| {
            let pack = cx
                .background_executor()
                .spawn(async move { tape::pull_before(&source, &focus, &bar, before) })
                .await;
            this.update(cx, |this, cx| {
                this.loading_older = false;
                if pack.candles.len() > 2 {
                    this.candles = tape::merge_candles(&this.candles, &pack.candles);
                    this.has_more = pack.candles.len() >= 40;
                    this.status = format!(
                        "history +{} · {} bars",
                        pack.candles.len(),
                        this.candles.len()
                    )
                    .into();
                } else {
                    this.has_more = false;
                    this.status = "history start".into();
                }
                cx.notify();
            })
            .ok();
        })
        .detach();
        cx.notify();
    }

    fn toggle_path(&mut self, cx: &mut Context<Self>) {
        self.local_only = !self.local_only;
        self.log.push(if self.local_only {
            "Path: local agent. This box. No relay.".into()
        } else {
            "Path: fleet. Pair a code to sit in the vault and sync memory.".into()
        });
        cx.notify();
    }
}

include!("desk_render_a.inc.rs");
include!("desk_render_b.inc.rs");
