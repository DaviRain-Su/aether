use anyhow::Result;
use gpui::*;
use gpui_component::{Root, TitleBar};

mod app;
mod book;
mod desk;
mod indicators;
mod memory;
mod okx;
mod pair;
mod tape;
mod wallet;

fn main() -> Result<()> {
    let app = Application::new().with_assets(Assets);

    app.run(move |cx| {
        gpui_component::init(cx);
        cx.activate(true);

        cx.spawn(async move |cx| {
            cx.open_window(
                WindowOptions {
                    titlebar: Some(TitlebarOptions {
                        title: Some("Aether Desk".into()),
                        appears_transparent: true,
                        traffic_light_position: Some(point(px(9.), px(9.))),
                    }),
                    window_bounds: Some(WindowBounds::Windowed(Bounds::centered(
                        None,
                        size(px(1280.), px(800.)),
                        &cx,
                    ))),
                    ..Default::default()
                },
                |window, cx| {
                    let view = cx.new(|cx| app::Desk::new(window, cx));
                    cx.new(|cx| Root::new(view.into(), window, cx))
                },
            )
            .expect("open window");
        })
        .detach();
    });

    Ok(())
}

struct Assets;

impl AssetSource for Assets {
    fn load(&self, _path: &str) -> Result<Option<std::borrow::Cow<'static, [u8]>>> {
        Ok(None)
    }

    fn list(&self, _path: &str) -> Result<Vec<SharedString>> {
        Ok(vec![])
    }
}
