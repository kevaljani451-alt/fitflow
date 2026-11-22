export const TOKEN='ff_token';
export async function api(path,{method='GET',body}={}){
 const r=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json',...(localStorage[TOKEN]?{Authorization:'Bearer '+localStorage[TOKEN]}:{})},body:body?JSON.stringify(body):undefined});
 const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d}
