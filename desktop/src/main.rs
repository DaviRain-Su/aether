mod app;
mod book;
mod desk;
mod memory;
mod okx;
mod pair;

use gpui::*;
use gpui_component::Root;

fn main() {
    let app = Application::new();
    app.run(move |cx| {
        gpui_component::init(cx);
        gpui_component::Theme::change(gpui_component::ThemeMode::Dark, None, cx);

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
