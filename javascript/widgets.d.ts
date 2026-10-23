/** Preview: canonical Engine 2.1.0 widget operation bindings; unsupported widgets fail closed. */
export type WidgetKind =
 "date-picker" | "dual-calendar-badge" | "holiday-month" | "holiday-badge" |
 "business-day-badge" | "deadline-calculator" | "deadline-create" |
 "sla-calculator" | "reminder-preview" | "recurrence-builder" |
 "agent-schedule-preview" | "webhook-test" | "booking" | "availability" |
 "workflow-run" | "agent-execution";
export declare const WIDGET_OPERATIONS: Readonly<Record<WidgetKind,
 Readonly<{method:"GET"|"POST";path:string;sideEffect?:boolean}> | Readonly<{unavailable:string}>>>;
export declare class WidgetCapabilityError extends Error {code:"WIDGET_NOT_AVAILABLE";}
export interface WidgetResponse<T=unknown> {data:T;status:number;requestId:string|null;rateLimit:string|null;}
export interface WidgetTransport {request(method:"GET"|"POST",path:string,options?:{body?:unknown;query?:Record<string,unknown>;idempotencyKey?:string;signal?:AbortSignal}):Promise<WidgetResponse>;}
export declare function invokeWidget(client:WidgetTransport,kind:WidgetKind,input?:Record<string,unknown>,options?:{idempotencyKey?:string;signal?:AbortSignal}):Promise<WidgetResponse>;
export declare function createWidgetGateway(options:{
 client?:WidgetTransport;
 singleTenant?:boolean;
 clientForTenant?:(tenantId:string, actor:{tenantId:string})=>Promise<WidgetTransport>|WidgetTransport;
 authorize:(request:Request)=>Promise<{tenantId:string}|null>|{tenantId:string}|null;
 admit:(ctx:{request:Request;actor:unknown;widget:WidgetKind;operation:unknown})=>Promise<boolean>|boolean;
 allowedOrigins:string[];
}):(request:Request)=>Promise<Response>;
export declare function createBrowserWidgetClient(options?:{endpoint?:string;fetch?:typeof fetch}):Readonly<{
 invoke:(widget:WidgetKind,input?:Record<string,unknown>,options?:{idempotencyKey?:string;signal?:AbortSignal})=>Promise<WidgetResponse>
}>;
