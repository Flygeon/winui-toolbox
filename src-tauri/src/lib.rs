use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

mod image_ops;

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

// ---------- 端口占用 ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortInfo {
    protocol: String,
    local_address: String,
    remote_address: String,
    state: String,
    pid: i32,
}

/// 运行 netstat -ano 解析当前网络连接/监听端口。
#[tauri::command]
async fn list_ports() -> Result<Vec<PortInfo>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let out = std::process::Command::new("netstat").arg("-ano").output().map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&out.stdout);
        let mut ports = Vec::new();
        for line in text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.is_empty() {
                continue;
            }
            let proto = parts[0];
            if proto == "UDP" && parts.len() >= 4 {
                ports.push(PortInfo {
                    protocol: proto.to_string(),
                    local_address: parts[1].to_string(),
                    remote_address: parts[2].to_string(),
                    state: "UDP".to_string(),
                    pid: parts[3].parse().unwrap_or(-1),
                });
            } else if proto == "TCP" && parts.len() >= 5 {
                ports.push(PortInfo {
                    protocol: proto.to_string(),
                    local_address: parts[1].to_string(),
                    remote_address: parts[2].to_string(),
                    state: parts[3].to_string(),
                    pid: parts[4].parse().unwrap_or(-1),
                });
            }
        }
        Ok(ports)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 强杀指定 PID 进程（taskkill /F）。
#[tauri::command]
fn kill_process(pid: i32) -> Result<String, String> {
    let pid_str = pid.to_string();
    let out = std::process::Command::new("taskkill")
        .arg("/F")
        .arg("/PID")
        .arg(&pid_str)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(format!("已结束进程 {}", pid))
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

// ---------- 硬件监控 ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DiskInfo {
    mount: String,
    total: u64,
    available: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemStats {
    cpu: f32,
    mem_total: u64,
    mem_used: u64,
    swap_total: u64,
    swap_used: u64,
    uptime: u64,
    hostname: String,
    disks: Vec<DiskInfo>,
}

/// 获取 CPU / 内存 / 磁盘 / 运行时长等系统信息。
#[tauri::command]
async fn get_system_stats() -> Result<SystemStats, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let mut sys = sysinfo::System::new_all();
        sys.refresh_all();
        // sysinfo 0.30 通过 Disks::new_with_refreshed_list() 获取磁盘
        let disks = sysinfo::Disks::new_with_refreshed_list()
            .list()
            .iter()
            .map(|d| DiskInfo {
                mount: d.mount_point().to_string_lossy().to_string(),
                total: d.total_space(),
                available: d.available_space(),
            })
            .collect();
        Ok(SystemStats {
            cpu: sys.global_cpu_info().cpu_usage(),
            mem_total: sys.total_memory(),
            mem_used: sys.used_memory(),
            swap_total: sys.total_swap(),
            swap_used: sys.used_swap(),
            uptime: sysinfo::System::uptime(),
            hostname: sysinfo::System::host_name().unwrap_or_default(),
            disks,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ---------- 环境变量 ----------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvVar {
    name: String,
    value: String,
}

fn decode_reg_string(rv: &winreg::RegValue) -> Option<String> {
    use winreg::enums::RegType;
    if rv.vtype != RegType::REG_SZ && rv.vtype != RegType::REG_EXPAND_SZ {
        return None;
    }
    let mut u16s: Vec<u16> = rv
        .bytes
        .chunks_exact(2)
        .map(|c| u16::from_le_bytes([c[0], c[1]]))
        .collect();
    if let Some(pos) = u16s.iter().position(|&c| c == 0) {
        u16s.truncate(pos);
    }
    Some(String::from_utf16_lossy(&u16s))
}

/// 列出用户环境变量（HKCU\Environment）。
#[tauri::command]
fn list_user_env_vars() -> Vec<EnvVar> {
    let mut out = Vec::new();
    // winreg 0.52 的 predef 直接返回 RegKey（非 Result）
    let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    if let Ok(env) = hkcu.open_subkey("Environment") {
        for item in env.enum_values() {
            if let Ok((name, rv)) = item {
                if let Some(value) = decode_reg_string(&rv) {
                    out.push(EnvVar { name, value });
                }
            }
        }
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// 设置用户环境变量（通过 setx，会自动广播环境变更）。
#[tauri::command]
fn set_user_env_var(name: String, value: String) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    if name.is_empty() {
        return Err("变量名不能为空".to_string());
    }
    let out = std::process::Command::new("setx")
        .arg(&name)
        .arg(&value)
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
    }
}

/// 删除用户环境变量（reg delete；其他已运行程序需重启/重新登录后生效）。
#[tauri::command]
fn delete_user_env_var(name: String) -> Result<(), String> {
    use std::os::windows::process::CommandExt;
    let out = std::process::Command::new("reg")
        .arg("delete")
        .arg(r"HKCU\Environment")
        .arg("/v")
        .arg(&name)
        .arg("/f")
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| e.to_string())?;
    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).trim().to_string())
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
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(AppState {
            minimize_to_tray: AtomicBool::new(true),
        })
        .invoke_handler(tauri::generate_handler![
            get_system_accent_color,
            find_ffmpeg_in_path,
            get_ffmpeg_version,
            ffmpeg_run,
            set_minimize_to_tray,
            list_ports,
            kill_process,
            get_system_stats,
            list_user_env_vars,
            set_user_env_var,
            delete_user_env_var,
            image_ops::image_convert,
            image_ops::image_compress,
            image_ops::image_transform,
            image_ops::image_adjust,
            image_ops::exif_read,
            image_ops::exif_strip,
            image_ops::image_phash,
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
