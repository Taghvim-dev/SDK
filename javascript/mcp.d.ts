import type {TaghvimClient} from "./index.js";
export const MCP_VERSION:"2026-07-28";
export interface MCPTool {name:string;description:string;inputSchema:Record<string,unknown>;annotations:Record<string,unknown>}
export interface MCPBridge {tools:readonly MCPTool[];handle(request:unknown):Promise<unknown>}
export function createTaghvimMcpBridge(options:{client:TaghvimClient;writeEnabled?:boolean;operationIndex?:unknown}):MCPBridge;
export function serveMcpStdio(bridge:MCPBridge,options?:{input?:NodeJS.ReadableStream;output?:NodeJS.WritableStream}):Promise<void>;
export function mcpFromEnvironment(env?:Record<string,string|undefined>):MCPBridge;
