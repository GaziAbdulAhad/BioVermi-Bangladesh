/**
 * BioVermi Bangladesh — Google Apps Script backend
 * -------------------------------------------------
 * কীভাবে বসাবেন: SETUP.md দেখুন।
 *
 * এই স্ক্রিপ্ট Google Sheet-এর ভেতর (Extensions → Apps Script) বসান।
 * প্রতিটি ডেটা-ধরনের জন্য আলাদা ট্যাব (sheet) নিজে থেকে তৈরি হবে:
 *   gas_log, bed_log, harvest, sales, expenses, profile, quiz, calc_history
 */

// ঐচ্ছিক গোপন কী। ফাঁকা রাখলে কী ছাড়াই চলবে।
// দিলে ওয়েবসাইটের "ফার্ম ডেটা → সেটিংস"-এও একই কী দিতে হবে।
const SECRET = '';

// শুধু এই ট্যাবগুলোতে লেখা/পড়া যাবে (অন্য ট্যাব নিরাপদ থাকবে)
const ALLOWED = ['gas_log','bed_log','harvest','sales','expenses','profile','quiz','calc_history'];

function doGet(e){ return handle_(e && e.parameter ? e.parameter : {}); }

function doPost(e){
  var body = {};
  try { body = JSON.parse(e.postData.contents); }
  catch(err){ return out_({ok:false, error:'BAD_JSON'}); }
  return handle_(body);
}

function handle_(p){
  if (SECRET && String(p.key||'') !== SECRET) return out_({ok:false, error:'BAD_KEY'});
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var action = String(p.action||'');
    if (action === 'ping')   return out_({ok:true, pong:true, time:new Date().toISOString()});
    if (ALLOWED.indexOf(p.sheet) < 0) return out_({ok:false, error:'BAD_SHEET'});
    if (action === 'list')   return out_({ok:true, rows:list_(p.sheet)});
    if (action === 'add')    return out_({ok:true, id:add_(p.sheet, p.row)});
    if (action === 'delete') return out_({ok:true, deleted:del_(p.sheet, p.id)});
    if (action === 'upsert') return out_({ok:true, id:upsert_(p.sheet, p.matchField, p.row)});
    return out_({ok:false, error:'BAD_ACTION'});
  } catch(err){
    return out_({ok:false, error:String(err && err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch(x){}
  }
}

function out_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(name){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.setFrozenRows(1); }
  return sh;
}

// হেডার না থাকলে বা নতুন কলাম এলে যোগ করে
function headers_(sh, keys){
  var lastCol = sh.getLastColumn();
  var head = lastCol ? sh.getRange(1,1,1,lastCol).getValues()[0].map(String) : [];
  var changed = false;
  ['id'].concat(keys).concat(['saved_at']).forEach(function(k){
    if (head.indexOf(k) < 0) { head.push(k); changed = true; }
  });
  if (changed) {
    sh.getRange(1,1,1,head.length).setValues([head]).setFontWeight('bold');
  }
  return head;
}

function clean_(v){
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  // safe_() যে ' বসিয়েছিল তা পড়ার সময় সরানো
  if (typeof v === 'string' && /^'[=+\-@]/.test(v)) return v.slice(1);
  return v;
}

// ফর্মুলা ইনজেকশন ঠেকাতে: = + - @ দিয়ে শুরু হওয়া টেক্সটের আগে ' বসানো হয়
function safe_(v){
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function list_(name){
  var sh = sheet_(name);
  var lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2 || !lastCol) return [];
  var vals = sh.getRange(1,1,lastRow,lastCol).getValues();
  var head = vals[0].map(String);
  var rows = [];
  for (var i=1;i<vals.length;i++){
    var o = {}, empty = true;
    for (var c=0;c<head.length;c++){
      var v = clean_(vals[i][c]);
      if (v !== '' && v !== null) empty = false;
      o[head[c]] = v;
    }
    if (!empty) rows.push(o);
  }
  return rows.slice(-2000);
}

function add_(name, row){
  row = row || {};
  var keys = Object.keys(row).filter(function(k){ return k !== 'id'; });
  var sh = sheet_(name);
  var head = headers_(sh, keys);
  var id = row.id || Utilities.getUuid();
  // একই id আগে থাকলে আবার যোগ হবে না (নেটওয়ার্ক retry নিরাপদ)
  if (findRow_(sh, head, id) > 0) return id;
  var rec = head.map(function(h){
    if (h === 'id') return id;
    if (h === 'saved_at') return new Date();
    return safe_(row[h] === undefined ? '' : row[h]);
  });
  sh.appendRow(rec);
  return id;
}

function findRow_(sh, head, id){
  var idCol = head.indexOf('id') + 1;
  var last = sh.getLastRow();
  if (last < 2 || idCol < 1) return -1;
  var ids = sh.getRange(2, idCol, last-1, 1).getValues();
  for (var i=0;i<ids.length;i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function del_(name, id){
  if (!id) return false;
  var sh = sheet_(name);
  var head = headers_(sh, []);
  var r = findRow_(sh, head, id);
  if (r > 0) { sh.deleteRow(r); return true; }
  return false;
}

function upsert_(name, matchField, row){
  row = row || {};
  matchField = matchField || 'key';
  var sh = sheet_(name);
  var keys = Object.keys(row).filter(function(k){ return k !== 'id'; });
  var head = headers_(sh, keys);
  var mCol = head.indexOf(matchField);
  var last = sh.getLastRow();
  if (mCol >= 0 && last >= 2) {
    var col = sh.getRange(2, mCol+1, last-1, 1).getValues();
    for (var i=0;i<col.length;i++){
      if (String(col[i][0]) === String(row[matchField])) {
        var r = i + 2;
        var existing = sh.getRange(r,1,1,head.length).getValues()[0];
        var rec = head.map(function(h,idx){
          if (h === 'saved_at') return new Date();
          if (row[h] !== undefined) return safe_(row[h]);
          return existing[idx];
        });
        sh.getRange(r,1,1,head.length).setValues([rec]);
        return String(existing[head.indexOf('id')] || '');
      }
    }
  }
  return add_(name, row);
}

// এডিটর থেকে একবার চালিয়ে অনুমতি (Authorize) দিন
function setup(){ ALLOWED.forEach(function(n){ sheet_(n); }); }
