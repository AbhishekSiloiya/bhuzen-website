const endpoint='https://api.web3forms.com/submit';
const subjects={'enquiry-form':'Bhuzen — business coaching enquiry','channel-form':'Bhuzen — digital-channel evaluation request','resource-form':'Bhuzen — playbook request'};
const priorities=new Set(['decisions','leadership','systems','team','growth','commercial','operations','owner','execution']);
const industries=new Set(['general','b2b','retail','ecommerce','hospitality','family','startup','professional','other']);
const interests=new Set(['','clarity','transformation','coaching','experience','product','advisory','other']);
const playbooks=new Set(['VIP','SCALE','CPG','All three playbooks']);
const clean=(value,max=120)=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const emailOK=value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);

export function deliveryGate(config,pageUrl,id){
  let origin;try{origin=new URL(pageUrl).origin;}catch{return {ready:false,reason:'configuration'};}
  if(!Object.hasOwn(subjects,id)||config.deliveryEnabled!==true||config.recipientVerified!==true||!emailOK(config.recipient||'')||!/^\b[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\b$/i.test(config.accessKey||'')||!config.allowedOrigins?.includes(origin))return {ready:false,reason:'configuration'};
  if(id==='resource-form'&&(config.resourcesEnabled!==true||config.resourcesCleared!==true||!['manual','automated'].includes(config.resourceFulfilment)))return {ready:false,reason:'resources'};
  return {ready:true};
}

function publicChannel(value){
  const url=new URL(value);const host=url.hostname.toLowerCase();
  const ip=/^\d+\.\d+\.\d+\.\d+$/.test(host)?host.split('.').map(Number):null;
  const reservedIP=ip&&(ip[0]===0||ip[0]===10||ip[0]===127||ip[0]>=224||ip[0]===100&&ip[1]>=64&&ip[1]<=127||ip[0]===169&&ip[1]===254||ip[0]===172&&ip[1]>=16&&ip[1]<=31||ip[0]===192&&(ip[1]===168||ip[1]===0)||ip[0]===198&&(ip[1]===18||ip[1]===19||ip[1]===51&&ip[2]===100)||ip[0]===203&&ip[1]===0&&ip[2]===113);
  if(!['https:','http:'].includes(url.protocol)||url.username||url.password||!host.includes('.')||reservedIP||/\.(local|internal|test)$/.test(host)||host.includes(':'))throw new RangeError('Use a public website or channel URL, without credentials.');
  for(const key of url.searchParams.keys())if(/token|secret|password|auth|key|email/i.test(key))throw new RangeError('Remove private query parameters from the channel URL.');
  url.hash='';return url.href;
}

export function buildPayload({id,entries,config,pageUrl}){
  if(!Object.hasOwn(subjects,id))throw new RangeError('Unknown request type.');
  const name=clean(entries.name,100),email=clean(entries.email,254);
  if(!name||!emailOK(email))throw new RangeError('Add your name and a valid email address.');
  const url=new URL(pageUrl);url.search='';url.hash='';
  const payload={access_key:config.accessKey,subject:subjects[id],from_name:'Bhuzen',name,email,page_url:url.href,request_type:id.replace('-form',''),marketing_consent:'Not requested'};
  if(id==='enquiry-form'){payload.company=clean(entries.company,160);payload.message=clean(entries.message,3000);payload.interest=interests.has(entries.interest)?entries.interest:'';}
  if(id==='channel-form'){payload.channel=publicChannel(clean(entries.channel,500));payload.message=clean(entries.message,2000);}
  if(id==='resource-form'){
    if(!playbooks.has(entries.playbook))throw new RangeError('Choose one of the listed playbooks.');
    payload.playbook=entries.playbook;payload.marketing_consent=['on','true',true].includes(entries.updates)?'Opted in':'Not opted in';payload.consent_copy_version='resource-insights-v1';payload.resource_fulfilment=config.resourceFulfilment||'pending';
  }
  if(/^\/[a-z0-9/_-]{0,120}$/i.test(entries.source_page||''))payload.source_page=entries.source_page;
  payload.cta_label=clean(entries.cta_label);
  payload.interest_context=clean(entries.interest_context);
  if(priorities.has(entries.assessment_priority))payload.assessment_priority=entries.assessment_priority;
  if(industries.has(entries.industry_context))payload.industry_context=entries.industry_context;
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])if(entries[key])payload[key]=clean(entries[key]);
  return payload;
}

export async function sendPayload(payload,fetcher=globalThis.fetch,{timeoutMs=15000}={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const body=await response.json();
    if(!response.ok||body?.success!==true)throw new Error('The provider did not accept the request.');
    return {accepted:true};
  }finally{clearTimeout(timer);}
}

export function mountLeadForms(config){
  for(const form of document.querySelectorAll('#enquiry-form,#resource-form,#channel-form')){
    const status=form.querySelector('.form-status'),button=form.querySelector('[type="submit"]'),note=form.querySelector('.form-note'),fields=form.querySelector('.lead-fields');
    const gate=deliveryGate(config,location.href,form.id);let busy=false,accepted=false;
    if(!gate.ready){note.textContent=form.id==='resource-form'?'Staging: playbook requests are awaiting publication and delivery clearance. Nothing is sent.':'Staging: enquiry delivery is not activated. Nothing is sent; Google booking remains available.';}
    else{note.textContent=form.id==='resource-form'?'We use your details to fulfil this request. Optional insights consent is separate.':'We use your details to respond to this enquiry. Please avoid confidential information.';}
    button.textContent=form.id==='resource-form'?'Request the playbook':form.id==='channel-form'?'Request an evaluation':'Send my enquiry';
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy||accepted)return;if(!form.reportValidity())return;
      if(!gate.ready){status.textContent='Delivery is not active in this staging build. Nothing has been sent. Please use the Google booking link to start a conversation.';status.dataset.state='unavailable';status.focus();return;}
      const entries=Object.fromEntries(new FormData(form));
      if(entries.botcheck){status.textContent='We could not accept this request. Please use Google booking.';return;}
      let payload;try{payload=buildPayload({id:form.id,entries,config,pageUrl:location.href});}catch(error){status.textContent=error.message;status.dataset.state='error';status.focus();return;}
      busy=true;if(fields)fields.disabled=true;button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='Sending your request…';status.dataset.state='sending';
      try{
        await sendPayload(payload);accepted=true;
        status.textContent=form.id==='resource-form'?(config.resourceFulfilment==='manual'?'Your playbook request has been accepted. Bhuzen will follow up by email.':'Your playbook request has been accepted. Please check your inbox and spam folder; contact Bhuzen if the email does not arrive.'):'Your request has been accepted. Bhuzen will follow up by email. This does not book a meeting.';
        status.dataset.state='accepted';button.textContent='Request accepted';form.reset();status.focus();
      }catch{
        status.replaceChildren(document.createTextNode('We could not confirm receipt. Your details remain here. Check your email before retrying to avoid a duplicate, or '));
        const fallback=document.createElement('a');fallback.href='mailto:'+config.recipient;fallback.textContent='email Bhuzen directly';status.append(fallback,document.createTextNode('.'));status.dataset.state='error';button.textContent='Try again';button.disabled=false;status.focus();
      }finally{busy=false;if(fields)fields.disabled=false;button.removeAttribute('aria-busy');}
    });
    if(fields)fields.disabled=false;
  }
}
