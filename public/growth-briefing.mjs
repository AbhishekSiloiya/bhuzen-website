export const goals={growth:'Grow revenue or enter new markets',profit:'Improve profitability',scale:'Build a stronger organisation',independence:'Create less owner dependence'};
export const priorities={commercial:'Commercial growth',operations:'Operational consistency',leadership:'Leadership ownership',owner:'Owner independence',execution:'Execution discipline',growth:'Capacity for growth'};
export const industries={general:'Another / mixed business',b2b:'B2B & manufacturing',retail:'Retail & consumer goods',ecommerce:'D2C & ecommerce',hospitality:'Travel & hospitality',family:'Family business',startup:'Startup & scale-up',professional:'Professional services'};
const options=o=>Object.entries(o).map(([value,label])=>({value,label}));
const ratings=labels=>labels.map((label,value)=>({value:String(value),label}));
export const questions=[
 {title:'What matters most for the next stage?',options:options(goals)},
 {title:'What is holding the business back most?',options:options({...Object.fromEntries(Object.entries(priorities).filter(([k])=>k!=='growth')),unsure:'I would like help identifying it'})},
 {title:'How often do decisions wait for you?',options:ratings(['Rarely — the team can move','Sometimes, for important exceptions','Often, including routine decisions','Most days, across several areas','Constantly — work stalls without me'])},
 {title:'How clearly does the team own decisions and outcomes?',options:ratings(['Clear ownership and authority','Mostly clear, with occasional gaps','Ownership varies across the business','People usually need my direction','Responsibility and authority are unclear'])},
 {title:'How reliably do operations deliver as demand grows?',options:ratings(['Consistently, with capacity to spare','Reliably, with occasional pressure','Service and handovers are uneven','Recurring issues consume attention','Demand regularly exceeds our capacity'])},
 {title:'How consistently do agreed priorities turn into results?',options:ratings(['Owners, measures and follow-through are clear','Most priorities move forward','Progress is uneven','Priorities frequently stall','Urgent work repeatedly displaces the plan'])}
];
const examples={general:'a recurring customer or operating decision',b2b:'a quotation or customer-order handover',retail:'a stock, replenishment or customer-service decision',ecommerce:'a promotion-to-fulfilment handover',hospitality:'a guest-service or location-level handover',family:'a recurring decision across family and management roles',startup:'a product or customer-delivery decision',professional:'a client-delivery or staffing decision'};
const actions={
 commercial:e=>'Choose one offer or customer segment. Review how '+e+' affects conversion, customer value or retention. Agree one commercial test, an accountable leader and the measure you will review.',
 operations:e=>'Map '+e+' from start to finish with the team. Identify one avoidable delay or rework point, agree ownership and test one change over the next seven days.',
 leadership:e=>'Give one leader ownership of '+e+'. Agree their decision boundaries, the outcome and the support available. Let them bring the result—not another approval request—to the next review.',
 owner:e=>'Choose '+e+' that currently returns to you. Agree an accountable person, clear decision limits and when to escalate. Test it for seven days without taking the work back.',
 execution:e=>'Connect '+e+' to one current business priority. Agree one owner, a measurable outcome and a seven-day review. Make room for the work by stopping or deferring one competing activity.',
 growth:e=>'Test '+e+' against the ambition for the next stage. Ask what would need to change in people, capacity or decision-making, then agree one small improvement to test this week.'
};
const perspectives={
 commercial:'Growth becomes more useful when the business understands which customers, choices and capabilities create lasting value.',
 operations:'A stronger business makes good work repeatable, without asking its owner to hold every handover together.',
 leadership:'Your experience has greater reach when it helps other people take responsibility with confidence.',
 owner:'The next stage is not about doing more yourself. It is about helping the business carry more without you.',
 execution:'Ambition starts to become real when a clear decision becomes an owned action and a useful review.',
 growth:'Before asking the business to grow, ask what its people and ways of working need to carry that growth well.'
};
const consequences={
 commercial:'Unexamined commercial choices can leave opportunities untested or effort concentrated on work that creates too little value.',
 operations:'Recurring delays, rework or inconsistent service may continue to absorb effort and weaken the experience customers receive.',
 leadership:'Unclear authority can keep capable people waiting and leave too much responsibility concentrated in the owner.',
 owner:'Routine approvals may keep consuming your attention, leaving less space for relationships, direction and the next stage.',
 execution:'Important priorities may continue to compete with urgent work, without clear evidence of what has changed.',
 growth:'The answers do not establish a current bottleneck. The opportunity is to test and protect your readiness for the next stage.'
};
function number(value,max,label){if(value===undefined||value===null)return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw new RangeError('Check '+label+'.');return value;}
export function buildBriefing(answers,context={}){
 if(!Array.isArray(answers)||answers.length!==6||!Object.hasOwn(goals,answers[0])||!(answers[1]==='unsure'||Object.hasOwn(priorities,answers[1])&&answers[1]!=='growth')||answers.slice(2).some(n=>typeof n!=='number'||!Number.isInteger(n)||n<0||n>4))throw new RangeError('Answer all six questions using the available choices.');
 const scores=answers.slice(2),keys=['owner','leadership','operations','execution'],max=Math.max(...scores),tied=scores.filter(n=>n===max).length>1;
 const key=answers[1]!=='unsure'?answers[1]:max===0?'growth':keys[scores.indexOf(max)];
 const industry=Object.hasOwn(industries,context.industry)?context.industry:'general',currency=['GBP','USD','EUR','INR','AED'].includes(context.currency)?context.currency:'GBP';
 const revenue=number(context.revenue,1e12,'annual revenue'),annualCost=number(context.annualCost,1e12,'estimated annual cost'),hours=number(context.hours,168,'avoidable hours per week'),weeks=context.weeks===undefined?46:number(context.weeks,52,'working weeks');
 if(weeks!==null&&weeks<1)throw new RangeError('Use 1–52 working weeks.');if(hours!==null&&weeks===null)throw new RangeError('Provide working weeks for the time illustration.');
 const revenueScenarios=revenue===null?[]:[1,3,5].map(rate=>({rate,value:revenue*rate/100}));
 const marginScenarios=revenue===null?[]:[.5,1,2].map(rate=>({rate,value:revenue*rate/100}));
 const mode=answers[0]==='profit'||key==='operations'?'margin':'revenue';
 const evidence=answers[1]!=='unsure'?'You selected '+priorities[key].toLowerCase()+' as the main constraint. Your ambition: '+goals[answers[0]].toLowerCase()+'. This is your chosen starting point—not a diagnosis.':max===0?'You reported little friction across ownership, leadership, operations and execution. Test that readiness against your ambition rather than assume a problem.':priorities[key]+' is one of your highest-reported areas of friction.'+(tied?' Other areas share the same rating; this is one practical place to begin.':'')+' This is a reflection on your answers, not an industry benchmark.';
 return {key,goal:answers[0],industry,currency,tied,heading:priorities[key],evidence,action:actions[key](examples[industry]),perspective:perspectives[key],consequence:consequences[key],milestone:'In 30 days, review the baseline, what changed, who owns the work and whether the change held without extra owner intervention. Decide what to keep, change or stop.',dimensions:keys.map((k,i)=>({key:k,label:priorities[k],value:scores[i]})),financial:{revenue,annualCost,annualHours:hours===null?null:hours*weeks,hours,weeks,mode,revenueScenarios,marginScenarios}};
}
