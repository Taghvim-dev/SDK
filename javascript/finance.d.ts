import type {ApiResponse,RequestOptions} from "./index.js";
export declare function createFinancialCalendarClient(options:{
 baseUrl:string;apiKey:string;mode?:"test"|"live";fetch?:typeof fetch
}):Readonly<{
 countries:(opts?:RequestOptions)=>Promise<ApiResponse>;
 holidays:(market:string,year:number,opts?:RequestOptions)=>Promise<ApiResponse<{
  status:"available_preview"|"source_unavailable"|"candidate_preview";
  holiday_count:number;holidays:Array<{date:string;name:string;type:"public_holiday"|"bank_holiday";scope:string;confirmation:string}>;
  candidate_count?:number;candidate_events?:Array<{date:string;name:string;scope:string;classification:"unclassified_event";estimated:boolean}>;
  financial_decision_allowed:false
 }>>;
 businessDays:(body:{markets:string[];date:string;offset_business_days:number;
  convention?:"following"|"preceding"|"modified_following"|"modified_preceding"|"unadjusted"},
  opts?:RequestOptions)=>Promise<ApiResponse>;
}>;
