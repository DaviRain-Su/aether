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
