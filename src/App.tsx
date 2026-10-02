import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Braces, CheckCircle2, Clock3, Code2, Copy, Eraser, History, Play, Plus, Save, Send, Settings, Square, TimerReset, Trash2 } from "lucide-react";
import { sendApiRequest } from "./api";
import { KeyValueEditor } from "./components/KeyValueEditor";
import { formatBody, validateJson, xmlToJson } from "./formatters";
import type { ApiResponse, HistoryEntry, HttpMethod, KeyValueRow } from "./types";
import packageInfo from "../package.json";

type RequestTab = "params" | "headers" | "auth" | "body" | "timer";
type ResponseTab = "body" | "headers";
type WorkspaceView = "request" | "history" | "monitors" | "settings";
type AuthType = "none" | "bearer" | "basic" | "api-key";
type BodyType = "none" | "json" | "xml" | "text" | "urlencoded";
interface AppSettings { historyLimit: number; defaultInterval: number; autoFormat: boolean }
interface SavedRequest { id: string; name: string; method: HttpMethod; url: string; params: KeyValueRow[]; headers: KeyValueRow[]; body: string; bodyType?: BodyType }

const DEFAULT_SETTINGS: AppSettings = { historyLimit: 50, defaultInterval: 30, autoFormat: true };
const emptyRow = (): KeyValueRow => ({ id: crypto.randomUUID(), enabled: true, key: "", value: "" });
const defaultHeaders = (): KeyValueRow[] => [{ ...emptyRow(), key: "Content-Type", value: "application/json" }];
const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
function readStorage<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; } }
function utf8Base64(value: string): string { return btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join("")); }
function validateXml(value: string): string | null {
  if (!value.trim()) return null;
  const document = new DOMParser().parseFromString(value, "application/xml");
  return document.querySelector("parsererror") ? "El XML no es válido." : null;
}
function contentTypeForBody(type: BodyType): string | null {
  return type === "json" ? "application/json" : type === "xml" ? "application/xml" : type === "urlencoded" ? "application/x-www-form-urlencoded" : type === "text" ? "text/plain" : null;
}

function App() {
  const [view, setView] = useState<WorkspaceView>("request");
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/todos/1");
  const [requestName, setRequestName] = useState("Nueva solicitud");
  const [requestTab, setRequestTab] = useState<RequestTab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [params, setParams] = useState<KeyValueRow[]>([emptyRow()]);
  const [headers, setHeaders] = useState<KeyValueRow[]>(defaultHeaders);
  const [body, setBody] = useState('{\n  "nombre": "API Studio"\n}');
  const [bodyType, setBodyType] = useState<BodyType>("json");
  const [authType, setAuthType] = useState<AuthType>("none");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyLocation, setApiKeyLocation] = useState<"header" | "query">("header");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [displayBody, setDisplayBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>(() => readStorage("api-studio-history", []));
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(() => readStorage("api-studio-saved", []));
  const [settings, setSettings] = useState<AppSettings>(() => ({ ...DEFAULT_SETTINGS, ...readStorage("api-studio-settings", {}) }));
  const [intervalSeconds, setIntervalSeconds] = useState(() => settings.defaultInterval);
  const [timerRunning, setTimerRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const timerId = useRef<number | null>(null);
  const requestActive = useRef(false);

  const requestUrl = useMemo(() => {
    try { const parsed = new URL(url); params.filter((row) => row.enabled && row.key).forEach((row) => parsed.searchParams.set(row.key, row.value)); return parsed.toString(); }
    catch { return url; }
  }, [url, params]);
  const finalUrl = useMemo(() => {
    if (authType !== "api-key" || apiKeyLocation !== "query" || !apiKeyName) return requestUrl;
    try { const parsed = new URL(requestUrl); parsed.searchParams.set(apiKeyName, apiKeyValue); return parsed.toString(); }
    catch { return requestUrl; }
  }, [apiKeyLocation, apiKeyName, apiKeyValue, authType, requestUrl]);
  const bodyError = method === "GET" || method === "HEAD" || bodyType === "none" ? null : bodyType === "json" ? validateJson(body) : bodyType === "xml" ? validateXml(body) : null;
  const lastMonitorRun = history.find((item) => item.url === requestUrl);

  useEffect(() => { localStorage.setItem("api-studio-history", JSON.stringify(history.slice(0, settings.historyLimit))); }, [history, settings.historyLimit]);
  useEffect(() => { localStorage.setItem("api-studio-saved", JSON.stringify(savedRequests)); }, [savedRequests]);
  useEffect(() => { localStorage.setItem("api-studio-settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if (!notice) return; const id = window.setTimeout(() => setNotice(""), 2500); return () => window.clearTimeout(id); }, [notice]);
  useEffect(() => {
    const managedValues = new Set(["application/json", "application/xml", "application/x-www-form-urlencoded", "text/plain"]);
    const nextValue = contentTypeForBody(bodyType);
    setHeaders((current) => {
      const index = current.findIndex((row) => row.key.toLowerCase() === "content-type" && managedValues.has(row.value));
      if (index < 0) return nextValue ? [...current, { ...emptyRow(), key: "Content-Type", value: nextValue }] : current;
      if (!nextValue) return current.filter((_, rowIndex) => rowIndex !== index);
      if (current[index].value === nextValue) return current;
      return current.map((row, rowIndex) => rowIndex === index ? { ...row, value: nextValue } : row);
    });
  }, [bodyType]);

  const execute = useCallback(async () => {
    if (!url.trim() || requestActive.current) return;
    if (bodyError) { setError(`Corrige el cuerpo antes de enviarlo: ${bodyError}`); setRequestTab("body"); setView("request"); return; }
    requestActive.current = true; setLoading(true); setError("");
    try {
      const headerMap = Object.fromEntries(headers.filter((row) => row.enabled && row.key).map((row) => [row.key, row.value]));
      if (bodyType !== "none" && !Object.keys(headerMap).some((key) => key.toLowerCase() === "content-type")) {
        headerMap["Content-Type"] = contentTypeForBody(bodyType) ?? "application/octet-stream";
      }
      if (authType === "bearer" && bearerToken) headerMap.Authorization = `Bearer ${bearerToken}`;
      if (authType === "basic") headerMap.Authorization = `Basic ${utf8Base64(`${basicUsername}:${basicPassword}`)}`;
      if (authType === "api-key" && apiKeyLocation === "header" && apiKeyName) headerMap[apiKeyName] = apiKeyValue;
      const result = await sendApiRequest({ method, url: finalUrl, headers: headerMap, body: bodyType === "none" ? undefined : body });
      setResponse(result); setDisplayBody(settings.autoFormat ? formatBody(result.body, result.content_type) : result.body);
      setHistory((current) => [{ id: crypto.randomUUID(), method, url: requestUrl, status: result.status, elapsedMs: result.elapsed_ms, createdAt: new Date().toISOString() }, ...current].slice(0, settings.historyLimit));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setHistory((current) => [{ id: crypto.randomUUID(), method, url: requestUrl, status: null, elapsedMs: null, createdAt: new Date().toISOString() }, ...current].slice(0, settings.historyLimit));
    } finally { requestActive.current = false; setLoading(false); }
  }, [apiKeyLocation, apiKeyName, apiKeyValue, authType, basicPassword, basicUsername, bearerToken, body, bodyError, bodyType, finalUrl, headers, method, requestUrl, settings.autoFormat, settings.historyLimit, url]);

  useEffect(() => {
    if (!timerRunning) { if (timerId.current) window.clearInterval(timerId.current); timerId.current = null; return; }
    void execute(); timerId.current = window.setInterval(() => void execute(), Math.max(intervalSeconds, 2) * 1000);
    return () => { if (timerId.current) window.clearInterval(timerId.current); };
  }, [execute, intervalSeconds, timerRunning]);

  const createNewRequest = () => {
    setTimerRunning(false); setMethod("GET"); setUrl(""); setRequestName("Nueva solicitud"); setParams([emptyRow()]); setHeaders(defaultHeaders());
    setBody("{\n  \n}"); setBodyType("json"); setAuthType("none"); setBearerToken(""); setBasicUsername(""); setBasicPassword(""); setApiKeyValue("");
    setResponse(null); setDisplayBody(""); setError(""); setIntervalSeconds(settings.defaultInterval); setRequestTab("params"); setView("request");
  };
  const openHistoryEntry = (item: HistoryEntry) => { setMethod(item.method); setUrl(item.url); setParams([emptyRow()]); setRequestName("Solicitud recuperada"); setResponse(null); setError(""); setView("request"); };
  const openSavedRequest = (item: SavedRequest) => { setMethod(item.method); setUrl(item.url); setRequestName(item.name); setParams(item.params); setHeaders(item.headers); setBody(item.body); setBodyType(item.bodyType ?? "json"); setAuthType("none"); setResponse(null); setError(""); setView("request"); };
  const saveRequest = () => {
    const proposed = requestName === "Nueva solicitud" ? `${method} ${url || "sin URL"}` : requestName;
    const name = window.prompt("Nombre de la solicitud", proposed)?.trim(); if (!name) return;
    const existing = savedRequests.find((item) => item.name === requestName && requestName !== "Nueva solicitud");
    const saved: SavedRequest = { id: existing?.id ?? crypto.randomUUID(), name, method, url, params, headers, body, bodyType };
    setSavedRequests((current) => existing ? current.map((item) => item.id === existing.id ? saved : item) : [saved, ...current]); setRequestName(name); setNotice("Solicitud guardada");
  };
  const convertXml = () => { if (!response) return; try { setDisplayBody(xmlToJson(response.body)); setError(""); } catch (reason) { setError(reason instanceof Error ? reason.message : String(reason)); } };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Code2 size={21} /></div><div><strong>API Studio</strong><span>Workspace local</span></div></div>
      <button className="new-request" onClick={createNewRequest}><Plus size={17} /> Nueva solicitud</button>
      <nav><div className="nav-title">ESPACIO DE TRABAJO</div>
        <button className={`nav-item ${view === "request" ? "active" : ""}`} onClick={() => setView("request")}><Braces size={17} /> Solicitud actual</button>
        <button className={`nav-item ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}><History size={17} /> Historial <span>{history.length}</span></button>
        <button className={`nav-item ${view === "monitors" ? "active" : ""}`} onClick={() => setView("monitors")}><Clock3 size={17} /> Monitores <span>{timerRunning ? 1 : 0}</span></button>
      </nav>
      <div className="history-list"><div className="nav-title">GUARDADAS</div>
        {!savedRequests.length && <div className="sidebar-empty">Aún no hay solicitudes</div>}
        {savedRequests.slice(0, 6).map((item) => <button key={item.id} className="history-item" onClick={() => openSavedRequest(item)}><span className={`method-mini ${item.method.toLowerCase()}`}>{item.method}</span><span className="history-url">{item.name}</span><span /></button>)}
        <div className="nav-title">RECIENTES</div>
        {history.slice(0, 6).map((item) => <button key={item.id} className="history-item" onClick={() => openHistoryEntry(item)}><span className={`method-mini ${item.method.toLowerCase()}`}>{item.method}</span><span className="history-url">{item.url}</span><span className={item.status && item.status < 400 ? "status-ok" : "status-bad"}>{item.status ?? "ERR"}</span></button>)}
      </div>
      <div className="sidebar-footer"><button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}><Settings size={16} /> Configuración</button><span>v{packageInfo.version}</span></div>
    </aside>

    <main className="workspace">
      {notice && <div className="toast"><CheckCircle2 size={16} /> {notice}</div>}
      {view === "request" && <RequestView requestName={requestName} method={method} setMethod={setMethod} url={url} setUrl={setUrl} execute={execute} loading={loading} saveRequest={saveRequest} requestTab={requestTab} setRequestTab={setRequestTab} params={params} setParams={setParams} headers={headers} setHeaders={setHeaders} body={body} setBody={setBody} bodyType={bodyType} setBodyType={setBodyType} bodyError={bodyError} authType={authType} setAuthType={setAuthType} bearerToken={bearerToken} setBearerToken={setBearerToken} basicUsername={basicUsername} setBasicUsername={setBasicUsername} basicPassword={basicPassword} setBasicPassword={setBasicPassword} apiKeyName={apiKeyName} setApiKeyName={setApiKeyName} apiKeyValue={apiKeyValue} setApiKeyValue={setApiKeyValue} apiKeyLocation={apiKeyLocation} setApiKeyLocation={setApiKeyLocation} timerRunning={timerRunning} intervalSeconds={intervalSeconds} setIntervalSeconds={setIntervalSeconds} setTimerRunning={setTimerRunning} response={response} responseTab={responseTab} setResponseTab={setResponseTab} error={error} displayBody={displayBody} convertXml={convertXml} />}

      {view === "history" && <WorkspacePage title="Historial" subtitle="Registro persistente de solicitudes ejecutadas" action={<button className="secondary-danger" disabled={!history.length} onClick={() => setHistory([])}><Trash2 size={15} /> Limpiar historial</button>}>
        {!history.length ? <EmptyPage icon={<History size={30} />} title="No hay solicitudes todavía" text="Las ejecuciones aparecerán aquí automáticamente." /> : <div className="data-table"><div className="data-row data-header"><span>Método</span><span>URL</span><span>Estado</span><span>Tiempo</span><span>Fecha</span><span /></div>{history.map((item) => <div className="data-row" key={item.id}><span className={`method-label ${item.method.toLowerCase()}`}>{item.method}</span><span className="table-url">{item.url}</span><span className={item.status && item.status < 400 ? "status-ok" : "status-bad"}>{item.status ?? "ERROR"}</span><span>{item.elapsedMs === null ? "—" : `${item.elapsedMs} ms`}</span><span>{new Date(item.createdAt).toLocaleString()}</span><button className="table-action" onClick={() => openHistoryEntry(item)}>Abrir</button></div>)}</div>}
      </WorkspacePage>}

      {view === "monitors" && <WorkspacePage title="Monitores" subtitle="Ejecuciones automáticas de la solicitud actual">
        <div className="monitor-card"><div className={`timer-icon ${timerRunning ? "running" : ""}`}><TimerReset size={26} /></div><div className="monitor-main"><div className="monitor-title"><h3>{method} {url || "Sin URL"}</h3><span className={timerRunning ? "monitor-live" : "monitor-stopped"}>{timerRunning ? "ACTIVO" : "DETENIDO"}</span></div><p>La solicitud se ejecuta sin superponer llamadas anteriores.</p><div className="monitor-stats"><span>Intervalo <strong>{intervalSeconds}s</strong></span><span>Último estado <strong>{lastMonitorRun?.status ?? "—"}</strong></span><span>Último tiempo <strong>{lastMonitorRun?.elapsedMs ? `${lastMonitorRun.elapsedMs} ms` : "—"}</strong></span></div></div><button disabled={!url.trim()} className={timerRunning ? "stop-button" : "start-button"} onClick={() => setTimerRunning((value) => !value)}>{timerRunning ? <Square size={15} /> : <Play size={15} />}{timerRunning ? "Detener" : "Iniciar"}</button></div>
        <div className="monitor-config"><label>Intervalo en segundos<input type="number" min="2" value={intervalSeconds} onChange={(event) => setIntervalSeconds(Math.max(2, Number(event.target.value)))} /></label><button className="outline-button" onClick={() => { setView("request"); setRequestTab("timer"); }}>Editar solicitud</button></div>
      </WorkspacePage>}

      {view === "settings" && <WorkspacePage title="Configuración" subtitle="Preferencias guardadas en este equipo">
        <div className="settings-card"><h3>Comportamiento</h3>
          <label className="setting-row"><span><strong>Formatear respuestas automáticamente</strong><small>Aplica indentación a las respuestas JSON recibidas.</small></span><input type="checkbox" checked={settings.autoFormat} onChange={(event) => setSettings((current) => ({ ...current, autoFormat: event.target.checked }))} /></label>
          <label className="setting-row"><span><strong>Límite del historial</strong><small>Número máximo de ejecuciones conservadas localmente.</small></span><input type="number" min="10" max="500" value={settings.historyLimit} onChange={(event) => setSettings((current) => ({ ...current, historyLimit: Math.max(10, Number(event.target.value)) }))} /></label>
          <label className="setting-row"><span><strong>Intervalo predeterminado</strong><small>Valor inicial para nuevos monitores.</small></span><div className="number-with-unit"><input type="number" min="2" value={settings.defaultInterval} onChange={(event) => setSettings((current) => ({ ...current, defaultInterval: Math.max(2, Number(event.target.value)) }))} /><span>segundos</span></div></label>
        </div>
        <div className="settings-card danger-zone"><h3>Datos locales</h3><p>Elimina historial, solicitudes guardadas y restaura las preferencias.</p><button className="secondary-danger" onClick={() => { if (window.confirm("¿Eliminar todos los datos locales de API Studio?")) { setHistory([]); setSavedRequests([]); setSettings(DEFAULT_SETTINGS); setIntervalSeconds(DEFAULT_SETTINGS.defaultInterval); setNotice("Datos locales eliminados"); } }}><Eraser size={15} /> Borrar datos locales</button></div>
      </WorkspacePage>}
    </main>
  </div>;
}

interface RequestViewProps {
  requestName: string; method: HttpMethod; setMethod: (value: HttpMethod) => void; url: string; setUrl: (value: string) => void; execute: () => Promise<void>; loading: boolean; saveRequest: () => void;
  requestTab: RequestTab; setRequestTab: (value: RequestTab) => void; params: KeyValueRow[]; setParams: (value: KeyValueRow[]) => void; headers: KeyValueRow[]; setHeaders: (value: KeyValueRow[]) => void;
  body: string; setBody: (value: string) => void; bodyType: BodyType; setBodyType: (value: BodyType) => void; bodyError: string | null;
  authType: AuthType; setAuthType: (value: AuthType) => void; bearerToken: string; setBearerToken: (value: string) => void; basicUsername: string; setBasicUsername: (value: string) => void; basicPassword: string; setBasicPassword: (value: string) => void; apiKeyName: string; setApiKeyName: (value: string) => void; apiKeyValue: string; setApiKeyValue: (value: string) => void; apiKeyLocation: "header" | "query"; setApiKeyLocation: (value: "header" | "query") => void;
  timerRunning: boolean; intervalSeconds: number; setIntervalSeconds: (value: number) => void; setTimerRunning: (updater: (value: boolean) => boolean) => void;
  response: ApiResponse | null; responseTab: ResponseTab; setResponseTab: (value: ResponseTab) => void; error: string; displayBody: string; convertXml: () => void;
}

function RequestView(props: RequestViewProps) {
  const { requestName, method, setMethod, url, setUrl, execute, loading, saveRequest, requestTab, setRequestTab, params, setParams, headers, setHeaders, body, setBody, bodyType, setBodyType, bodyError, authType, setAuthType, bearerToken, setBearerToken, basicUsername, setBasicUsername, basicPassword, setBasicPassword, apiKeyName, setApiKeyName, apiKeyValue, setApiKeyValue, apiKeyLocation, setApiKeyLocation, timerRunning, intervalSeconds, setIntervalSeconds, setTimerRunning, response, responseTab, setResponseTab, error, displayBody, convertXml } = props;
  return <><header className="topbar"><div><h1>{requestName}</h1><p>{requestName === "Nueva solicitud" ? "Sin guardar" : "Guardada localmente"}</p></div><button className="save-button" onClick={saveRequest}><Save size={14} /> Guardar</button></header>
    <section className="request-area"><div className="url-bar"><select value={method} onChange={(event) => setMethod(event.target.value as HttpMethod)} className={`method-select ${method.toLowerCase()}`}>{methods.map((item) => <option key={item}>{item}</option>)}</select><input aria-label="URL" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void execute(); }} placeholder="https://api.ejemplo.com/recurso" /><button className="send-button" onClick={() => void execute()} disabled={loading || !url.trim()}><Send size={17} /> {loading ? "Enviando…" : "Enviar"}</button></div>
      <div className="tabs">{(["params", "headers", "auth", "body", "timer"] as RequestTab[]).map((tab) => <button key={tab} className={requestTab === tab ? "active" : ""} onClick={() => setRequestTab(tab)}>{tab === "params" ? "Parámetros" : tab === "headers" ? "Headers" : tab === "auth" ? "Autenticación" : tab === "body" ? "Body" : "Temporizador"}{tab === "headers" && <span className="badge">{headers.filter((row) => row.enabled && row.key).length}</span>}</button>)}</div>
      <div className="request-panel">
        {requestTab === "params" && <KeyValueEditor rows={params} onChange={setParams} keyPlaceholder="page" valuePlaceholder="1" />}
        {requestTab === "headers" && <KeyValueEditor rows={headers} onChange={setHeaders} keyPlaceholder="Content-Type" valuePlaceholder="application/json" />}
        {requestTab === "auth" && <AuthEditor authType={authType} setAuthType={setAuthType} bearerToken={bearerToken} setBearerToken={setBearerToken} basicUsername={basicUsername} setBasicUsername={setBasicUsername} basicPassword={basicPassword} setBasicPassword={setBasicPassword} apiKeyName={apiKeyName} setApiKeyName={setApiKeyName} apiKeyValue={apiKeyValue} setApiKeyValue={setApiKeyValue} apiKeyLocation={apiKeyLocation} setApiKeyLocation={setApiKeyLocation} />}
        {requestTab === "body" && <BodyEditor body={body} setBody={setBody} bodyType={bodyType} setBodyType={setBodyType} bodyError={bodyError} />}
        {requestTab === "timer" && <TimerControls running={timerRunning} intervalSeconds={intervalSeconds} onIntervalChange={setIntervalSeconds} onToggle={() => setTimerRunning((value) => !value)} />}
      </div>
    </section>
    <section className="response-area"><div className="response-heading"><div className="tabs response-tabs"><button className={responseTab === "body" ? "active" : ""} onClick={() => setResponseTab("body")}>Respuesta</button><button className={responseTab === "headers" ? "active" : ""} onClick={() => setResponseTab("headers")}>Headers</button></div>{response && <div className="response-meta"><span className={response.status < 400 ? "pill success" : "pill failure"}>{response.status} {response.status_text}</span><span>{response.elapsed_ms} ms</span><span>{(response.size_bytes / 1024).toFixed(2)} KB</span></div>}</div>{error && <div className="error-banner">{error}</div>}{!response && !error ? <div className="empty-response"><div><Send size={30} /></div><h2>La respuesta aparecerá aquí</h2><p>Configura tu solicitud y presiona Enviar.</p></div> : response && <div className="response-content"><div className="response-toolbar"><span>{responseTab === "body" ? (response.content_type || "text/plain") : `${Object.keys(response.headers).length} headers`}</span><div>{responseTab === "body" && response.body.trim().startsWith("<") && <button onClick={convertXml}><Braces size={14} /> XML a JSON</button>}<button onClick={() => navigator.clipboard.writeText(responseTab === "body" ? displayBody : JSON.stringify(response.headers, null, 2))}><Copy size={14} /> Copiar</button></div></div><pre>{responseTab === "body" ? displayBody : JSON.stringify(response.headers, null, 2)}</pre></div>}</section>
  </>;
}

interface AuthEditorProps {
  authType: AuthType; setAuthType: (value: AuthType) => void; bearerToken: string; setBearerToken: (value: string) => void;
  basicUsername: string; setBasicUsername: (value: string) => void; basicPassword: string; setBasicPassword: (value: string) => void;
  apiKeyName: string; setApiKeyName: (value: string) => void; apiKeyValue: string; setApiKeyValue: (value: string) => void;
  apiKeyLocation: "header" | "query"; setApiKeyLocation: (value: "header" | "query") => void;
}
function AuthEditor(props: AuthEditorProps) {
  return <div className="auth-editor"><div className="auth-type"><label>Tipo de autenticación</label><select value={props.authType} onChange={(event) => props.setAuthType(event.target.value as AuthType)}><option value="none">Sin autenticación</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option><option value="api-key">API Key</option></select></div>
    {props.authType === "none" && <div className="auth-empty">Esta solicitud no enviará credenciales.</div>}
    {props.authType === "bearer" && <label className="field-group">Token<input type="password" value={props.bearerToken} onChange={(event) => props.setBearerToken(event.target.value)} placeholder="Token Bearer" /></label>}
    {props.authType === "basic" && <div className="auth-grid"><label className="field-group">Usuario<input value={props.basicUsername} onChange={(event) => props.setBasicUsername(event.target.value)} placeholder="usuario" /></label><label className="field-group">Contraseña<input type="password" value={props.basicPassword} onChange={(event) => props.setBasicPassword(event.target.value)} placeholder="contraseña" /></label></div>}
    {props.authType === "api-key" && <div className="auth-grid three"><label className="field-group">Nombre<input value={props.apiKeyName} onChange={(event) => props.setApiKeyName(event.target.value)} placeholder="X-API-Key" /></label><label className="field-group">Valor<input type="password" value={props.apiKeyValue} onChange={(event) => props.setApiKeyValue(event.target.value)} placeholder="API key" /></label><label className="field-group">Enviar en<select value={props.apiKeyLocation} onChange={(event) => props.setApiKeyLocation(event.target.value as "header" | "query")}><option value="header">Header</option><option value="query">Query parameter</option></select></label></div>}
    {props.authType !== "none" && <p className="secret-note">Las credenciales permanecen únicamente en memoria y no se guardan con la solicitud.</p>}
  </div>;
}

function BodyEditor({ body, setBody, bodyType, setBodyType, bodyError }: { body: string; setBody: (value: string) => void; bodyType: BodyType; setBodyType: (value: BodyType) => void; bodyError: string | null }) {
  const format = () => { if (bodyType === "json") { try { setBody(JSON.stringify(JSON.parse(body), null, 2)); } catch { return; } } };
  return <div className="body-editor"><div className="editor-toolbar"><div className="body-type-options">{(["none", "json", "xml", "text", "urlencoded"] as BodyType[]).map((type) => <button key={type} className={bodyType === type ? "selected" : ""} onClick={() => setBodyType(type)}>{type === "none" ? "Ninguno" : type === "urlencoded" ? "URL-encoded" : type.toUpperCase()}</button>)}</div>{bodyType === "json" && <button onClick={format}>Formatear</button>}</div>{bodyType === "none" ? <div className="no-body">Esta solicitud se enviará sin cuerpo.</div> : <textarea spellCheck={false} value={body} onChange={(event) => setBody(event.target.value)} placeholder={bodyType === "xml" ? "<mensaje>Hola</mensaje>" : bodyType === "urlencoded" ? "clave=valor&otra=valor" : "Contenido de la solicitud"} />}{bodyError && <div className="validation-error">{bodyError}</div>}</div>;
}

function TimerControls({ running, intervalSeconds, onIntervalChange, onToggle }: { running: boolean; intervalSeconds: number; onIntervalChange: (value: number) => void; onToggle: () => void }) { return <div className="timer-panel"><div className={`timer-icon ${running ? "running" : ""}`}><TimerReset size={25} /></div><div><h3>Ejecución automática</h3><p>Repite esta solicitud sin superponer ejecuciones.</p></div><label>Cada <input type="number" min="2" value={intervalSeconds} onChange={(event) => onIntervalChange(Math.max(2, Number(event.target.value)))} /> segundos</label><button className={running ? "stop-button" : "start-button"} onClick={onToggle}>{running ? <Square size={15} /> : <Play size={15} />}{running ? "Detener" : "Iniciar"}</button></div>; }
function WorkspacePage({ title, subtitle, action, children }: { title: string; subtitle: string; action?: ReactNode; children: ReactNode }) { return <><header className="topbar"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</header><section className="page-content">{children}</section></>; }
function EmptyPage({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="empty-page"><div>{icon}</div><h2>{title}</h2><p>{text}</p></div>; }
export default App;
