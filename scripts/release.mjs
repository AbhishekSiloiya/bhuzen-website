import {readFileSync,writeFileSync,readdirSync,mkdirSync,mkdtempSync,existsSync,copyFileSync,lstatSync} from 'node:fs';
import {resolve,dirname,join,relative,extname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=join(project,'public');
const productionOrigin='https://bhuzen.com';
const stagingOrigin='https://abhisheksiloiya.github.io/bhuzen-website';
export const legacyRoutes=Object.freeze({'general-7':'our-commitment','general-clean':'founders-evaluation','blank':'privacy','blank-1':'accessibility'});
const types=new Set(['.html','.css','.js','.mjs','.png','.jpg','.webp','.svg','.woff2','.ttf','.txt','.xml']);
const escape=value=>String(value).replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function decoratePage(html,{route,profile='staging',indexable=false}={}){
 if(!['staging','production'].includes(profile))throw new Error('Unknown release profile.');
 if(indexable&&profile!=='production')throw new Error('Indexing is only supported by the production profile.');
 const title=html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
 const description=html.match(/<meta name="description" content="([^"]*)"/)?.[1];
 if(!title||!description)throw new Error('Page title and description are required: '+route);
 if((html.match(/<meta\b[^>]*\bname="robots"[^>]*>/gi)||[]).length!==1||!/<meta name="robots" content="[^"]*">/.test(html))throw new Error('One supported robots control is required: '+route);
 if((html.match(/<link\b[^>]*\brel="canonical"[^>]*>/gi)||[]).length!==1||!/<link rel="canonical" href="[^"]*">/.test(html))throw new Error('One supported canonical control is required: '+route);
 const alias=route?.match(/^([^/]+)\/index\.html$/)?.[1];
 const path=legacyRoutes[alias]?'/'+legacyRoutes[alias]+'/':route==='index.html'?'/':'/'+route.replace(/index\.html$/,'');
 const canonical=productionOrigin+path;
 const share=(profile==='staging'?stagingOrigin:productionOrigin)+path;
 const image=(profile==='staging'?stagingOrigin:productionOrigin)+'/assets/bhuzen-social-portrait.jpg';
 const robots=indexable?(route==='404.html'?'noindex,follow':'index,follow'):'noindex,nofollow';
 let result=html.replace(/<meta\b[^>]*(?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\n?/g,'');
 result=result.replace(/<meta name="robots" content="[^"]*">/,'<meta name="robots" content="'+robots+'">');
 result=result.replace(/<link rel="canonical" href="[^"]*">/,'<link rel="canonical" href="'+canonical+'">');
 const tags=[['og:type','website'],['og:site_name','Bhuzen'],['og:title',title],['og:description',description],['og:url',share],['og:image',image],['og:image:type','image/jpeg'],['og:image:width','1122'],['og:image:height','1402'],['og:image:alt','Aabhishek Siloya, founder of Bhuzen'],['twitter:card','summary'],['twitter:title',title],['twitter:description',description],['twitter:image',image],['twitter:image:alt','Aabhishek Siloya, founder of Bhuzen']].map(([key,value])=>'<meta '+(key.startsWith('og:')?'property':'name')+'="'+key+'" content="'+escape(value)+'">').join('');
 result=result.replace('</head>',tags+'</head>');
 if(profile==='production'&&route==='404.html')result=result.replace(/((?:href|src)=")\/bhuzen-website\//g,'$1/');
 return result;
}

function runtimeFiles(dir){
 return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const path=join(dir,entry.name);
  if(entry.isSymbolicLink())throw new Error('Symlinks are not allowed in the release source.');
  if(entry.isDirectory())return runtimeFiles(path);
  const name=relative(source,path);
  if(/(?:^|\/)(?:CNAME|compare\.html|private)(?:\/|$)|(?:preservation|assessment-source)/i.test(name))throw new Error('Non-runtime file in public source: '+name);
  if(entry.name!=='.nojekyll'&&!types.has(extname(path)))throw new Error('Unsupported public file: '+name);
  return path;
 });
}

export function buildRelease({profile='staging',indexable=false,launchApproved=false,output}={}){
 if(!['staging','production'].includes(profile))throw new Error('Unknown release profile.');
 if(indexable&&profile!=='production')throw new Error('Indexing requires the production profile.');
 if(indexable&&launchApproved!==true)throw new Error('Explicit launch approval is required before enabling indexing.');
 const files=runtimeFiles(source);
 if(!output){const dist=join(project,'dist');mkdirSync(dist,{recursive:true});output=mkdtempSync(join(dist,profile+'-'));}
 output=resolve(output);
 if(output===source||output.startsWith(source+sep)||source.startsWith(output+sep))throw new Error('Output must be fresh and outside the source tree.');
 if(existsSync(output)&&(lstatSync(output).isSymbolicLink()||!lstatSync(output).isDirectory()||readdirSync(output).length))throw new Error('Release output must be a fresh empty directory.');
 mkdirSync(output,{recursive:true});
 for(const file of files){
  const route=relative(source,file),target=join(output,route);mkdirSync(dirname(target),{recursive:true});
  if(route.endsWith('.html'))writeFileSync(target,decoratePage(readFileSync(file,'utf8'),{route,profile,indexable}));
  else if(route==='robots.txt')writeFileSync(target,indexable?'User-agent: *\nAllow: /\nSitemap: '+productionOrigin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n');
  else copyFileSync(file,target);
 }
 return {profile,indexable,output,pages:files.filter(f=>f.endsWith('.html')).length,files:files.length};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),known=new Set(['--profile','--out','--approve-indexing']);
 const options={};
 for(let i=0;i<args.length;i++){
  const key=args[i];if(!known.has(key))throw new Error('Unknown release option: '+key);
  if(key==='--approve-indexing'){options.indexable=true;options.launchApproved=true;}
  else {const value=args[++i];if(!value||value.startsWith('--'))throw new Error('Missing release option value.');options[key==='--profile'?'profile':'output']=value;}
 }
 console.log(JSON.stringify(buildRelease(options),null,2));
}
