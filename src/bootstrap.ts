import type { GeneratedTool } from "./openapi";

export type WebMcpBootstrapOptions = {
  callPathPrefix?: string;
  resultSelector?: string;
};

export function webMcpBootstrapModule(tools: GeneratedTool[], options: WebMcpBootstrapOptions = {}): string {
  const descriptors = tools.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations }));
  const serialized = JSON.stringify(descriptors).replace(/</g, "\\u003c");
  const callPathPrefix = JSON.stringify(options.callPathPrefix ?? "/__mulder/call/").replace(/</g, "\\u003c");
  const resultSelector = JSON.stringify(options.resultSelector ?? "#mulder-result").replace(/</g, "\\u003c");
  return `const descriptors=${serialized};
const callPathPrefix=${callPathPrefix};
const context=document.modelContext??navigator.modelContext;
const output=document.querySelector(${resultSelector});
if(context){
  for(const descriptor of descriptors){
    await context.registerTool({
      ...descriptor,
      execute:async(input)=>{
        const response=await fetch(callPathPrefix+encodeURIComponent(descriptor.name),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input??{})});
        const result={status:response.status,body:await response.json()};
        if(output) output.textContent=JSON.stringify({tool:descriptor.name,...result},null,2);
        return JSON.stringify(result);
      }
    });
  }
}`;
}

export function webMcpBootstrap(tools: GeneratedTool[], options: WebMcpBootstrapOptions = {}): string {
  return `<script type="module">${webMcpBootstrapModule(tools, options)}</script>`;
}
