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
            div().flex().gap_1().children(crate::indicators::INDICATOR_IDS.iter().map(|id| {
                let key = (*id).to_string();
                let active = desk.active_indicators.iter().any(|x| x == *id);
                Button::new(SharedString::from(format!("ind-{id}")))
                    .label(*id)
                    .small()
                    .selected(active)
                    .on_click(cx.listener(move |this, _, _, cx| this.toggle_indicator(&key, cx)))
            })),
        )
        .child(
            div()
                .flex()
                .items_center()
                .gap_2()
                .child(
                    div()
                        .text_xs()
                        .text_color(cx.theme().muted_foreground)
                        .child(tape::hint(&desk.tape)),
                )
                .child(
                    Button::new("older")
                        .label(if desk.loading_older {
                            "…"
                        } else if desk.has_more {
                            "Older"
                        } else {
                            "Start"
                        })
                        .small()
                        .disabled(!desk.has_more || desk.loading_older)
                        .on_click(cx.listener(|this, _, _, cx| this.load_older(cx))),
                ),
        )
}
