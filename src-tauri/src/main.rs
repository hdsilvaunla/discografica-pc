#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

#[tauri::command]
fn save_text_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<serde_json::Value>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in entries.flatten() {
        let meta = entry.metadata().ok();
        out.push(serde_json::json!({
            "name": entry.file_name().to_string_lossy(),
            "isFile": meta.as_ref().map(|m| m.is_file()).unwrap_or(false),
            "size": meta.as_ref().map(|m| m.len()).unwrap_or(0)
        }));
    }
    Ok(out)
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_text_file,
            read_text_file,
            list_dir,
            delete_path
        ])
        .run(tauri::generate_context!())
        .expect("error");
}
