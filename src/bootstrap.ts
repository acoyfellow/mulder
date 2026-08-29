import type { GeneratedTool } from "./openapi";

export function webMcpBootstrapModule(tools: GeneratedTool[]): string {
  const descriptors = tools.map(({ name, description, inputSchema, annotations }) => ({ name, description, inputSchema, annotations }));
  const serialized = JSON.stringify(descriptors).replace(/</g, "\\u003c");
  return `const descriptors=${serialized};
const context=document.modelContext??navigator.modelContext;
const output=document.querySelector('#mulder-result');
if(context){
  for(const descriptor of descriptors){
    await context.registerTool({
      ...descriptor,
      execute:async(input)=>{
        const response=await fetch('/__mulder/call/'+encodeURIComponent(descriptor.name),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input??{})});
        const result={status:response.status,body:await response.json()};
        if(output) output.textContent=JSON.stringify({tool:descriptor.name,...result},null,2);
        return JSON.stringify(result);
      }
    });
  }
}`;
}

export function webMcpBootstrap(tools: GeneratedTool[]): string {
  return `<script type="module">${webMcpBootstrapModule(tools)}</script>`;
}
