'use strict';
const $=id=>document.getElementById(id);
let code='',busy=false;
const status=msg=>{const target=$('add-dialog').open?'add-status':$('directory').hidden?'status':'directory-status';for(const id of ['status','directory-status','add-status'])$(id).textContent=id===target?msg:'';};
function node(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
async function request(action,fields={}){
 if(!window.WISHLIST_API)throw Error('Setup required: configure the Google Apps Script endpoint.');
 const r=await fetch(window.WISHLIST_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,code,...fields}),redirect:'follow'});
 if(!r.ok)throw Error('Server unavailable.');
 const data=await r.json();if(data.error)throw Error(data.error);return data.members;
}
async function run(action,fields={}){
 if(busy)return false;busy=true;status('Saving or loading…');document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const members=await request(action,fields);render(members);$('gate').hidden=true;$('directory').hidden=false;status(action==='confirm'?'Wishlist confirmed.':action==='update'?'Changes saved.':action==='add'?'Family member added.':'');return true;}
 catch(e){status(e.message||'Unable to connect.');return false;}
 finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
function render(members){
 const root=$('members');root.replaceChildren();
 if(!members.length){root.append(node('p','No family members yet. Use Add member to get started.'));return;}
 const table=node('table','','wishlist-table');
 const head=document.createElement('thead'), hr=document.createElement('tr');
 for(const label of ['Name','Birthday','Wishlist','Last confirmed','Edit']){const th=node('th',label);th.scope='col';hr.append(th);}
 head.append(hr);table.append(head);
 const body=document.createElement('tbody');table.append(body);
 for(const [i,m] of members.entries()){
  const row=document.createElement('tr'), details=document.createElement('tr');row.className='member-row';
  details.hidden=true;details.className='edit-row';details.id='edit-row-'+i;
  const name=node('th',m.name,'member-name');name.scope='row';row.append(name);
  const birthdayCell=node('td',m.birthday||'—','birthday-cell');birthdayCell.dataset.label='Birthday';row.append(birthdayCell);
  const linkCell=document.createElement('td');linkCell.className='link-cell';linkCell.dataset.label='Wishlist';
  if(/^https?:\/\/[^\/?#\s]+[^\s]*$/i.test(m.url)){const a=node('a','View list','wishlist-link');a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';linkCell.append(a);}else linkCell.append(node('span','Not set','muted'));
  row.append(linkCell);
  const date=m.confirmed?new Date(m.confirmed):null;
  const fresh=date&&Date.now()-date.getTime()<90*86400000;
  const dateCell=node('td','','date-cell');dateCell.dataset.label='Last confirmed';const dateGroup=node('div','','date-group');dateGroup.append(node('span',date?date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Not yet',fresh?'fresh':'stale'));dateCell.append(dateGroup);row.append(dateCell);
  const editCell=document.createElement('td'),edit=node('button','','pencil-button');
  edit.type='button';edit.title='Edit '+m.name;edit.setAttribute('aria-label','Edit '+m.name);edit.setAttribute('aria-expanded','false');edit.setAttribute('aria-controls',details.id);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');path.setAttribute('d','M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z');svg.append(path);edit.append(svg);const quick=node('button','✓','confirm-button');quick.type='button';quick.title='Confirm current list';quick.setAttribute('aria-label','Confirm wishlist for '+m.name);quick.onclick=()=>run('confirm',{id:m.id});quick.disabled=!m.url;if(m.url)dateGroup.append(quick);editCell.append(edit);editCell.className='row-actions';row.append(editCell);
  const panel=document.createElement('td');panel.colSpan=5;
  const form=node('form','','edit-form');const label=node('label','Wishlist link');label.htmlFor='wishlist-url-'+i;
  const input=document.createElement('input');input.id=label.htmlFor;input.type='url';input.required=false;input.value=m.url||'';input.placeholder='https://…';
  const actions=node('div','','actions');const save=node('button','Save changes');save.type='submit';
    const cancel=node('button','Cancel','secondary');cancel.type='button';cancel.onclick=()=>{details.hidden=true;edit.setAttribute('aria-expanded','false');edit.focus();};
  actions.append(cancel,save);
  const birthdayLabel=node('label','Birthday (MM/DD)');birthdayLabel.htmlFor='birthday-'+i;const birthday=document.createElement('input');birthday.id=birthdayLabel.htmlFor;birthday.type='text';birthday.placeholder='MM/DD';birthday.maxLength=5;birthday.pattern='[0-9]{2}/[0-9]{2}';birthday.value=m.birthday||'';birthday.inputMode='numeric';birthday.maxLength=5;
  birthday.addEventListener('input',e=>{
    const raw=birthday.value, pos=birthday.selectionStart??raw.length;
    const digits=raw.replace(/[^0-9]/g,'').slice(0,4);
    const before=raw.slice(0,pos).replace(/[^0-9]/g,'').length;
    const deleting=(e.inputType||'').startsWith('delete');
    const formatted=digits.length>2?digits.slice(0,2)+'/'+digits.slice(2):digits.length===2&&!deleting?digits+'/':digits;
    birthday.value=formatted;
    const caret=Math.min(formatted.length,before+(formatted.includes('/')&&before>=2?1:0));
    birthday.setSelectionRange(caret,caret);
  });
  const urlField=node('div','','form-field');urlField.append(label,input);const birthdayField=node('div','','form-field');birthdayField.append(birthdayLabel,birthday);form.append(urlField,birthdayField,actions);form.onsubmit=e=>{e.preventDefault();run('update',{id:m.id,url:input.value,birthday:birthday.value});};
  edit.onclick=()=>{const opening=details.hidden;for(const d of body.querySelectorAll('.edit-row'))d.hidden=true;for(const b of body.querySelectorAll('.pencil-button'))b.setAttribute('aria-expanded','false');details.hidden=!opening;edit.setAttribute('aria-expanded',String(opening));if(opening)input.focus();};
  panel.append(form);details.append(panel);body.append(row,details);
 }
 root.append(table);
}
$('login').onsubmit=async e=>{e.preventDefault();code=$('code').value;if(await run('list')){if($('remember').checked)localStorage.setItem('wishlist-access',code);else localStorage.removeItem('wishlist-access');$('code').value='';}};
function toggleAdd(open){const d=$('add-dialog');if(open&&!d.open){$('add-status').textContent='';d.showModal();$('add-toggle').setAttribute('aria-expanded','true');$('name').focus();}else if(!open&&d.open){d.close();}}
$('add-dialog').addEventListener('close',()=>{$('add-toggle').setAttribute('aria-expanded','false');$('name').value='';$('add-status').textContent='';$('add-toggle').focus();});
$('add-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('add-close').onclick=()=>toggleAdd(false);
$('add-toggle').onclick=()=>toggleAdd(!$('add-dialog').open);
$('add-cancel').onclick=()=>toggleAdd(false);
$('add').onsubmit=async e=>{e.preventDefault();if(await run('add',{name:$('name').value})){toggleAdd(false);status('Family member added.');}};
$('refresh').onclick=()=>run('list');
$('logout').onclick=()=>{if($('add-dialog').open)$('add-dialog').close();code='';localStorage.removeItem('wishlist-access');$('members').replaceChildren();$('directory').hidden=true;$('gate').hidden=false;status('');};
try{code=localStorage.getItem('wishlist-access')||'';if(code)run('list');}catch(e){}
