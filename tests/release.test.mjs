import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,mkdtempSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

const walk=p=>readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]);
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const fresh=()=>join(mkdtempSync(join(tmpdir(),'bhuzen-release-test-')),'site');
async function builder(){assert.ok(existsSync('scripts/release.mjs'),'isolated release builder must exist');return import('../scripts/release.mjs');}

test('staging release defaults closed and leaves public source unchanged',async()=>{
 const {buildRelease}=await builder();const source=walk(resolve('public'));const before=source.map(hash);
 const result=buildRelease({output:fresh()});
 assert.equal(result.profile,'staging');assert.equal(result.indexable,false);
 assert.equal(result.pages,17);assert.equal(result.files,source.length);
 assert.ok(readFileSync(join(result.output,'robots.txt'),'utf8').includes('Disallow: /'));
 assert.ok(readFileSync(join(result.output,'404.html'),'utf8').includes('/bhuzen-website/style.css'));
 assert.deepEqual(source.map(hash),before);
 assert.ok(!walk(result.output).some(f=>/\.pdf$|CNAME|compare\.html|source\.json|\/tests\//.test(f)));
});

test('production candidate repairs root 404 but remains noindex with delivery disabled',async()=>{
 const {buildRelease}=await builder();const r=buildRelease({profile:'production',output:fresh()});
 const html=readFileSync(join(r.output,'404.html'),'utf8');
 assert.ok(html.includes('href="/style.css"'));assert.ok(!html.includes('/bhuzen-website/'));
 for(const f of walk(r.output).filter(f=>f.endsWith('.html')))assert.match(readFileSync(f,'utf8'),/noindex,nofollow/);
 assert.match(readFileSync(join(r.output,'site-config.mjs'),'utf8'),/deliveryEnabled:false/);
 const home=readFileSync(join(r.output,'index.html'),'utf8');
 assert.match(home,/property="og:url" content="https:\/\/bhuzen.com\/"/);
 assert.match(home,/property="og:image" content="https:\/\/bhuzen.com\/assets\/bhuzen-social-portrait.jpg"/);
});

test('indexing requires an explicit production approval; 404 is never indexable',async()=>{
 const {buildRelease}=await builder();
 assert.throws(()=>buildRelease({indexable:true,launchApproved:true,output:fresh()}),/production/);
 assert.throws(()=>buildRelease({profile:'production',indexable:true,output:fresh()}),/approval/);
 assert.throws(()=>buildRelease({profile:'other',output:fresh()}),/profile/);
 assert.throws(()=>buildRelease({output:resolve('public')}),/fresh|source/);
 assert.throws(()=>buildRelease({output:resolve('.')}),/fresh|source/);
 const r=buildRelease({profile:'production',indexable:true,launchApproved:true,output:fresh()});
 assert.match(readFileSync(join(r.output,'index.html'),'utf8'),/name="robots" content="index,follow"/);
 assert.match(readFileSync(join(r.output,'404.html'),'utf8'),/name="robots" content="noindex,follow"/);
 assert.match(readFileSync(join(r.output,'robots.txt'),'utf8'),/Sitemap: https:\/\/bhuzen.com\/sitemap.xml/);
 assert.doesNotMatch(readFileSync(join(r.output,'robots.txt'),'utf8'),/Disallow: \//);
});

test('social metadata is complete, idempotent and uses the current profile origin',async()=>{
 const {decoratePage}=await builder();
 for(const f of walk(resolve('public')).filter(f=>f.endsWith('.html'))){
  const h=readFileSync(f,'utf8');const route=relative(resolve('public'),f);
  for(const field of ['og:title','og:description','og:type','og:url','og:image','og:image:alt'])assert.equal((h.match(new RegExp('property="'+field+'"','g'))||[]).length,1,route+' '+field);
  for(const field of ['twitter:card','twitter:title','twitter:description','twitter:image'])assert.ok(h.includes('name="'+field+'"'),route+' '+field);
  assert.match(h,/content="https:\/\/abhisheksiloiya.github.io\/bhuzen-website\/assets\/bhuzen-social-portrait.jpg"/);
  assert.equal(decoratePage(h,{route,profile:'staging'}),h,'metadata stays idempotent');
 }
 assert.ok(existsSync('public/assets/bhuzen-social-portrait.jpg'));
});

test('release decoration rejects missing or duplicate indexing/canonical controls',async()=>{
 const {decoratePage}=await builder();const h=readFileSync('public/index.html','utf8');const options={route:'index.html'};
 assert.throws(()=>decoratePage(h.replace(/<meta name="robots"[^>]*>/,''),options),/robots/);
 assert.throws(()=>decoratePage(h.replace(/<link rel="canonical"[^>]*>/,''),options),/canonical/);
 assert.throws(()=>decoratePage(h.replace('</head>','<meta name="robots" content="index,follow"></head>'),options),/robots/);
 assert.throws(()=>decoratePage(h.replace('</head>','<link rel="canonical" href="https://example.com/"></head>'),options),/canonical/);
});

test('retained legacy routes contain substantive content with preferred canonicals',()=>{
 for(const [old,current]of Object.entries({'general-7':'our-commitment','general-clean':'founders-evaluation','blank':'privacy','blank-1':'accessibility'})){
  const legacy=readFileSync('public/'+old+'/index.html','utf8'),primary=readFileSync('public/'+current+'/index.html','utf8');
  assert.ok(legacy.includes('rel="canonical" href="https://bhuzen.com/'+current+'/"'),old);
  assert.equal(legacy.match(/<main[\s\S]*?<\/main>/)?.[0],primary.match(/<main[\s\S]*?<\/main>/)?.[0],old+' retains full content');
 }
});

test('assessment keeps illustrative boundaries without an internal approval label',()=>{
 for(const page of ['founders-evaluation','general-clean']){
  const h=readFileSync('public/'+page+'/index.html','utf8');
  assert.ok(!h.includes('Personalised draft')&&!h.includes('For Aabhishek’s review'));
  assert.ok(h.includes('Illustrative coaching perspective'));assert.ok(h.includes('not a validated'));
 }
});
