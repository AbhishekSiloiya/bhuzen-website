import {buildBriefing,industries,goals} from './growth-briefing.mjs';
const form=document.querySelector('#audit-form'),steps=[...form.querySelectorAll('[data-step]')],results=document.querySelector('#audit-results');
const context=document.querySelector('#briefing-context'),flow=document.querySelector('#question-flow'),next=document.querySelector('#audit-next'),prev=document.querySelector('#audit-prev'),submit=document.querySelector('#audit-submit');
const error=document.querySelector('#audit-error'),showResults=document.querySelector('#show-results'),resetBox=document.querySelector('#reset-confirm');
let step=0,ready=false,briefing=null,scenarioMode='revenue';
const values=()=>steps.map((s,i)=>{const checked=s.querySelector('input:checked');return checked?(i<2?checked.value:Number(checked.value)):null;});
const optionalNumber=name=>form.elements[name].value.trim()===''?null:Number(form.elements[name].value);
function financialContext(){return {industry:form.elements.industry.value,currency:form.elements.currency.value,revenue:optionalNumber('revenue'),annualCost:optionalNumber('annualCost'),hours:optionalNumber('hours'),weeks:optionalNumber('weeks')};}
function progress(){const count=values().filter(v=>v!==null).length;document.querySelector('#audit-progress').value=count;document.querySelector('#audit-progress-label').textContent=count+' of 6 answered';}
function showStep(n,focus=true){step=n;context.hidden=true;flow.hidden=false;steps.forEach((s,i)=>s.hidden=i!==n);prev.hidden=n===0;next.hidden=n===5;submit.hidden=n!==5;if(focus){(steps[n].querySelector('input:checked')||steps[n].querySelector('input')).focus({preventScroll:true});steps[n].scrollIntoView({block:'start',behavior:'auto'});}}
function showContext(){context.hidden=false;flow.hidden=true;context.scrollIntoView({block:'start',behavior:'auto'});form.elements.industry.focus({preventScroll:true});}
function validateContext(){for(const name of ['revenue','annualCost','hours','weeks']){const input=form.elements[name];if(!input.checkValidity()){error.textContent='Check the highlighted financial input. Use a non-negative value within the displayed limits.';context.hidden=false;flow.hidden=true;input.reportValidity();return false;}}if(form.elements.hours.value!==''&&form.elements.weeks.value===''){showContext();form.elements.weeks.focus();error.textContent='Add 1–52 working weeks to illustrate annual time capacity.';return false;}error.textContent='';return true;}
document.querySelector('#start-questions').addEventListener('click',()=>{if(validateContext())showStep(step);});
document.querySelector('#edit-context').addEventListener('click',showContext);
next.addEventListener('click',()=>{if(!steps[step].querySelector('input:checked')){error.textContent='Choose the answer that best reflects your business today.';steps[step].querySelector('input').focus();return;}error.textContent='';showStep(step+1);});
prev.addEventListener('click',()=>{error.textContent='';showStep(Math.max(0,step-1));});
function invalidate(){progress();ready=false;briefing=null;showResults.disabled=true;results.hidden=true;error.textContent='';}
form.addEventListener('input',invalidate);
form.addEventListener('change',invalidate);
const setText=(id,value)=>document.getElementById(id).textContent=value;
const money=value=>new Intl.NumberFormat('en-GB',{style:'currency',currency:briefing.currency,maximumFractionDigits:0}).format(value);
function renderScenarios(mode){
 scenarioMode=mode;const f=briefing.financial,margin=mode==='margin',rows=margin?f.marginScenarios:f.revenueScenarios;
 setText('scenario-explanation',margin?'At the revenue you provided, a change in operating margin could translate into the following annual profit differences, if revenue stayed constant.':'At the revenue you provided, the following assumed percentage uplifts would translate into additional annual revenue—not profit.');
 setText('scenario-caption',margin?'Annual revenue × assumed margin change. Percentage points, not relative profit growth.':'Annual revenue × assumed revenue uplift. These are sensitivity scenarios.');
 setText('scenario-value-heading',margin?'Additional annual profit':'Additional annual revenue');
 document.querySelector('#show-revenue').setAttribute('aria-pressed',String(!margin));document.querySelector('#show-margin').setAttribute('aria-pressed',String(margin));
 const body=document.querySelector('#scenario-rows');body.replaceChildren();for(const row of rows){const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');th.scope='row';th.textContent=margin?'+'+row.rate+' percentage point'+(row.rate===1?'':'s'):'+'+row.rate+'% revenue';td.textContent=money(row.value);tr.append(th,td);body.append(tr);}
}
function renderBriefing(){
 briefing=buildBriefing(values(),financialContext());const f=briefing.financial;
 setText('briefing-business-context',industries[briefing.industry]+' · '+goals[briefing.goal]);
 for(const [id,value]of Object.entries({'priority-title':briefing.heading,'priority-evidence':briefing.evidence,'priority-action':briefing.action,'review-milestone':briefing.milestone,'coaching-perspective':briefing.perspective,'inaction-consequence':briefing.consequence}))setText(id,value);
 setText('report-revenue',f.revenue===null?'Not provided':money(f.revenue));
 setText('report-cost',f.annualCost===null?'Not quantified':money(f.annualCost)+(f.revenue>0?' · '+new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(f.annualCost/f.revenue*100)+'% of stated revenue':''));
 setText('cost-boundary',f.annualCost===null?'No current financial loss has been inferred. Revenue and questionnaire answers alone cannot establish the cost of this constraint.':'This cost is your annual estimate for the chosen problem, not a verified loss or an amount coaching is guaranteed to recover.');
 document.querySelector('#scenario-section').hidden=f.revenue===null;document.querySelector('#missing-revenue').hidden=f.revenue!==null;
 if(f.revenue!==null)renderScenarios(f.mode);
 setText('report-capacity',f.annualHours===null?'Not quantified. Add avoidable owner hours when reviewing your context to illustrate annual capacity.':new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(f.annualHours)+' hours of potential annual capacity to examine.');
 setText('capacity-assumptions',f.annualHours===null?'There is no assumed hourly value or cash saving.':f.hours+' avoidable hours/week × '+f.weeks+' working weeks. Releasing this time would require changes in how the business operates. This is not a financial saving and is not added to the financial scenarios.');
 const dims=document.querySelector('#friction-dimensions');dims.replaceChildren();for(const d of briefing.dimensions){const row=document.createElement('div'),label=document.createElement('span'),value=document.createElement('strong');label.textContent=d.label;value.textContent=d.value+' / 4';row.append(label,value);dims.append(row);}
 const focus={commercial:'clarity',operations:'transformation',leadership:'coaching',owner:'advisory',execution:'coaching',growth:'clarity'}[briefing.key];
 const url=new URL('../book-online/index.html',location.href);url.search=new URLSearchParams({focus,priority:briefing.key,industry:briefing.industry,source:'/founders-evaluation/',cta:'Book a detailed 30-minute evaluation'}).toString();const campaign=new URLSearchParams(location.search);for(const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])if(campaign.has(key))url.searchParams.set(key,String(campaign.get(key)).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,120));url.hash='enquire';document.querySelector('#evaluation-cta').href=url.href;
}
function openResults(){if(!ready)return;form.hidden=true;results.hidden=false;resetBox.hidden=true;results.focus({preventScroll:true});results.scrollIntoView({block:'start',behavior:'auto'});}
form.addEventListener('submit',event=>{event.preventDefault();if(!validateContext())return;const missing=values().findIndex(v=>v===null);if(missing!==-1){showStep(missing);error.textContent='Answer this question before building your briefing.';return;}try{renderBriefing();ready=true;showResults.disabled=false;openResults();}catch(e){error.textContent=e instanceof RangeError?e.message:'Please review the inputs before building the briefing.';}});
document.querySelector('#show-revenue').addEventListener('click',()=>{if(briefing)renderScenarios('revenue');});
document.querySelector('#show-margin').addEventListener('click',()=>{if(briefing)renderScenarios('margin');});
function edit(){results.hidden=true;form.hidden=false;showContext();}
document.querySelector('#show-questions').addEventListener('click',edit);document.querySelector('#edit-answers').addEventListener('click',edit);showResults.addEventListener('click',openResults);
document.querySelector('#print-results').addEventListener('click',()=>window.print());
let closedForPrint=[];
window.addEventListener('beforeprint',()=>{closedForPrint=ready?[...results.querySelectorAll('details:not([open])')]:[];closedForPrint.forEach(detail=>detail.open=true);});
window.addEventListener('afterprint',()=>{closedForPrint.forEach(detail=>detail.open=false);closedForPrint=[];});
document.querySelector('#request-reset').addEventListener('click',()=>{resetBox.hidden=false;document.querySelector('#cancel-reset').focus();});
document.querySelector('#cancel-reset').addEventListener('click',()=>{resetBox.hidden=true;document.querySelector('#request-reset').focus();});
document.querySelector('#confirm-reset').addEventListener('click',()=>{form.reset();ready=false;briefing=null;step=0;showResults.disabled=true;results.hidden=true;form.hidden=false;resetBox.hidden=true;error.textContent='';progress();showContext();});
steps.forEach(s=>s.hidden=true);progress();
