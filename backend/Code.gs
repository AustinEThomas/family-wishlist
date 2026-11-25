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
    if(s.getRange('E1').getValue()!=='Birthday') { s.getRange('E1').setValue('Birthday').setFontWeight('bold'); s.getRange('E2:E').setNumberFormat('@'); }
    if(p.action==='add'){
      const name=String(p.name||'').trim();
      if(!name || name.length>60 || /^[=+@-]/.test(name)) return out({error:'Invalid name.'});
      s.appendRow([Utilities.getUuid(),name,'','','']);
    } else if(p.action==='update'||p.action==='confirm'){
      const i=rows.findIndex(r=>r[0]===p.id);
      if(i<0) return out({error:'Member not found.'});
      const url=p.action==='update'?String(p.url||'').trim():String(rows[i][2]||'');
      if((url || p.action==='confirm') && (!/^https?:\/\/[^\/?#\s]+[^\s]*$/i.test(url) || url.length>4096)) return out({error:'Enter a valid website URL beginning with https:// or http://.'});
      if(p.action==='update' && Object.prototype.hasOwnProperty.call(p,'birthday')){
        const b=String(p.birthday||'').trim();
        if(b && !validBirthday(b)) return out({error:'Enter a valid birthday in MM/DD format.'});
        s.getRange(i+2,5).setNumberFormat('@').setValue(b);
      }
      if(p.action==='confirm' || url!==String(rows[i][2]||'')){
        s.getRange(i+2,3,1,2).setValues([[url,url?new Date():'']]);
      }
    } else if(p.action!=='list') return out({error:'Unknown action.'});
    SpreadsheetApp.flush();
    return out({members:s.getDataRange().getValues().slice(1).filter(r=>r[0]).map(r=>({id:r[0],name:r[1],url:r[2],confirmed:r[3] instanceof Date?r[3].toISOString():'',birthday:r[4] instanceof Date?Utilities.formatDate(r[4],s.getParent().getSpreadsheetTimeZone(),'MM/dd'):String(r[4]||'')}))});
  } catch(err){return out({error:'Request failed. Check backend configuration.'});}
  finally {if(lock.hasLock()) lock.releaseLock();}
}
function setup(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();
 if (!ss) throw new Error('Run setup from the bound spreadsheet editor.');
 PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
 let s=ss.getSheetByName('Wishlists');
 if(!s)s=ss.insertSheet('Wishlists');
 if(s.getLastRow()===0)s.appendRow(['ID','Name','Wishlist Link','Last Confirmed','Birthday']);
 s.getRange('E1').setValue('Birthday').setFontWeight('bold');s.getRange('E2:E').setNumberFormat('@');
 s.setFrozenRows(1);s.getRange('A1:D1').setFontWeight('bold');s.setColumnWidth(3,350);s.getRange('D2:D').setNumberFormat('mmm d, yyyy');
}
function validBirthday(b){if(!/^\d{2}\/\d{2}$/.test(b))return false;const [m,d]=b.split('/').map(Number);return m>=1&&m<=12&&d>=1&&d<=[31,29,31,30,31,30,31,31,30,31,30,31][m-1];}
