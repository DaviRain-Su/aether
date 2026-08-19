mod app;
mod book;
mod desk;
mod memory;
mod okx;
mod pair;
mod tape;
mod indicators;
mod wallet;

use gpui::*;
use gpui_component::{Root, Theme, ThemeMode};

fn apply_aether(cx: &mut App) {
    Theme::change(ThemeMode::Dark, None, cx);
    let theme = Theme::global_mut(cx);
    theme.background = rgb(0x09090b).into();
    theme.foreground = rgb(0xf4f4f5).into();
    theme.border = rgb(0x26262b).into();
    theme.muted = rgb(0x111114).into();
    theme.muted_foreground = rgb(0xa1a1aa).into();
    theme.secondary = rgb(0x18181c).into();
    theme.secondary_foreground = rgb(0xf4f4f5).into();
    theme.primary = rgb(0xd4d4d8).into();
    theme.primary_foreground = rgb(0x09090b).into();
    theme.success = rgb(0x34d399).into();
    theme.danger = rgb(0xf87171).into();
    theme.bullish = rgb(0x34d399).into();
    theme.bearish = rgb(0xf87171).into();
    theme.sidebar = rgb(0x09090b).into();
    theme.radius = px(4.);
    theme.font_family = "IBM Plex Sans".into();
    theme.mono_font_family = "IBM Plex Mono".into();
}

fn main() {
    let app = Application::new();
    app.run(move |cx| {
        gpui_component::init(cx);
        apply_aether(cx);

        cx.spawn(async move |cx| {
            cx.open_window(WindowOptions::default(), |window, cx| {
                let view = cx.new(|cx| app::Desk::new(window, cx));
                cx.new(|cx| Root::new(view, window, cx))
            })?;
            Ok::<_, anyhow::Error>(())
        })
        .detach();
    });
}
