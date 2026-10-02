import { invoke } from "@tauri-apps/api/core";
import type { ApiRequest, ApiResponse } from "./types";

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export async function sendApiRequest(request: ApiRequest): Promise<ApiResponse> {
  if (isTauriRuntime()) {
    return invoke<ApiResponse>("send_request", { request });
  }

  const started = performance.now();
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });
  const body = await response.text();
  const headers = Object.fromEntries(response.headers.entries());

  return {
    status: response.status,
    status_text: response.statusText,
    headers,
    body,
    elapsed_ms: Math.round(performance.now() - started),
    size_bytes: new TextEncoder().encode(body).length,
    url: response.url,
    content_type: response.headers.get("content-type") ?? "",
  };
}
