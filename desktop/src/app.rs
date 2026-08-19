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

pub struct Desk {
    focus: String,
    bar: String,
    tickers: Vec<Ticker>,
    candles: Vec<Candle>,
    book: Book,
    memory: Memory,
    device: Option<Device>,
    log: Vec<String>,
    status: SharedString,
    prompt: Entity<InputState>,
    pair_input: Entity<InputState>,
    qty: String,
    tape_error: Option<String>,
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
            tickers: vec![],
            candles: vec![],
            book: Book::default(),
            memory: Memory::load(),
            device: Device::load(),
            log: vec!["Aether Desk. GPUI native. Same tape as the web harness.".into()],
            status: "pulling OKX…".into(),
            prompt,
            pair_input,
            qty: "0.01".into(),
            tape_error: None,
            _focus: cx.focus_handle(),
        };
        desk.pull();
        desk.arm_timer(cx);
        desk
    }

    fn arm_timer(&self, cx: &mut Context<Self>) {
        cx.spawn(async move |this, cx| {
            loop {
                cx.background_executor()
                    .timer(Duration::from_secs(8))
                    .await;
                this.update(cx, |this, cx| {
                    this.pull();
                    if let Some(dev) = this.device.clone() {
                        cx.background_executor()
                            .spawn(async move {
                                crate::pair::heartbeat(&dev);
                            })
                            .detach();
                    }
                    cx.notify();
                })
                .ok();
            }
        })
        .detach();
    }

    fn pull(&mut self) {
        match okx::tickers() {
            Ok(rows) if !rows.is_empty() => {
                self.tickers = rows;
                self.tape_error = None;
            }
            Ok(_) => self.tape_error = Some("OKX returned no tickers".into()),
            Err(err) => self.tape_error = Some(err.to_string()),
        }
        let limit = if self.bar == "1s" || self.bar == "1m" { 200 } else { 120 };
        match okx::candles(&self.focus, &self.bar, limit) {
            Ok(rows) if rows.len() > 4 => {
                self.candles = rows;
                self.status = format!(
                    "OKX {} × {} · {}",
                    self.candles.len(),
                    self.bar,
                    self.focus
                )
                .into();
            }
            Ok(_) => self.status = "not enough candles".into(),
            Err(err) => self.status = format!("candles: {err}").into(),
        }
    }

    fn ticker(&self) -> Option<&Ticker> {
        self.tickers.iter().find(|t| t.symbol == self.focus)
    }

    fn set_focus(&mut self, symbol: &str, cx: &mut Context<Self>) {
        self.focus = symbol.into();
        self.pull();
        cx.notify();
    }

    fn set_bar(&mut self, bar: &str, cx: &mut Context<Self>) {
        self.bar = bar.into();
        self.pull();
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
        match crate::pair::claim(&code, &crate::pair::origin()) {
            Ok(dev) => {
                self.status = format!("paired {}", dev.name).into();
                self.log.push(format!("paired as {} ({})", dev.name, dev.code));
                self.device = Some(dev);
            }
            Err(err) => {
                self.status = format!("pair failed: {err}").into();
                self.log.push(format!("pair  {err}"));
            }
        }
        self.pair_input.update(cx, |input, cx| input.set_value("", window, cx));
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
                                            .child("Waiting on OKX candles…")
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
                ),
        )
        .child(
            div()
                .flex()
                .items_center()
                .gap_4()
                .child(div().font_family("monospace").child(format!("eq  {equity:.0}")))
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
                .child("MARKETS · OKX"),
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
    div().flex().gap_1().children(okx::BARS.iter().map(|b| {
        let bar = (*b).to_string();
        let active = desk.bar == *b;
        Button::new(SharedString::from(format!("bar-{b}")))
            .label(*b)
            .small()
            .selected(active)
            .on_click(cx.listener(move |this, _, _, cx| this.set_bar(&bar, cx)))
    }))
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
                .child("AGENT · Desk Rules · load-bearing memory"),
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
                .child(format!("cash {:.0}", desk.book.cash)),
        )
        .children(desk.book.positions.iter().map(|p| {
            div()
                .text_sm()
                .font_family("monospace")
                .child(format!("{} {} {} @ {:.2}", p.side, p.qty, p.symbol, p.avg))
        }))
        .child(div().text_xs().text_color(theme.muted_foreground).child("MEMORY"))
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
        .child(div().text_xs().text_color(theme.muted_foreground).child("FLEET PAIR"))
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
