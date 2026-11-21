/** Public preview. Requires a separately issued key and active API access. */
export interface RequestOptions { signal?: AbortSignal; idempotencyKey?: string; workspaceId?: string; query?: Record<string,string|number|boolean|null|undefined>; }
export interface ApiResponse<T=unknown>{data:T;status:number;requestId:string|null;rateLimit:string|null;}
export class TaghvimApiError extends Error {status:number;code:string;requestId:string|null;retryAfter:string|null;problem:Record<string,unknown>|null;}
export class TaghvimClient {
 constructor(options?:{apiKey?:string;baseUrl?:string;fetch?:typeof fetch;mode?:"test"|"live"});
 request(method:"GET"|"POST"|"PATCH"|"DELETE",path:string,options?:RequestOptions&{body?:unknown;auth?:boolean}):Promise<ApiResponse>;
 health(options?:RequestOptions):Promise<ApiResponse>;
 readiness(options?:RequestOptions):Promise<ApiResponse>;
 versions(options?:RequestOptions):Promise<ApiResponse>;
 me(options?:RequestOptions):Promise<ApiResponse>;
 convertDate(body:{date:string},options?:RequestOptions):Promise<ApiResponse>;
 reconcileDates(body:{left:{date:string;calendar_system:"jalali"|"gregorian"|"hijri"};right:{date:string;calendar_system:"jalali"|"gregorian"|"hijri"}},options?:RequestOptions):Promise<ApiResponse>;
 resolveDate(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 addBusinessDays(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 diffBusinessDays(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 isBusinessDay(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 holidays(query?:Record<string,unknown>,options?:RequestOptions):Promise<ApiResponse>;
 deadline(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 reminderPreview(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 schedulePreview(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 usage(options?:RequestOptions):Promise<ApiResponse>;
 subscription(options?:RequestOptions):Promise<ApiResponse>;
 listKeys(options?:RequestOptions):Promise<ApiResponse>;
 createKey(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 revokeKey(id:string,options?:RequestOptions):Promise<ApiResponse>;
 listWebhooks(options?:RequestOptions):Promise<ApiResponse>;
 createWebhook(body:unknown,options?:RequestOptions):Promise<ApiResponse>;
 webhookDeliveries(id:string,options?:RequestOptions):Promise<ApiResponse>;
 getCurrentWorkspace(options?:RequestOptions):Promise<ApiResponse>;
 createWorkspace(body:{kind:string},options:RequestOptions&{idempotencyKey:string}):Promise<ApiResponse>;
 getWorkspace(id:string,options?:RequestOptions):Promise<ApiResponse>;
 createCalendarEvent(calendarId:string,body:Record<string,unknown>,options:RequestOptions&{idempotencyKey:string}):Promise<ApiResponse>;
 updateCalendarEvent(calendarId:string,eventId:string,body:Record<string,unknown>,options:RequestOptions&{idempotencyKey:string}):Promise<ApiResponse>;
 listCalendarEvents(calendarId:string,options?:RequestOptions):Promise<ApiResponse>;
 listPublicCalendarEvents(calendarId:string,options?:RequestOptions):Promise<ApiResponse>;
 subscribeCalendar(calendarId:string,options:RequestOptions&{idempotencyKey:string}):Promise<ApiResponse>;
 setCalendarNotificationPreferences(calendarId:string,body:{expected_version:number;enabled:boolean;channels:string[]},options:RequestOptions&{idempotencyKey:string}):Promise<ApiResponse>;
 createCalendar(graph:Record<string,unknown>,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 getCalendar(id:string,options?:RequestOptions):Promise<ApiResponse>;
 updateCalendar(id:string,graph:Record<string,unknown>,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 publishCalendar(id:string,expectedVersion:number,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 unpublishCalendar(id:string,expectedVersion:number,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 publicCalendar(id:string,options?:RequestOptions):Promise<ApiResponse>;
 publicCalendarIcs(id:string,options?:RequestOptions):Promise<ApiResponse<string>>;
 searchPublicCalendarEvents(query?:Record<string,string|number|undefined>,options?:RequestOptions):Promise<ApiResponse>;
}
export function createTestClient(options:{apiKey:string;baseUrl?:string;fetch?:typeof fetch}):TaghvimClient;
