import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildRelease} from '../scripts/release.mjs';
import {deliveryGate} from '../public/lead-forms.mjs';
const fresh=()=>join(mkdtempSync(join(tmpdir(),'bhuzen-production-')),'site');
const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const config=async r=>(await import(pathToFileURL(join(r.output,'site-config.mjs')).href)).siteConfig;

test('production candidate has truthful closed copy and does not modify staging source',async()=>{
 const files=walk(resolve('public')),before=files.map(digest);
 const r=buildRelease({profile:'production',output:fresh()}),c=await config(r);
 assert.equal(c.siteMode,'production');assert.equal(c.deliveryEnabled,false);assert.equal(c.resourcesEnabled,false);assert.deepEqual(c.allowedOrigins,[]);
 for(const f of walk(r.output).filter(f=>f.endsWith('.html'))){const h=readFileSync(f,'utf8');assert.doesNotMatch(h,/Staging site\.|Design preview|Local design preview|Local preview|Version 3 Bhuzen preview/);assert.match(h,/noindex,nofollow/);}
 const privacy=readFileSync(join(r.output,'privacy/index.html'),'utf8');
 for(const word of ['Privacy at Bhuzen','BHUZEN LTD','12 months','Contact location: Viotti Heights, Sandu Hills, Woolwich, SE18 6PA.','currently unavailable'])assert.ok(privacy.includes(word),word);
 assert.doesNotMatch(privacy,/\bFlat\s*\d|Registered office:\s*Viotti|project conversation/);
 const access=readFileSync(join(r.output,'accessibility/index.html'),'utf8');assert.ok(access.includes('mailto:aabhisheksiloya708@gmail.com'));assert.doesNotMatch(access,/project conversation|This local version/);
 assert.deepEqual(files.map(digest),before);
});

test('production delivery and resources require deliberate separate approvals',async()=>{
 for(const key of ['indexable','launchApproved','deliveryApproved','resourcesApproved'])assert.throws(()=>buildRelease({profile:'production',launchApproved:true,[key]:'false',output:fresh()}),/boolean/i);
 assert.throws(()=>buildRelease({profile:'production',deliveryApproved:true,output:fresh()}),/approval/i);
 assert.throws(()=>buildRelease({deliveryApproved:true,launchApproved:true,output:fresh()}),/production/i);
 assert.throws(()=>buildRelease({profile:'production',resourcesApproved:true,launchApproved:true,output:fresh()}),/delivery/i);
 const r=buildRelease({profile:'production',deliveryApproved:true,launchApproved:true,output:fresh()}),c=await config(r);
 assert.equal(deliveryGate(c,'https://bhuzen.com/book-online/','enquiry-form').ready,true);
 assert.equal(deliveryGate(c,'https://www.bhuzen.com/','enquiry-form').ready,true);
 for(const origin of ['https://abhisheksiloiya.github.io/','http://127.0.0.1:8794/','https://unrelated.example/'])assert.equal(deliveryGate(c,origin,'enquiry-form').ready,false);
 assert.equal(deliveryGate(c,'https://bhuzen.com/resources/','resource-form').ready,false);
 assert.match(readFileSync(join(r.output,'resources/index.html'),'utf8'),/Playbook requests are not available/);
 const live=buildRelease({profile:'production',deliveryApproved:true,resourcesApproved:true,launchApproved:true,output:fresh()}),lc=await config(live);
 assert.equal(deliveryGate(lc,'https://bhuzen.com/','resource-form').ready,true);assert.equal(lc.resourceFulfilment,'manual');
 assert.match(readFileSync(join(live.output,'resources/index.html'),'utf8'),/follow up by email/);
 assert.match(readFileSync(join(live.output,'index.html'),'utf8'),/noindex,nofollow/,'delivery approval must not implicitly enable indexing');
});

test('production copy keeps substantive legacy aliases and post-only native forms',()=>{
 const r=buildRelease({profile:'production',output:fresh()});
 for(const [old,primary]of Object.entries({contact:'resources',blank:'privacy','blank-1':'accessibility','general-7':'our-commitment','general-clean':'founders-evaluation'})){
  const a=readFileSync(join(r.output,old,'index.html'),'utf8'),b=readFileSync(join(r.output,primary,'index.html'),'utf8');assert.equal(a.match(/<main[\s\S]*?<\/main>/)?.[0],b.match(/<main[\s\S]*?<\/main>/)?.[0]);
 }
 for(const page of ['index.html','resources/index.html','contact/index.html','book-online/index.html']){
  const h=readFileSync(join(r.output,page),'utf8');for(const [,opening]of h.matchAll(/(<form id="(?:enquiry|resource|channel)-form"[^>]*>)/g))assert.ok(opening.includes('method="post"'));assert.ok(h.includes('<fieldset class="lead-fields" disabled>'));
 }
});

test('form-state copy distinguishes production unavailability from staging',async()=>{
 const api=await import('../public/lead-forms.mjs');assert.equal(typeof api.formStateCopy,'function');
 const closed=api.formStateCopy({siteMode:'production'},'enquiry-form',{ready:false});assert.doesNotMatch(closed.note,/staging/i);assert.match(closed.note,/not available/);assert.match(closed.unavailable,/Nothing has been sent/);
 const stage=api.formStateCopy({},'enquiry-form',{ready:false});assert.match(stage.note,/Staging/);
 const resource=api.formStateCopy({siteMode:'production',resourceFulfilment:'manual'},'resource-form',{ready:true});assert.match(resource.note,/follow up by email/);assert.doesNotMatch(resource.note,/instant|automatically/i);
});

async function controls(){assert.ok(existsSync('scripts/production-workflow.mjs'),'manual release controls exist');return import('../scripts/production-workflow.mjs');}
test('manual production controls default closed and reject ambiguous or unapproved activation',async()=>{
 const {releaseRequest}=await controls();const closed=releaseRequest({});for(const field of ['publish','indexable','deliveryApproved','resourcesApproved'])assert.equal(closed[field],false);
 for(const env of [{BHUZEN_PUBLISH:'yes'},{BHUZEN_PUBLISH:'true'},{BHUZEN_INDEXING:'true'},{BHUZEN_DELIVERY:'true'},{BHUZEN_RESOURCES:'true'}])assert.throws(()=>releaseRequest(env));
 assert.throws(()=>releaseRequest({BHUZEN_RESOURCES:'true',BHUZEN_APPROVAL:'PUBLISH BHUZEN.COM'}),/delivery/i);
 const approved=releaseRequest({BHUZEN_PUBLISH:'true',BHUZEN_DELIVERY:'true',BHUZEN_APPROVAL:'PUBLISH BHUZEN.COM'});assert.equal(approved.publish,true);assert.equal(approved.deliveryApproved,true);assert.equal(approved.indexable,false);
});
test('production publishing requires intended custom domain and staging refuses any custom domain',async()=>{
 const {assertProductionDomain,assertStagingDomain}=await controls();
 for(const cname of [null,'','elsewhere.example'])assert.throws(()=>assertProductionDomain(cname));assert.doesNotThrow(()=>assertProductionDomain('bhuzen.com'));
 assert.doesNotThrow(()=>assertStagingDomain(null));assert.doesNotThrow(()=>assertStagingDomain(''));assert.throws(()=>assertStagingDomain('bhuzen.com'));
});
test('production workflow is manual build-first with environment-only inputs and guarded deploy',()=>{
 assert.ok(existsSync('.github/workflows/production.yml'),'production workflow exists');
 const w=readFileSync('.github/workflows/production.yml','utf8');assert.match(w,/workflow_dispatch/);assert.doesNotMatch(w,/^\s*(push|pull_request|schedule):/m);assert.match(w,/default: false/);assert.match(w,/if:.*inputs\.publish/);assert.match(w,/artifact_path/);assert.match(w,/BHUZEN_APPROVAL:/);assert.match(w,/node scripts\/production-workflow\.mjs/);assert.doesNotMatch(w,/path: public|run:.*\$\{\{\s*inputs\./);
 assert.match(readFileSync('.github/workflows/pages.yml','utf8'),/check-staging/);
});
test('operator CLI requires the same approval phrase for every activation flag',()=>{
 const env={...process.env};delete env.BHUZEN_APPROVAL;
 for(const option of ['--approve-indexing','--approve-delivery','--approve-resources']){
  const r=spawnSync(process.execPath,['scripts/release.mjs','--profile','production',option,'--out',fresh()],{env,encoding:'utf8'});
  assert.notEqual(r.status,0,option+' must not self-approve');assert.match(r.stderr,/approval phrase/i);
 }
 const approved=spawnSync(process.execPath,['scripts/release.mjs','--profile','production','--approve-delivery','--out',fresh()],{env:{...env,BHUZEN_APPROVAL:'PUBLISH BHUZEN.COM'},encoding:'utf8'});assert.equal(approved.status,0,approved.stderr);
});
test('both workflows recheck the custom domain inside deploy after any approval wait',()=>{
 for(const [file,guard]of [['pages.yml','--check-staging'],['production.yml','--check-production']]){
  const yaml=readFileSync('.github/workflows/'+file,'utf8'),deploy=yaml.indexOf('\n  deploy:');
  assert.ok(deploy>=0);const tail=yaml.slice(deploy);assert.ok(tail.includes(guard),file+' late domain guard');assert.ok(tail.indexOf(guard)<tail.indexOf('uses: actions/deploy-pages@'),file+' guard before publish');assert.match(tail,/contents: read/);
 }
});
