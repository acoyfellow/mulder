export const schemaCases = [
  { label: "baseline-string-enum", schema: { type: "object", properties: { unit: { type: "string", enum: ["celsius", "fahrenheit"] } }, required: ["unit"] }, input: { unit: "celsius" } },
  { label: "integer-range", schema: { type: "object", properties: { value: { type: "integer", minimum: 0, maximum: 100 } }, required: ["value"] }, input: { value: 42 } },
  { label: "boolean-flag", schema: { type: "object", properties: { enabled: { type: "boolean" } } }, input: { enabled: true } },
  { label: "number-float", schema: { type: "object", properties: { value: { type: "number" } }, required: ["value"] }, input: { value: 3.14 } },
  { label: "array-of-strings", schema: { type: "object", properties: { values: { type: "array", items: { type: "string" } } }, required: ["values"] }, input: { values: ["a", "b"] } },
  { label: "nested-object", schema: { type: "object", properties: { location: { type: "object", properties: { city: { type: "string" }, country: { type: "string" } }, required: ["city"] } }, required: ["location"] }, input: { location: { city: "Paris", country: "FR" } } },
  { label: "string-pattern", schema: { type: "object", properties: { code: { type: "string", pattern: "^[A-Z]{2,3}$" } }, required: ["code"] }, input: { code: "US" } },
  { label: "nullable-union", schema: { type: "object", properties: { value: { type: ["string", "null"] } } }, input: { value: null } },
  { label: "oneof-composition", schema: { type: "object", properties: { value: { oneOf: [{ type: "string" }, { type: "integer" }] } }, required: ["value"] }, input: { value: "either" } },
  { label: "unresolved-ref", schema: { type: "object", properties: { city: { $ref: "#/components/schemas/City" } }, required: ["city"] }, input: { city: "Oslo" } },
] as const;

export function schemaExperimentModule(): string {
  const serialized = JSON.stringify(schemaCases).replace(/</g, "\\u003c");
  return `const cases=${serialized};
const context=document.modelContext??navigator.modelContext;
const output=document.querySelector('#schema-results');
const state={registered:{},invoked:{}};
globalThis.__mulderSchemaState=state;
const selected=new URL(location.href).searchParams.get('case');
const ordered=selected?cases.filter((item)=>item.label===selected):[...cases.slice(1),cases[0]];
for(const item of ordered){
  try{
    await context.registerTool({name:'schema_'+item.label.replaceAll('-','_'),description:'Schema case '+item.label,inputSchema:item.schema,annotations:{readOnlyHint:true},execute:async(input)=>{state.invoked[item.label]=input;output.textContent=JSON.stringify(state);return JSON.stringify({label:item.label,input})}});
    state.registered[item.label]='resolved';
  }catch(error){state.registered[item.label]=String(error)}
  output.textContent=JSON.stringify(state);
}`;
}

export function schemaExperimentPage(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder schema experiment</title></head><body><h1>Schema compatibility</h1><pre id="schema-results">starting</pre><script type="module" src="/experiments/schema/module.js"></script></body></html>`;
}
