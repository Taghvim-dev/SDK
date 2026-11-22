/**
 * Taghvim.dev JavaScript API client (early-access preview).
 * No runtime dependencies. Node >= 20 or browsers with fetch.
 * Never put live keys in public browser bundles or logs.
 */
import {requireReconciliationPair} from "./reconciliation.js";
export {reconcileCalendarDates} from "./reconciliation.js";
const DEFAULT_BASE = "https://api.taghvim.dev";
export class TaghvimApiError extends Error {
  constructor(message, { status, code, requestId, problem, retryAfter } = {}) {
    super(message);
    this.name = "TaghvimApiError";
    this.status = status ?? 0;
    this.code = code ?? "unknown_error";
    this.requestId = requestId ?? null;
    this.problem = problem ?? null;
    this.retryAfter = retryAfter ?? null;
  }
}
function validateKey(key, mode) {
  if (key == null || key === "") return null;
  if (typeof key !== "string" || !/^tgv_(test|live)_[a-zA-Z0-9_-]+$/.test(key))
    throw new TypeError("Expected an authorized tgv_test_ or tgv_live_ key");
  if (mode === "test" && !key.startsWith("tgv_test_"))
    throw new TypeError("Test mode requires a tgv_test_ key");
  if (mode === "live" && !key.startsWith("tgv_live_"))
    throw new TypeError("Live mode requires a tgv_live_ key");
  return key;
}
function encodePart(part) { return encodeURIComponent(String(part)); }
export class TaghvimClient {
  constructor({ apiKey, baseUrl = DEFAULT_BASE, fetch: fetcher = (...args) => globalThis.fetch(...args), mode = "test" } = {}) {
    if (mode !== "test" && mode !== "live") throw new TypeError("mode must be test or live");
    this.apiKey = validateKey(apiKey, mode);
    this.mode = mode;
    if (typeof fetcher !== "function") throw new TypeError("fetch function is required");
    this.fetcher = fetcher;
    const base = new URL(baseUrl);
    if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash)
      throw new TypeError("Invalid API URL");
    if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname))
      throw new TypeError("Insecure API base URLs are only supported for local development");
    this.base = base.toString().replace(/\/$/, "");
  }
  async request(method, path, { body, query, idempotencyKey, signal, workspaceId, auth = true } = {}) {
    if (auth && !this.apiKey) throw new TypeError("An API key is required for this operation");
    if (!/^(GET|POST|PATCH|DELETE)$/.test(method) || typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") ||
      path.includes("?") || path.includes("#") || path.includes(".."))
      throw new TypeError("Invalid API method or path");
    if (idempotencyKey !== undefined && (typeof idempotencyKey !== "string" || idempotencyKey.length < 8 || idempotencyKey.length > 128))
      throw new TypeError("Idempotency key must be between 8 and 200 characters");
    if (method === "GET" && body !== undefined) throw new TypeError("GET requests cannot send a body");
    const url = new URL(this.base + path);
    for (const [k,v] of Object.entries(query || {})) if (v !== undefined && v !== null)
      url.searchParams.set(k, String(v));
    const headers = { "accept": "application/json" };
    if (auth) headers.authorization = "Bearer " + this.apiKey;
    if (body !== undefined) headers["content-type"] = "application/json";
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;
    if(workspaceId!==undefined){
      if(typeof workspaceId!=="string"||!/^[A-Za-z][A-Za-z0-9_:-]{3,127}$/.test(workspaceId))
        throw new TypeError("Invalid Workspace selector");
      headers["Taghvim-Workspace-Id"]=workspaceId;
    }
    const response = await this.fetcher(url.toString(), {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal,
    });
    const requestId = response.headers.get("Taghvim-Request-Id");
    const retryAfter = response.headers.get("Retry-After");
    const mediaType = response.headers.get("content-type") || "";
    const payload = response.status === 204 ? null : mediaType.includes("json")
      ? await response.json().catch(() => null) : await response.text().catch(() => "");
    if (!response.ok) {
      const problem = payload && typeof payload === "object" ? payload : null;
      throw new TaghvimApiError(problem?.detail || problem?.title || `API request failed (${response.status})`, {
        status: response.status, code: problem?.code || "http_error", problem, requestId, retryAfter,
      });
    }
    return { data: payload, status: response.status, requestId, rateLimit: response.headers.get("RateLimit") };
  }
  health(options) { return this.request("GET", "/v1/health", { ...options, auth: false }); }
  readiness(options) { return this.request("GET", "/v1/readiness", { ...options, auth: false }); }
  versions(options) { return this.request("GET", "/v1/versions", { ...options, auth: false }); }
  me(options) { return this.request("GET", "/v1/me", options); }
  convertDate(body, options) { return this.request("POST", "/v1/dates/convert", { ...options, body }); }
  /** Native, one-request, tenant-authenticated T0 reconciliation. No downgrade to two conversions. */
  reconcileDates(body, options) {
    return this.request("POST", "/v1/dates/reconcile", { ...options, body: requireReconciliationPair(body) });
  }
  resolveDate(body, options) { return this.request("POST", "/v1/dates/resolve", { ...options, body }); }
  addBusinessDays(body, options) { return this.request("POST", "/v1/business-days/add", { ...options, body }); }
  diffBusinessDays(body, options) { return this.request("POST", "/v1/business-days/diff", { ...options, body }); }
  isBusinessDay(body, options) { return this.request("POST", "/v1/business-days/is-business-day", { ...options, body }); }
  holidays(query, options) { return this.request("GET", "/v1/holidays", { ...options, query }); }
  deadline(body, options) { return this.request("POST", "/v1/deadlines", { ...options, body }); }
  reminderPreview(body, options) { return this.request("POST", "/v1/reminders/preview", { ...options, body }); }
  schedulePreview(body, options) { return this.request("POST", "/v1/schedules/preview", { ...options, body }); }
  usage(options) { return this.request("GET", "/v1/usage", options); }
  subscription(options) { return this.request("GET", "/v1/subscription", options); }
  listKeys(options) { return this.request("GET", "/v1/keys", options); }
  createKey(body, options) { return this.request("POST", "/v1/keys", { ...options, body }); }
  revokeKey(id, options) { return this.request("DELETE", "/v1/keys/" + encodePart(id), options); }
  listWebhooks(options) { return this.request("GET", "/v1/webhooks", options); }
  createWebhook(body, options) { return this.request("POST", "/v1/webhooks", { ...options, body }); }
  webhookDeliveries(id, options) { return this.request("GET", "/v1/webhooks/" + encodePart(id) + "/deliveries", options); }
  getCurrentWorkspace(options) { return this.request("GET", "/v1/workspaces/current", options); }
  /** Explicitly granted same-tenant Workspaces only; never traverse inherited permissions. */
  listCalendarPortfolio(query={},options={}) {
    return this.request("GET","/v1/portfolios/calendars",{...options,query});
  }
  /** All governed Workspace/event/ICS capabilities reuse request()'s exact actor, key and idempotency boundary. */
  createWorkspace(body, options={}) {
    if(!options.idempotencyKey)throw new TypeError("Workspace creation requires an Idempotency-Key");
    return this.request("POST","/v1/workspaces",{...options,body});
  }
  getWorkspace(id,options) {return this.request("GET","/v1/workspaces/"+encodePart(id),options);}
  createCalendarEvent(calendarId,body,options={}) {
    if(!options.idempotencyKey)throw new TypeError("Event creation requires an Idempotency-Key");
    return this.request("POST","/v1/calendars/"+encodePart(calendarId)+"/events",{...options,body});
  }
  updateCalendarEvent(calendarId,eventId,body,options={}) {
    if(!options.idempotencyKey)throw new TypeError("Event update requires an Idempotency-Key");
    return this.request("PATCH","/v1/calendars/"+encodePart(calendarId)+"/events/"+encodePart(eventId),{...options,body});
  }
  listCalendarEvents(calendarId,options) {
    return this.request("GET","/v1/calendars/"+encodePart(calendarId)+"/events",options);
  }
  publicCalendarEvents(calendarId,options) {
    return this.request("GET","/v1/public/calendars/"+encodePart(calendarId)+"/events",{...options,auth:false});
  }
  subscribeCalendar(calendarId,body={channel:"ics"},options={}) {
    if(!options.idempotencyKey)throw new TypeError("ICS subscription requires an Idempotency-Key");
    return this.request("POST","/v1/public/calendars/"+encodePart(calendarId)+"/subscriptions",{...options,body});
  }
  setCalendarNotificationPreferences(calendarId,body,options={}) {
    if(!options.idempotencyKey)throw new TypeError("Notification preference mutation requires an Idempotency-Key");
    return this.request("PATCH","/v1/calendars/"+encodePart(calendarId)+"/notification-preferences",{...options,body});
  }
  createCalendar(graph, options={}) {
    if (!options.idempotencyKey) throw new TypeError("Calendar creation requires an Idempotency-Key");
    return this.request("POST","/v1/calendars",{...options,body:graph});
  }
  getCalendar(id,options) { return this.request("GET","/v1/calendars/"+encodePart(id),options); }
  updateCalendar(id,graph,options={}) {
    if (!options.idempotencyKey) throw new TypeError("Updating a calendar requires an Idempotency-Key");
    return this.request("PATCH","/v1/calendars/"+encodePart(id),{...options,body:graph});
  }
  publishCalendar(id,expectedVersion,options={}) {
    if (!options.idempotencyKey) throw new TypeError("Publishing requires an Idempotency-Key");
    return this.request("POST","/v1/calendars/"+encodePart(id)+"/publish",
      {...options,body:{expected_version:expectedVersion}});
  }
  unpublishCalendar(id,expectedVersion,options={}) {
    if (!options.idempotencyKey) throw new TypeError("Unpublishing requires an Idempotency-Key");
    return this.request("POST","/v1/calendars/"+encodePart(id)+"/unpublish",
      {...options,body:{expected_version:expectedVersion}});
  }
  publicCalendar(id,options) {
    return this.request("GET","/v1/public/calendars/"+encodePart(id),{...options,auth:false});
  }
  publicCalendarIcs(id,options) {
    return this.request("GET","/v1/public/calendars/"+encodePart(id)+"/ics",{...options,auth:false});
  }
  searchPublicCalendarEvents(query={},options) {
    return this.request("GET","/v1/public/calendar-search",{...options,auth:false,query});
  }
  /** A request is not a handle reservation, entitlement, public listing, or activation. */
  requestHandle(body,options={}) {
    if(!options.idempotencyKey)throw new TypeError("Handle request requires an Idempotency-Key");
    return this.request("POST","/v1/handles/requests",{...options,body});
  }
  /** Public, read-only, published-source-gated discovery; no bearer credential. */
  discoverHandles(query={},options) {
    return this.request("GET","/v1/public/handles",{...options,auth:false,query});
  }
}
export function createTestClient(options) { return new TaghvimClient({ ...options, mode: "test" }); }
