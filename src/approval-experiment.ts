export function approvalExperimentModule(): string {
  return `const context=document.modelContext??navigator.modelContext;
const output=document.querySelector('#approval-result');
if(context)await context.registerTool({name:'create_case_file',description:'Create one protected case file after separate human approval',inputSchema:{type:'object',properties:{title:{type:'string'},classification:{type:'string'}},required:['title','classification']},annotations:{readOnlyHint:false,destructiveHint:false},execute:async(input)=>{const response=await fetch('/__mulder/write-call',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(input)});const result={status:response.status,body:await response.json()};output.textContent=JSON.stringify(result);return JSON.stringify(result)}});`;
}

export function approvalExperimentPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder approval experiment</title></head><body><h1>Write approval</h1><pre id="approval-result">waiting</pre><script type="module" src="/experiments/approval/module.js"></script></body></html>`;
}
