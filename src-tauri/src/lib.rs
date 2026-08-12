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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![get_system_accent_color])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
