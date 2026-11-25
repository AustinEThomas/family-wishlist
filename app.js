'use strict';
const $=id=>document.getElementById(id);
let code='',busy=false;
const status=msg=>{$('status').textContent=msg;};
function node(tag,text,cls){const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;}
async function request(action,fields={}){
 if(!window.WISHLIST_API)throw Error('Setup required: configure the Google Apps Script endpoint.');
 const r=await fetch(window.WISHLIST_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,code,...fields}),redirect:'follow'});
 if(!r.ok)throw Error('Server unavailable.');
 const data=await r.json();if(data.error)throw Error(data.error);return data.members;
}
async function run(action,fields={}){
 if(busy)return false;busy=true;status('Saving or loading…');document.querySelectorAll('button').forEach(b=>b.disabled=true);
 try{const members=await request(action,fields);render(members);$('gate').hidden=true;$('directory').hidden=false;status('');return true;}
 catch(e){status(e.message||'Unable to connect.');return false;}
 finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}
}
function render(members){
 const root=$('members');root.replaceChildren();
 if(!members.length){root.append(node('p','No family members yet. Add one below.'));return;}
 const table=node('table','','wishlist-table');
 const head=document.createElement('thead'), hr=document.createElement('tr');
 for(const label of ['Name','Wishlist','Last confirmed','Edit']){const th=node('th',label);th.scope='col';hr.append(th);}
 head.append(hr);table.append(head);
 const body=document.createElement('tbody');table.append(body);
 for(const [i,m] of members.entries()){
  const row=document.createElement('tr'), details=document.createElement('tr');
  details.hidden=true;details.className='edit-row';details.id='edit-row-'+i;
  const name=node('th',m.name,'member-name');name.scope='row';row.append(name);
  const linkCell=document.createElement('td');
  if(/^https?:\/\/[^\/?#\s]+[^\s]*$/i.test(m.url)){const a=node('a','View list','wishlist-link');a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';linkCell.append(a);}else linkCell.append(node('span','Not set','muted'));
  row.append(linkCell);
  const date=m.confirmed?new Date(m.confirmed):null;
  const fresh=date&&Date.now()-date.getTime()<90*86400000;
  row.append(node('td',date?date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Not yet',fresh?'fresh':'stale'));
  const editCell=document.createElement('td'),edit=node('button','','pencil-button');
  edit.type='button';edit.title='Edit '+m.name;edit.setAttribute('aria-label','Edit '+m.name);edit.setAttribute('aria-expanded','false');edit.setAttribute('aria-controls',details.id);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');path.setAttribute('d','M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z');svg.append(path);edit.append(svg);editCell.append(edit);row.append(editCell);
  const panel=document.createElement('td');panel.colSpan=4;
  const form=node('form','','edit-form');const label=node('label','Wishlist link');label.htmlFor='wishlist-url-'+i;
  const input=document.createElement('input');input.id=label.htmlFor;input.type='url';input.required=true;input.value=m.url||'';input.placeholder='https://…';
  const actions=node('div','','actions');const save=node('button','Save link');save.type='submit';
  const confirm=node('button','Confirm current list','secondary');confirm.type='button';confirm.onclick=()=>run('confirm',{id:m.id});
  const cancel=node('button','Cancel','secondary');cancel.type='button';cancel.onclick=()=>{details.hidden=true;edit.setAttribute('aria-expanded','false');edit.focus();};
  actions.append(save);if(m.url)actions.append(confirm);actions.append(cancel);
  form.append(label,input,actions);form.onsubmit=e=>{e.preventDefault();run('update',{id:m.id,url:input.value});};
  edit.onclick=()=>{const opening=details.hidden;for(const d of body.querySelectorAll('.edit-row'))d.hidden=true;for(const b of body.querySelectorAll('.pencil-button'))b.setAttribute('aria-expanded','false');details.hidden=!opening;edit.setAttribute('aria-expanded',String(opening));if(opening)input.focus();};
  panel.append(form);details.append(panel);body.append(row,details);
 }
 root.append(table);
}
$('login').onsubmit=async e=>{e.preventDefault();code=$('code').value;if(await run('list')){if($('remember').checked)localStorage.setItem('wishlist-access',code);else localStorage.removeItem('wishlist-access');$('code').value='';}};
$('add').onsubmit=async e=>{e.preventDefault();if(await run('add',{name:$('name').value}))$('name').value='';};
$('refresh').onclick=()=>run('list');
$('logout').onclick=()=>{code='';localStorage.removeItem('wishlist-access');$('members').replaceChildren();$('directory').hidden=true;$('gate').hidden=false;status('');};
try{code=localStorage.getItem('wishlist-access')||'';if(code)run('list');}catch(e){}
