import test from 'node:test';
import assert from 'node:assert/strict';
const api=await import('../public/lead-forms.mjs').catch(()=>({}));
const config={deliveryEnabled:true,recipientVerified:true,recipient:'owner@example.com',accessKey:'00000000-0000-4000-8000-000000000001',allowedOrigins:['https://staging.example.com'],resourcesEnabled:false};
const pageUrl='https://staging.example.com/bhuzen/book-online/index.html?revenue=2000000&email=private@example.com#enquire';
test('verified Bhuzen routing stays disabled before activation',async()=>{
 const {siteConfig}=await import('../public/site-config.mjs');
 assert.equal(siteConfig.recipient,'aabhisheksiloya708@gmail.com');
 assert.equal(siteConfig.recipientVerified,true);
 assert.equal(siteConfig.deliveryEnabled,false);
 assert.equal(siteConfig.accessKey,'6e792ae7-dbed-46b8-8429-388ea9c6971b');
 assert.deepEqual(siteConfig.allowedOrigins,[]);
 assert.equal(siteConfig.resourcesEnabled,false);
 assert.equal(api.deliveryGate(siteConfig,'http://127.0.0.1:8794/','enquiry-form').ready,false);
});
test('delivery gate requires verified configuration and an approved origin',()=>{
 assert.equal(typeof api.deliveryGate,'function');
 assert.equal(api.deliveryGate(config,pageUrl,'enquiry-form').ready,true);
 for(const c of [{...config,deliveryEnabled:false},{...config,recipientVerified:false},{...config,accessKey:''},{...config,recipient:''},{...config,allowedOrigins:[]}])assert.equal(api.deliveryGate(c,pageUrl,'enquiry-form').ready,false);
 assert.equal(api.deliveryGate(config,'http://localhost:8794/','enquiry-form').ready,false);
 assert.equal(api.deliveryGate(config,pageUrl,'resource-form').ready,false);
});
test('payload allowlist excludes financial inputs, answers and untrusted routing',()=>{
 assert.equal(typeof api.buildPayload,'function');
 const p=api.buildPayload({id:'enquiry-form',entries:{name:'Example Owner',email:'owner@example.com',company:'Example Ltd',message:'A synthetic test',source_page:'/founders-evaluation/',assessment_priority:'operations',industry_context:'retail',utm_source:'newsletter',revenue:'2000000',annualCost:'30000',q1:'growth',password:'secret',access_key:'override',subject:'Injected',updates:'on'},config,pageUrl});
 assert.equal(p.access_key,config.accessKey);assert.equal(p.subject,'Bhuzen — business coaching enquiry');assert.equal(p.page_url,'https://staging.example.com/bhuzen/book-online/index.html');assert.equal(p.assessment_priority,'operations');
 for(const key of ['revenue','annualCost','q1','password','updates'])assert.ok(!Object.hasOwn(p,key));
 assert.equal(p.marketing_consent,'Not requested');assert.ok(!JSON.stringify(p).includes('2000000'));
});
test('resource consent is separate; only permitted playbooks and public URLs pass',()=>{
 assert.equal(typeof api.buildPayload,'function');
 const input={id:'resource-form',entries:{name:'Test',email:'test@example.com',playbook:'VIP'},config,pageUrl};
 assert.equal(api.buildPayload(input).marketing_consent,'Not opted in');assert.equal(api.buildPayload({...input,entries:{...input.entries,updates:'on'}}).marketing_consent,'Opted in');
 assert.throws(()=>api.buildPayload({...input,entries:{...input.entries,playbook:'../../private.pdf'}}));
 for(const channel of ['javascript:alert(1)','http://localhost/','http://192.168.1.1/','https://example.com/?token=secret','https://user:password@example.com/'])assert.throws(()=>api.buildPayload({id:'channel-form',entries:{name:'Test',email:'test@example.com',channel},config,pageUrl}));
 assert.equal(api.buildPayload({id:'channel-form',entries:{name:'Test',email:'test@example.com',channel:'https://example.com/'},config,pageUrl}).channel,'https://example.com/');
});
test('provider acceptance is strict and transport errors never become success',async()=>{
 assert.equal(typeof api.sendPayload,'function');
 let calls=0;const accepted=await api.sendPayload({name:'Test'},async(url,options)=>{calls++;assert.equal(url,'https://api.web3forms.com/submit');assert.equal(options.method,'POST');return {ok:true,json:async()=>({success:true})};});
 assert.equal(accepted.accepted,true);assert.equal(calls,1);
 for(const fetcher of [async()=>({ok:false,json:async()=>({success:true})}),async()=>({ok:true,json:async()=>({success:false})}),async()=>({ok:true,json:async()=>({success:'true'})}),async()=>{throw new Error('offline');},async()=>({ok:true,json:async()=>{throw new Error('bad JSON');}})])await assert.rejects(()=>api.sendPayload({},fetcher));
});

test('timed-out transport aborts once without automatically retrying',async()=>{
 assert.equal(typeof api.sendPayload,'function');let calls=0;
 await assert.rejects(()=>api.sendPayload({},async(_url,{signal})=>{calls++;return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('Timeout')),{once:true}));},{timeoutMs:5}));
 assert.equal(calls,1);
});

test('public-channel validation separates numeric domain labels from reserved IPs',()=>{
 assert.equal(typeof api.buildPayload,'function');const make=channel=>api.buildPayload({id:'channel-form',entries:{name:'Test',email:'test@example.com',channel},config,pageUrl});
 assert.equal(make('https://10.example.com/').channel,'https://10.example.com/');
 for(const ip of ['100.64.0.1','198.18.0.1','192.0.2.1','203.0.113.1','224.0.0.1'])assert.throws(()=>make('http://'+ip+'/'));
});
