/** Public preview. Requires a separately issued key and active API access. */
/** Finance responses default-deny financial settlement until official rules are certified. */
export type FinanceBusinessDayRequest = {markets:string[];date:string;offset_business_days:number;convention?:"following"|"preceding"|"modified_following"|"modified_preceding"|"unadjusted";rail_id?:string;cutoff_time?:string};
export type FinanceBusinessDayResult = {status:"preview"|"verification_required"|"invalid_input";business_date:string|null;certified_for_financial_settlement:false;financial_decision_allowed:false;pack_version:string;problems?:string[];sources?:unknown[]};
export type FinanceCountryCatalog = {status:"preview";country_count:249;countries:Array<{country:string;markets:string[];financial_grade:false;verified_holiday_calendar:false}>;non_country_markets:unknown[];warning:string};
export interface RequestOptions { signal?: AbortSignal; idempotencyKey?: string; query?: Record<string,string|number|boolean|null|undefined>; workspaceId?: string; }
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
 listFinanceCountries(options?:RequestOptions):Promise<ApiResponse<FinanceCountryCatalog>>;
 quoteFinanceBusinessDay(body:FinanceBusinessDayRequest,options?:RequestOptions):Promise<ApiResponse<FinanceBusinessDayResult>>;
 getCurrentWorkspace(options?:RequestOptions):Promise<ApiResponse>;
 listCalendarPortfolio(query?:{scope?:"granted"|"selected";status?:"draft"|"published"|"unpublished"|"archived";sector_pack?:string;q?:string;limit?:number},options?:RequestOptions):Promise<ApiResponse<{scope:string;workspace_id:string;count:number;data:unknown[]}>>;
 createWorkspace(body:{kind:"organisation"|"partner"|"reseller"|"distributor"|"department"|"team"|"customer"|"agent"},options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 getWorkspace(id:string,options?:RequestOptions):Promise<ApiResponse>;
 createCalendarEvent(calendarId:string,body:{expected_version:number;entity:Record<string,unknown>;occurrences:unknown[]},options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 updateCalendarEvent(calendarId:string,eventId:string,body:{expected_version:number;entity:Record<string,unknown>;occurrences:unknown[]},options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 listCalendarEvents(calendarId:string,options?:RequestOptions):Promise<ApiResponse>;
 publicCalendarEvents(calendarId:string,options?:RequestOptions):Promise<ApiResponse>;
 subscribeCalendar(calendarId:string,body:{channel:"ics"},options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 setCalendarNotificationPreferences(calendarId:string,body:{expected_version:number;enabled:boolean;channels:("email"|"web_push")[]},options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 createCalendar(graph:Record<string,unknown>,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 getCalendar(id:string,options?:RequestOptions):Promise<ApiResponse>;
 updateCalendar(id:string,graph:Record<string,unknown>,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 publishCalendar(id:string,expectedVersion:number,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 unpublishCalendar(id:string,expectedVersion:number,options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse>;
 publicCalendar(id:string,options?:RequestOptions):Promise<ApiResponse>;
 publicCalendarIcs(id:string,options?:RequestOptions):Promise<ApiResponse<string>>;
 searchPublicCalendarEvents(query?:Record<string,string|number|undefined>,options?:RequestOptions):Promise<ApiResponse>;
 /** Request-only admission: Platform Superadmin approval is mandatory before any public activation. */
 requestHandle(body:{handle:string;kind:"calendar";calendar_id:string;purpose:string},options:RequestOptions & {idempotencyKey:string}):Promise<ApiResponse<{request_id:string;handle:string;status:"pending";version:number;approval:string}>>;
 discoverHandles(query?:{q?:string;kind?:"calendar";tag?:string;limit?:number},options?:RequestOptions):Promise<ApiResponse<{data:Array<{handle:string;kind:"calendar";calendar_id:string;labels:Record<string,string>;tags:string[];version:number}>;count:number}>>;
}
export function createTestClient(options:{apiKey:string;baseUrl?:string;fetch?:typeof fetch}):TaghvimClient;
