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
 if(!members.length)root.append(node('p','No family members yet. Add one below.'));
 for(const m of members){
  const card=node('article','');card.append(node('h3',m.name));
  const date=m.confirmed?new Date(m.confirmed):null;
  const fresh=date&&Date.now()-date.getTime()<90*86400000;
  card.append(node('p',date?'Last confirmed: '+date.toLocaleDateString():'Not confirmed yet',fresh?'fresh':'stale'));
  const actions=node('div','','actions');
  if(/^https:\/\/(?:www\.)?amazon\.com\//.test(m.url)){const a=node('a','Open wishlist','action');a.href=m.url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);}
  const edit=node('button','Update link','secondary');const confirm=node('button','Confirm current list','secondary');
  edit.onclick=()=>{form.hidden=!form.hidden;input.focus();};confirm.onclick=()=>run('confirm',{id:m.id});
  actions.append(edit);if(m.url)actions.append(confirm);card.append(actions);
  const form=node('form','');form.hidden=true;const input=document.createElement('input');input.type='url';input.required=true;input.value=m.url||'';input.placeholder='Amazon wishlist URL';input.setAttribute('aria-label','Amazon wishlist URL');
  const save=node('button','Save link');form.append(input,save);form.onsubmit=e=>{e.preventDefault();run('update',{id:m.id,url:input.value});};card.append(form);root.append(card);
 }
}
$('login').onsubmit=async e=>{e.preventDefault();code=$('code').value;if(await run('list')){if($('remember').checked)localStorage.setItem('wishlist-access',code);else localStorage.removeItem('wishlist-access');$('code').value='';}};
$('add').onsubmit=async e=>{e.preventDefault();if(await run('add',{name:$('name').value}))$('name').value='';};
$('refresh').onclick=()=>run('list');
$('logout').onclick=()=>{code='';localStorage.removeItem('wishlist-access');$('members').replaceChildren();$('directory').hidden=true;$('gate').hidden=false;status('');};
try{code=localStorage.getItem('wishlist-access')||'';if(code)run('list');}catch(e){}
