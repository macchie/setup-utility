use tokio::net::TcpStream; // Use Tokio's non-blocking stream
use tokio::time::{timeout, Duration};
use futures::future::join_all;
use std::sync::Arc; // For sharing memory
use tokio::sync::Semaphore; // For limiting concurrency

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_network::init())
    .plugin(tauri_plugin_tcp::init())
    .invoke_handler(tauri::generate_handler![check_port])
    .invoke_handler(tauri::generate_handler![check_ports])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
async fn check_port(host: String, port: u16) -> bool {
    let addr = format!("{}:{}", host, port);
    
    // We set a timeout of 1 second (adjust as needed)
    // The 'await' keyword yields execution, allowing other parallel calls to run
    let result = timeout(Duration::from_secs(1), TcpStream::connect(addr)).await;

    // Logic:
    // 1. timeout() returns Ok if the task finished in time, Err if it timed out.
    // 2. If it finished, connect() returns Ok if TCP handshake succeeded.
    match result {
        Ok(connect_result) => connect_result.is_ok(),
        Err(_) => false, // Timed out
    }
}

#[tauri::command]
async fn check_ports(host: String, ports: Vec<u16>) -> Vec<u16> {
    // 1. Wrap host in Arc so we can share it without cloning the data
    let host_arc = Arc::new(host);
    
    // 2. Create a Semaphore to limit concurrent connections (e.g., 64 at a time)
    // This prevents "Too many open files" errors on Linux/macOS
    let semaphore = Arc::new(Semaphore::new(64));

    let tasks = ports.into_iter().map(|port| {
        let host_ref = Arc::clone(&host_arc);
        let sem_ref = Arc::clone(&semaphore);

        async move {
            // 3. Acquire a permit. If 64 are already active, this waits here.
            let _permit = sem_ref.acquire().await;
            
            let addr = format!("{}:{}", host_ref, port);
            
            // 4. Try connection
            let result = timeout(Duration::from_millis(800), TcpStream::connect(addr)).await;

            // _permit is dropped here automatically, letting the next task run
            match result {
                Ok(Ok(_)) => Some(port),
                _ => None,
            }
        }
    });

    let results = join_all(tasks).await;
    results.into_iter().flatten().collect()
}