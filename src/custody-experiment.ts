export function custodyExperimentModule(): string {
  return `const context=document.modelContext??navigator.modelContext;
const output=document.querySelector('#custody-result');
if(context)await context.registerTool({name:'get_secret_weather',description:'Read weather through an edge-held origin credential',inputSchema:{type:'object',properties:{city:{type:'string'}},required:['city']},annotations:{readOnlyHint:true},execute:async(input)=>{const response=await fetch('/__mulder/custody-call',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});const result={status:response.status,body:await response.json()};output.textContent=JSON.stringify(result);return JSON.stringify(result)}});`;
}

export function custodyExperimentPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder credential custody</title></head><body><h1>Credential custody</h1><pre id="custody-result">waiting</pre><script type="module" src="/experiments/custody/module.js"></script></body></html>`;
}
