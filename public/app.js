import {mountLeadForms} from './lead-forms.mjs';
import {siteConfig} from './site-config.mjs';
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
if (menu && nav) {
  const closeMenu = () => { nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); };
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const openGroup = nav.querySelector('.nav-group[open]');
    if (openGroup) openGroup.open = false;
    if (menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
    else if (openGroup) openGroup.querySelector('summary').focus();
  });
}
function openHash() {
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement) target.open = true;
}
addEventListener('hashchange', openHash); openHash();
document.querySelectorAll('[data-service]').forEach(link => link.addEventListener('click', () => {
  const detail = document.getElementById(link.dataset.service);
  if (detail instanceof HTMLDetailsElement) detail.open = true;
  const interest = document.querySelector('#interest');
  if (interest) interest.value = link.dataset.service;
}));
document.querySelectorAll('[data-resource]').forEach(link => link.addEventListener('click', () => {
  document.querySelector('#resource-request').open = true;
  document.querySelector('#playbook').value = link.dataset.resource;
}));
const focusChoice = new URLSearchParams(location.search).get('focus');
const focusSelect = document.querySelector('#interest');
if (focusSelect && [...focusSelect.options].some(option => option.value === focusChoice)) focusSelect.value = focusChoice;
document.addEventListener('click',event=>{document.querySelectorAll('.nav-group[open]').forEach(group=>{if(!group.contains(event.target))group.open=false;});});

// Bounded, non-sensitive journey context only. No answers, scores or financial inputs.
const journeyParams=new URLSearchParams(location.search);
const safeContext=(value,max=120)=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max);
const pagePath=location.pathname.replace(/index\.html$/,'');
const priorityNames={decisions:'Decision ownership',leadership:'Leadership ownership',systems:'Systems & decision rights',team:'Team capability',growth:'Capacity for growth',commercial:'Commercial growth',operations:'Operational consistency',owner:'Owner independence',execution:'Execution discipline'};
const industryNames={general:'General business',b2b:'B2B & manufacturing',retail:'Retail & consumer goods',ecommerce:'D2C & ecommerce',hospitality:'Travel & hospitality',family:'Family business',startup:'Startup & scale-up',professional:'Professional services',other:'Other business'};
const entrySource=journeyParams.get('source');
const sourcePage=entrySource&&/^\/[a-z0-9\-/]{0,100}$/.test(entrySource)?entrySource:pagePath;
const priority=Object.hasOwn(priorityNames,journeyParams.get('priority'))?journeyParams.get('priority'):'';
const industry=Object.hasOwn(industryNames,journeyParams.get('industry'))?journeyParams.get('industry'):'';
function recordContext(form,cta){
  const data={source_page:sourcePage,cta_label:safeContext(cta||form.elements.cta_label?.value||journeyParams.get('cta')),interest_context:safeContext(form.querySelector('#interest')?.value||form.elements.playbook?.value||''),industry_context:industry,assessment_priority:priority};
  for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])data[key]=safeContext(journeyParams.get(key));
  for(const [name,value]of Object.entries(data)){let input=form.querySelector('input[type="hidden"][name="'+name+'"]');if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.append(input);}input.value=value;}
}
const leadForms=[...document.querySelectorAll('form:not(#audit-form):not(#cost-form)')];
leadForms.forEach(form=>{recordContext(form);form.addEventListener('change',()=>recordContext(form));});
for(const link of document.querySelectorAll('a[href]')){
  const destination=new URL(link.href,location.href);
  const isBooking=!link.getAttribute('href').startsWith('#')&&destination.origin===location.origin&&/\/book-online\/(?:index\.html)?$/.test(destination.pathname);
  if(isBooking){destination.hash='enquire';destination.searchParams.set('source',pagePath);destination.searchParams.set('cta',safeContext(link.textContent.trim()));for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])if(journeyParams.has(key))destination.searchParams.set(key,safeContext(journeyParams.get(key)));link.href=destination.href;}
  if(destination.origin===location.origin&&destination.pathname===location.pathname&&['#conversation','#enquire','#resource-request'].includes(destination.hash))link.addEventListener('click',()=>{const target=document.getElementById(destination.hash.slice(1));const form=target?.matches('form')?target:target?.querySelector('form');if(form)recordContext(form,link.textContent.trim());});
}
const enquiry=document.querySelector('#enquiry-form');
if(enquiry&&(priority||industry||sourcePage!==pagePath)){
  const context=document.createElement('p');context.className='enquiry-context';context.textContent=priority?'Your evaluation focus: '+priorityNames[priority]+(industry?' · '+industryNames[industry]:'')+'.':focusChoice&&focusSelect?'Let’s discuss '+focusSelect.selectedOptions[0].textContent.toLowerCase()+'.':'Continuing your conversation with Bhuzen.';enquiry.prepend(context);
}
function focusEnquiry(){if(['#enquire','#conversation'].includes(location.hash)){const target=document.getElementById(location.hash.slice(1));if(target){const form=target.querySelector('form');const scrollTarget=matchMedia('(max-width:560px)').matches&&form?form:target;scrollTarget.scrollIntoView({block:'start',behavior:'auto'});target.querySelector('input[name="name"]')?.focus({preventScroll:true});}}}
addEventListener('hashchange',focusEnquiry);if(location.hash)addEventListener('load',focusEnquiry,{once:true});

mountLeadForms(siteConfig);
