import type {WidgetKind, WidgetResponse} from "./widgets.js";
export declare const WIDGET_INPUTS:Readonly<Partial<Record<WidgetKind,ReadonlyArray<Readonly<{name:string;label:string;value:string;type?:"integer"|"text"|"json"}>>>>>;
export declare function registerTaghvimWidgets(options?:{
 registry?:CustomElementRegistry;
 HTMLElementType?:typeof HTMLElement;
 createClient?:(options:{endpoint?:string})=>{invoke:(widget:WidgetKind,input?:Record<string,unknown>,options?:{idempotencyKey?:string;signal?:AbortSignal})=>Promise<WidgetResponse>};
}):typeof HTMLElement;
