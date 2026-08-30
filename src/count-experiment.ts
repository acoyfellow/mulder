export function countExperimentModule(): string {
  return `const context=document.modelContext??navigator.modelContext;
const count=Math.min(2000,Math.max(1,Number(new URL(location.href).searchParams.get('count')??1)));
const output=document.querySelector('#count-result');
for(let index=0;index<count;index+=1){
  const name='generated_tool_'+String(index).padStart(4,'0');
  await context.registerTool({name,description:'Generated tool '+index,inputSchema:{type:'object',properties:{value:{type:'integer'}},required:['value']},annotations:{readOnlyHint:true},execute:async(input)=>{const result={index,value:input.value};output.textContent=JSON.stringify(result);return JSON.stringify(result)}});
}
output.textContent=JSON.stringify({registered:count});`;
}

export function countExperimentPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder count experiment</title></head><body><h1>Tool count</h1><pre id="count-result">starting</pre><script type="module" src="/experiments/count/module.js"></script></body></html>`;
}
