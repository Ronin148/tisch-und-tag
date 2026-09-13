import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './worker';
import { handleFamily, resolveFamilyEnv, setupFamily, type FamilyEnv } from './family-server';
import { authorized, handleAI } from './ai-server';
import { initialData, exampleRecipes } from './seed';
import { defaultProfiles } from './kitchen';

const code='test-family-code-for-unit-tests';
function storeEnv():FamilyEnv {
  let counter=0;const values=new Map<string,{etag:string;value:string}>();
  return {TISCH_ACCESS_KEY:code,OPENROUTER_API_KEY:'test-api-key',TISCH_SETUP_TOKEN:'test-private-setup-token',TISCH_CONFIG_ENCRYPTION_KEY:'ab'.repeat(32),BUCKET:{
    async head(key){return values.get(key)||null;},
    async get(key){const v=values.get(key);return v?{etag:v.etag,text:async()=>v.value}:null;},
    async put(key,value,options){const old=values.get(key);if(options?.onlyIf.etagDoesNotMatch==='*'&&old||options?.onlyIf.etagMatches&&options.onlyIf.etagMatches!==old?.etag)return null;const etag=(++counter).toString(16);values.set(key,{value,etag});return {etag};}
  }};
}
const request=(path:string,body?:unknown,key=code)=>new Request(`https://test.example/api/${path}`,{method:body===undefined?'GET':'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('private family storage',()=>{
  it('blocks readers and writers without the family code',async()=>{
    const env=storeEnv();expect(await authorized(request('family'),env)).toBe(true);
    expect((await handleFamily(request('family',undefined,'wrong'),env)).status).toBe(401);
    expect((await handleFamily(request('family',{data:initialData(),etag:null},'wrong'),env)).status).toBe(401);
  });
  it('round-trips data and prevents two phones from overwriting one another',async()=>{
    const env=storeEnv();const first=await handleFamily(request('family',{data:initialData(),etag:null}),env);expect(first.status).toBe(200);const {etag}=await first.json();
    const changed={...initialData(),profiles:defaultProfiles(),recipes:[exampleRecipes[0]]};
    expect((await handleFamily(request('family',{data:changed,etag}),env)).status).toBe(200);
    expect((await handleFamily(request('family',{data:initialData(),etag}),env)).status).toBe(409);
    const loaded=await(await handleFamily(request('family'),env)).json();expect(loaded.data.recipes).toHaveLength(1);
  });
  it('validates a backup before writing it',async()=>{
    const env=storeEnv();expect((await handleFamily(request('family',{data:{version:1},etag:null}),env)).status).toBe(422);expect((await(await handleFamily(request('family'),env)).json()).data).toBeNull();
  });
  it('encrypts configuration and consumes the setup invitation once',async()=>{
    const env=storeEnv();env.OPENROUTER_API_KEY=undefined;env.TISCH_ACCESS_KEY=undefined;vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}',{status:200})));
    const apiKey='sk-or-v1-abcdefghijklmnopqrstuvwxyz123456';const setup=request('setup',{apiKey,familyCode:code},env.TISCH_SETUP_TOKEN);
    expect((await setupFamily(setup,env)).status).toBe(200);
    const stored=await env.BUCKET!.get('private/config-v1.json');expect(await stored!.text()).not.toContain(apiKey);expect(await stored!.text()).not.toContain(code);
    const configured=await resolveFamilyEnv(env);expect(configured.OPENROUTER_API_KEY).toBe(apiKey);expect(configured.TISCH_ACCESS_KEY).toBe(code);
    expect((await setupFamily(request('setup',{apiKey,familyCode:code},env.TISCH_SETUP_TOKEN),env)).status).toBe(409);
  });
  it('allows GitHub Pages preflight but refuses other browser origins',async()=>{
    const good=await worker.fetch(new Request('https://test.example/api/family',{method:'OPTIONS',headers:{origin:'https://ronin148.github.io','access-control-request-method':'POST'}}),storeEnv());
    expect(good.status).toBe(204);expect(good.headers.get('access-control-allow-origin')).toBe('https://ronin148.github.io');
    expect((await worker.fetch(new Request('https://test.example/api/family',{headers:{origin:'https://unrelated.example'}}),storeEnv())).status).toBe(403);
  });
});
describe('OpenRouter actions',()=>{
  it('fails closed without configuration or authorization',async()=>{
    expect((await handleAI(request('ai/plan',{},'wrong'),storeEnv(),'plan')).status).toBe(401);
    expect((await handleAI(request('ai/plan',{}),{TISCH_ACCESS_KEY:code},'plan')).status).toBe(503);
  });
  it('sends photos only to the configured provider and returns editable detections',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(100000);const fake=vi.fn(async(_url:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:[{name:'Tomaten',quantity:'',uncertain:true}],note:'Menge unklar'})}}]})));vi.stubGlobal('fetch',fake);
    const result=await handleAI(request('ai/pantry',{images:['data:image/jpeg;base64,YWJj']}),storeEnv(),'pantry');
    expect(result.status).toBe(200);expect((await result.json()).items[0].uncertain).toBe(true);expect(fake.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions');
  });
  it('rejects invented candidate IDs instead of storing a fabricated web recipe',async()=>{
    vi.spyOn(Date,'now').mockReturnValue(200000);vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({recipeIds:['invented'],recipes:[],note:''})}}]}))));
    const response=await handleAI(request('ai/recommend',{source:'own',profiles:defaultProfiles(),recipes:[exampleRecipes[0]],pantry:[]}),storeEnv(),'recommend');expect(response.status).toBe(422);expect((await response.json()).error).toContain('ungültig');
  });
});
