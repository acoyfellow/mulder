export function identityExperimentModule(): string {
  return `const context=document.modelContext??navigator.modelContext;
const output=document.querySelector('#identity-result');
if(context)await context.registerTool({name:'inspect_principals',description:'Inspect which principals the edge can verify',inputSchema:{type:'object',properties:{probe:{type:'string'}},required:['probe']},annotations:{readOnlyHint:true},execute:async(input)=>{const response=await fetch('/__mulder/identity-call',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});const result={status:response.status,body:await response.json()};output.textContent=JSON.stringify(result);return JSON.stringify(result)}});`;
}

export function identityExperimentPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder identity experiment</title></head><body><h1>Principal identity</h1><pre id="identity-result">waiting</pre><script type="module" src="/experiments/identity/module.js"></script></body></html>`;
}
