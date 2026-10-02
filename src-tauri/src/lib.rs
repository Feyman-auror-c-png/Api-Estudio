use reqwest::{header::HeaderMap, Method};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, time::Instant};

#[derive(Debug, Deserialize)]
struct ApiRequest {
    method: String,
    url: String,
    headers: HashMap<String, String>,
    body: Option<String>,
}

#[derive(Debug, Serialize)]
struct ApiResponse {
    status: u16,
    status_text: String,
    headers: HashMap<String, String>,
    body: String,
    elapsed_ms: u128,
    size_bytes: usize,
    url: String,
    content_type: String,
}

#[tauri::command]
async fn send_request(request: ApiRequest) -> Result<ApiResponse, String> {
    let method = Method::from_bytes(request.method.as_bytes())
        .map_err(|error| format!("Método HTTP inválido: {error}"))?;
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|error| format!("No se pudo crear el cliente HTTP: {error}"))?;

    let mut builder = client.request(method.clone(), &request.url);
    for (name, value) in request.headers {
        builder = builder.header(&name, &value);
    }
    if method != Method::GET && method != Method::HEAD {
        if let Some(body) = request.body {
            builder = builder.body(body);
        }
    }

    let started = Instant::now();
    let response = builder.send().await.map_err(|error| format!("Error de conexión: {error}"))?;
    let elapsed_ms = started.elapsed().as_millis();
    let status = response.status();
    let final_url = response.url().to_string();
    let response_headers = response.headers().clone();
    let content_type = response_headers
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();
    let body = response.text().await.map_err(|error| format!("No se pudo leer la respuesta: {error}"))?;
    let size_bytes = body.len();

    Ok(ApiResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers: headers_to_map(&response_headers),
        body,
        elapsed_ms,
        size_bytes,
        url: final_url,
        content_type,
    })
}

fn headers_to_map(headers: &HeaderMap) -> HashMap<String, String> {
    headers
        .iter()
        .map(|(name, value)| (name.to_string(), value.to_str().unwrap_or("<valor binario>").to_string()))
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![send_request])
        .run(tauri::generate_context!())
        .expect("error al ejecutar API Studio");
}
