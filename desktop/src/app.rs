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
                cx.background_executor()
                    .timer(Duration::from_secs(8))
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
                        this.candles = pack.candles;
                        this.status = format!(
                            "{} {} × {} · {}",
                            tape::label(&this.tape),
                            this.candles.len(),
                            this.bar,
                            this.focus
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
                        this.status = format!("pair failed: {err}").into();
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

impl Render for Desk {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let theme = cx.theme().clone();
        let mark = self.ticker().cloned();
        let equity = self.book.equity(
            &self
                .tickers
                .iter()
                .map(|t| (t.symbol.clone(), t.last))
                .collect::<Vec<_>>(),
        );
        let candles = self.candles.clone();
        let bar = self.bar.clone();
        let log = self.log.iter().rev().take(12).rev().cloned().collect::<Vec<_>>();
        let lessons: Vec<_> = self
            .memory
            .lessons
            .iter()
            .filter(|l| l.live)
            .take(4)
            .cloned()
            .collect();

        div()
            .bg(theme.background)
            .text_color(theme.foreground)
            .size_full()
            .flex()
            .flex_col()
            .child(header(self, &mark, equity, cx))
            .child(
                div()
                    .flex()
                    .flex_1()
                    .min_h_0()
                    .child(market_rail(self, cx))
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .flex_1()
                            .min_w_0()
                            .px_3()
                            .py_2()
                            .gap_2()
                            .child(bar_row(self, cx))
                            .child(
                                div()
                                    .flex_1()
                                    .min_h(px(280.))
                                    .rounded_md()
                                    .border_1()
                                    .border_color(theme.border)
                                    .p_2()
                                    .child(if candles.len() > 4 {
                                        CandlestickChart::new(candles)
                                            .x(move |c| okx::label_time(c.t, &bar))
                                            .open(|c| c.o)
                                            .high(|c| c.h)
                                            .low(|c| c.l)
                                            .close(|c| c.c)
                                            .tick_margin(24)
                                            .into_any_element()
                                    } else {
                                        div()
                                            .size_full()
                                            .flex()
                                            .items_center()
                                            .justify_center()
                                            .text_color(theme.muted_foreground)
                                            .child("Waiting on tape…")
                                            .into_any_element()
                                    }),
                            )
                            .child(agent_pane(self, &log, window, cx)),
                    )
                    .child(ticket_rail(self, &mark, &lessons, window, cx)),
            )
    }
}

fn header(
    desk: &Desk,
    mark: &Option<Ticker>,
    equity: f64,
    cx: &mut Context<Desk>,
) -> impl IntoElement {
    let theme = cx.theme().clone();
    div()
        .flex()
        .items_center()
        .justify_between()
        .px_4()
        .py_2()
        .border_b_1()
        .border_color(theme.border)
        .child(
            div()
                .flex()
                .items_center()
                .gap_3()
                .child(
                    div()
                        .flex()
                        .items_center()
                        .gap_2()
                        .child(Icon::new(IconName::SquareTerminal).text_color(theme.primary))
                        .child(div().text_lg().font_semibold().child("Aether Desk")),
                )
                .child(
                    div()
                        .text_sm()
                        .text_color(theme.muted_foreground)
                        .child(desk.status.clone()),
                )
                .when_some(desk.funding, |this, rate| {
                    let color = if rate >= 0.0 { theme.success } else { theme.danger };
                    this.child(
                        div()
                            .font_family("monospace")
                            .text_sm()
                            .text_color(color)
                            .child(format!("fund {:+.4}%", rate * 100.0)),
                    )
                }),
        )
        .child(
            div()
                .flex()
                .items_center()
                .gap_4()
                .child(div().font_family("monospace").child(format!("paper  {equity:.0}")))
                .child(
                    div()
                        .font_family("monospace")
                        .text_color(theme.muted_foreground)
                        .child(if desk.wallet.minted {
                            format!("live  {:.0}", desk.wallet.live_usd)
                        } else {
                            "live  —".into()
                        }),
                )
                .when_some(mark.clone(), |this, t| {
                    let color = if t.change24h >= 0.0 {
                        theme.success
                    } else {
                        theme.danger
                    };
                    this.child(
                        div()
                            .font_family("monospace")
                            .text_color(color)
                            .child(format!("{}  {:.2}  {:+.2}%", t.symbol, t.last, t.change24h)),
                    )
                })
                .child(
                    Button::new("kill")
                        .label(if desk.book.kill { "Kill on" } else { "Kill" })
                        .small()
                        .on_click(cx.listener(|this, _, _, cx| {
                            this.book.kill = !this.book.kill;
                            cx.notify();
                        })),
                ),
        )
}

fn market_rail(desk: &Desk, cx: &mut Context<Desk>) -> impl IntoElement {
    let theme = cx.theme().clone();
    div()
        .w(px(220.))
        .border_r_1()
        .border_color(theme.border)
        .flex()
        .flex_col()
        .child(
            div()
                .px_3()
                .py_2()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(format!("MARKETS · {}", tape::label(&desk.tape))),
        )
        .children(desk.tickers.iter().map(|t| {
            let symbol = t.symbol.clone();
            let active = desk.focus == t.symbol;
            let color = if t.change24h >= 0.0 {
                theme.success
            } else {
                theme.danger
            };
            div()
                .id(SharedString::from(format!("m-{symbol}")))
                .px_3()
                .py_2()
                .cursor_pointer()
                .bg(if active { theme.secondary } else { theme.background })
                .hover(|s| s.bg(theme.secondary))
                .on_click(cx.listener(move |this, _, _, cx| this.set_focus(&symbol, cx)))
                .flex()
                .justify_between()
                .child(div().child(t.symbol.clone()))
                .child(
                    div()
                        .font_family("monospace")
                        .text_color(color)
                        .child(format!("{:+.2}%", t.change24h)),
                )
        }))
}

fn bar_row(desk: &Desk, cx: &mut Context<Desk>) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .gap_1()
        .child(
            div().flex().gap_1().children(tape::TAPES.iter().map(|s| {
                let source = (*s).to_string();
                let active = desk.tape == *s;
                Button::new(SharedString::from(format!("tape-{s}")))
                    .label(tape::label(s))
                    .small()
                    .selected(active)
                    .on_click(cx.listener(move |this, _, _, cx| this.set_tape(&source, cx)))
            })),
        )
        .child(
            div().flex().gap_1().children(tape::BARS.iter().map(|b| {
                let bar = (*b).to_string();
                let active = desk.bar == *b;
                Button::new(SharedString::from(format!("bar-{b}")))
                    .label(*b)
                    .small()
                    .selected(active)
                    .on_click(cx.listener(move |this, _, _, cx| this.set_bar(&bar, cx)))
            })),
        )
        .child(
            div()
                .text_xs()
                .text_color(cx.theme().muted_foreground)
                .child(tape::hint(&desk.tape)),
        )
}

fn agent_pane(
    desk: &mut Desk,
    log: &[String],
    _window: &mut Window,
    cx: &mut Context<Desk>,
) -> impl IntoElement {
    let theme = cx.theme().clone();
    div()
        .h(px(220.))
        .flex()
        .flex_col()
        .border_1()
        .border_color(theme.border)
        .rounded_md()
        .child(
            div()
                .px_3()
                .py_1()
                .border_b_1()
                .border_color(theme.border)
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(if desk.local_only {
                    "AGENT · local · Desk Rules · no relay"
                } else {
                    "AGENT · fleet seat · pair to sync memory"
                }),
        )
        .child(
            div()
                .flex_1()
                .p_3()
                .gap_1()
                .flex()
                .flex_col()
                .overflow_hidden()
                .children(log.iter().map(|line| {
                    div()
                        .text_sm()
                        .text_color(theme.muted_foreground)
                        .child(line.clone())
                })),
        )
        .child(
            div()
                .flex()
                .gap_2()
                .p_2()
                .child(div().flex_1().child(Input::new(&desk.prompt)))
                .child(
                    Button::new("send")
                        .primary()
                        .label("Send")
                        .on_click(cx.listener(|this, _, window, cx| this.submit_prompt(window, cx))),
                ),
        )
}

fn ticket_rail(
    desk: &Desk,
    mark: &Option<Ticker>,
    lessons: &[crate::memory::Lesson],
    _window: &mut Window,
    cx: &mut Context<Desk>,
) -> impl IntoElement {
    let theme = cx.theme().clone();
    div()
        .w(px(280.))
        .border_l_1()
        .border_color(theme.border)
        .flex()
        .flex_col()
        .p_3()
        .gap_3()
        .child(div().text_xs().text_color(theme.muted_foreground).child("TICKET"))
        .child(
            div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(if desk.local_only {
                    "Local agent · this box"
                } else {
                    "Fleet · relay optional"
                }),
        )
        .child(
            Button::new("path")
                .label(if desk.local_only { "Use fleet path" } else { "Use local path" })
                .small()
                .on_click(cx.listener(|this, _, _, cx| this.toggle_path(cx))),
        )
        .child(
            div().flex().gap_2()
                .child(
                    Button::new("buy")
                        .primary()
                        .label("Buy")
                        .on_click(cx.listener(|this, _, _, cx| this.trade("buy", cx))),
                )
                .child(
                    Button::new("sell")
                        .danger()
                        .label("Sell")
                        .on_click(cx.listener(|this, _, _, cx| this.trade("sell", cx))),
                ),
        )
        .child(
            div()
                .text_sm()
                .font_family("monospace")
                .child(format!("qty {} · {}", desk.qty, mark.as_ref().map(|t| t.symbol.as_str()).unwrap_or("—"))),
        )
        .child(
            div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(format!("paper cash {:.0}", desk.book.cash)),
        )
        .child(div().text_xs().text_color(theme.muted_foreground).child("LIVE WALLET"))
        .children(if desk.wallet.minted {
            desk.wallet
                .wallets
                .iter()
                .map(|w| {
                    div()
                        .font_family("monospace")
                        .text_xs()
                        .child(format!(
                            "{} {}  {}  usdc {:.2}",
                            w.native_symbol,
                            crate::wallet::WalletSnap::short_addr(&w.address),
                            format!("{:.4}", w.native),
                            w.usdc
                        ))
                        .into_any_element()
                })
                .collect::<Vec<_>>()
        } else {
            vec![div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(if desk.device.is_some() {
                    "pair ok · mint on the web with Google"
                } else {
                    "pair to read the Google→Privy wallet"
                })
                .into_any_element()]
        })
        .child(div().text_xs().text_color(theme.muted_foreground).child("DEPTH"))
        .children(if desk.depth.asks.is_empty() && desk.depth.bids.is_empty() {
            vec![div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child("—")
                .into_any_element()]
        } else {
            let mut rows = vec![];
            for (px, sz) in desk.depth.asks.iter().rev().take(4) {
                rows.push(
                    div()
                        .font_family("monospace")
                        .text_xs()
                        .text_color(theme.danger)
                        .child(format!("{px:.2}  {sz:.3}"))
                        .into_any_element(),
                );
            }
            for (px, sz) in desk.depth.bids.iter().take(4) {
                rows.push(
                    div()
                        .font_family("monospace")
                        .text_xs()
                        .text_color(theme.success)
                        .child(format!("{px:.2}  {sz:.3}"))
                        .into_any_element(),
                );
            }
            rows
        })
        .children(desk.book.positions.iter().map(|p| {
            div()
                .text_sm()
                .font_family("monospace")
                .child(format!("{} {} {} @ {:.2}", p.side, p.qty, p.symbol, p.avg))
        }))
        .child(div().text_xs().text_color(theme.muted_foreground).child(
            if desk.memory.cloud {
                format!("MEMORY · cloud · {}", desk.memory.plan)
            } else {
                "MEMORY · local file".into()
            },
        ))
        .children(if lessons.is_empty() {
            vec![div().text_sm().text_color(theme.muted_foreground).child("empty — losses stick").into_any_element()]
        } else {
            lessons
                .iter()
                .map(|l| {
                    div()
                        .text_sm()
                        .child(format!("{}  {}", l.name, l.body))
                        .into_any_element()
                })
                .collect()
        })
        .child(div().flex_1())
        .child(div().text_xs().text_color(theme.muted_foreground).child(
            if desk.local_only { "IDENTITY (optional)" } else { "FLEET PAIR" },
        ))
        .child(Input::new(&desk.pair_input))
        .child(
            Button::new("pair")
                .label(if desk.device.is_some() { "Paired" } else { "Claim device code" })
                .on_click(cx.listener(|this, _, window, cx| this.pair(window, cx))),
        )
        .child(
            div()
                .text_xs()
                .text_color(theme.muted_foreground)
                .child(desk.device.as_ref().map(|d| d.code.clone()).unwrap_or_else(|| "offline".into())),
        )
}
