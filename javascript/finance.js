/**
 * Brand-neutral finance-calendar SDK facade. Apache-2.0.
 * Works on any approved customer's HTTPS domain, through its real gateway.
 */
import {TaghvimClient} from "./index.js";
export function createFinancialCalendarClient(options={}){
 if(typeof options.baseUrl!=="string"||!options.baseUrl)
  throw new TypeError("An explicit approved branded HTTPS API origin is required");
 const c=new TaghvimClient(options);
 return Object.freeze({
  countries:(opts)=>c.financeCountries(opts),
  holidays:(market,year,opts)=>c.financeHolidays({market,year},opts),
  businessDays:(body,opts)=>c.financeBusinessDays(body,opts)
 });
}
