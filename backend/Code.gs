// Bind this script to the private spreadsheet. Set FAMILY_CODE in Script Properties.
function doPost(e) {
  const out = x => ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);
  const lock = LockService.getScriptLock();
  try {
    const p = JSON.parse(e.postData.contents);
    const props = PropertiesService.getScriptProperties();
    const secret = props.getProperty('FAMILY_CODE');
    if (!lock.tryLock(5000)) return out({error:'Busy; try again.'});
    const now = Date.now();
    const blocked = Number(props.getProperty('BLOCK_UNTIL') || 0);
    if (now < blocked) return out({error:'Too many attempts. Try again later.'});
    if (!secret || typeof p.code !== 'string' || p.code !== secret) {
      const n = Number(props.getProperty('FAILURES') || 0)+1;
      props.setProperty('FAILURES',String(n));
      if(n>=10){props.setProperty('BLOCK_UNTIL',String(now+300000));props.deleteProperty('FAILURES');}
      return out({error:'Invalid access code.'});
    }
    props.deleteProperty('FAILURES');
    const s = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID')).getSheetByName('Wishlists');
    if(!s) return out({error:'Missing Wishlists tab.'});
    const rows = s.getDataRange().getValues().slice(1);
    if(p.action==='add'){
      const name=String(p.name||'').trim();
      if(!name || name.length>60 || /^[=+@-]/.test(name)) return out({error:'Invalid name.'});
      s.appendRow([Utilities.getUuid(),name,'','']);
    } else if(p.action==='update'||p.action==='confirm'){
      const i=rows.findIndex(r=>r[0]===p.id);
      if(i<0) return out({error:'Member not found.'});
      const url=p.action==='update'?String(p.url||'').trim():String(rows[i][2]||'');
      if(!/^https?:\/\/[^\/?#\s]+[^\s]*$/i.test(url) || url.length>4096) return out({error:'Enter a valid website URL beginning with https:// or http://.'});
      s.getRange(i+2,3,1,2).setValues([[url,new Date()]]);
    } else if(p.action!=='list') return out({error:'Unknown action.'});
    SpreadsheetApp.flush();
    return out({members:s.getDataRange().getValues().slice(1).filter(r=>r[0]).map(r=>({id:r[0],name:r[1],url:r[2],confirmed:r[3] instanceof Date?r[3].toISOString():''}))});
  } catch(err){return out({error:'Request failed. Check backend configuration.'});}
  finally {if(lock.hasLock()) lock.releaseLock();}
}
function setup(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 if (!ss) throw new Error('Run setup from the bound spreadsheet editor.');
 PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
 let s=ss.getSheetByName('Wishlists');
 if(!s)s=ss.insertSheet('Wishlists');
 if(s.getLastRow()===0)s.appendRow(['ID','Name','Wishlist Link','Last Confirmed']);
 s.setFrozenRows(1);s.getRange('A1:D1').setFontWeight('bold');s.setColumnWidth(3,350);s.getRange('D2:D').setNumberFormat('mmm d, yyyy');
}