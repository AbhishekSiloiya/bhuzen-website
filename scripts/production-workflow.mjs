import {appendFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildRelease,productionConfirmation} from './release.mjs';

function flag(value){if(value===undefined||value==='')return false;if(value==='true')return true;if(value==='false')return false;throw new Error('Release flags must be true or false.');}
export function releaseRequest(env){
 const request={publish:flag(env.BHUZEN_PUBLISH),indexable:flag(env.BHUZEN_INDEXING),deliveryApproved:flag(env.BHUZEN_DELIVERY),resourcesApproved:flag(env.BHUZEN_RESOURCES)};
 const activated=Object.values(request).some(Boolean);
 if(activated&&env.BHUZEN_APPROVAL!==productionConfirmation)throw new Error('Explicit release approval phrase is required for publishing or activation.');
 if(request.resourcesApproved&&!request.deliveryApproved)throw new Error('Resource activation requires delivery approval.');
 return {...request,launchApproved:activated};
}
export function assertProductionDomain(cname){if(cname!=='bhuzen.com')throw new Error('Production publishing requires the Bhuzen custom domain to be configured and separately approved.');}
export function assertStagingDomain(cname){if(cname!==null&&cname!=='')throw new Error('Staging deployment refused: a custom domain is configured. Use the reviewed production workflow.');}
function currentDomain(){
 const repo=process.env.GITHUB_REPOSITORY;
 if(repo!=='AbhishekSiloiya/bhuzen-website')throw new Error('Unexpected repository; refusing Pages access.');
 const body=JSON.parse(execFileSync('gh',['api','repos/'+repo+'/pages'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 if(!Object.hasOwn(body,'cname')||(body.cname!==null&&typeof body.cname!=='string'))throw new Error('Pages domain response is incomplete.');
 return body.cname;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2);
 if(args.length===1&&args[0]==='--check-staging'){assertStagingDomain(currentDomain());console.log('Staging domain guard passed.');}
 else if(args.length===1&&args[0]==='--check-production'){assertProductionDomain(currentDomain());console.log('Production domain guard passed.');}
 else if(args.length)throw new Error('Unknown production workflow option.');
 else{
  const request=releaseRequest(process.env);if(request.publish)assertProductionDomain(currentDomain());
  const result=buildRelease({profile:'production',...request});
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'artifact_path='+result.output+'\n');
  console.log(JSON.stringify({...result,publishRequested:request.publish,deliveryEnabled:request.deliveryApproved,resourcesEnabled:request.resourcesApproved},null,2));
 }
}
