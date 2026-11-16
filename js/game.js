'use strict';

const KEY = 'pocket-grove-v1';
const $ = selector => document.querySelector(selector);
const dialog = $('#dialog');
const money = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
const usd = cents => money.format(cents/100);
const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)+Math.random().toString(36).slice(2);
const today = () => {
  const date=new Date();
  return new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,10);
};
const sum = entries => entries.reduce((total,entry)=>total+entry.amount,0);
const isAmount = value => Number.isSafeInteger(value)&&value>0&&value<=100000000;
const isSavingsAmount = value => Number.isSafeInteger(value)&&isAmount(Math.abs(value));
const isDate = value => typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
const isId = value => typeof value==='string'&&/^[\w-]{1,80}$/.test(value);
const isName = value => typeof value==='string'&&value.trim().length>0&&value.length<=60;
const unique = array => new Set(array).size===array.length;
const fresh = () => ({
  version:1,egg:null,pet:{stage:0,form:null},goals:[],expenses:[],milestones:[],
  achievements:[],coins:0,owned:[],equipped:{},settings:{motion:!matchMedia('(prefers-reduced-motion: reduce)').matches}
});

function validate(saved) {
  if(!saved||saved.version!==1)throw Error('Choose a Pocket Grove save file.');
  const list=(value,test)=>Array.isArray(value)&&value.length<=10000&&value.every(test);
  const entry=(e,validAmount)=>e&&isId(e.id)&&validAmount(e.amount)&&isDate(e.date);
  const records=(value,test)=>list(value,test)&&unique(value.map(e=>e.id));
  const eggValid=saved.egg===null||EGGS.some(e=>e.id===saved.egg);
  const petValid=saved.pet&&[0,1,2,3].includes(saved.pet.stage)&&(saved.pet.stage===3?[0,1].includes(saved.pet.form):saved.pet.form===null);
  const known=(entries,value)=>entries.some(e=>e.id===value);
  if(!eggValid||!petValid||
    !records(saved.goals,g=>g&&isId(g.id)&&isName(g.name)&&isAmount(g.target)&&(g.deadline===''||isDate(g.deadline))&&records(g.entries,e=>entry(e,isSavingsAmount)))||
    !records(saved.expenses,e=>entry(e,isAmount)&&isName(e.name)&&CATEGORIES.includes(e.category))||
    !list(saved.milestones,isId)||!unique(saved.milestones)||
    !list(saved.achievements,a=>known(ACHIEVEMENTS,a))||!unique(saved.achievements)||
    !list(saved.owned,o=>known(ITEMS,o))||!unique(saved.owned)||
    !Number.isSafeInteger(saved.coins)||saved.coins<0||
    !saved.equipped||Array.isArray(saved.equipped)||typeof saved.equipped!=='object'||
    !Object.entries(saved.equipped).every(([slot,item])=>saved.owned.includes(item)&&ITEMS.some(i=>i.id===item&&i.slot===slot))||
    typeof saved.settings?.motion!=='boolean'||
    saved.pet.stage>(saved.egg?(saved.milestones.length>=3?3:0):0)) {
    throw Error('This save file is incomplete or contains invalid records.');
  }
  return saved;
}

let state=fresh();
let loadError='';
try {
  const stored=localStorage.getItem(KEY);
  if(stored)state=validate(JSON.parse(stored));
} catch {
  loadError='The browser save could not be loaded. You can import a backup in Settings.';
}
let toastTimer;
let reactionUntil=0;
let lastFrame=0;
let restoreFocus=null;

function notify(message) {
  $('#toast').textContent=message;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{$('#toast').textContent='';},5500);
}
function metrics() {
  const entries=state.goals.flatMap(g=>g.entries);
  const saved=sum(entries);
  return {
    saved,spent:sum(state.expenses),target:state.goals.reduce((n,g)=>n+g.target,0),
    complete:state.goals.filter(g=>sum(g.entries)>=g.target).length,
    goals:state.milestones.length,days:new Set(entries.filter(e=>e.amount>0).map(e=>e.date)).size,
    hatched:state.pet.stage>=1,stage:state.pet.stage
  };
}
function react(message) {
  reactionUntil=performance.now()+1900;
  $('#reaction').textContent='✦ ♥ ✦';
  notify(message);
}
function progressGame() {
  const newGoals=state.goals.filter(g=>sum(g.entries)>=g.target&&!state.milestones.includes(g.id));
  for(const goal of newGoals){state.milestones.push(goal.id);state.coins+=25;}
  const m=metrics();
  let message='';
  if(newGoals.length)message=state.egg&&m.goals===1?'Your first goal is complete! The egg gave a wiggle.':state.egg&&m.goals===2?'Two goals complete! A tiny crack appeared.':'Goal complete! You earned '+(25*newGoals.length)+' grove coins.';
  if(state.egg) {
    const data=EGGS.find(e=>e.id===state.egg);
    if(state.pet.stage===0&&m.goals>=3){state.pet.stage=1;message='Your egg hatched! Meet '+data.pet+' the baby '+data.species.toLowerCase()+'.';}
    else if(state.pet.stage===1&&m.goals>=5){state.pet.stage=2;message=data.pet+' is growing up!';}
    else if(state.pet.stage===2&&(m.goals>=9||(m.goals>=7&&m.days>=4))){
      state.pet={stage:3,form:m.days>=4?0:1};
      message=data.pet+' evolved into '+data.forms[state.pet.form]+'!';
    }
  }
  for(const achievement of ACHIEVEMENTS) {
    if(!state.achievements.includes(achievement.id)&&achievement.earned(metrics())) {
      state.achievements.push(achievement.id);
      state.coins+=achievement.coins;
      if(!message)message='Achievement unlocked! '+achievement.name+' · +'+achievement.coins+' coins.';
    }
  }
  return message;
}
function commit(message='') {
  const progression=progressGame();
  let stored=true;
  try {localStorage.setItem(KEY,JSON.stringify(state));}
  catch {stored=false;}
  render();
  if(progression)react(progression);
  else if(message)notify(message);
  if(!stored)notify('Browser storage is unavailable. Export your progress in Settings.');
}

const button=(action,label,extra='',className='mini')=>'<button type="button" class="'+className+'" data-action="'+action+'" '+extra+'>'+label+'</button>';
const meter=(percent,label)=>'<div class="meter" role="progressbar" aria-label="'+escapeHtml(label)+'" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+percent+'%"></span></div>';
const ratio=(a,b)=>b?Math.max(0,Math.min(100,Math.floor(a/b*100))):0;
const goalById=key=>state.goals.find(g=>g.id===key);
const stageName=()=>['Egg','Baby','Growing','Evolved'][state.pet.stage];

function render() {
  const m=metrics();
  const egg=EGGS.find(e=>e.id===state.egg);
  $('#stats').innerHTML=[
    ['◇',usd(m.saved),'saved',''],['✓',m.complete,'done',''],['✦',egg?stageName():'Choose an egg','',''],['●',state.coins,'coins','coin']
  ].map(([icon,value,label,className])=>'<span class="stat '+className+'"><i aria-hidden="true">'+icon+'</i> <strong>'+value+'</strong> '+label+'</span>').join('');
  $('#welcome-title').textContent=egg?'Welcome back to the Grove!':'Welcome to the Grove!';
  $('#welcome-copy').textContent=egg?'Make a little progress today and see what grows.':'Grow your savings and raise a little companion along the way.';
  $('#stage').textContent=egg?'✦  '+stageName():'✦  Choose an egg';
  $('#habitat-subtitle').textContent=state.pet.stage?(state.pet.stage===3?egg.forms[state.pet.form]:egg.pet+' the '+egg.species):'A quiet corner of the grove';
  $('.pet-button').hidden=!egg;
  const intro=$('#egg-intro');
  intro.hidden=Boolean(egg);
  document.querySelector('.bar').inert=!egg;
  document.querySelector('main').inert=!egg;
  if(!egg)$('#egg-choices').innerHTML=EGGS.map(e=>button('egg','<span class="egg-name">'+e.name+'</span>','data-id="'+e.id+'" aria-label="Choose '+e.name+' · '+e.theme+'"','egg-select')).join('');
  $('#habitat-content').innerHTML=egg?growth(m):'';
  $('#goals').innerHTML=state.goals.length?'<p class="overview-line"><b>'+usd(m.saved)+'</b> recorded across '+state.goals.length+' '+(state.goals.length===1?'goal':'goals')+'.</p>'+state.goals.map(goalCard).join(''):'<div class="goal-empty"><span class="empty-icon" aria-hidden="true">◇</span><b>Your clipboard is empty</b><p>What would you like to save for?</p></div>';
  $('#places').innerHTML=PLACES.map(p=>{
    const locked=m.goals<p.unlock;
    return button('place','<span class="tile '+p.color+'" aria-hidden="true">'+p.icon+'</span><span><strong>'+p.name+'</strong><small>'+(locked?'Unlocks at '+p.unlock+' '+(p.unlock===1?'goal':'goals'):'Explore')+'</small></span><span class="lock" aria-hidden="true">'+(locked?'⌑':'›')+'</span>','data-id="'+p.id+'"','place');
  }).join('');
}
function goalCard(g) {
  const saved=sum(g.entries);
  const percent=ratio(saved,g.target);
  const complete=saved>=g.target;
  const attr='data-id="'+g.id+'"';
  return '<article class="goal '+(complete?'complete':'')+'"><h3>'+escapeHtml(g.name)+'</h3>'+
    (g.deadline?'<small>Target date · '+g.deadline+'</small>':'')+
    '<div class="goal-line"><span>'+usd(saved)+' / '+usd(g.target)+'</span><b>'+(complete?'✓ Complete':percent+'%')+'</b></div>'+
    meter(percent,g.name)+'<div class="goal-actions">'+button('contribution','＋ Record',attr)+button('history','Entries',attr)+button('edit-goal','Edit',attr)+'</div></article>';
}
function growth(m) {
  const stage=state.pet.stage;
  const next=[3,5,9,9][stage];
  const hint=[
    'Complete three savings goals to hatch your egg.',
    'Complete five goals to help your companion grow.',
    'Evolve at nine completed goals, or at seven with savings recorded on four days.',
    'Your companion has reached its final form.'
  ][stage];
  return '<div class="growth"><div class="row"><strong>'+['Hatching progress','Growing up','Evolution progress','Fully evolved'][stage]+'</strong><small>'+
    (stage===3?'✦':m.goals+' / '+(stage===2&&m.days>=4?7:next)+' goals')+'</small></div><p>'+hint+'</p>'+
    meter(stage===3?100:ratio(m.goals,stage===2&&m.days>=4?7:next),'Pet progression')+'</div>';
}

function open(title,body) {
  if(!dialog.open)restoreFocus=document.activeElement;
  $('#dialog-content').innerHTML='<div class="dialog-head"><h2 id="dialog-title">'+title+'</h2>'+button('close','×','aria-label="Close dialog"','icon-button')+'</div><div class="dialog-body">'+body+'</div>';
  dialog.setAttribute('aria-labelledby','dialog-title');
  if(!dialog.open)dialog.showModal();
  const initial=dialog.querySelector('form input, form select, [autofocus]')??dialog.querySelector('[data-action="close"]');
  initial.focus();
}
dialog.addEventListener('close',()=>{
  if(restoreFocus?.isConnected)restoreFocus.focus();
  else $('.wide').focus();
});
const form=(kind,fields,label,attrs='')=>'<form data-form="'+kind+'" '+attrs+'>'+fields+'<p class="error" role="alert"></p><button class="primary" type="submit">'+label+'</button></form>';
const textField=(label,name,value='')=>'<label>'+label+'<input name="'+name+'" maxlength="60" required value="'+escapeHtml(value)+'"></label>';
const amountField=(label,amount)=>'<label>'+label+'<input name="amount" type="number" inputmode="decimal" min="0.01" max="1000000" step="0.01" required value="'+(amount?amount/100:'')+'"></label>';
const dateField=(label,value,optional=false,min='')=>'<label>'+label+'<input name="date" type="date" value="'+value+'" '+(min?'min="'+min+'" ':'')+(optional?'':'required')+'></label>';
function editGoal(g) {
  open(g?'Edit savings goal':'New savings goal',form('goal',textField('What are you saving for?','name',g?.name)+amountField('Target amount ($)',g?.target)+dateField('Target date (optional)',g?.deadline??'',true,today()),'Save goal',g?'data-id="'+g.id+'"':'')+
    (g?button('delete-goal','Delete goal','data-id="'+g.id+'"','mini danger'):''));
}
function contribution(g,entry) {
  const amount='<label>Amount ($)<input name="amount" type="text" maxlength="11" required value="'+(entry?entry.amount/100:'')+'" aria-describedby="entry-amount-hint"></label>';
  open(entry?'Edit savings entry':'Record savings','<p>'+escapeHtml(g.name)+'</p><p id="entry-amount-hint">Enter a negative amount, like −5.00, to subtract money from this goal.</p>'+form('entry',amount+dateField('Date',entry?.date??today()),'Save entry','data-id="'+g.id+'" data-entry="'+(entry?.id??'')+'"'));
}
function history(g) {
  open('Savings entries','<p>'+escapeHtml(g.name)+' · '+usd(sum(g.entries))+' recorded</p>'+
    (g.entries.length?g.entries.map(e=>'<div class="row"><div><strong>'+usd(e.amount)+'</strong><small>'+e.date+'</small></div><div class="goal-actions">'+
    button('edit-entry','Edit','data-id="'+g.id+'" data-entry="'+e.id+'"')+button('delete-entry','Remove','data-id="'+g.id+'" data-entry="'+e.id+'"','mini danger')+'</div></div>').join(''):'<p>No entries yet.</p>')+
    '<p class="goal-actions">'+button('contribution','＋ Record savings','data-id="'+g.id+'"')+'</p>');
}
function budget() {
  const m=metrics();
  const progress=ratio(state.goals.reduce((total,g)=>total+Math.min(sum(g.entries),g.target),0),m.target);
  open('Budget overview','<div class="row"><strong>Recorded savings</strong><b>'+usd(m.saved)+'</b></div><div class="row"><strong>Savings targets</strong><b>'+usd(m.target)+'</b></div><div class="row"><strong>Overall goal progress</strong><b>'+progress+'%</b></div>'+meter(progress,'Overall goal progress')+'<div class="row"><strong>Goals completed</strong><b>'+m.complete+' / '+state.goals.length+'</b></div><div class="row"><strong>Recorded expenses</strong><b>'+usd(m.spent)+'</b></div><p class="goal-actions">'+button('expenses','Open spending tracker')+'</p>');
}
function expenses() {
  open('Spending tracker','<p>Track purchases if it helps you plan. Spending is part of life.</p>'+button('new-expense','＋ Record expense')+
    (state.expenses.length?state.expenses.map(e=>'<div class="row"><div><strong>'+escapeHtml(e.name)+' · '+usd(e.amount)+'</strong><small>'+e.category+' · '+e.date+'</small></div><div class="goal-actions">'+button('edit-expense','Edit','data-id="'+e.id+'"')+button('delete-expense','Remove','data-id="'+e.id+'"','mini danger')+'</div></div>').join(''):'<p class="goal-actions">No expenses recorded.</p>')+
    '<p class="goal-actions">'+button('budget','Back to budget overview')+'</p>');
}
function editExpense(entry) {
  const categories='<label>Category<select name="category">'+CATEGORIES.map(c=>'<option '+(entry?.category===c?'selected':'')+'>'+c+'</option>').join('')+'</select></label>';
  open(entry?'Edit expense':'Record an expense',form('expense',textField('What did you buy?','name',entry?.name)+amountField('Amount ($)',entry?.amount)+categories+dateField('Date',entry?.date??today()),'Save expense',entry?'data-id="'+entry.id+'"':''));
}
function place(p) {
  const m=metrics();
  if(m.goals<p.unlock){
    open(p.name,'<p>Complete '+(p.unlock-m.goals)+' more '+(p.unlock-m.goals===1?'goal':'goals')+' to unlock this place.</p>');
    return;
  }
  if(p.id==='achievements'){
    open(p.name,ACHIEVEMENTS.map(a=>'<div class="row"><div><strong>'+(state.achievements.includes(a.id)?'★ ':'☆ ')+a.name+'</strong><small>'+a.text+'</small></div><small>'+a.coins+' coins</small></div>').join(''));
    return;
  }
  if(p.id==='collection'){
    open(p.name,EGGS.map(e=>{
      const discovered=state.egg===e.id&&state.pet.stage>0;
      return '<div class="row"><div><strong>'+(discovered?e.pet+' · '+e.species:e.name)+'</strong><small>'+(discovered?(state.pet.stage===3?e.forms[state.pet.form]:stageName()):'Undiscovered')+'</small></div></div>';
    }).join(''));
    return;
  }
  const inventory=p.id==='inventory';
  const items=ITEMS.filter(i=>inventory?state.owned.includes(i.id):i.shop===p.id);
  open(p.name,(inventory?'<p>Change what your pet wears and how your meadow looks.</p>':'<p><strong>'+state.coins+' grove coins</strong> · Earned in game for cosmetics.</p>')+
    (items.length?items.map(i=>{
      const owned=state.owned.includes(i.id);
      const equipped=state.equipped[i.slot]===i.id;
      return '<div class="row"><div><strong>'+i.icon+' &nbsp; '+i.name+'</strong><small>'+(equipped?'Equipped':owned?'Owned':i.price+' coins')+'</small></div>'+
        button(owned?'equip':'buy',equipped?'Unequip':owned?'Equip':'Buy','data-id="'+i.id+'" data-place="'+p.id+'" '+(!owned&&state.coins<i.price?'disabled':'') )+'</div>';
    }).join(''):'<p>Your inventory is empty.</p>'));
}
function settings() {
  open('Settings','<p>Your progress is saved locally in this browser. To move it to another device, export a JSON backup and import it there.</p>'+
    '<label class="check"><input type="checkbox" id="motion" '+(state.settings.motion?'checked':'')+'> Play animations</label>'+
    '<div class="goal-actions">'+button('export','Export save')+button('import','Import save')+button('reset','Reset progress','','mini danger')+'</div>');
}
function confirmAction(title,copy,action,attrs='') {
  open(title,'<p>'+copy+'</p><div class="goal-actions">'+button(action,'Confirm',attrs,'mini danger')+button('close','Cancel')+'</div>');
}

document.addEventListener('submit',event=>{
  const formElement=event.target;
  const kind=formElement.dataset.form;
  if(!kind)return;
  event.preventDefault();
  const data=new FormData(formElement);
  const name=String(data.get('name')??'').trim();
  const amountText=String(data.get('amount')??'').trim().replace(/^−/,'-');
  const amount=Math.round(Number(amountText)*100);
  const validAmount=kind==='entry'
    ? /^-?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(amountText)&&isSavingsAmount(amount)
    : isAmount(amount);
  const date=String(data.get('date')??'');
  if(!validAmount||(kind!=='entry'&&!isName(name))||((kind!=='goal'||date)&&!isDate(date))){
    formElement.querySelector('.error').textContent=kind==='entry'&&!validAmount
      ? 'Enter a nonzero amount with up to two decimal places, such as 5 or -5.00.'
      : 'Check the name, amount, and date, then try again.';
    return;
  }
  if(kind==='goal'&&date&&date<today()){
    formElement.querySelector('.error').textContent='Choose today or a later target date, or leave it blank.';
    return;
  }
  const key=formElement.dataset.id;
  const g=goalById(key);
  if(kind==='goal'){
    if(g)Object.assign(g,{name,target:amount,deadline:date});
    else state.goals.push({id:id(),name,target:amount,deadline:date,entries:[]});
    dialog.close();commit('Savings goal saved.');
  }
  if(kind==='entry'&&g){
    const entry=g.entries.find(e=>e.id===formElement.dataset.entry);
    if(entry)Object.assign(entry,{amount,date});
    else g.entries.push({id:id(),amount,date});
    dialog.close();commit('Savings entry saved.');
  }
  if(kind==='expense'){
    const category=data.get('category');
    if(!CATEGORIES.includes(category))return;
    const entry=state.expenses.find(e=>e.id===key);
    if(entry)Object.assign(entry,{name,amount,date,category});
    else state.expenses.push({id:id(),name,amount,date,category});
    commit('Expense saved.');expenses();
  }
});

document.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');
  if(!target||target.disabled)return;
  const {action,id:key,entry:entryId,place:placeId}=target.dataset;
  const g=goalById(key);
  const entry=g?.entries.find(e=>e.id===entryId);
  const expense=state.expenses.find(e=>e.id===key);
  const placeById=value=>PLACES.find(p=>p.id===value);
  switch(action){
    case 'close':dialog.close();break;
    case 'egg':
      if(!state.egg&&EGGS.some(e=>e.id===key)){
        if($('#egg-intro').classList.contains('choosing'))break;
        const intro=$('#egg-intro');
        intro.classList.add('choosing');
        target.classList.add('chosen');
        const enter=()=>{
          state.egg=key;
          intro.classList.remove('choosing');
          commit();
          if(!state.pet.stage)react('Your egg is cozy in its new home!');
          $('.pet-button').focus();
        };
        if(state.settings.motion)setTimeout(enter,480);
        else enter();
      }break;
    case 'pet':react(state.pet.stage?'Your companion is happy to see you!':'A little warmth for your egg.');break;
    case 'budget':budget();break;
    case 'expenses':expenses();break;
    case 'new-expense':editExpense();break;
    case 'edit-expense':if(expense)editExpense(expense);break;
    case 'delete-expense':if(expense)confirmAction('Remove expense?','This will remove the expense from your spending tracker.','confirm-expense','data-id="'+key+'"');break;
    case 'confirm-expense':
      state.expenses=state.expenses.filter(e=>e.id!==key);commit('Expense removed.');expenses();break;
    case 'new-goal':editGoal();break;
    case 'edit-goal':if(g)editGoal(g);break;
    case 'contribution':if(g)contribution(g);break;
    case 'history':if(g)history(g);break;
    case 'edit-entry':if(entry)contribution(g,entry);break;
    case 'delete-entry':if(entry)confirmAction('Remove savings entry?','This will update the savings recorded for this goal.','confirm-entry','data-id="'+key+'" data-entry="'+entryId+'"');break;
    case 'confirm-entry':if(entry){g.entries=g.entries.filter(e=>e.id!==entryId);commit('Savings entry removed.');history(g);}break;
    case 'delete-goal':if(g)confirmAction('Delete savings goal?','This will remove the goal and its savings entries from your budget.','confirm-goal','data-id="'+key+'"');break;
    case 'confirm-goal':
      state.goals=state.goals.filter(goal=>goal.id!==key);dialog.close();commit('Savings goal deleted.');break;
    case 'place':if(placeById(key))place(placeById(key));break;
    case 'buy':
    case 'equip': {
      const item=ITEMS.find(i=>i.id===key);
      const location=placeById(placeId);
      const shop=item&&placeById(item.shop);
      if(!item||!location||state.milestones.length<shop.unlock)break;
      if(action==='buy'){
        if(state.owned.includes(key)||state.coins<item.price)break;
        state.coins-=item.price;
        state.owned.push(key);
      }
      if(!state.owned.includes(key))break;
      if(state.equipped[item.slot]===key)delete state.equipped[item.slot];
      else state.equipped[item.slot]=key;
      commit(action==='buy'?item.name+' purchased and equipped.':'Habitat updated.');
      place(location);
      break;
    }
    case 'settings':settings();break;
    case 'export':{
      const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download='pocket-grove-'+today()+'.json';link.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      break;
    }
    case 'import':confirmAction('Import a save?','Your selected backup will replace the current progress in this browser.','choose-import');break;
    case 'choose-import':$('#import-file').click();break;
    case 'reset':confirmAction('Reset all progress?','This will clear your pet, budget, and items from this browser.','confirm-reset');break;
    case 'confirm-reset':state=fresh();dialog.close();commit('A fresh grove is ready.');break;
  }
});
document.addEventListener('change',async event=>{
  if(event.target.id==='motion'){
    state.settings.motion=event.target.checked;
    commit();
  }
  if(event.target.id==='import-file'){
    const file=event.target.files[0];
    event.target.value='';
    if(!file)return;
    try {
      if(file.size>8000000)throw Error('This save file is too large.');
      const candidate=validate(JSON.parse(await file.text()));
      state=candidate;
      if(dialog.open)dialog.close();
      commit('Save imported.');
    } catch(error) {
      notify(error instanceof SyntaxError?'Choose a valid JSON backup.':error.message);
    }
  }
});

function animate(now) {
  if(now-lastFrame>32){
    if(state.egg)paintWorld(now,state,reactionUntil);
    else paintIntro(now,state.settings.motion);
    if(now>=reactionUntil&&$('#reaction').textContent)$('#reaction').textContent='';
    lastFrame=now;
  }
  requestAnimationFrame(animate);
}
render();
if(state.egg)paintWorld(performance.now(),state,0);
else paintIntro(performance.now(),state.settings.motion);
requestAnimationFrame(animate);
if(loadError)notify(loadError);
