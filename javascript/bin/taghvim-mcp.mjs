#!/usr/bin/env node
import {mcpFromEnvironment,serveMcpStdio} from "../mcp.js";
try{
 await serveMcpStdio(mcpFromEnvironment());
}catch(e){
 // Diagnostic metadata only. Never echo API keys or arbitrary upstream responses.
 process.stderr.write("TAGHVIM_MCP_STARTUP_BLOCKED: configuration unavailable\n");
 process.exitCode=1;
}
