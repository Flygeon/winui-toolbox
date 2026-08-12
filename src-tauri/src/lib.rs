use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

/// 应用运行状态（跨命令共享）
struct AppState {
    minimize_to_tray: AtomicBool,
}

// ---------- 系统强调色 ----------

/// 读取 Windows 系统强调色（DWM AccentColor），返回 #RRGGBB。
/// 值存储在 HKCU\Software\Microsoft\Windows\DWM\AccentColor（0xAABBGGRR）。
#[tauri::command]
fn get_system_accent_color() -> Result<String, String> {
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let dwm = hkcu
        .open_subkey(r"Software\Microsoft\Windows\DWM")
        .map_err(|e| e.to_string())?;
    let color: u32 = dwm.get_value("AccentColor").map_err(|e| e.to_string())?;
    let r = color & 0xFF;
    let g = (color >> 8) & 0xFF;
    let b = (color >> 16) & 0xFF;
    Ok(format!("#{:02X}{:02X}{:02X}", r, g, b))
}

// ---------- FFmpeg ----------

/// 扫描 PATH 中的 ffmpeg.exe，返回第一个找到的路径。
#[tauri::command]
async fn find_ffmpeg_in_path() -> Option<String> {
    tauri::async_runtime::spawn_blocking(|| {
        let path = std::env::var_os("PATH")?;
        for dir in std::env::split_paths(&path) {
            let candidate = dir.join("ffmpeg.exe");
            if candidate.is_file() {
                return Some(candidate.to_string_lossy().into_owned());
            }
        }
        None
    })
    .await
    .ok()
    .flatten()
}

/// 校验指定路径的 ffmpeg，返回版本信息首行。
#[tauri::command]
async fn get_ffmpeg_version(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let out = std::process::Command::new(&path)
            .arg("-version")
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
        }
        let text = String::from_utf8_lossy(&out.stdout);
        Ok(text.lines().next().unwrap_or("").trim().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RunResult {
    code: i32,
    stderr: String,
}

/// 以指定 ffmpeg 运行给定参数，返回退出码与 stderr。
#[tauri::command]
async fn ffmpeg_run(ffmpeg_path: String, args: Vec<String>) -> Result<RunResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let out = std::process::Command::new(&ffmpeg_path)
            .args(&args)
            .output()
            .map_err(|e| e.to_string())?;
        Ok(RunResult {
            code: out.status.code().unwrap_or(-1),
            stderr: String::from_utf8_lossy(&out.stderr).to_string(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- 最小化到托盘 ----------

#[tauri::command]
fn set_minimize_to_tray(enabled: bool, app: tauri::AppHandle) {
    let state = app.state::<AppState>();
    state.minimize_to_tray.store(enabled, Ordering::Relaxed);
}

// ---------- 托盘 ----------

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().expect("缺少默认图标").clone())
        .tooltip("WinUI 工具箱")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { .. } = event {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            minimize_to_tray: AtomicBool::new(true),
        })
        .invoke_handler(tauri::generate_handler![
            get_system_accent_color,
            find_ffmpeg_in_path,
            get_ffmpeg_version,
            ffmpeg_run,
            set_minimize_to_tray,
        ])
        .setup(|app| {
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if state.minimize_to_tray.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
