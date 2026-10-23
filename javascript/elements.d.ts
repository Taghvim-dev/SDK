import type {WidgetKind} from "./widgets.js";
export declare const WIDGET_EXAMPLES: Readonly<Record<string,Record<string,unknown>>>;
export declare const LIVE_WIDGET_KINDS: readonly WidgetKind[];
export declare const BLOCKED_WIDGET_KINDS: readonly WidgetKind[];
export interface TaghvimWidgetElementRegistration {
 registry?: CustomElementRegistry;
 Element?: typeof HTMLElement;
 clientFactory?: (options?:{endpoint?:string})=>{
   invoke:(kind:WidgetKind,input?:Record<string,unknown>,options?:{idempotencyKey?:string;signal?:AbortSignal})=>Promise<{
     data:unknown;requestId?:string|null
   }>
 };
 name?:string;
}
export declare function registerTaghvimWidgets(options?:TaghvimWidgetElementRegistration):typeof HTMLElement;
