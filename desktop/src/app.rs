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
                        let tip = series.rsi.last().and_then(|v| *v);
                        this.status = format!(
                            "{} {} × {} · {}{}",
                            tape::label(&this.tape),
                            this.candles.len(),
                            this.bar,
                            this.focus,
                            tip.map(|r| format!(" · RSI {r:.1}")).unwrap_or_default()
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
        self.status = format!("loading {}…", self.focus).into();
        self.schedule_pull(cx);
        cx.notify();
    }

    fn set_bar(&mut self, bar: &str, cx: &mut Context<Self>) {
        if self.bar == bar {
            return;
        }
        self.bar = bar.into();
        self.status = format!("loading {}…", self.bar).into();
        self.schedule_pull(cx);
        cx.notify();
    }

    fn set_tape(&mut self, source: &str, cx: &mut Context<Self>) {
        if self.tape == source {
            return;
        }
        self.tape = source.into();
        self.status = format!("loading {}…", tape::label(&self.tape)).into();
        self.schedule_pull(cx);
        cx.notify();
    }

    // REST OF FILE CONTINUES IN NEXT COMMIT - see app_render.rs
    fn stub_rest(&self) {}
}
