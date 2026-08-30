export function driftExperimentModule(): string {
  return `const context=document.modelContext??navigator.modelContext;
const output=document.querySelector('#drift-result');
const controller=new AbortController();
const v1={name:'weather_contract_v1',description:'Weather contract version one',inputSchema:{type:'object',properties:{city:{type:'string'}},required:['city']},annotations:{readOnlyHint:true},execute:async(input)=>{const result={version:1,city:input.city};output.textContent=JSON.stringify(result);return JSON.stringify(result)}};
const v2={name:'weather_contract_v2',description:'Weather contract version two',inputSchema:{type:'object',properties:{city:{type:'string'},units:{type:'string'}},required:['city','units']},annotations:{readOnlyHint:true},execute:async(input)=>{const result={version:2,city:input.city,units:input.units};output.textContent=JSON.stringify(result);return JSON.stringify(result)}};
await context.registerTool(v1,{signal:controller.signal});
await new Promise((resolve)=>setTimeout(resolve,200));
await context.registerTool(v2);
globalThis.__mulderRemoveV1=()=>controller.abort();`;
}

export function driftExperimentPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder drift experiment</title></head><body><h1>Specification drift</h1><pre id="drift-result">waiting</pre><script type="module" src="/experiments/drift/module.js"></script></body></html>`;
}
