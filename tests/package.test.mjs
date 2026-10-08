import test from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync,readdirSync} from 'node:fs';import {resolve,dirname} from 'node:path';
const root=resolve('public');
const stagingPath='/bhuzen-website/';
const walk=p=>existsSync(p)?readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(p,e.name)):[resolve(p,e.name)]):[];
test('public staging package excludes comparisons and private artefacts',()=>{
 assert.ok(existsSync(resolve(root,'index.html')),'production export exists');const files=walk(root),pages=files.filter(f=>f.endsWith('.html'));assert.equal(pages.length,17);
 assert.ok(!files.some(f=>/compare|preservation|assessment-source|\.jpg\.json|\.webp\.json|\.ttf\.json|\.pdf$|CNAME|\.git\//.test(f)));
 for(const f of pages){const h=readFileSync(f,'utf8');assert.ok(!/compare\.html|\/version-[12]\/|Earlier versions|\/Users\/|127\.0\.0\.1/.test(h),f);assert.ok(h.includes('noindex,nofollow'));assert.equal((h.match(/<h1[ >]/g)||[]).length,1);for(const [,href]of h.matchAll(/(?:href|src)="([^"]+)"/g)){if(/^(https?:|mailto:)/.test(href))continue;const [path,anchor]=href.split('#'),target=path?resolve(path.startsWith(stagingPath)?root:dirname(f),(path.startsWith(stagingPath)?path.slice(stagingPath.length):path).split('?')[0]):f;assert.ok(existsSync(target),f+' '+href);if(anchor&&target.endsWith('.html'))assert.ok(readFileSync(target,'utf8').includes('id="'+anchor+'"'),href);}}
 assert.ok(readFileSync(resolve(root,'book-online/index.html'),'utf8').includes('https://calendar.app.google/D4yYD9aEahuF2CeM9'));
 assert.ok(readFileSync(resolve(root,'robots.txt'),'utf8').includes('Disallow: /'));
});
test('nested missing routes keep 404 navigation and assets at the site root',()=>{
 const h=readFileSync(resolve(root,'404.html'),'utf8');
 for(const [,href]of h.matchAll(/(?:href|src)="([^"]+)"/g)){
  if(/^(https?:|mailto:|#)/.test(href))continue;
  for(const missing of ['missing/','missing/deeper/page'])assert.ok(new URL(href,'https://abhisheksiloiya.github.io'+stagingPath+missing).pathname.startsWith(stagingPath),'404 must not resolve relative to '+missing+': '+href);
  assert.ok(href.startsWith(stagingPath),'404 needs a deployment-root path: '+href);
 }
});
test('shared delivery hook replaces local preview submit handler',()=>{
 assert.ok(existsSync(resolve(root,'app.js')));const js=readFileSync(resolve(root,'app.js'),'utf8');assert.ok(js.includes('mountLeadForms'));assert.ok(!js.includes('Preview complete. Your'));
 for(const route of ['index.html','book-online/index.html','resources/index.html']){const h=readFileSync(resolve(root,route),'utf8');assert.match(h,/<script[^>]*type="module"[^>]*src="[^\"]*app\.js"/);assert.ok(h.includes('name="botcheck"'));}
});

test('form fallback cannot place personal data in URLs when JavaScript fails',()=>{
 for(const route of ['index.html','book-online/index.html','resources/index.html']){
  const h=readFileSync(resolve(root,route),'utf8');
  for(const [,opening]of h.matchAll(/(<form id="(?:enquiry|resource|channel)-form"[^>]*>)/g))assert.ok(opening.includes('method="post"'),'POST fallback required');
  assert.ok(h.includes('<fieldset class="lead-fields" disabled>'),'inputs stay disabled until handlers are mounted');
 }
});
