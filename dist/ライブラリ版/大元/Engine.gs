var Sheets = (typeof Sheets !== 'undefined' && Sheets && Sheets.Spreadsheets) ? Sheets : (function () {
function qs_(params) {
if (!params) return '';
var p = [];
Object.keys(params).forEach(function (k) {
var v = params[k];
if (v === undefined || v === null || v === '') return;
if (Array.isArray(v)) {
v.forEach(function (item) { p.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(item))); });
} else {
p.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
}
});
return p.length ? ('?' + p.join('&')) : '';
}
function call_(method, url, payload) {
var opt = { method: method, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
if (payload !== undefined) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(payload); }
var res = UrlFetchApp.fetch(url, opt);
var code = res.getResponseCode();
var txt = res.getContentText() || '{}';
var obj = JSON.parse(txt);
if (code >= 400 || obj.error) {
throw new Error((obj.error && obj.error.message) || ('Sheets API error ' + code));
}
return obj;
}
return {
Spreadsheets: {
get: function (ssId, params) {
return call_('get', 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(ssId) + qs_(params));
},
batchUpdate: function (body, ssId) {
return call_('post', 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(ssId) + ':batchUpdate', body);
}
}
};
})();
var ENGINE_VERSION = 'ws-1+0d2b37c9';
var BK_BOOK_NAME = 'GASマネージャー_控え';
var BK_DOC_PREFIX = 'GASマネージャー_文書控え_';
var BK_DOC_SLOTS = 5;
var BK_TABS_MAX = 20;
var BK_TABS_KEEP = 15;
var LEDGER_MAX = 40;
var STYLE = {
headBg: '#1F4E79', headFg: '#FFFFFF', border: '#9E9E9E', totalBg: '#F2F2F2',
numFmt: '#,##0', numFmtDec: '#,##0.00', dateFmt: 'yyyy/mm/dd',
colMin: 50, colMax: 360, px: 7, pad: 18
};
var DYNAMIC = {};
var EXTRA_ACTIONS = {};
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ArgError(msg) { this.message = msg; this.isArg = true; }
function Blocked(msg) { this.message = msg; this.isBlocked = true; }
var LANE = '';
function props_() {
var p = PropertiesService.getScriptProperties();
if (!LANE) return p;
var k2 = function (k) { return k === 'TRIAL_CFG' ? k : k + '@' + LANE; };
return {
getProperty: function (k) { return p.getProperty(k2(k)); },
setProperty: function (k, v) { return p.setProperty(k2(k), v); },
setProperties: function (obj) {
var o = {};
Object.keys(obj).forEach(function (k) { o[k2(k)] = obj[k]; });
return typeof p.setProperties === 'function' ? p.setProperties(o) : Object.keys(o).forEach(function (k) { p.setProperty(k, o[k]); });
},
deleteProperty: function (k) { return p.deleteProperty(k2(k)); }
};
}
function getJson_(k, d) { var v = props_().getProperty(k); if (!v) return d; try { return JSON.parse(v); } catch (e) { return d; } }
function setJson_(k, v) { props_().setProperty(k, JSON.stringify(v)); }
function colLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function colNum_(s) {
s = String(s).trim().toUpperCase();
if (!/^[A-Z]{1,3}$/.test(s)) throw new ArgError('列「' + s + '」は列記号（A・B…）ではありません。見出しの名前で指すときは表の見出しと同じ文字で');
var n = 0; for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64); return n;
}
function a1_(r, c, nr, nc) {
var s = colLetter_(c) + r;
if ((nr || 1) > 1 || (nc || 1) > 1) s += ':' + colLetter_(c + (nc || 1) - 1) + (r + (nr || 1) - 1);
return s;
}
function wlen_(s) { s = String(s); var n = 0; for (var i = 0; i < s.length; i++) n += s.charCodeAt(i) > 255 ? 2 : 1; return n; }
function isBlank_(v) { return v === '' || v === null || v === undefined; }
var FP_VER = 4;
function digest_(s, v) {
var bytes = (v === 1) ? s : Utilities.newBlob(s).getBytes();
return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes)).slice(0, 12);
}
function q_(name) { return "'" + String(name).replace(/'/g, "''") + "'"; }
function openTarget_(t) {
t = t || {};
if (t.kind === 'doc') {
var activeDoc = null;
try { activeDoc = DocumentApp.getActiveDocument(); } catch (eD) {}
if (activeDoc && (!t.id || activeDoc.getId() === t.id)) return { kind: 'doc', file: activeDoc };
if (!t.id) throw new ArgError('対象のファイルが決まっていません');
return { kind: 'doc', file: DocumentApp.openById(t.id) };
}
var activeSs = null;
try { activeSs = SpreadsheetApp.getActiveSpreadsheet(); } catch (eS) {}
if (activeSs && (!t.id || activeSs.getId() === t.id)) return { kind: 'sheet', file: activeSs };
if (t.id) return { kind: 'sheet', file: SpreadsheetApp.openById(t.id) };
if (typeof comboOpenSs_ === 'function') return { kind: 'sheet', file: comboOpenSs_(t) };
throw new ArgError('対象のファイルが決まっていません');
}
function sheetOf_(ss, name, ctxDefault) {
var nm = name || ctxDefault;
if (!nm) return ss.getSheets()[0];
var sh = ss.getSheetByName(nm);
if (!sh) throw new ArgError('シート「' + nm + '」がありません。あるのは: ' + ss.getSheets().map(function (s) { return s.getName(); }).join('、'));
return sh;
}
var _TBL_CACHE = null;
function findTable_(sh) {
if (!sh || typeof sh.getLastRow !== 'function') return null;
var sid = (_TBL_CACHE && typeof sh.getSheetId === 'function') ? sh.getSheetId() : null;
if (_TBL_CACHE && _TBL_CACHE[sid] !== undefined) {
var c0 = _TBL_CACHE[sid];
if (_TBL_CACHE._once) _TBL_CACHE = null;
return c0 ? { sheet: sh, headerRow: c0.headerRow, firstCol: c0.firstCol, lastCol: c0.lastCol, firstData: c0.firstData, lastData: c0.lastData, totalRow: c0.totalRow, vals: c0.vals } : null;
}
if (_TBL_CACHE && _TBL_CACHE._once) _TBL_CACHE = null;
var vals = sh.getDataRange().getValues();
var lr = vals.length, lc = vals[0] ? vals[0].length : 0;
if (lr < 1 || lc < 1) { if (_TBL_CACHE) _TBL_CACHE[sid] = null; return null; }
var nonEmpty = function (row) { return row.filter(function (v) { return !isBlank_(v); }).length; };
var h = -1;
for (var r = 0; r < vals.length; r++) { if (nonEmpty(vals[r]) >= 2) { h = r; break; } }
for (var hs = 0; h >= 0 && hs < 10; hs++) {
var nx = h + 1; while (nx < vals.length && nonEmpty(vals[nx]) === 0) nx++;
if (nx < vals.length && nonEmpty(vals[nx]) >= 2 * nonEmpty(vals[h])) h = nx; else break;
}
if (h < 0) { if (_TBL_CACHE) _TBL_CACHE[sid] = null; return null; }
var hdr = vals[h], fc = -1, lcol = -1;
for (var c = 0; c < hdr.length; c++) if (!isBlank_(hdr[c])) { if (fc < 0) fc = c; lcol = c; }
var last = h;
for (var r2 = h + 1; r2 < vals.length; r2++) {
var seg = vals[r2].slice(fc, lcol + 1);
if (nonEmpty(seg) > 0) last = r2;
}
var t = { sheet: sh, headerRow: h + 1, firstCol: fc + 1, lastCol: lcol + 1, firstData: h + 2, lastData: last + 1, totalRow: 0, vals: vals };
if (last > h) {
var first = '';
for (var fcx = fc; fcx <= lcol; fcx++) { var fv = vals[last][fcx]; if (!isBlank_(fv)) { first = String(fv); break; } }
if (/^(合計|総計|小計|計|total|sum)/i.test(first.trim())) { t.totalRow = last + 1; t.lastData = last; }
}
if (_TBL_CACHE) _TBL_CACHE[sid] = { headerRow: t.headerRow, firstCol: t.firstCol, lastCol: t.lastCol, firstData: t.firstData, lastData: t.lastData, totalRow: t.totalRow, vals: t.vals };
return t;
}
function needTable_(sh) {
var t = findTable_(sh);
if (!t) throw new ArgError('シート「' + sh.getName() + '」に表が見つかりません（見出しの行がありません）');
return t;
}
function titleRange_(sh) {
var t = findTable_(sh);
var limit = t ? t.headerRow - 1 : 1;
var vals = t ? t.vals : sh.getDataRange().getValues();
if (!t && (!vals.length || !vals[0].length || (vals.length === 1 && vals[0].length === 1 && isBlank_(vals[0][0])))) throw new ArgError('シート「' + sh.getName() + '」が空です');
if (limit < 1) throw new ArgError('シート「' + sh.getName() + '」に見出しの上の行がありません（range でセルを指定してください）');
for (var r = 0; r < limit; r++) {
for (var c = 0; c < vals[r].length; c++) {
if (!isBlank_(vals[r][c])) {
var rg = sh.getRange(r + 1, c + 1);
if (typeof rg.isPartOfMerge === 'function' && rg.isPartOfMerge()) {
var mr = rg.getMergedRanges();
if (mr && mr.length) return mr[0];
}
return rg;
}
}
}
throw new ArgError('シート「' + sh.getName() + '」に見出しの上の行にタイトルが見つかりません（range でセルを指定してください）');
}
function dataRange_(t) { return t.sheet.getRange(t.firstData, t.firstCol, Math.max(1, t.lastData - t.firstData + 1), t.lastCol - t.firstCol + 1); }
function headerNames_(t) { return t.vals[t.headerRow - 1].slice(t.firstCol - 1, t.lastCol).map(String); }
function colIndexOf_(t, ref) {
if (typeof ref === 'number') return ref;
var s = String(ref).trim();
var names = headerNames_(t);
var i = names.indexOf(s);
if (i >= 0) return t.firstCol + i;
if (/^[A-Za-z]{1,3}$/.test(s)) return colNum_(s);
throw new ArgError('列「' + s + '」がありません。見出しは: ' + names.join('、'));
}
function isNumberCol_(t, ci) {
var n = 0, tot = 0;
for (var r = t.firstData; r <= t.lastData; r++) { var v = t.vals[r - 1][ci - 1]; if (isBlank_(v)) continue; tot++; if (typeof v === 'number') n++; }
return tot > 0 && n / tot > 0.5;
}
function isNoCol_(t, ci) {
var h = String(t.vals[t.headerRow - 1][ci - 1]).trim();
return /^(no\.?|番号|#|№|id)$/i.test(h);
}
function fingerSheet_(sh, v, meta) {
v = v || FP_VER;
var lr = sh.getLastRow(), lc = sh.getLastColumn();
var d = '';
if (lr > 0 && lc > 0) {
var rg = sh.getRange(1, 1, lr, lc);
if (v >= 4) {
d = digest_(JSON.stringify(rg.getFormulas()) + JSON.stringify(rg.getDisplayValues()), v);
} else {
d = digest_(JSON.stringify(rg.getFormulas()) + JSON.stringify(rg.getDisplayValues()) + JSON.stringify(rg.getBackgrounds()) + JSON.stringify(rg.getFontWeights()) +
JSON.stringify(rg.getFontColors()) + JSON.stringify(rg.getNumberFormats()) + JSON.stringify(rg.getHorizontalAlignments()), v);
}
}
var nm = (meta && meta.name !== undefined) ? meta.name : sh.getName();
var fr = (meta && meta.frozenR !== undefined) ? meta.frozenR : sh.getFrozenRows();
var fc = (meta && meta.frozenC !== undefined) ? meta.frozenC : sh.getFrozenColumns();
return { rows: lr, cols: lc, d: digest_(d + '|' + nm + '|' + fr + (v >= 3 ? '|' + fc : ''), v) };
}
function fingerDoc_(doc, v) {
v = v || FP_VER;
var b = doc.getBody();
return { n: b.getNumChildren(), d: digest_(b.getText() + '|' + docStructure_(b), v) };
}
function docStructure_(b) {
var o = [];
for (var i = 0; i < b.getNumChildren(); i++) {
var ch = b.getChild(i), t = String(ch.getType());
if (t === 'PARAGRAPH') o.push('P' + ch.asParagraph().getHeading());
else if (t === 'LIST_ITEM') o.push('L' + ch.asListItem().getNestingLevel());
else o.push(t);
}
return o.join(',');
}
function sameFinger_(a, b) { return a && b && a.rows === b.rows && a.cols === b.cols && a.d === b.d && a.n === b.n; }
function ledger_() { return getJson_('LEDGER', { seq: 0, items: [] }); }
function ledgerSave_(l, extraProps) {
while (l.items.length > LEDGER_MAX) {
var x = l.items.shift();
if (x && x.hasSide) { try { props_().deleteProperty('SIDE_' + x.n); } catch (e) { } }
if (x && x.hasLight) { try { props_().deleteProperty('LIGHT_' + x.n); } catch (e) { } }
}
var p = props_();
if (extraProps && Object.keys(extraProps).length && typeof p.setProperties === 'function') {
var map = {};
Object.keys(extraProps).forEach(function (k) { map[k] = JSON.stringify(extraProps[k]); });
map['LEDGER'] = JSON.stringify(l);
p.setProperties(map);
} else {
if (extraProps) Object.keys(extraProps).forEach(function (k) { setJson_(k, extraProps[k]); });
setJson_('LEDGER', l);
}
}
function ledgerBrief_() {
return ledger_().items.slice().reverse().map(function (it) {
return { n: it.n, time: it.time, target: it.name, kind: it.kind, what: it.what, undone: !!it.undone };
});
}
function bkBook_() {
var id = props_().getProperty('BK_BOOK');
if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { } }
var b = SpreadsheetApp.create(BK_BOOK_NAME);
props_().setProperty('BK_BOOK', b.getId());
return b;
}
function bkTabName_(n, sheetId) { return 'ws' + n + '_' + sheetId; }
function pruneTabs_(book) {
var tabs = book.getSheets().filter(function (s) { return /^ws\d+_/.test(s.getName()); });
tabs.sort(function (a, b) { return parseInt(a.getName().slice(2)) - parseInt(b.getName().slice(2)); });
var extra = tabs.length - BK_TABS_MAX;
var left = book.getSheets().length;
for (var i = 0; i < extra && left > 1; i++) { book.deleteSheet(tabs[i]); left--; }
}
var BKT = {};
function bkLap_(k, t0) { BKT['bk_' + k] = (BKT['bk_' + k] || 0) + (Date.now() - t0); }
function backupSheets_(ss, sheets, n, sideItems) {
if (!sheets.length) return [];
var tb = Date.now();
var book = bkBook_(), out = []; bkLap_('open', tb); tb = Date.now();
var cur = book.getSheets(); bkLap_('list', tb);
var curCount = cur.length, added = [], needRefresh = false;
sheets.forEach(function (sh) {
var sid = sh.getSheetId(), shName = sh.getName();
var nm = bkTabName_(n, sid);
if (curCount > 1) {
var dup = book.getSheetByName(nm);
if (dup) { book.deleteSheet(dup); curCount--; needRefresh = true; }
}
var tc = Date.now();
var c = sh.copyTo(book); bkLap_('copy', tc); tc = Date.now();
c.setName(nm); curCount++; added.push({ s: c, name: nm }); bkLap_('name', tc);
out.push({ id: sid, name: shName, index: sh.getIndex(), tab: nm, frozenR: sh.getFrozenRows(), frozenC: sh.getFrozenColumns() });
});
var tp = Date.now();
if (cur.length <= 3) {
for (var j = 0; j < cur.length; j++) {
var nj = cur[j].getName();
if ((nj === 'シート1' || nj === 'Sheet1') && curCount > 1) { try { book.deleteSheet(cur[j]); curCount--; needRefresh = true; } catch (e) { } break; }
}
}
if (curCount > BK_TABS_MAX) {
var list = needRefresh
? book.getSheets().map(function (s) { return { s: s, name: s.getName() }; })
: cur.map(function (s) { return { s: s, name: s.getName() }; }).concat(added);
var tabs = list.filter(function (x) { return /^ws\d+_/.test(x.name); });
tabs.sort(function (x, y) { return parseInt(x.name.slice(2)) - parseInt(y.name.slice(2)); });
var extra = tabs.length - BK_TABS_KEEP, left = list.length;
for (var k = 0; k < extra && left > 1; k++) { book.deleteSheet(tabs[k].s); left--; }
}
bkLap_('prune', tp);
var ts = Date.now();
captureSide_(ss, sheets, out, sideItems || []); bkLap_('side', ts);
return out;
}
function discardBackup_(bk) {
if (!bk || !bk.length) return;
if (!bk.some(function (b) { return !b.lite && b.tab; })) return;
try {
var book = bkBook_();
bk.forEach(function (b) { if (!b.lite && b.tab) { var t = book.getSheetByName(b.tab); if (t && book.getSheets().length > 1) book.deleteSheet(t); } });
} catch (e) { }
}
function colWidths_(sh) { var o = [], lc = Math.min(Math.max(sh.getLastColumn(), 1), 30); for (var c = 1; c <= lc; c++) o.push(sh.getColumnWidth(c)); return o; }
function restoreSheet_(ss, b) {
var book = bkBook_();
var tab = book.getSheetByName(b.tab);
if (!tab) throw new Error('控えのタブ「' + b.tab + '」が見つかりません（古くて消えた可能性があります）');
var orig = ss.getSheets().filter(function (s) { return s.getSheetId() === b.id; })[0];
var tmp = tab.copyTo(ss);
try {
if (!orig) {
tmp.setName(b.name); ss.setActiveSheet(tmp); ss.moveActiveSheet(Math.min(b.index, ss.getNumSheets())); tmp = null;
return;
}
if (orig.getName() !== b.name) orig.setName(b.name);
var lr = tmp.getMaxRows(), lc = tmp.getMaxColumns();
var f = orig.getFilter(); if (f) f.remove();
orig.getRange(1, 1, orig.getMaxRows(), orig.getMaxColumns()).breakApart();
orig.clear();
if (orig.getMaxRows() < lr) orig.insertRowsAfter(orig.getMaxRows(), lr - orig.getMaxRows());
else if (orig.getMaxRows() > lr) orig.deleteRows(lr + 1, orig.getMaxRows() - lr);
if (orig.getMaxColumns() < lc) orig.insertColumnsAfter(orig.getMaxColumns(), lc - orig.getMaxColumns());
else if (orig.getMaxColumns() > lc) orig.deleteColumns(lc + 1, orig.getMaxColumns() - lc);
try { var tf = tmp.getFilter(); if (tf) tf.remove(); } catch (eF) { }
tmp.getRange(1, 1, lr, lc).copyTo(orig.getRange(1, 1, lr, lc));
var widths = b.widths || colWidths_(tab);
for (var c = 0; c < widths.length && c < lc; c++) orig.setColumnWidth(c + 1, widths[c]);
orig.setFrozenRows(b.frozenR); orig.setFrozenColumns(b.frozenC);
if (orig.getIndex() !== b.index) { ss.setActiveSheet(orig); ss.moveActiveSheet(b.index); }
} finally { if (tmp) { try { ss.deleteSheet(tmp); } catch (e) { } } }
}
var LITE_EXCLUDE_ = { '値': 1, 'シート構成': 1 };
function liteTouch_(ops) {
if (!ops || !ops.length) return null;
var set = {};
for (var i = 0; i < ops.length; i++) {
var op = ops[i], c = CATALOG[op.shelf];
if (!c || DYNAMIC[op.shelf]) return null;
if (op.to && String(op.to).indexOf('!') >= 0) return null;
if ('merge' in op && op.merge !== undefined) return null;
var touch = c.touch || [];
for (var j = 0; j < touch.length; j++) {
if (LITE_EXCLUDE_[touch[j]]) return null;
set[touch[j]] = 1;
}
}
return Object.keys(set);
}
function packRects_(rows, rOff, cOff, pickFn) {
var pal = [], pMap = {}, truns = [], rects = [], prev = {};
for (var r = 0; r < rows.length; r++) {
var vals = (rows[r] && rows[r].values) || [];
var cur = {}, c = 0;
while (c < vals.length) {
var v = vals[c] || {};
if (v.textFormatRuns) truns.push([rOff + r, cOff + c, v.textFormatRuns]);
var obj = pickFn(v);
if (!obj || !Object.keys(obj).length) { c++; continue; }
var key = JSON.stringify(obj), idx = pMap[key];
if (!idx) { pal.push(obj); idx = pal.length; pMap[key] = idx; }
var c0 = c;
while (c + 1 < vals.length) {
var nv = vals[c + 1] || {};
var nobj = pickFn(nv);
if (!nobj || !Object.keys(nobj).length || JSON.stringify(nobj) !== key) break;
if (nv.textFormatRuns) truns.push([rOff + r, cOff + c + 1, nv.textFormatRuns]);
c++;
}
var c1 = c + 1, rk = (cOff + c0) + ':' + (cOff + c1) + ':' + idx;
if (prev[rk] && prev[rk][1] === rOff + r) {
prev[rk][1] = rOff + r + 1;
cur[rk] = prev[rk];
} else {
var rect = [rOff + r, rOff + r + 1, cOff + c0, cOff + c1, idx];
rects.push(rect);
cur[rk] = rect;
}
c++;
}
prev = cur;
}
return { pal: pal, rects: rects, truns: truns };
}
function packDim_(meta, defPx) {
var out = [];
(meta || []).forEach(function (m) {
var px = (m && m.pixelSize !== undefined) ? m.pixelSize : defPx;
if (out.length && out[out.length - 1][1] === px) out[out.length - 1][0]++;
else out.push([1, px]);
});
return out;
}
function saveSide_(n, rec, preStr) {
if (preStr) { props_().setProperty('SIDE_' + n, preStr); return; }
var s = JSON.stringify(rec);
if (s.length <= 6000) { props_().setProperty('SIDE_' + n, s); return; }
var gz = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(s, 'application/json')).getBytes());
props_().setProperty('SIDE_' + n, JSON.stringify({ __gz: gz }));
}
function backupSheetsLite_(ss, sheets, n, items) {
if (!sheets.length) return [];
var tb = Date.now();
var want = {}; items.forEach(function (i) { want[i] = 1; });
var out = sheets.map(function (sh) {
return { id: sh.getSheetId(), name: sh.getName(), frozenR: sh.getFrozenRows(), frozenC: sh.getFrozenColumns(), lite: true };
});
var needMeta = !!(want['隠し'] || want['グループ'] || want['保護'] || want['名前'] || want['タブ色'] || want['グラフ'] || want['フィルタ'] || want['条件付き'] || want['交互の色']);
if (needMeta) {
var shF = ['properties(sheetId' + (want['隠し'] ? ',hidden' : '') + (want['タブ色'] ? ',tabColorStyle' : '') + ')'];
if (want['フィルタ']) shF.push('basicFilter');
if (want['グループ']) shF.push('rowGroups', 'columnGroups');
if (want['保護']) shF.push('protectedRanges(protectedRangeId,range,description,warningOnly,editors,unprotectedRanges)');
if (want['グラフ']) shF.push('charts(chartId,spec,position)');
if (want['条件付き']) shF.push('conditionalFormats');
if (want['交互の色']) shF.push('bandedRanges');
var resp = Sheets.Spreadsheets.get(ss.getId(), { fields: 'sheets(' + shF.join(',') + ')' + (want['名前'] ? ',namedRanges' : '') });
var byId = {}; (resp.sheets || []).forEach(function (x) { byId[x.properties.sheetId] = x; });
out.forEach(function (b) {
var x = byId[b.id]; if (!x) return;
b.side = b.side || {};
if (want['フィルタ']) b.side.filter = x.basicFilter || null;
if (want['隠し']) b.side.hidden = !!x.properties.hidden;
if (want['タブ色']) b.side.tab = x.properties.tabColorStyle || null;
if (want['グループ']) { b.side.rg = x.rowGroups || []; b.side.cg = x.columnGroups || []; }
if (want['保護']) b.side.prot = (x.protectedRanges || []).map(stripId_);
if (want['グラフ']) b.side.charts = (x.charts || []).map(function (c) { return { spec: c.spec, position: c.position }; });
if (want['条件付き']) b.side.cf = x.conditionalFormats || [];
if (want['交互の色']) b.side.band = (x.bandedRanges || []).map(function (br) { var c = {}; Object.keys(br).forEach(function (k) { if (k !== 'bandedRangeId') c[k] = br[k]; }); return c; });
});
if (want['名前']) out.book = { named: (resp.namedRanges || []).map(function (r) { return { name: r.name, range: r.range }; }) };
}
var needGrid = !!(want['書式'] || want['入力規則'] || want['幅'] || want['隠し']);
if (needGrid) {
var ranges = [], gFields = ['properties(sheetId)'];
var needCells = !!(want['書式'] || want['入力規則']);
if (want['書式']) gFields.push('merges');
var dataF = [];
if (want['隠し'] || want['幅']) {
dataF.push('rowMetadata(' + (want['隠し'] ? 'hiddenByUser' : '') + (want['隠し'] && want['幅'] ? ',' : '') + (want['幅'] ? 'pixelSize' : '') + ')');
dataF.push('columnMetadata(' + (want['隠し'] ? 'hiddenByUser' : '') + (want['隠し'] && want['幅'] ? ',' : '') + (want['幅'] ? 'pixelSize' : '') + ')');
}
if (needCells) {
var vF = [];
if (want['書式']) vF.push('userEnteredFormat', 'textFormatRuns');
if (want['入力規則']) vF.push('dataValidation');
dataF.push('startRow', 'startColumn', 'rowData(values(' + vF.join(',') + '))');
sheets.forEach(function (s, si) { ranges.push(q_(out[si].name)); });
} else {
sheets.forEach(function (s, si) { var qn = q_(out[si].name); ranges.push(qn + '!A:A'); ranges.push(qn + '!1:1'); });
}
gFields.push('data(' + dataF.join(',') + ')');
var dr = Sheets.Spreadsheets.get(ss.getId(), { includeGridData: true, ranges: ranges, fields: 'sheets(' + gFields.join(',') + ')' });
var dById = {}; (dr.sheets || []).forEach(function (x) { dById[x.properties.sheetId] = x; });
out.forEach(function (b) {
var x = dById[b.id]; if (!x) return;
b.side = b.side || {};
var d = x.data || [], g0 = d[0] || {}, g1 = needCells ? g0 : (d[1] || {});
if (want['隠し']) { b.side.hr = hiddenRuns_(g0.rowMetadata); b.side.hc = hiddenRuns_(g1.columnMetadata); }
if (want['幅']) { b.side.rh = packDim_(g0.rowMetadata, 21); b.side.cw = packDim_(g1.columnMetadata, 100); }
if (want['書式']) {
var pf = packRects_(g0.rowData || [], g0.startRow || 0, g0.startColumn || 0, function (v) { return v.userEnteredFormat || null; });
var fmt = { merges: x.merges || [], pal: pf.pal, rects: pf.rects };
if (pf.truns.length) fmt.truns = pf.truns;
b.side.fmt = fmt;
}
if (want['入力規則']) {
var pd = packRects_(g0.rowData || [], g0.startRow || 0, g0.startColumn || 0, function (v) { return v.dataValidation || null; });
b.side.dv = { pal: pd.pal, rects: pd.rects };
}
});
}
if (want['固定']) {
out.forEach(function (b) { b.side = b.side || {}; b.side.fr = [b.frozenR, b.frozenC]; });
}
var probe = packSide_(out, items);
if (probe) {
var ps = JSON.stringify(probe);
if (ps.length > 6000) {
var gz = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(ps, 'application/json')).getBytes());
ps = JSON.stringify({ __gz: gz });
if (ps.length > 7800) return null;
}
out._packedStr = ps;
out._packedItems = probe.items;
}
bkLap_('lite', tb);
return out;
}
var SIDE_ITEMS = ['隠し', 'グループ', '保護', '名前', 'タブ色', 'グラフ'];
function sideItems_(ops) {
var set = {};
ops.forEach(function (o) {
var c = CATALOG[o.shelf], touch = DYNAMIC[o.shelf] ? DYNAMIC[o.shelf].touch(o) : (c ? c.touch : []);
touch.forEach(function (x) { if (SIDE_ITEMS.indexOf(x) >= 0) set[x] = 1; });
});
return Object.keys(set);
}
function hiddenRuns_(meta) {
var runs = [], start = -1;
(meta || []).forEach(function (m, i) {
if (m && m.hiddenByUser) { if (start < 0) start = i; } else if (start >= 0) { runs.push([start, i]); start = -1; }
});
if (start >= 0) runs.push([start, (meta || []).length]);
return runs;
}
function stripId_(p) { var c = {}; Object.keys(p).forEach(function (k) { if (k !== 'protectedRangeId') c[k] = p[k]; }); return c; }
function sideFields_(want, filter) {
var sh = ['properties(sheetId' + (want['隠し'] ? ',hidden' : '') + (want['タブ色'] ? ',tabColorStyle' : '') + ')'];
if (filter) sh.push('basicFilter');
if (want['グループ']) sh.push('rowGroups', 'columnGroups');
if (want['保護']) sh.push('protectedRanges(protectedRangeId,range,description,warningOnly,editors,unprotectedRanges)');
if (want['グラフ']) sh.push('charts(chartId,spec,position)');
return 'sheets(' + sh.join(',') + ')' + (want['名前'] ? ',namedRanges' : '');
}
function captureSide_(ss, sheets, bk, items) {
var want = {}; items.forEach(function (i) { want[i] = 1; });
var hasFilter = sheets.some(function (s) { return !!s.getFilter(); });
if (!items.length && !hasFilter) return;
var resp = Sheets.Spreadsheets.get(ss.getId(), { fields: sideFields_(want, hasFilter) });
var byId = {}; (resp.sheets || []).forEach(function (x) { byId[x.properties.sheetId] = x; });
var dataById = {};
if (want['隠し']) {
var ranges = [];
sheets.forEach(function (s, si) { var qn = q_((bk[si] && bk[si].name) || s.getName()); ranges.push(qn + '!A:A'); ranges.push(qn + '!1:1'); });
var dr = Sheets.Spreadsheets.get(ss.getId(), { includeGridData: true, ranges: ranges, fields: 'sheets(properties(sheetId),data(rowMetadata(hiddenByUser),columnMetadata(hiddenByUser)))' });
(dr.sheets || []).forEach(function (x) { dataById[x.properties.sheetId] = x.data || []; });
}
bk.forEach(function (b) {
var x = byId[b.id]; if (!x) return;
var s = {};
if (x.basicFilter) s.filter = x.basicFilter;
if (want['隠し']) { var d = dataById[b.id] || []; s.hidden = !!x.properties.hidden; s.hr = hiddenRuns_(d[0] && d[0].rowMetadata); s.hc = hiddenRuns_(d[1] && d[1].columnMetadata); }
if (want['タブ色']) s.tab = x.properties.tabColorStyle || null;
if (want['グループ']) { s.rg = x.rowGroups || []; s.cg = x.columnGroups || []; }
if (want['保護']) s.prot = (x.protectedRanges || []).map(stripId_);
if (want['グラフ']) s.charts = (x.charts || []).map(function (c) { return { spec: c.spec, position: c.position }; });
if (Object.keys(s).length) b.side = s;
});
if (want['名前']) bk.book = { named: (resp.namedRanges || []).map(function (r) { return { name: r.name, range: r.range }; }) };
}
function packSide_(bk, items) {
var sheets = {}, any = false;
(bk || []).forEach(function (b) { if (b.side) { sheets[b.id] = b.side; any = true; } });
if (bk && bk.book) any = true;
return any ? { sheets: sheets, book: (bk && bk.book) || null, items: items || [] } : null;
}
function stripSide_(bk) {
return bk.map(function (b) { var c = {}; Object.keys(b).forEach(function (k) { if (k !== 'side') c[k] = b[k]; }); return c; });
}
function loadSide_(it) {
var rec = it.hasSide ? getJson_('SIDE_' + it.n, null) : null;
if (rec && rec.__gz) {
try { rec = JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(rec.__gz), 'application/x-gzip')).getDataAsString('utf-8')); }
catch (e) { rec = null; }
}
var bks = (it.sheets || []).map(function (b) { var c = {}; Object.keys(b).forEach(function (k) { c[k] = b[k]; }); if (rec && rec.sheets && rec.sheets[b.id]) c.side = rec.sheets[b.id]; return c; });
if (rec && rec.book) bks.book = rec.book;
return bks;
}
function batchRetry_(ss, reqs) {
try { return Sheets.Spreadsheets.batchUpdate({ requests: reqs }, ss.getId()); }
catch (e) {
if (String(e && e.message || e).indexOf('Internal error') < 0) throw e;
Utilities.sleep(1000);
return Sheets.Spreadsheets.batchUpdate({ requests: reqs }, ss.getId());
}
}
function restoreSide_(ss, bk, notes) {
var recs = (bk || []).filter(function (b) { return b.side; });
var book = bk && bk.book;
if (!recs.length && !book) return;
var needCur = !!book, need = {};
recs.forEach(function (b) {
['rg', 'cg', 'prot', 'charts'].forEach(function (k) { if (b.side[k] !== undefined) { needCur = true; need[k] = 1; } });
if (b.side.fmt !== undefined) { needCur = true; need.merges = 1; }
if (b.side.cf !== undefined) { needCur = true; need.cf = 1; }
if (b.side.band !== undefined) { needCur = true; need.band = 1; }
});
var cur = {};
if (needCur) {
var f = ['properties(sheetId)'];
if (need.rg) f.push('rowGroups'); if (need.cg) f.push('columnGroups');
if (need.prot) f.push('protectedRanges(protectedRangeId)'); if (need.charts) f.push('charts(chartId)');
if (need.merges) f.push('merges');
if (need.cf) f.push('conditionalFormats');
if (need.band) f.push('bandedRanges(bandedRangeId)');
var r = Sheets.Spreadsheets.get(ss.getId(), { fields: 'sheets(' + f.join(',') + ')' + (book ? ',namedRanges(namedRangeId)' : '') });
(r.sheets || []).forEach(function (x) { cur[x.properties.sheetId] = x; });
cur.__named = r.namedRanges || [];
}
var repeatReq_ = function (range, cell, fields) { var req = {}; req['repeat' + 'Cell'] = { range: range, cell: cell, fields: fields }; return req; };
var build = function (withEditors) {
var dels = [], adds = [], props = [];
recs.forEach(function (b) {
var s = b.side, id = b.id, c = cur[id] || {};
if (s.fmt !== undefined) {
(c.merges || []).forEach(function (m) { dels.push({ unmergeCells: { range: m } }); });
dels.push(repeatReq_({ sheetId: id }, {}, 'userEnteredFormat,textFormatRuns'));
(s.fmt.rects || []).forEach(function (q) {
adds.push(repeatReq_({ sheetId: id, startRowIndex: q[0], endRowIndex: q[1], startColumnIndex: q[2], endColumnIndex: q[3] },
{ userEnteredFormat: s.fmt.pal[q[4] - 1] }, 'userEnteredFormat'));
});
(s.fmt.truns || []).forEach(function (tr) {
adds.push({ updateCells: { start: { sheetId: id, rowIndex: tr[0], columnIndex: tr[1] }, rows: [{ values: [{ textFormatRuns: tr[2] }] }], fields: 'textFormatRuns' } });
});
(s.fmt.merges || []).forEach(function (m) { adds.push({ mergeCells: { range: m, mergeType: 'MERGE_ALL' } }); });
}
if (s.dv !== undefined) {
dels.push(repeatReq_({ sheetId: id }, {}, 'dataValidation'));
(s.dv.rects || []).forEach(function (q) {
adds.push(repeatReq_({ sheetId: id, startRowIndex: q[0], endRowIndex: q[1], startColumnIndex: q[2], endColumnIndex: q[3] },
{ dataValidation: s.dv.pal[q[4] - 1] }, 'dataValidation'));
});
}
if (s.cw !== undefined) {
var ci = 0;
s.cw.forEach(function (run) { props.push({ updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: ci, endIndex: ci + run[0] }, properties: { pixelSize: run[1] }, fields: 'pixelSize' } }); ci += run[0]; });
}
if (s.rh !== undefined) {
var ri = 0;
s.rh.forEach(function (run) { props.push({ updateDimensionProperties: { range: { sheetId: id, dimension: 'ROWS', startIndex: ri, endIndex: ri + run[0] }, properties: { pixelSize: run[1] }, fields: 'pixelSize' } }); ri += run[0]; });
}
if (s.cf !== undefined) {
for (var cfi = 0; cfi < (c.conditionalFormats || []).length; cfi++) dels.push({ deleteConditionalFormatRule: { sheetId: id, index: 0 } });
s.cf.forEach(function (rule, idx) { adds.push({ addConditionalFormatRule: { rule: rule, index: idx } }); });
}
if (s.band !== undefined) {
(c.bandedRanges || []).forEach(function (br) { dels.push({ deleteBanding: { bandedRangeId: br.bandedRangeId } }); });
s.band.forEach(function (br) { adds.push({ addBanding: { bandedRange: br } }); });
}
if (s.fr !== undefined) {
props.push({ updateSheetProperties: { properties: { sheetId: id, gridProperties: { frozenRowCount: s.fr[0], frozenColumnCount: s.fr[1] } }, fields: 'gridProperties.frozenRowCount,gridProperties.frozenColumnCount' } });
}
if (s.hr !== undefined || s.hc !== undefined) {
var sh = byId_(ss, id), mr = sh ? sh.getMaxRows() : 0, mc = sh ? sh.getMaxColumns() : 0;
if (s.hr !== undefined && mr) { props.push({ updateDimensionProperties: { range: { sheetId: id, dimension: 'ROWS', startIndex: 0, endIndex: mr }, properties: { hiddenByUser: false }, fields: 'hiddenByUser' } });
s.hr.forEach(function (e) { props.push({ updateDimensionProperties: { range: { sheetId: id, dimension: 'ROWS', startIndex: e[0], endIndex: e[1] }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' } }); }); }
if (s.hc !== undefined && mc) { props.push({ updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: 0, endIndex: mc }, properties: { hiddenByUser: false }, fields: 'hiddenByUser' } });
s.hc.forEach(function (e) { props.push({ updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: e[0], endIndex: e[1] }, properties: { hiddenByUser: true }, fields: 'hiddenByUser' } }); }); }
}
if (s.tab !== undefined) props.push({ updateSheetProperties: { properties: { sheetId: id, tabColorStyle: s.tab || {} }, fields: 'tabColorStyle' } });
['rg', 'cg'].forEach(function (k) {
if (s[k] === undefined) return;
(c[k === 'rg' ? 'rowGroups' : 'columnGroups'] || []).forEach(function (g) { dels.push({ deleteDimensionGroup: { range: g.range } }); });
s[k].slice().sort(function (a, b2) { return a.depth - b2.depth; }).forEach(function (g) { adds.push({ addDimensionGroup: { range: g.range } }); });
s[k].forEach(function (g) { if (g.collapsed) adds.push({ updateDimensionGroup: { dimensionGroup: g, fields: 'collapsed' } }); });
});
if (s.prot !== undefined) {
(c.protectedRanges || []).forEach(function (p) { dels.push({ deleteProtectedRange: { protectedRangeId: p.protectedRangeId } }); });
s.prot.forEach(function (p) { var q = JSON.parse(JSON.stringify(p)); if (!withEditors) delete q.editors; adds.push({ addProtectedRange: { protectedRange: q } }); });
}
if (s.charts !== undefined) {
(c.charts || []).forEach(function (ch) { dels.push({ deleteEmbeddedObject: { objectId: ch.chartId } }); });
s.charts.forEach(function (ch) { adds.push({ addChart: { chart: { spec: ch.spec, position: ch.position } } }); });
}
if (s.hidden !== undefined) props.push({ updateSheetProperties: { properties: { sheetId: id, hidden: s.hidden }, fields: 'hidden' } });
});
if (book) {
(cur.__named || []).forEach(function (n) { dels.push({ deleteNamedRange: { namedRangeId: n.namedRangeId } }); });
book.named.forEach(function (n) { adds.push({ addNamedRange: { namedRange: { name: n.name, range: n.range } } }); });
}
var showFirst = props.filter(function (q) { return q.updateSheetProperties && q.updateSheetProperties.properties.hidden === false; });
var hideLast = props.filter(function (q) { return q.updateSheetProperties && q.updateSheetProperties.properties.hidden === true; });
var rest = props.filter(function (q) { return showFirst.indexOf(q) < 0 && hideLast.indexOf(q) < 0; });
return dels.concat(showFirst, adds, rest, hideLast);
};
var reqs = build(true);
if (reqs.length) SpreadsheetApp.flush();
if (reqs.length) try { batchRetry_(ss, reqs); }
catch (e) {
var chartReqs = reqs.filter(function (q) { return q.addChart; });
if (String(e && e.message || e).indexOf('Internal error') >= 0 && chartReqs.length) {
batchRetry_(ss, reqs.filter(function (q) { return !q.addChart; }));
recs.forEach(function (b) {
(b.side.charts || []).forEach(function (ch) {
try { restoreChartApp_(byId_(ss, b.id), ch); }
catch (e2) { if (notes) notes.push('グラフを付け直せませんでした（種類・範囲・位置・題の記録から作れない形でした）。グラフだけ作り直してください'); }
});
});
} else {
var hasEditors = recs.some(function (b) { return (b.side.prot || []).some(function (p) { return p.editors; }); });
if (!hasEditors) throw e;
batchRetry_(ss, build(false));
if (notes) notes.push('保護の「編集できる人」の一覧は戻せませんでした（保護そのものは付け直しました）');
}
}
recs.forEach(function (b) {
if (b.side.filter) restoreFilter_(ss, b.id, b.side.filter, notes);
else if (b.side.filter === null) { var shf = byId_(ss, b.id); var f0 = shf && shf.getFilter(); if (f0) f0.remove(); }
});
}
function restoreChartApp_(sh, ch) {
var spec = ch.spec || {}, srcs = [], type = null;
var take = function (x) { if (x && x.sourceRange) (x.sourceRange.sources || []).forEach(function (s) { srcs.push(s); }); };
if (spec.basicChart) { type = spec.basicChart.chartType || 'COLUMN'; (spec.basicChart.domains || []).forEach(function (d) { take(d.domain); }); (spec.basicChart.series || []).forEach(function (s) { take(s.series); }); }
else if (spec.pieChart) { type = 'PIE'; take(spec.pieChart.domain); take(spec.pieChart.series); }
if (!type || !Charts.ChartType[type]) throw new Error('作れない種類: ' + type);
var b = sh.newChart().setChartType(Charts.ChartType[type]);
srcs.forEach(function (r) { b.addRange(sh.getRange((r.startRowIndex || 0) + 1, (r.startColumnIndex || 0) + 1, (r.endRowIndex || sh.getMaxRows()) - (r.startRowIndex || 0), (r.endColumnIndex || sh.getMaxColumns()) - (r.startColumnIndex || 0))); });
var pos = ch.position && ch.position.overlayPosition;
if (pos && pos.anchorCell) b.setPosition((pos.anchorCell.rowIndex || 0) + 1, (pos.anchorCell.columnIndex || 0) + 1, pos.offsetXPixels || 0, pos.offsetYPixels || 0);
if (spec.title) b.setOption('title', spec.title);
sh.insertChart(b.build());
}
function restoreFilter_(ss, id, f, notes) {
var sh = byId_(ss, id);
if (!sh || !f || !f.range) return;
var g = f.range, r0 = g.startRowIndex || 0, c0 = g.startColumnIndex || 0;
var nr = (g.endRowIndex || sh.getMaxRows()) - r0, nc = (g.endColumnIndex || sh.getMaxColumns()) - c0;
var old = sh.getFilter(); if (old) old.remove();
var filter = sh.getRange(r0 + 1, c0 + 1, nr, nc).createFilter(), hard = false;
Object.keys(f.criteria || {}).forEach(function (k) {
var c = f.criteria[k];
if (c.hiddenValues && c.hiddenValues.length && !c.condition) filter.setColumnFilterCriteria(parseInt(k, 10) + 1, SpreadsheetApp.newFilterCriteria().setHiddenValues(c.hiddenValues).build());
else hard = true;
});
SpreadsheetApp.flush();
if (hard && notes) notes.push('フィルタの条件のうち、隠す値の指定以外（条件式・色）は付け直せませんでした（フィルタの範囲と隠す値は戻しました）');
}
function docBkIds_() { return getJson_('BK_DOCS', []); }
function docBkSlotDoc_(slot) {
var ids = docBkIds_(), id = ids[slot];
if (id) { try { return DocumentApp.openById(id); } catch (e) { } }
var d = DocumentApp.create(BK_DOC_PREFIX + (slot + 1));
ids[slot] = d.getId(); setJson_('BK_DOCS', ids);
return d;
}
function clearBody_(b) {
try { b.clear(); return; } catch (e) { }
b.appendParagraph('');
for (var i = b.getNumChildren() - 2; i >= 0; i--) { try { b.removeChild(b.getChild(i)); } catch (e2) { } }
}
function copyBody_(src, dst) {
clearBody_(dst);
var afterTable = false;
for (var i = 0; i < src.getNumChildren(); i++) {
var el = src.getChild(i).copy(), t = String(el.getType());
if (afterTable && t === 'PARAGRAPH' && el.asParagraph().getText() === '') { afterTable = false; continue; }
afterTable = false;
if (t === 'PARAGRAPH') dst.appendParagraph(el);
else if (t === 'LIST_ITEM') dst.appendListItem(el);
else if (t === 'TABLE') { dst.appendTable(el); afterTable = true; }
else if (t === 'HORIZONTAL_RULE') dst.appendHorizontalRule();
else if (t === 'PAGE_BREAK') dst.appendPageBreak();
}
if (dst.getNumChildren() > 1 && dst.getChild(0).getType() == DocumentApp.ElementType.PARAGRAPH && dst.getChild(0).asParagraph().getText() === '') {
try { dst.removeChild(dst.getChild(0)); }
catch (e) { try { dst.removeChild(dst.getChild(dst.getNumChildren() - 1)); } catch (e2) { } }
}
}
function pickSlot_() {
var seqs = getJson_('BK_DOC_SEQ', {}), live = {};
ledger_().items.forEach(function (it) { if (it.doc) live[it.n] = 1; });
var best = -1, bestSeq = Infinity;
for (var i = 0; i < BK_DOC_SLOTS; i++) {
if (seqs[i] === undefined || !live[seqs[i]]) return i;
if (seqs[i] < bestSeq) { bestSeq = seqs[i]; best = i; }
}
return best;
}
function backupDoc_(doc, n) {
var slot = pickSlot_();
var bk = docBkSlotDoc_(slot);
copyBody_(doc.getBody(), bk.getBody());
bk.saveAndClose();
var slots = getJson_('BK_DOC_SEQ', {}); slots[slot] = n; setJson_('BK_DOC_SEQ', slots);
return { slot: slot };
}
function restoreDoc_(doc, b, n) {
var slots = getJson_('BK_DOC_SEQ', {});
if (slots[b.slot] !== n) throw new Error('文書の控え（枠' + (b.slot + 1) + '）はその後の控えで上書きされました');
var bk = docBkSlotDoc_(b.slot);
copyBody_(bk.getBody(), doc.getBody());
}
function extractDriveId_(s) {
var raw = String(s || '').trim();
var m = raw.match(/\/folders\/([A-Za-z0-9_-]+)/) || raw.match(/\/d\/([A-Za-z0-9_-]+)/) || raw.match(/[?&]id=([A-Za-z0-9_-]+)/);
if (m) return m[1];
if (/^[A-Za-z0-9_-]{20,}$/.test(raw) && raw.indexOf('/') < 0) return raw;
return '';
}
function activeDriveList_(it, maxN) {
var out = [];
while (it.hasNext()) {
var x = it.next();
if (!x.isTrashed()) {
out.push(x);
if (maxN && out.length >= maxN) break;
}
}
return out;
}
function activeFolders_(parent, name) { return activeDriveList_(parent.getFoldersByName(name)); }
function activeFiles_(parent, name) { return activeDriveList_(parent.getFilesByName(name)); }
function mimeLabel_(mime) {
if (mime === 'application/vnd.google-apps.folder') return 'フォルダ';
if (mime === 'application/vnd.google-apps.spreadsheet') return 'シート';
if (mime === 'application/vnd.google-apps.document') return '文書';
if (mime === 'application/pdf') return 'PDF';
if (mime && mime.indexOf('image/') === 0) return '画像';
return 'ファイル';
}
function wrapDriveObj_(obj, isFolder) {
var mime = isFolder ? 'application/vnd.google-apps.folder' : obj.getMimeType();
return { obj: obj, id: obj.getId(), name: obj.getName(), mime: mime, isFolder: isFolder };
}
function resolveDriveItem_(spec) {
var raw = String(spec || '').trim();
if (!raw) throw new ArgError('対象のファイルやフォルダの名前・ID を指定してください');
var id = extractDriveId_(raw);
if (id) {
try {
var f0 = DriveApp.getFileById(id);
if (f0 && !f0.isTrashed()) {
var isDir = f0.getMimeType() === 'application/vnd.google-apps.folder';
return wrapDriveObj_(isDir ? DriveApp.getFolderById(id) : f0, isDir);
}
} catch (eId) {  }
}
var hits = [];
if (raw.indexOf('/') >= 0) {
var parts = raw.replace(/^\/+|\/+$/g, '').split('/').map(function (s) { return s.trim(); }).filter(Boolean);
var first = parts[0];
var startIdx = (first === 'マイドライブ' || first === 'My Drive' || first === 'root') ? 1 : 0;
var cur = DriveApp.getRootFolder();
for (var i = startIdx; i < parts.length - 1; i++) {
var dirs = activeFolders_(cur, parts[i]);
if (!dirs.length) throw new ArgError('フォルダ「' + parts.slice(0, i + 1).join('/') + '」が見つかりません');
if (dirs.length > 1) throw new ArgError('フォルダ「' + parts[i] + '」が複数あります（ID で指定してください）');
cur = dirs[0];
}
var last = parts[parts.length - 1];
if (!last) return wrapDriveObj_(cur, true);
activeFolders_(cur, last).forEach(function (d) { hits.push(wrapDriveObj_(d, true)); });
activeFiles_(cur, last).forEach(function (f) { hits.push(wrapDriveObj_(f, false)); });
} else {
activeDriveList_(DriveApp.getFoldersByName(raw), 6).forEach(function (d) { hits.push(wrapDriveObj_(d, true)); });
activeDriveList_(DriveApp.getFilesByName(raw), 6).forEach(function (f) { hits.push(wrapDriveObj_(f, false)); });
}
if (!hits.length) throw new ArgError('「' + raw + '」が見つかりません（パス名や URL・ID でも指定できます）');
if (hits.length > 1) {
var desc = hits.slice(0, 5).map(function (h) { return '[' + mimeLabel_(h.mime) + '] ' + h.name + ' (ID: ' + h.id + ')'; }).join(' ／ ');
throw new ArgError('「' + raw + '」に一致する項目が ' + hits.length + ' 件以上あります。ID または「フォルダ/名前」で指定してください: ' + desc);
}
return hits[0];
}
function isAncestorFolder_(ancestorId, folder) {
var q = [folder], seen = {};
while (q.length) {
var cur = q.shift(), cid = cur.getId();
if (cid === ancestorId) return true;
if (seen[cid]) continue;
seen[cid] = true;
var ps = cur.getParents();
while (ps.hasNext()) q.push(ps.next());
}
return false;
}
function countFolderChildren_(folder) {
var n = 0;
var df = folder.getFolders(); while (df.hasNext()) { if (!df.next().isTrashed()) n++; }
var ff = folder.getFiles(); while (ff.hasNext()) { if (!ff.next().isTrashed()) n++; }
return n;
}
function folderLabel_(f) {
return (f && typeof f.getName === 'function') ? f.getName() : 'マイドライブ';
}
function resolveFolder_(spec, createMissing) {
var raw = String(spec || '').trim();
var idHit = extractDriveId_(raw);
if (idHit) raw = idHit;
if (!raw || raw === 'root' || raw === 'マイドライブ' || raw === 'My Drive' || raw === '直下' || raw === 'ルート') {
var root = DriveApp.getRootFolder();
return { folder: root, id: root.getId(), name: 'マイドライブ', created: false, isRoot: true };
}
if (/^[A-Za-z0-9_-]{20,}$/.test(raw) && raw.indexOf('/') < 0) {
try {
var byId = DriveApp.getFolderById(raw);
if (byId && !byId.isTrashed()) {
return { folder: byId, id: byId.getId(), name: byId.getName(), created: false, isRoot: false };
}
} catch (eId) {  }
}
var parts = raw.replace(/^\/+|\/+$/g, '').split('/').map(function (s) { return s.trim(); }).filter(Boolean);
var cur = DriveApp.getRootFolder();
var anyCreated = false;
for (var i = 0; i < parts.length; i++) {
var name = parts[i];
if (i === 0 && (name === 'マイドライブ' || name === 'My Drive' || name === 'root')) continue;
var hits = activeFolders_(cur, name);
if (hits.length > 1) {
throw new ArgError('同じ名前のフォルダ「' + name + '」が ' + hits.length + ' 個あります（' + folderLabel_(cur) + ' 配下）');
}
if (hits.length === 1) {
cur = hits[0];
} else if (createMissing) {
cur = cur.createFolder(name);
anyCreated = true;
} else {
throw new ArgError('フォルダ「' + parts.slice(0, i + 1).join('/') + '」が見つかりません（新しく作るなら create=true を付けてください）');
}
}
return { folder: cur, id: cur.getId(), name: cur.getName(), created: anyCreated, isRoot: false };
}
function summarizeOps_(ops) { return ops.map(function (o) { return o.shelf; }).join('・'); }
function msOut_(tm) { var o = {}; Object.keys(BKT).forEach(function (k) { o[k] = BKT[k]; }); Object.keys(tm).forEach(function (k) { if (k !== 't0' && k !== 'last') o[k] = tm[k]; }); o.total = Date.now() - tm.t0; return o; }
function lap_(tm, k) { var n = Date.now(); tm[k] = (tm[k] || 0) + (n - tm.last); tm.last = n; }
function actDo_(req) {
var tc = Date.now();
var cache = CacheService.getScriptCache();
if (req.call_id) {
var hit = cache.get('call_' + req.call_id);
if (hit) { var r0 = JSON.parse(hit); r0.replayed = true; return r0; }
}
var cacheGetMs = Date.now() - tc;
var res = runDo_(req, Date.now());
if (res && res.ms) res.ms.cacheGet = cacheGetMs;
if (req.call_id && res && !(res.stale || res.auth_needed)) { try { var s = JSON.stringify(res); if (s.length < 90000) cache.put('call_' + req.call_id, s, 21600); } catch (e) { } }
return res;
}
function runDo_(req, T0) {
BKT = {};
var tm = { t0: T0 || Date.now() }; tm.last = tm.t0;
var ops = req.ops || [];
if (!ops.length) return { ok: false, error: 'ops が空です' };
var t = req.target || {}, created = null, file = null, kind = t.kind === 'doc' ? 'doc' : 'sheet', destFolder = null;
if (t.new) {
if (t.folder_id) {
try {
destFolder = DriveApp.getFolderById(t.folder_id);
if (destFolder.isTrashed()) throw new ArgError('保存先フォルダがゴミ箱に入っています');
} catch (eDf) {
if (eDf && eDf.isArg) throw eDf;
throw new ArgError('既定フォルダ（' + t.folder_id + '）を開けません。設定し直してください');
}
} else if (t.folder) {
destFolder = resolveFolder_(t.folder, false).folder;
}
file = kind === 'doc' ? DocumentApp.create(t.new) : SpreadsheetApp.create(t.new);
created = { id: file.getId(), name: t.new, kind: kind, url: file.getUrl() };
if (destFolder) DriveApp.getFileById(created.id).moveTo(destFolder);
} else if (t.id || !t.no_file) {
var o = openTarget_(t); file = o.file; kind = o.kind;
}
lap_(tm, 'open');
_TBL_CACHE = {};
if (file && req.expect && kind === 'sheet' && !created) {
var shE = (t.sheet && file.getSheetByName(t.sheet)) ? t.sheet : file.getSheets()[0].getName(), nowT = tableOfSheet_(file, shE);
if (!sameTable_(nowT, req.expect)) {
_TBL_CACHE = null;
return { ok: false, stale: true, error: '表の形が変わっていました（書いていません）', target: { id: file.getId(), name: file.getName(), kind: 'sheet', url: file.getUrl(), sheet: shE },
table: nowT && !nowT.none ? nowT : null, sheets: file.getSheets().map(function (s) { return s.getName(); }), ms: msOut_(tm) };
}
lap_(tm, 'expect');
}
var useBackup = !!file && req.backup !== false;
var l = null, n = 0;
if (useBackup) {
l = ledger_(); l.seq++; n = l.seq;
}
lap_(tm, 'seq');
var fid = created ? created.id : (file ? (t.id || file.getId()) : ''), fname = created ? created.name : (t.name || (file ? file.getName() : ''));
var ctx = { wideKey: digest_(fid + '|' + JSON.stringify(ops), FP_VER), kind: kind, file: file, ss: (file && kind === 'sheet') ? file : null, doc: (file && kind === 'doc') ? file : null,
sheetName: t.sheet || '', ok: !!req.ok, changed: destFolder ? ['フォルダ「' + destFolder.getName() + '」に配置'] : [], notes: [], remaining: [], createdSheets: [], n: n, isNew: !!created,
_file: { id: fid, name: fname, url: created ? created.url : null } };
var entry = { n: n, time: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'), id: fid,
name: fname, kind: kind, what: summarizeOps_(ops), isNew: !!created, fp: FP_VER };
var bk = null, sideItems = [], liteItems = null, isLite = false;
try {
if (!created && useBackup) {
if (kind === 'sheet') {
var names = touchedSheets_(ctx, ops);
liteItems = liteTouch_(ops);
if (liteItems !== null) {
bk = backupSheetsLite_(ctx.ss, names, n, liteItems);
if (bk !== null) isLite = true;
}
if (!isLite) {
sideItems = sideItems_(ops);
bk = backupSheets_(ctx.ss, names, n, sideItems);
}
lap_(tm, 'backup');
entry.sheets = bk;
if (isLite) {
entry.lite = true;
entry.liteItems = liteItems;
tm.finger0 = 0;
} else {
entry.before = {}; names.forEach(function (sh0, idx) { var b0 = bk[idx]; entry.before[b0.id] = fingerSheet_(sh0, FP_VER, b0); });
}
} else { entry.doc = backupDoc_(ctx.doc, n); lap_(tm, 'backup'); entry.beforeDoc = fingerDoc_(ctx.doc); }
}
ctx.bk = bk; lap_(tm, 'finger0');
var errBefore = (file && kind === 'sheet' && !created && errScanNeeded_(ops)) ? errScan_(ctx.ss) : null;
if (errBefore) lap_(tm, 'err0');
if (!isLite && _TBL_CACHE) _TBL_CACHE._once = true;
for (var i = 0; i < ops.length; i++) {
var op = ops[i], fn = SHELF[op.shelf];
if (!fn) throw new ArgError('棚「' + op.shelf + '」はありません');
if (fn.kind && fn.kind !== kind) throw new ArgError('棚「' + op.shelf + '」は' + (fn.kind === 'doc' ? '文書' : 'シート') + '用です（今の相手は' + (kind === 'doc' ? '文書' : 'スプレッドシート') + '）');
ctx.opNo = i + 1; ctx.opName = op.shelf;
fn(ctx, op);
if (!isLite) _TBL_CACHE = null;
}
lap_(tm, 'ops');
if (errBefore) { SpreadsheetApp.flush(); errReport_(ctx, ops, errBefore, errScan_(ctx.ss)); lap_(tm, 'err1'); }
if (file && kind === 'sheet' && (created || req.want_table || (useBackup && !(entry.sheets && entry.sheets.length)))) SpreadsheetApp.flush();
if (file && kind === 'doc') { ctx.doc.saveAndClose(); ctx.doc = DocumentApp.openById(entry.id); file = ctx.doc; lap_(tm, 'save'); }
if (useBackup) {
if (kind === 'sheet') {
entry.after = {};
var keepName = !touchesItem_(ops, 'シート構成'), keepFix = !touchesItem_(ops, '固定');
(entry.sheets || []).forEach(function (b) {
var s = byId_(ctx.ss, b.id);
if (s) entry.after[b.id] = fingerSheet_(s, FP_VER, { name: keepName ? b.name : undefined, frozenR: keepFix ? b.frozenR : undefined, frozenC: keepFix ? b.frozenC : undefined });
});
entry.created = {};
ctx.createdSheets.forEach(function (nm) { var s = ctx.ss.getSheetByName(nm); if (s) entry.created[nm] = fingerSheet_(s); });
} else entry.afterDoc = fingerDoc_(ctx.doc);
lap_(tm, 'finger');
var noop = !created && isNoop_(ops, entry, ctx);
lap_(tm, 'noop');
if (noop) {
discardBackup_(bk); lap_(tm, 'discard');
return { ok: true, target: tgt_(ctx, file), changed: [], notes: ['変更はありませんでした（すでにその状態です）'].concat(ctx.notes.filter(function (x) { return x.indexOf('変更なし') < 0; })), remaining: ctx.remaining, backup: 0, ms: msOut_(tm) };
}
var preStr = bk && bk._packedStr;
var sideRec = preStr ? { items: bk._packedItems } : ((bk && bk.length) ? packSide_(bk, isLite ? liteItems : sideItems) : null);
if (sideRec) { saveSide_(n, sideRec, preStr); entry.hasSide = true; entry.sideItems = sideRec.items; entry.sheets = stripSide_(bk); }
l.items.push(entry); ledgerSave_(l);
lap_(tm, 'ledger');
}
var out = { ok: true, new_errors: ctx.newErrors || [], target: tgt_(ctx, file), changed: ctx.changed, notes: ctx.notes, remaining: ctx.remaining, backup: (created || !useBackup) ? 0 : n, ms: msOut_(tm) };
if (created) { out.created = created; }
if (ctx.defaultFolder !== undefined) { out.default_folder = ctx.defaultFolder; }
if (file && req.want_table && kind === 'sheet') {
try { out.table = tableOfSheet_(ctx.ss, out.target.sheet); out.sheets = ctx.ss.getSheets().map(function (s) { return s.getName(); }); lap_(tm, 'table'); out.ms = msOut_(tm); } catch (eT) { }
}
return out;
} catch (err) {
var restored = false, why = '';
try {
if (created) resetNew_(ctx, kind);
else if (useBackup && kind === 'sheet') { restoreAll_(ctx.ss, bk || [], ctx.createdSheets); }
else if (useBackup && entry.doc) { restoreDoc_(DocumentApp.openById(entry.id), entry.doc, n); }
restored = !!(created || useBackup);
if (bk) discardBackup_(bk);
} catch (e2) { why = String(e2.message || e2); }
var out2 = { ok: false, error: String(err.message || err), where: '棚 #' + (ctx.opNo || 0) + ' ' + (ctx.opName || ''),
restored: restored, restore_error: why, blocked: !!err.isBlocked, needs_ok: !!err.isBlocked, arg: !!err.isArg, target: tgt_(ctx, file), stack: String(err.stack || '').slice(0, 400) };
var errStr = String(err.message || err);
if (errStr.indexOf('権限がありません') >= 0 || errStr.indexOf('permission to call') >= 0 || errStr.indexOf('Required permissions:') >= 0) out2.auth_needed = true;
try {
var ai = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
if (ai && ai.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) { out2.auth_needed = true; out2.auth_url = ai.getAuthorizationUrl(); }
} catch (eAi) { }
if (created) out2.created = created;
return out2;
} finally {
_TBL_CACHE = null;
}
}
var FINGER_ITEMS_ = ['値', 'シート構成', '固定'];
function fingerOnly_(ops, kind) {
return ops.every(function (o) {
var c = CATALOG[o.shelf];
return !!c && c.touch.some(function (t) { return FINGER_ITEMS_.indexOf(t) >= 0; });
});
}
function touchesItem_(ops, item) {
return ops.some(function (o) {
var c = CATALOG[o.shelf];
if (c && c.touch && c.touch.indexOf(item) >= 0) return true;
return !!(DYNAMIC[o.shelf] && DYNAMIC[o.shelf].touch && DYNAMIC[o.shelf].touch(o).indexOf(item) >= 0);
});
}
function normJson_(v) {
if (v === null || typeof v !== 'object') return JSON.stringify(v);
if (Array.isArray(v)) return '[' + v.map(function (x) { return x === undefined ? 'null' : normJson_(x); }).join(',') + ']';
return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + normJson_(v[k]); }).join(',') + '}';
}
function filterChanged_(ctx, entry) {
var both = [];
for (var i = 0; i < (entry.sheets || []).length; i++) {
var b = entry.sheets[i], s = ctx.ss && byId_(ctx.ss, b.id);
if (!s || typeof s.getFilter !== 'function') continue;
var had = !!(b.side && b.side.filter), has = !!s.getFilter();
if (had !== has) return true;
if (had && has) both.push(b);
}
if (!both.length) return false;
if (typeof SpreadsheetApp !== 'undefined' && typeof SpreadsheetApp.flush === 'function') SpreadsheetApp.flush();
if (typeof Sheets === 'undefined' || !Sheets.Spreadsheets || typeof Sheets.Spreadsheets.get !== 'function') return ctx.changed.length > 0;
try {
var resp = Sheets.Spreadsheets.get(ctx.ss.getId(), { fields: 'sheets(properties(sheetId),basicFilter)' });
var byId = {};
(resp.sheets || []).forEach(function (x) { byId[x.properties.sheetId] = x.basicFilter || null; });
return both.some(function (b) { return normJson_(b.side.filter) !== normJson_(byId[b.id] || null); });
} catch (e) {
return ctx.changed.length > 0;
}
}
function isNoop_(ops, entry, ctx) {
if (ctx.createdSheets.length) return false;
if (entry.lite) {
if (entry.liteItems && entry.liteItems.length === 1 && entry.liteItems[0] === '固定') {
return (entry.sheets || []).every(function (b) { var s = byId_(ctx.ss, b.id); return s && s.getFrozenRows() === b.frozenR && s.getFrozenColumns() === b.frozenC; });
}
return ctx.changed.length === 0;
}
if (!fingerOnly_(ops, ctx.kind)) return ctx.changed.length === 0;
if (ctx.kind === 'sheet') {
if (!entry.sheets || !entry.sheets.length) return false;
if (!entry.sheets.every(function (b) { return sameFinger_(entry.before[b.id], entry.after[b.id]); })) return false;
if (touchesItem_(ops, 'フィルタ') && filterChanged_(ctx, entry)) return false;
return true;
}
return sameFinger_(entry.beforeDoc, entry.afterDoc);
}
var ERR_SCAN_SKIP = /^(format|width|bg\.clear|banding\.|cf\.|freeze|unfreeze|filter\.|tidy|sheet\.(color|hide|show|move|rename)|cols\.(hide|show)|rows\.(hide|show)|validation\.|checkbox|protect\.|name\.list|drive\.|folder|backup|find|cf\.list)/;
var ERR_RE = /^#(REF!|VALUE!|DIV\/0!|N\/A|NAME\?|NUM!|NULL!|ERROR!)/;
var FORMULA_DROP_OK = /^(rows\.delete|cols\.delete|dedupe|seiri|clear\.|sheet\.delete|formula\.tovalue|copy\.values|write|replace)/;
function errScanNeeded_(ops) { return ops.some(function (o) { return !ERR_SCAN_SKIP.test(String(o.shelf || '')); }); }
function errScan_(ss) {
var out = {};
ss.getSheets().forEach(function (sh) {
var lr = sh.getLastRow(), lc = sh.getLastColumn();
if (lr < 1 || lc < 1 || lr * lc > 60000) return;
var rg = sh.getRange(1, 1, lr, lc), v = rg.getValues(), f = rg.getFormulas(), errs = {}, fcol = {};
for (var r = 0; r < lr; r++) for (var c = 0; c < lc; c++) {
if (typeof v[r][c] === 'string' && ERR_RE.test(v[r][c])) errs[a1_(r + 1, c + 1)] = v[r][c] + (f[r][c] ? '（' + f[r][c].slice(0, 40) + '）' : '');
if (f[r][c]) fcol[c] = (fcol[c] || 0) + 1;
}
out[sh.getSheetId()] = { name: sh.getName(), errs: errs, fcol: fcol };
});
return out;
}
function errReport_(ctx, ops, before, after) {
var news = [], drops = [];
var dropOk = ops.some(function (o) { return FORMULA_DROP_OK.test(String(o.shelf || '')); });
Object.keys(after).forEach(function (id) {
var a = after[id], b = before[id] || { errs: {}, fcol: {} };
Object.keys(a.errs).forEach(function (k) { if (!(k in b.errs)) news.push(a.name + '!' + k + ' ' + a.errs[k]); });
if (!dropOk && before[id]) Object.keys(b.fcol).forEach(function (c) {
var n0 = b.fcol[c], n1 = a.fcol[c] || 0;
if (n1 < n0) drops.push(a.name + ' の ' + colLetter_(+c + 1) + ' 列の式が ' + n0 + ' → ' + n1 + ' 個');
});
});
ctx.newErrors = news.concat(drops);
if (news.length) ctx.notes.push('新しいエラー: ' + news.slice(0, 5).join('・') + (news.length > 5 ? ' ほか ' + (news.length - 5) + ' 件' : '') + '（撃つ前には無かった物。直すか ws_undo で戻すかを決める）');
if (drops.length) ctx.notes.push('式が減った: ' + drops.slice(0, 3).join('・') + '（式が値に化けていないか確かめる。戻すなら ws_undo）');
}
function tgt_(ctx, file) {
if (!file && !(ctx._file && ctx._file.id)) return {};
var f = ctx._file || {};
var o = { id: f.id || file.getId(), name: f.name || file.getName(), kind: ctx.kind, url: f.url || ('https://docs.google.com/' + (ctx.kind === 'doc' ? 'document' : 'spreadsheets') + '/d/' + (f.id || file.getId()) + '/edit') };
if (ctx.kind === 'sheet') o.sheet = ctx.curSheet || ctx.sheetName || ctx._sheet0 || ctx.ss.getSheets()[0].getName();
return o;
}
function byId_(ss, id) { return ss.getSheets().filter(function (s) { return s.getSheetId() === id; })[0]; }
function touchedSheets_(ctx, ops) {
var ss = ctx.ss, seen = {}, out = [];
var add = function (name) {
var s = name ? ss.getSheetByName(name) : null;
if (s && !seen[s.getSheetId()]) { seen[s.getSheetId()] = 1; out.push(s); }
};
var def = ctx.sheetName || (ctx._sheet0 = ss.getSheets()[0].getName());
ops.forEach(function (op) {
if (DYNAMIC[op.shelf]) { DYNAMIC[op.shelf].sheets(ctx, op).forEach(add); return; }
var c = CATALOG[op.shelf], bk = c && c.backup ? c.backup : ['今'];
bk.forEach(function (b) {
if (b === '今') add(op.sheet || def);
else if (b === '名前') add(op.name);
else if (b === '先') add(op.into);
else if (b === '全部') ss.getSheets().forEach(function (s) { add(s.getName()); });
});
});
return out;
}
function restoreAll_(ss, bk, createdNames) {
(createdNames || []).forEach(function (nm) { var s = ss.getSheetByName(nm); if (s && ss.getSheets().length > 1) ss.deleteSheet(s); });
(bk || []).forEach(function (b) { if (!b.lite) restoreSheet_(ss, b); });
restoreSide_(ss, bk, null);
}
function resetNew_(ctx, kind) {
if (kind === 'sheet') {
var shs = ctx.ss.getSheets();
for (var i = shs.length - 1; i >= 1; i--) ctx.ss.deleteSheet(shs[i]);
shs[0].clear(); shs[0].setName('シート1');
} else { clearBody_(ctx.doc.getBody()); }
}
function actUndo_(req) {
var l = ledger_(), it;
if (req.to) it = l.items.filter(function (x) { return x.n === parseInt(req.to); })[0];
else {
for (var i = l.items.length - 1; i >= 0; i--) {
var x = l.items[i];
if (!x.undone && !x.isUndo && (!req.target_id || x.id === req.target_id)) { it = x; break; }
}
}
if (!it) return { ok: false, error: req.target_id && !req.to ? '今の相手のファイルには、戻せる記録がありません（ws_undo(list=True) で全体の台帳）' : '戻せる記録がありません' };
if (it.isNew && !it.sheets && !it.doc) return { ok: false, error: '新しく作ったファイルは undo では消しません（消すのは人です）: ' + it.name };
var file = it.kind === 'doc' ? DocumentApp.openById(it.id) : SpreadsheetApp.openById(it.id);
var hand = [];
if (it.kind === 'sheet') {
var ss = file;
(it.sheets || []).forEach(function (b) {
var s = byId_(ss, b.id);
if (s && it.after && it.after[b.id] && !sameFinger_(it.after[b.id], fingerSheet_(s, it.fp || 1))) hand.push(b.name);
});
Object.keys(it.created || {}).forEach(function (nm) {
var s = ss.getSheetByName(nm);
if (s && !sameFinger_(it.created[nm], fingerSheet_(s, it.fp || 1))) hand.push(nm);
});
} else if (it.afterDoc && !sameFinger_(it.afterDoc, fingerDoc_(file, it.fp || 1))) hand.push(file.getName());
if (hand.length && !req.ok)
return { ok: false, needs_ok: true, error: '道具が書いた後に手で直した所があります（戻すと消えます）: ' + hand.join('、') + '。それでも戻すなら ok=True', target: { id: it.id, name: it.name, kind: it.kind, url: file.getUrl() } };
l.seq++; var n = l.seq;
var undoNotes = [];
var entry = { n: n, time: Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss'), id: it.id, name: it.name, kind: it.kind, what: 'undo #' + it.n, isUndo: true, fp: FP_VER };
try {
if (it.kind === 'sheet') {
var ss2 = file, names = [];
(it.sheets || []).forEach(function (b) { var s = byId_(ss2, b.id); if (s) names.push(s); });
var undoLite = false;
if (it.lite && it.liteItems) {
entry.sheets = backupSheetsLite_(ss2, names, n, it.liteItems);
if (entry.sheets !== null) { undoLite = true; entry.lite = true; entry.liteItems = it.liteItems; }
}
if (!undoLite) entry.sheets = backupSheets_(ss2, names, n, it.sideItems || []);
var made = Object.keys(it.created || {});
made.forEach(function (nm) { var s = ss2.getSheetByName(nm); if (s && ss2.getSheets().length > 1) ss2.deleteSheet(s); });
var bks = loadSide_(it);
bks.forEach(function (b) { if (!b.lite) restoreSheet_(ss2, b); });
restoreSide_(ss2, bks, undoNotes);
SpreadsheetApp.flush();
entry.after = {}; (entry.sheets || []).forEach(function (b) { var s = byId_(ss2, b.id); if (s) entry.after[b.id] = fingerSheet_(s); });
} else {
entry.doc = backupDoc_(file, n);
restoreDoc_(file, it.doc, it.n);
file.saveAndClose(); file = DocumentApp.openById(it.id);
entry.afterDoc = fingerDoc_(file);
}
} catch (err) {
return { ok: false, error: '戻せませんでした: ' + String(err.message || err), target: { id: it.id, name: it.name, kind: it.kind, url: file.getUrl() } };
}
var preStr2 = entry.sheets && entry.sheets._packedStr;
var sideRec2 = preStr2 ? { items: entry.sheets._packedItems } : ((entry.sheets && entry.sheets.length) ? packSide_(entry.sheets, entry.lite ? entry.liteItems : (it.sideItems || [])) : null);
if (sideRec2) { saveSide_(n, sideRec2, preStr2); entry.hasSide = true; entry.sideItems = sideRec2.items; entry.sheets = stripSide_(entry.sheets); }
it.undone = true;
if (req.to) {
l.items.forEach(function (x) {
if (x.id === it.id && x.n > it.n && !x.undone && !x.isUndo) {
x.undone = true;
}
});
}
l.items.push(entry); ledgerSave_(l);
return { ok: true, undone: it.n, backup: n, what: it.what, notes: undoNotes, target: { id: it.id, name: it.name, kind: it.kind, url: file.getUrl() } };
}
function gridA1_(g) {
if (!g) return '';
var r0 = g.startRowIndex || 0, c0 = g.startColumnIndex || 0;
if (g.startRowIndex === undefined && g.endRowIndex === undefined && g.startColumnIndex === undefined && g.endColumnIndex === undefined) return 'シート全体';
var a = colLetter_(c0 + 1) + (r0 + 1);
var r1 = g.endRowIndex, c1 = g.endColumnIndex;
if (r1 === undefined && c1 === undefined) return a;
if ((r1 === undefined || r1 === r0 + 1) && (c1 === undefined || c1 === c0 + 1)) return a;
return a + ':' + (c1 !== undefined ? colLetter_(c1) : '') + (r1 !== undefined ? r1 : '');
}
function numRuns_(idx0) {
var out = [], s = -1, prev = -2;
idx0.forEach(function (i) { if (i === prev + 1) { prev = i; return; } if (s >= 0) out.push(s === prev ? '' + (s + 1) : (s + 1) + '-' + (prev + 1)); s = i; prev = i; });
if (s >= 0) out.push(s === prev ? '' + (s + 1) : (s + 1) + '-' + (prev + 1));
return out;
}
function colRuns_(idx0) { return numRuns_(idx0).map(function (x) { return x.replace(/\d+/g, function (n) { return colLetter_(parseInt(n, 10)); }); }); }
function capList_(arr, n) { return arr.length > n ? arr.slice(0, n).concat(['ほか ' + (arr.length - n)]) : arr; }
var CHART_NAMES = { COLUMN: '縦棒', BAR: '横棒', LINE: '折れ線', PIE: '円', AREA: '面', SCATTER: '散布図', COMBO: '複合', STEPPED_AREA: '階段面' };
function validationLabel_(v) {
var c = v.condition || {}, vals = (c.values || []).map(function (x) { return x.userEnteredValue || ''; });
if (c.type === 'ONE_OF_LIST') return 'プルダウン（' + vals.slice(0, 4).join('/') + (vals.length > 4 ? '…' : '') + '）';
if (c.type === 'ONE_OF_RANGE') return 'プルダウン（範囲 ' + String(vals[0] || '').replace(/^=/, '') + '）';
if (c.type === 'BOOLEAN') return 'チェックボックス';
if (/^NUMBER_/.test(c.type)) return '数値の入力規則';
if (/^DATE_/.test(c.type)) return '日付の入力規則';
return String(c.type || '入力規則');
}
function lookSide_(ss, sh) {
var lines = [], id = sh.getSheetId();
var r1 = Sheets.Spreadsheets.get(ss.getId(), { fields: 'namedRanges,sheets(properties(sheetId),basicFilter,rowGroups,columnGroups,protectedRanges(range,warningOnly),charts(spec(title,basicChart(chartType),pieChart(legendPosition))),bandedRanges(range))' });
var x = (r1.sheets || []).filter(function (s) { return s.properties.sheetId === id; })[0] || {};
var maxR = Math.min(sh.getLastRow(), 2000), maxC = Math.min(sh.getLastColumn(), 60), d = null;
if (maxR > 0 && maxC > 0) {
var r2 = Sheets.Spreadsheets.get(ss.getId(), { includeGridData: true, ranges: [q_(sh.getName()) + '!A1:' + colLetter_(maxC) + maxR],
fields: 'sheets(properties(sheetId),data(rowMetadata(hiddenByUser),columnMetadata(hiddenByUser),rowData(values(dataValidation))))' });
d = (((r2.sheets || [])[0] || {}).data || [])[0] || null;
}
if (d && d.rowData) {
var bySig = {};
d.rowData.forEach(function (row, r) { (row.values || []).forEach(function (cell, c) { if (cell.dataValidation) { var k = validationLabel_(cell.dataValidation); (bySig[k] = bySig[k] || []).push([r, c]); } }); });
var vparts = [];
Object.keys(bySig).forEach(function (k) {
var cols = {}; bySig[k].forEach(function (rc) { (cols[rc[1]] = cols[rc[1]] || []).push(rc[0]); });
var runsByKey = {};
Object.keys(cols).map(Number).sort(function (a, b) { return a - b; }).forEach(function (c) {
numRuns_(cols[c]).forEach(function (rr) { var m = rr.split('-'); var key = rr; (runsByKey[key] = runsByKey[key] || { r: m, cols: [] }).cols.push(c); });
});
Object.keys(runsByKey).forEach(function (key) {
var o = runsByKey[key], cs = o.cols, st = cs[0], pv = cs[0];
for (var i = 1; i <= cs.length; i++) {
if (i < cs.length && cs[i] === pv + 1) { pv = cs[i]; continue; }
var a = colLetter_(st + 1) + o.r[0], b = colLetter_(pv + 1) + (o.r[1] || o.r[0]);
vparts.push((a === b ? a : a + ':' + b) + ' ' + k); if (i < cs.length) { st = cs[i]; pv = cs[i]; }
}
});
});
if (vparts.length) lines.push('入力規則: ' + capList_(vparts, 4).join('、'));
}
(x.bandedRanges || []).length && lines.push('交互の色: ' + capList_((x.bandedRanges || []).map(function (b) { return gridA1_(b.range); }), 3).join('、'));
var prot = (x.protectedRanges || []).map(function (q) { return gridA1_(q.range) + (q.warningOnly ? '（警告のみ）' : ''); });
if (prot.length) lines.push('保護: ' + capList_(prot, 3).join('、'));
if (x.basicFilter) {
var f = x.basicFilter, cr = Object.keys(f.criteria || {}).map(function (k) { return colLetter_(parseInt(k, 10) + 1); });
lines.push('フィルタ: ' + gridA1_(f.range) + (cr.length ? '（' + cr.join('・') + ' 列で絞り込み中）' : ''));
}
if (d) {
var hr = [], hc = [];
(d.rowMetadata || []).forEach(function (m, i) { if (m && m.hiddenByUser) hr.push(i); });
(d.columnMetadata || []).forEach(function (m, i) { if (m && m.hiddenByUser) hc.push(i); });
var hp = [];
if (hr.length) hp.push('隠した行: ' + capList_(numRuns_(hr), 4).join('、'));
if (hc.length) hp.push('隠した列: ' + capList_(colRuns_(hc), 4).join('、'));
if (hp.length) lines.push(hp.join(' ／ '));
}
var gp = [];
(x.rowGroups || []).forEach(function (g) { gp.push('行 ' + ((g.range.startIndex || 0) + 1) + '-' + g.range.endIndex + '（深さ' + g.depth + (g.collapsed ? '・畳んである' : '') + '）'); });
(x.columnGroups || []).forEach(function (g) { gp.push('列 ' + colLetter_((g.range.startIndex || 0) + 1) + '-' + colLetter_(g.range.endIndex) + '（深さ' + g.depth + (g.collapsed ? '・畳んである' : '') + '）'); });
if (gp.length) lines.push('グループ: ' + capList_(gp, 3).join('、'));
var nm = (r1.namedRanges || []).map(function (n) { return n.name + '=' + gridA1_(n.range); });
if (nm.length) lines.push('名前付き範囲: ' + capList_(nm, 4).join('、'));
var ch = (x.charts || []).map(function (c) { var s = c.spec || {}, ty = s.basicChart ? s.basicChart.chartType : (s.pieChart ? 'PIE' : ''); return (CHART_NAMES[ty] || ty || 'グラフ') + (s.title ? '（' + s.title + '）' : ''); });
if (ch.length) lines.push('グラフ: ' + capList_(ch, 3).join('、'));
return lines;
}
function tableOut_(tb) {
return { header_row: tb.headerRow, first_col: colLetter_(tb.firstCol), last_col: colLetter_(tb.lastCol), data: tb.firstData + '-' + tb.lastData,
total_row: tb.totalRow || null, columns: headerNames_(tb).map(function (h, i) { var ci = tb.firstCol + i; return { col: colLetter_(ci), name: h, number: isNumberCol_(tb, ci) }; }) };
}
function tableOfSheet_(ss, name) {
var sh = name ? ss.getSheetByName(name) : null;
if (!sh) return null;
var tb = findTable_(sh);
return tb ? tableOut_(tb) : { none: true };
}
function sameTable_(a, e) {
if (!a || a.none || !e) return false;
if (a.header_row !== e.header_row || a.data !== e.data || (a.total_row || null) !== (e.total_row || null)) return false;
var an = a.columns.map(function (c) { return c.col + '=' + c.name; }).join('|');
var en = (e.columns || []).map(function (c) { return c.col + '=' + c.name; }).join('|');
return an === en;
}
var SHELF = {};
function sheetCtx_(ctx, op) {
var sh = sheetOf_(ctx.ss, op.sheet, ctx.sheetName);
ctx.curSheet = sh.getName();
return sh;
}
function note_(ctx, s) { ctx.notes.push(s); }
function chg_(ctx, sh, a1, what) { ctx.changed.push((sh ? sh.getName() + '!' : '') + a1 + (what ? ' ' + what : '')); }
function need_(op, keys) { keys.forEach(function (k) { if (op[k] === undefined || op[k] === null || op[k] === '') throw new ArgError('棚「' + op.shelf + '」に「' + k + '」が要ります'); }); }
function guardDelete_(ctx, msg, wide, count) {
if (wide) return guardWide_(ctx, msg, count);
if (!ctx.ok) throw new Blocked(msg + '（人の値を消すので、「消してよい」の承認＝ok=True が要ります）');
}
var WIDE_MS = 10 * 60 * 1000;
function guardWide_(ctx, msg, count) {
var now = Date.now(), map = getJson_('WIDE', {}), key = ctx.wideKey || 'x', live = {};
Object.keys(map).forEach(function (k) { if (now - map[k] < WIDE_MS) live[k] = map[k]; });
if (ctx.ok && live[key]) { delete live[key]; setJson_('WIDE', live); return; }
live[key] = now; setJson_('WIDE', live);
throw new Blocked('広い削除です。' + (count ? '消える数: ' + count + '。' : '') + (msg.length > 150 ? msg.slice(0, 150) + '…' : msg) + '（何が消えるかを使う人に見せて、「消してよい」の承認を得てから、同じ ops をもう一度 ok=True で撃つと通ります）');
}
function wideRange_(sh, rg) {
var dr = sh.getDataRange();
if (rg.getRow() <= dr.getRow() && rg.getColumn() <= dr.getColumn() && rg.getLastRow() >= dr.getLastRow() && rg.getLastColumn() >= dr.getLastColumn()) return true;
var t = findTable_(sh);
if (t) {
var last = t.totalRow || t.lastData;
if (rg.getRow() < t.headerRow || rg.getLastRow() > last || rg.getColumn() < t.firstCol || rg.getLastColumn() > t.lastCol) return true;
}
return false;
}
function wideRowCount_(t, n) { return !!t && n > (t.lastData - t.firstData + 1) / 2; }
function guardOverwrite_(ctx, rg, msg) {
if (ctx.ok) return;
var vals = rg.getValues(), forms = rg.getFormulas();
var r0 = rg.getRow(), c0 = rg.getColumn();
var hit = 0, first3 = [], nf = 0, f3 = [];
for (var r = 0; r < vals.length; r++) {
for (var c = 0; c < vals[r].length; c++) {
var v = vals[r][c];
if (forms[r][c]) { nf++; if (f3.length < 3) f3.push(a1_(r0 + r, c0 + c)); }
if (v !== '' && v !== null && v !== undefined || forms[r][c]) {
hit++;
if (first3.length < 3) first3.push(a1_(r0 + r, c0 + c));
}
}
}
if (hit > 0) {
var fNote = nf ? '。うち式のセルが ' + nf + ' 個（' + f3.join('・') + (nf > 3 ? ' など' : '') + '）＝上書きすると式が消えて値になります' : '';
var desc = (msg ? msg + '（' : '（') + '書く先に空でないセルが ' + hit + ' 個あります: ' + first3.join('・') + (hit > 3 ? ' など' : '') + fNote + '。「上書きしてよい」の承認＝ok=True が要ります）';
throw new Blocked(desc);
}
}
function rgb_(s) {
if (s === undefined || s === null || s === '') return null;
if (typeof s !== 'string') return s;
var str = s.trim();
if (str === 'なし' || str.toLowerCase() === 'none' || str.toLowerCase() === 'transparent' || str.toLowerCase() === 'clear') return null;
if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str)) {
if (str.length === 4) {
return ('#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3]).toUpperCase();
}
return str.toUpperCase();
}
var map = {
'黒': '#000000', 'black': '#000000',
'白': '#FFFFFF', 'white': '#FFFFFF',
'赤': '#FF0000', 'red': '#FF0000',
'青': '#0000FF', 'blue': '#0000FF',
'緑': '#008000', 'green': '#008000',
'黄': '#FFFF00', 'yellow': '#FFFF00',
'橙': '#FFA500', 'オレンジ': '#FFA500', 'orange': '#FFA500',
'紫': '#800080', 'purple': '#800080',
'桃': '#FFC0CB', 'ピンク': '#FFC0CB', 'pink': '#FFC0CB',
'灰': '#808080', '灰色': '#808080', 'グレー': '#808080', 'gray': '#808080', 'grey': '#808080',
'水色': '#00FFFF', 'シアン': '#00FFFF', 'cyan': '#00FFFF', 'lightblue': '#ADD8E6',
'紺': '#000080', 'ネイビー': '#000080', 'navy': '#000080',
'茶': '#8B4513', '茶色': '#8B4513', 'brown': '#8B4513',
'薄赤': '#FCE4D6', '薄青': '#D9E1F2', '薄緑': '#E2EFDA', '薄黄': '#FFF2CC', '薄灰': '#F2F2F2', '薄灰色': '#F2F2F2', '薄グレー': '#F2F2F2', '薄橙': '#FCE5CD', '薄紫': '#EAD1DC',
'lightred': '#FCE4D6', 'lightgreen': '#E2EFDA', 'lightyellow': '#FFF2CC', 'lightgray': '#F2F2F2'
};
var k = str.toLowerCase();
if (map[k] !== undefined) return map[k];
if (map[str] !== undefined) return map[str];
var norm = str.replace(/^薄い/, '薄').replace(/色$/, '');
if (map[norm] !== undefined) return map[norm];
var norm2 = str.replace(/^薄い/, '薄');
if (map[norm2] !== undefined) return map[norm2];
throw new ArgError('知らない色の名前です: 「' + str + '」');
}
function shiftFormula_(f, off) {
if (!off || typeof f !== 'string' || f.charAt(0) !== '=') return f;
return f.replace(/(\$?[A-Z]{1,3}\$?)(\d+)/g, function (m, c, r) { return c.indexOf('$') >= 0 && /\$$/.test(c) ? m : c + (parseInt(r) + off); });
}
var CATALOG = {
"api": {"kind": "sheet", "touch": ["隠し", "グループ", "保護", "名前", "タブ色", "グラフ", "フィルタ"], "backup": ["今"], "danger": "消す"},
"doc.new": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.append": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.replace": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.section": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": "消す"},
"doc.table": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.style": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.outline": {"kind": "doc", "touch": [], "backup": ["今"], "danger": ""},
"doc.insert": {"kind": "doc", "touch": ["値"], "backup": ["今"], "danger": ""},
"doc.table.cell": {"kind": "doc", "touch": ["値"], "backup": ["今"], "danger": ""},
"doc.find": {"kind": "doc", "touch": [], "backup": ["今"], "danger": ""},
"doc.heading": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.list": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.delete": {"kind": "doc", "touch": ["値"], "backup": ["今"], "danger": "消す"},
"doc.move": {"kind": "doc", "touch": ["値"], "backup": ["今"], "danger": ""},
"doc.table.row": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.font": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.align": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.table.style": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.pagebreak": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.header": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.toc": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.link": {"kind": "doc", "touch": ["書式"], "backup": ["今"], "danger": ""},
"doc.from.sheet": {"kind": "doc", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"doc.template": {"kind": "doc", "touch": ["シート構成"], "backup": ["今"], "danger": ""},
"doc.copy": {"kind": "doc", "touch": ["シート構成"], "backup": ["今"], "danger": ""},
"tidy": {"kind": "sheet", "touch": ["書式", "幅", "固定"], "backup": ["今"], "danger": ""},
"seiri": {"kind": "sheet", "touch": ["値", "書式", "幅", "固定"], "backup": ["今"], "danger": "消す"},
"renumber": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"sort": {"kind": "sheet", "touch": ["値", "フィルタ"], "backup": ["今"], "danger": ""},
"filter.where": {"kind": "sheet", "touch": ["値", "フィルタ"], "backup": ["今"], "danger": ""},
"filter.on": {"kind": "sheet", "touch": ["フィルタ"], "backup": ["今"], "danger": ""},
"dedupe": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "消す"},
"split.col": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"filter.off": {"kind": "sheet", "touch": ["フィルタ"], "backup": ["今"], "danger": ""},
"calc.col": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"calc.percent": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"stat.row": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"lookup.add": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"calc.diff": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"calc.running": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"calc.rank": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"count.if": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"subtotal": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"formula.guard": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"formula.tovalue": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"round": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"date.parts": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"text.join": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"text.case": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"validation.list": {"kind": "sheet", "touch": ["入力規則"], "backup": ["今"], "danger": ""},
"validation.number": {"kind": "sheet", "touch": ["入力規則"], "backup": ["今"], "danger": ""},
"validation.date": {"kind": "sheet", "touch": ["入力規則"], "backup": ["今"], "danger": ""},
"checkbox": {"kind": "sheet", "touch": ["入力規則", "値"], "backup": ["今"], "danger": "上書き"},
"validation.clear": {"kind": "sheet", "touch": ["入力規則"], "backup": ["今"], "danger": ""},
"protect.sheet": {"kind": "sheet", "touch": ["保護"], "backup": ["今"], "danger": ""},
"protect.range": {"kind": "sheet", "touch": ["保護"], "backup": ["今"], "danger": ""},
"protect.remove": {"kind": "sheet", "touch": ["保護"], "backup": ["今"], "danger": ""},
"name.add": {"kind": "sheet", "touch": ["名前"], "backup": ["今"], "danger": ""},
"name.delete": {"kind": "sheet", "touch": ["名前"], "backup": ["今"], "danger": ""},
"name.list": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"backup": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"folder": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"drive.list": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"drive.rename": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"drive.move": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"drive.trash": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": "消す"},
"format": {"kind": "sheet", "touch": ["書式"], "backup": ["今"], "danger": ""},
"bg.clear": {"kind": "sheet", "touch": ["書式"], "backup": ["今"], "danger": ""},
"width": {"kind": "sheet", "touch": ["幅"], "backup": ["今"], "danger": ""},
"cf.add": {"kind": "sheet", "touch": ["条件付き"], "backup": ["今"], "danger": ""},
"cf.dup": {"kind": "sheet", "touch": ["条件付き"], "backup": ["今"], "danger": ""},
"cf.scale": {"kind": "sheet", "touch": ["条件付き"], "backup": ["今"], "danger": ""},
"cf.clear": {"kind": "sheet", "touch": ["条件付き"], "backup": ["今"], "danger": ""},
"cf.list": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"banding.add": {"kind": "sheet", "touch": ["交互の色"], "backup": ["今"], "danger": ""},
"banding.remove": {"kind": "sheet", "touch": ["交互の色"], "backup": ["今"], "danger": ""},
"table.new": {"kind": "sheet", "touch": ["値", "書式", "シート構成", "固定"], "backup": ["今"], "danger": ""},
"total": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"summary": {"kind": "sheet", "touch": ["値", "書式", "シート構成"], "backup": ["今", "先"], "danger": "消す"},
"pivot.new": {"kind": "sheet", "touch": ["シート構成", "値"], "backup": ["先"], "danger": ""},
"chart.new": {"kind": "sheet", "touch": ["グラフ"], "backup": ["今"], "danger": ""},
"chart.delete": {"kind": "sheet", "touch": ["グラフ"], "backup": ["今"], "danger": "消す"},
"write": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"replace": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"find": {"kind": "sheet", "touch": [], "backup": ["なし"], "danger": ""},
"clear.values": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "消す"},
"clear.format": {"kind": "sheet", "touch": ["書式"], "backup": ["今"], "danger": ""},
"clear.all": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": "消す"},
"copy": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": "上書き"},
"copy.values": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"copy.format": {"kind": "sheet", "touch": ["書式"], "backup": ["今"], "danger": ""},
"fill.series": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"date.fix": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": ""},
"fill.date": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"fill.down": {"kind": "sheet", "touch": ["値"], "backup": ["今"], "danger": "上書き"},
"rows": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": "消す"},
"rows.insert": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"rows.delete": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": "消す"},
"rows.move": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"cols.insert": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"cols.delete": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": "消す"},
"cols.move": {"kind": "sheet", "touch": ["値", "書式"], "backup": ["今"], "danger": ""},
"freeze": {"kind": "sheet", "touch": ["固定"], "backup": ["今"], "danger": ""},
"unfreeze": {"kind": "sheet", "touch": ["固定"], "backup": ["今"], "danger": ""},
"rows.hide": {"kind": "sheet", "touch": ["隠し"], "backup": ["今"], "danger": ""},
"rows.show": {"kind": "sheet", "touch": ["隠し"], "backup": ["今"], "danger": ""},
"cols.hide": {"kind": "sheet", "touch": ["隠し"], "backup": ["今"], "danger": ""},
"cols.show": {"kind": "sheet", "touch": ["隠し"], "backup": ["今"], "danger": ""},
"group.rows": {"kind": "sheet", "touch": ["グループ", "隠し"], "backup": ["今"], "danger": ""},
"group.cols": {"kind": "sheet", "touch": ["グループ", "隠し"], "backup": ["今"], "danger": ""},
"group.remove": {"kind": "sheet", "touch": ["グループ"], "backup": ["今"], "danger": ""},
"sheet.add": {"kind": "sheet", "touch": ["シート構成"], "backup": ["名前", "全部"], "danger": ""},
"sheet.rename": {"kind": "sheet", "touch": ["シート構成"], "backup": ["名前", "全部"], "danger": ""},
"sheet.move": {"kind": "sheet", "touch": ["シート構成"], "backup": ["名前", "全部"], "danger": ""},
"sheet.delete": {"kind": "sheet", "touch": ["シート構成"], "backup": ["名前", "全部"], "danger": "消す"},
"sheet.copy": {"kind": "sheet", "touch": ["シート構成"], "backup": ["名前", "全部"], "danger": ""},
"sheet.hide": {"kind": "sheet", "touch": ["隠し"], "backup": ["名前", "全部"], "danger": ""},
"sheet.show": {"kind": "sheet", "touch": ["隠し"], "backup": ["名前", "全部"], "danger": ""},
"sheet.color": {"kind": "sheet", "touch": ["タブ色"], "backup": ["今"], "danger": ""}
};
var API_TYPES = {"addBanding": {"touch": ["交互の色"], "danger": false, "deny": []}, "addChart": {"touch": ["グラフ"], "danger": false, "deny": []}, "addConditionalFormatRule": {"touch": ["条件付き"], "danger": false, "deny": []}, "addDimensionGroup": {"touch": ["グループ"], "danger": false, "deny": []}, "addNamedRange": {"touch": ["名前"], "danger": false, "deny": []}, "addProtectedRange": {"touch": ["保護"], "danger": false, "deny": []}, "clearBasicFilter": {"touch": ["フィルタ"], "danger": false, "deny": []}, "copyPaste": {"touch": ["値", "書式"], "danger": false, "deny": []}, "deleteConditionalFormatRule": {"touch": ["条件付き"], "danger": true, "deny": []}, "deleteDimension": {"touch": ["値", "書式"], "danger": true, "deny": []}, "deleteRange": {"touch": ["値", "書式"], "danger": true, "deny": []}, "findReplace": {"touch": ["値"], "danger": false, "deny": []}, "insertDimension": {"touch": ["値", "書式"], "danger": false, "deny": []}, "mergeCells": {"touch": ["書式"], "danger": false, "deny": []}, "repeatCell": {"touch": ["値", "書式"], "danger": false, "deny": []}, "setBasicFilter": {"touch": ["フィルタ"], "danger": false, "deny": []}, "setDataValidation": {"touch": ["入力規則"], "danger": false, "deny": []}, "sortRange": {"touch": ["値"], "danger": false, "deny": []}, "unmergeCells": {"touch": ["書式"], "danger": false, "deny": []}, "updateBorders": {"touch": ["書式"], "danger": false, "deny": []}, "updateCells": {"touch": ["値", "書式"], "danger": false, "deny": []}, "updateDimensionProperties": {"touch": ["隠し", "幅"], "danger": false, "deny": [{"when": {"range.dimension": "ROWS"}, "fields": ["pixelSize"]}]}, "updateSheetProperties": {"touch": ["シート構成", "固定", "タブ色", "隠し"], "danger": false, "deny": [{"fields": ["hideGridlines", "rightToLeft"]}]}};
SHELF['api'] = function (ctx, op) {
need_(op, ['requests']);
var reqs = op.requests, ss = ctx.ss;
if (!Array.isArray(reqs) || !reqs.length) throw new ArgError('棚「api」の requests は batchUpdate の requests の配列です');
var info = apiScan_(reqs);
if (info.bad.length) throw new ArgError('棚「api」: ' + info.bad.slice(0, 3).join(' ／ '));
if (info.danger.length) guardDelete_(ctx, 'api の消す型 ' + info.danger.join('・') + ' を撃ちます（' + info.danger.length + ' 件）', true, info.danger.length + ' 件');
var def = apiDefaultSheet_(ctx, op);
var conv = reqs.map(function (r) { return apiWalk_(ss, r, def.getSheetId(), ''); });
var before = ss.getSheets().map(function (s) { return s.getName(); });
ctx.curSheet = def.getName();
try { Sheets.Spreadsheets.batchUpdate({ requests: conv }, ss.getId()); }
catch (e) {
var gm = String(e && e.message || e);
if (/Invalid (JSON payload|requests)|No grid with id|Unknown name|INVALID_ARGUMENT/.test(gm)) throw new ArgError('棚「api」: Google が requests を受け付けませんでした（何も変わっていません）: ' + gm.replace(/\s+/g, ' ').slice(0, 300));
throw e;
}
ss.getSheets().forEach(function (s) { if (before.indexOf(s.getName()) < 0) ctx.createdSheets.push(s.getName()); });
chg_(ctx, null, 'api', info.types.join('・') + ' を撃った（' + reqs.length + ' 件）' + (op.why ? '：' + op.why : ''));
};
function apiDig_(obj, path) {
var cur = obj, ks = path.split('.');
for (var i = 0; i < ks.length; i++) { if (!cur || typeof cur !== 'object' || !(ks[i] in cur)) return undefined; cur = cur[ks[i]]; }
return cur;
}
function apiScan_(reqs) {
var bad = [], danger = [], types = [];
reqs.forEach(function (r, i) {
var ks = r && typeof r === 'object' ? Object.keys(r) : [];
if (ks.length !== 1) { bad.push((i + 1) + ' 番目の request は {"型の名前": {…}} の形です'); return; }
var t = ks[0], spec = API_TYPES[t];
if (!spec) { bad.push((i + 1) + ' 番目の型「' + t + '」は表にありません（許す型: ' + Object.keys(API_TYPES).sort().join('・') + '）'); return; }
if (types.indexOf(t) < 0) types.push(t);
if (spec.danger) danger.push(t);
var fields = String((r[t] || {}).fields || '');
(spec.deny || []).forEach(function (d) {
var ok = true; Object.keys(d.when || {}).forEach(function (k) { if (apiDig_(r[t], k) !== d.when[k]) ok = false; });
if (ok && d.fields.some(function (f) { return fields.indexOf(f) >= 0; })) bad.push((i + 1) + ' 番目の「' + t + '」の fields「' + fields + '」は ws_undo で戻らない物を含むので断ります');
});
});
return { bad: bad, danger: danger, types: types };
}
function apiDefaultSheet_(ctx, op) {
var nm = op.sheet || ctx.sheetName;
return nm ? sheetOf_(ctx.ss, nm, '') : ctx.ss.getSheets()[0];
}
function apiSheetId_(ss, v) {
if (typeof v === 'number') {
if (!byId_(ss, v)) throw new ArgError('sheetId ' + v + ' のシートはありません。sheetId にはシートの名前を書けます（"sheetId":"シート名"）。あるのは: ' + ss.getSheets().map(function (s) { return s.getName() + '（' + s.getSheetId() + '）'; }).join('、'));
return v;
}
var s = ss.getSheetByName(String(v));
if (!s) throw new ArgError('シート「' + v + '」がありません');
return s.getSheetId();
}
function apiGrid_(ss, str, defId) {
var m = /^(?:'((?:[^']|'')+)'|([^!']+))!(.+)$/.exec(str), sid = defId, a1 = str;
if (m) { sid = apiSheetId_(ss, m[1] ? m[1].replace(/''/g, "'") : m[2]); a1 = m[3]; }
var p = /^\$?([A-Za-z]*)\$?(\d*)(?::\$?([A-Za-z]*)\$?(\d*))?$/.exec(a1);
if (!p || (!p[1] && !p[2])) throw new ArgError('範囲「' + str + '」が読めません');
var g = { sheetId: sid }, c1 = p[1], r1 = p[2], c2 = p[3], r2 = p[4], single = c2 === undefined && r2 === undefined;
if (c1) g.startColumnIndex = colNum_(c1.toUpperCase()) - 1;
if (r1) g.startRowIndex = parseInt(r1, 10) - 1;
if (single) {
if (c1) g.endColumnIndex = g.startColumnIndex + 1;
if (r1) g.endRowIndex = g.startRowIndex + 1;
} else {
var ec = c2 || c1, er = r2 || r1;
if (ec) g.endColumnIndex = colNum_(ec.toUpperCase());
if (er) g.endRowIndex = parseInt(er, 10);
}
return g;
}
function apiColor_(s) {
var hex = rgb_(s);
if (!hex) return {};
var n = parseInt(String(hex).replace('#', ''), 16);
return { red: ((n >> 16) & 255) / 255, green: ((n >> 8) & 255) / 255, blue: (n & 255) / 255 };
}
var API_GRID_KEYS = { range: 1, source: 1, destination: 1 };
function apiWalk_(ss, node, defId, key) {
if (Array.isArray(node)) {
if (key === 'ranges' && node.length && typeof node[0] === 'string') return node.map(function (x) { return apiGrid_(ss, x, defId); });
return node.map(function (x) { return apiWalk_(ss, x, defId, key); });
}
if (node && typeof node === 'object') {
var o = {};
Object.keys(node).forEach(function (k) {
var v = node[k];
if (k === 'sheetId' && (typeof v === 'string' || typeof v === 'number')) o[k] = apiSheetId_(ss, v);
else if (API_GRID_KEYS[k] && typeof v === 'string') o[k] = apiGrid_(ss, v, defId);
else if (k === 'anchorCell' && typeof v === 'string') { var g = apiGrid_(ss, v, defId); o[k] = { sheetId: g.sheetId, rowIndex: g.startRowIndex || 0, columnIndex: g.startColumnIndex || 0 }; }
else if ((k === 'color' || /Color$/.test(k)) && typeof v === 'string') o[k] = apiColor_(v);
else o[k] = apiWalk_(ss, v, defId, k);
});
return o;
}
return node;
}
function apiSheetNames_(ctx, op) {
var ss = ctx.ss, names = [], all = false, found = false;
var add = function (n) { if (names.indexOf(n) < 0) names.push(n); };
var scan = function (node, key) {
if (Array.isArray(node)) { node.forEach(function (x) { scan(x, key); }); return; }
if (node && typeof node === 'object') {
if (node.allSheets === true) all = true;
Object.keys(node).forEach(function (k) {
var v = node[k];
if (k === 'sheetId') {
found = true;
if (typeof v === 'string') add(v);
else if (typeof v === 'number') { var s = byId_(ss, v); if (s) add(s.getName()); else all = true; }
} else if ((API_GRID_KEYS[k] || k === 'anchorCell') && typeof v === 'string') {
var m = /^(?:'((?:[^']|'')+)'|([^!']+))!/.exec(v);
if (m) { found = true; add(m[1] ? m[1].replace(/''/g, "'") : m[2]); }
} else if (key === 'ranges' || k === 'ranges') {
(Array.isArray(v) ? v : []).forEach(function (x) { if (typeof x === 'string') { var m2 = /^(?:'((?:[^']|'')+)'|([^!']+))!/.exec(x); if (m2) { found = true; add(m2[1] ? m2[1].replace(/''/g, "'") : m2[2]); } } });
scan(v, k);
} else scan(v, k);
});
}
};
scan(op.requests || [], '');
if (all) return ss.getSheets().map(function (s) { return s.getName(); });
if (!found) add(apiDefaultSheet_(ctx, op).getName());
return names;
}
DYNAMIC['api'] = {
sheets: function (ctx, op) { return apiSheetNames_(ctx, op); },
touch: function (op) {
var set = {};
(Array.isArray(op.requests) ? op.requests : []).forEach(function (r) {
var t = r && typeof r === 'object' ? Object.keys(r)[0] : null;
if (t && API_TYPES[t]) API_TYPES[t].touch.forEach(function (x) { set[x] = 1; });
});
return Object.keys(set);
}
};
function hexColor_(h) { return { red: parseInt(h.substr(1, 2), 16) / 255, green: parseInt(h.substr(3, 2), 16) / 255, blue: parseInt(h.substr(5, 2), 16) / 255 }; }
function tidyNumText_(v, dec) {
var s = Math.abs(v).toFixed(dec ? 2 : 0), p = s.split('.');
p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
return (v < 0 ? '-' : '') + p.join('.');
}
function tidyRange_(ctx, sh, rangeA1) {
if (typeof Sheets === 'undefined' || !Sheets.Spreadsheets || typeof Sheets.Spreadsheets.batchUpdate !== 'function') return tidyRangeLegacy_(ctx, sh, rangeA1);
var t = findTable_(sh);
if (!t) { note_(ctx, 'tidy: 表が見つからないので整えていません'); return; }
try {
if (rangeA1) {
var r = sh.getRange(rangeA1);
t.firstCol = r.getColumn(); t.lastCol = r.getLastColumn();
}
var sid = sh.getSheetId(), nc = t.lastCol - t.firstCol + 1, last = t.totalRow || t.lastData;
var grid = function (r1, r2, c1, c2) { return { sheetId: sid, startRowIndex: r1 - 1, endRowIndex: r2, startColumnIndex: c1 - 1, endColumnIndex: c2 }; };
var bd = { style: 'SOLID', color: hexColor_(STYLE.border) };
var reqs = [
{ updateBorders: { range: grid(t.headerRow, last, t.firstCol, t.lastCol), top: bd, bottom: bd, left: bd, right: bd, innerHorizontal: bd, innerVertical: bd } },
{ repeatCell: { range: grid(t.headerRow, last, t.firstCol, t.lastCol), cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE' } }, fields: 'userEnteredFormat.verticalAlignment' } },
{ repeatCell: { range: grid(t.headerRow, t.headerRow, t.firstCol, t.lastCol), cell: { userEnteredFormat: { backgroundColor: hexColor_(STYLE.headBg), textFormat: { bold: true, foregroundColor: hexColor_(STYLE.headFg) }, horizontalAlignment: 'CENTER', wrapStrategy: 'WRAP' } }, fields: 'userEnteredFormat(backgroundColor,textFormat(bold,foregroundColor),horizontalAlignment,wrapStrategy)' } }
];
var colFmt = {};
if (t.lastData - t.firstData + 1 >= 1) {
var rows = (t.totalRow ? t.totalRow : t.lastData) - t.firstData + 1;
for (var ci = t.firstCol; ci <= t.lastCol; ci++) {
var vals = [];
for (var rr = t.firstData; rr <= t.lastData; rr++) vals.push(t.vals[rr - 1][ci - 1]);
var fmt = null, align = null, kind = null;
if (isNoCol_(t, ci)) align = 'center';
else {
var nums = vals.filter(function (v) { return typeof v === 'number'; });
var dates = vals.filter(function (v) { return Object.prototype.toString.call(v) === '[object Date]'; });
var nonEmpty = vals.filter(function (v) { return !isBlank_(v); }).length;
if (nonEmpty && nums.length / nonEmpty > 0.5) { var dec = nums.some(function (v) { return v % 1 !== 0; }); fmt = dec ? STYLE.numFmtDec : STYLE.numFmt; align = 'right'; kind = dec ? 'dec' : 'int'; }
else if (nonEmpty && dates.length / nonEmpty > 0.5) { fmt = STYLE.dateFmt; align = 'center'; kind = 'date'; }
}
colFmt[ci] = kind;
var uf = {}, fl = [];
if (fmt) { uf.numberFormat = { type: kind === 'date' ? 'DATE' : 'NUMBER', pattern: fmt }; fl.push('numberFormat'); }
if (align) { uf.horizontalAlignment = align.toUpperCase(); fl.push('horizontalAlignment'); }
if (fl.length) reqs.push({ repeatCell: { range: grid(t.firstData, t.firstData + rows - 1, ci, ci), cell: { userEnteredFormat: uf }, fields: 'userEnteredFormat(' + fl.join(',') + ')' } });
}
}
if (t.totalRow) reqs.push({ repeatCell: { range: grid(t.totalRow, t.totalRow, t.firstCol, t.lastCol), cell: { userEnteredFormat: { backgroundColor: hexColor_(STYLE.totalBg), textFormat: { bold: true } } }, fields: 'userEnteredFormat(backgroundColor,textFormat(bold))' } });
var disp = sh.getRange(t.headerRow, t.firstCol, last - t.headerRow + 1, nc).getDisplayValues();
for (var c = 0; c < nc; c++) {
var k = colFmt[t.firstCol + c], mx = 0;
disp.forEach(function (row, ri) {
var s = row[c], v = t.vals[t.headerRow - 1 + ri][t.firstCol - 1 + c];
if (k && ri > 0) {
if (k === 'date' && Object.prototype.toString.call(v) === '[object Date]') s = '0000/00/00';
else if ((k === 'int' || k === 'dec') && typeof v === 'number') s = tidyNumText_(v, k === 'dec');
}
mx = Math.max(mx, wlen_(s));
});
reqs.push({ updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: t.firstCol - 1 + c, endIndex: t.firstCol + c }, properties: { pixelSize: Math.max(STYLE.colMin, Math.min(STYLE.colMax, mx * STYLE.px + STYLE.pad)) }, fields: 'pixelSize' } });
}
var fr = t.headerRow;
try {
for (var pass = 0; pass < 4; pass++) {
var fr0 = fr;
sh.getRange(1, 1, fr, Math.max(1, sh.getLastColumn())).getMergedRanges().forEach(function (m) { fr = Math.max(fr, m.getLastRow()); });
if (fr === fr0) break;
}
} catch (e) { fr = t.headerRow; }
reqs.push({ updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: fr } }, fields: 'gridProperties.frozenRowCount' } });
if (ctx.changed.length) SpreadsheetApp.flush();
batchRetry_(sh.getParent(), reqs);
} catch (e) {
note_(ctx, '速い整え方が使えなかったので従来の方法で整えました（' + String(e && e.message || e).slice(0, 120) + '）');
tidyRangeLegacy_(ctx, sh, rangeA1);
}
}
function tidyRangeLegacy_(ctx, sh, rangeA1) {
var t = findTable_(sh);
if (!t) { note_(ctx, 'tidy: 表が見つからないので整えていません'); return; }
if (rangeA1) {
var r = sh.getRange(rangeA1);
t.firstCol = r.getColumn(); t.lastCol = r.getLastColumn();
}
var nc = t.lastCol - t.firstCol + 1, last = t.totalRow || t.lastData;
var full = sh.getRange(t.headerRow, t.firstCol, last - t.headerRow + 1, nc);
full.setBorder(true, true, true, true, true, true, STYLE.border, SpreadsheetApp.BorderStyle.SOLID);
full.setVerticalAlignment('middle');
var hd = sh.getRange(t.headerRow, t.firstCol, 1, nc);
hd.setFontWeight('bold').setBackground(STYLE.headBg).setFontColor(STYLE.headFg).setHorizontalAlignment('center').setWrap(true);
var cnt = t.lastData - t.firstData + 1;
if (cnt >= 1) {
var rows = (t.totalRow ? t.totalRow : t.lastData) - t.firstData + 1;
var bodyRg = sh.getRange(t.firstData, t.firstCol, rows, nc);
var nf = bodyRg.getNumberFormats(), al = bodyRg.getHorizontalAlignments();
for (var ci = t.firstCol; ci <= t.lastCol; ci++) {
var k = ci - t.firstCol, vals = [];
for (var r = t.firstData; r <= t.lastData; r++) vals.push(t.vals[r - 1][ci - 1]);
var fmt = null, align = null;
if (isNoCol_(t, ci)) align = 'center';
else {
var nums = vals.filter(function (v) { return typeof v === 'number'; });
var dates = vals.filter(function (v) { return Object.prototype.toString.call(v) === '[object Date]'; });
var nonEmpty = vals.filter(function (v) { return !isBlank_(v); }).length;
if (nonEmpty && nums.length / nonEmpty > 0.5) { fmt = nums.some(function (v) { return v % 1 !== 0; }) ? STYLE.numFmtDec : STYLE.numFmt; align = 'right'; }
else if (nonEmpty && dates.length / nonEmpty > 0.5) { fmt = STYLE.dateFmt; align = 'center'; }
}
for (var rr = 0; rr < rows; rr++) { if (fmt) nf[rr][k] = fmt; if (align) al[rr][k] = align; }
}
bodyRg.setNumberFormats(nf).setHorizontalAlignments(al);
}
if (t.totalRow) sh.getRange(t.totalRow, t.firstCol, 1, nc).setFontWeight('bold').setBackground(STYLE.totalBg);
var disp = sh.getRange(t.headerRow, t.firstCol, last - t.headerRow + 1, nc).getDisplayValues();
for (var c = 0; c < nc; c++) {
var mx = 0; disp.forEach(function (row) { mx = Math.max(mx, wlen_(row[c])); });
sh.setColumnWidth(t.firstCol + c, Math.max(STYLE.colMin, Math.min(STYLE.colMax, mx * STYLE.px + STYLE.pad)));
}
var fr = t.headerRow;
try {
for (var pass = 0; pass < 4; pass++) {
var fr0 = fr;
sh.getRange(1, 1, fr, Math.max(1, sh.getLastColumn())).getMergedRanges().forEach(function (m) { fr = Math.max(fr, m.getLastRow()); });
if (fr === fr0) break;
}
} catch (e) { fr = t.headerRow; }
try { sh.setFrozenRows(fr); } catch (e) { note_(ctx, '結合セルをまたぐので、行の固定は変えませんでした'); }
}
SHELF['tidy'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
tidyRange_(ctx, sh, op.range || null);
chg_(ctx, sh, op.range || 'A1', '書式をそろえた');
};
SHELF['seiri'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
var rg = sh.getRange(t.headerRow, t.firstCol, t.lastData - t.headerRow + 1, t.lastCol - t.firstCol + 1);
var vals = rg.getValues(), forms = rg.getFormulas(), fixed = [], nTrim = 0, nHalf = 0, nNum = 0;
var doTrim = op.trim !== false, doHalf = op.halfwidth !== false, doNum = op.numbers !== false;
for (var r = 0; r < vals.length; r++) for (var c = 0; c < vals[r].length; c++) {
var v = vals[r][c];
if (forms[r][c] || typeof v !== 'string') continue;
var nv = v;
if (doHalf) { var h = nv.replace(/[！-～]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); }).replace(/　/g, ' '); if (h !== nv) { nv = h; nHalf++; } }
if (doTrim) { var tr = nv.replace(/^[\s　]+|[\s　]+$/g, ''); if (tr !== nv) { nv = tr; nTrim++; } }
if (doNum && r > 0 && /^-?[\d,]+(\.\d+)?$/.test(nv) && !/^-?0\d/.test(nv)) { nv = Number(nv.replace(/,/g, '')); nNum++; }
if (nv !== v) { vals[r][c] = nv; fixed.push(a1_(t.headerRow + r, t.firstCol + c)); }
}
if (fixed.length) {
var changedSet = {}; fixed.forEach(function (a) { changedSet[a] = 1; });
for (var c2 = 0; c2 < vals[0].length; c2++) {
var r2 = 0;
while (r2 < vals.length) {
if (!changedSet[a1_(t.headerRow + r2, t.firstCol + c2)]) { r2++; continue; }
var r3 = r2; while (r3 + 1 < vals.length && changedSet[a1_(t.headerRow + r3 + 1, t.firstCol + c2)]) r3++;
sh.getRange(t.headerRow + r2, t.firstCol + c2, r3 - r2 + 1, 1).setValues(vals.slice(r2, r3 + 1).map(function (row) { return [row[c2]]; }));
r2 = r3 + 1;
}
}
chg_(ctx, sh, fixed.slice(0, 4).join('・') + (fixed.length > 4 ? ' ほか' + (fixed.length - 4) + ' 件' : ''), '空白' + nTrim + '・全角→半角' + nHalf + '・数値化' + nNum);
if (_TBL_CACHE) _TBL_CACHE = { _once: true };
}
var t2 = op.blank_rows ? findTable_(sh) : null;
if (op.blank_rows && t2) {
var blanks = [];
for (var rr = t2.firstData; rr <= t2.lastData; rr++) {
var row = t2.vals[rr - 1].slice(t2.firstCol - 1, t2.lastCol);
if (row.every(isBlank_)) blanks.push(rr);
}
if (blanks.length) {
guardDelete_(ctx, '空行 ' + blanks.join('・') + ' 行目を詰めます', wideRowCount_(t2, blanks.length), blanks.length + ' 行');
for (var k = blanks.length - 1; k >= 0; k--) sh.deleteRow(blanks[k]);
chg_(ctx, sh, blanks.join('・') + ' 行目', '空行を削除（' + blanks.length + ' 行）');
if (_TBL_CACHE) _TBL_CACHE = { _once: true };
}
}
t2 = op.dedupe ? findTable_(sh) : null;
if (op.dedupe && t2) {
var seen = {}, dups = [];
for (var d = t2.firstData; d <= t2.lastData; d++) {
var key = JSON.stringify(t2.vals[d - 1].slice(t2.firstCol - 1, t2.lastCol));
if (seen[key]) dups.push(d); else seen[key] = 1;
}
if (dups.length) {
guardDelete_(ctx, '全列が同じ重複行 ' + dups.join('・') + ' 行目を消します', wideRowCount_(t2, dups.length), dups.length + ' 行');
for (var k2 = dups.length - 1; k2 >= 0; k2--) sh.deleteRow(dups[k2]);
chg_(ctx, sh, dups.join('・') + ' 行目', '重複行を削除（' + dups.length + ' 行）');
if (_TBL_CACHE) _TBL_CACHE = { _once: true };
}
}
if (op.renumber) SHELF['renumber'](ctx, { shelf: 'renumber', col: op.renumber, sheet: op.sheet });
if (op.tidy !== false) { tidyRange_(ctx, sh, null); chg_(ctx, sh, '', '書式をそろえた'); }
if (!ctx.changed.length) note_(ctx, '直す所はありませんでした');
};
SHELF['renumber'] = function (ctx, op) {
need_(op, ['col']);
var sh = sheetCtx_(ctx, op), t = needTable_(sh), ci = colIndexOf_(t, op.col), start = op.start === undefined ? 1 : op.start;
var n = 0, rowsOut = [];
for (var r = t.firstData; r <= t.lastData; r++) {
var row = t.vals[r - 1].slice(t.firstCol - 1, t.lastCol).filter(function (v, i) { return t.firstCol + i !== ci; });
var empty = row.every(isBlank_);
if (empty) { rowsOut.push(['']); continue; }
rowsOut.push([start + n]); n++;
}
if (rowsOut.length) sh.getRange(t.firstData, ci, rowsOut.length, 1).setValues(rowsOut);
chg_(ctx, sh, a1_(t.firstData, ci, rowsOut.length, 1), '番号を ' + start + ' から振り直し（' + n + ' 件）');
};
SHELF['sort'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
var rng = dataRange_(t);
if (op.col) { rng.sort({ column: colIndexOf_(t, op.col), ascending: !op.desc }); chg_(ctx, sh, rng.getA1Notation(), op.col + ' で' + (op.desc ? '降順' : '昇順') + 'に並べ替え'); }
if (op.filter || op.where) {
var full = sh.getRange(t.headerRow, t.firstCol, t.lastData - t.headerRow + 1, t.lastCol - t.firstCol + 1);
var f = sh.getFilter(); if (f) f.remove();
f = full.createFilter();
if (op.where) {
need_(op.where, ['col']);
var ci = colIndexOf_(t, op.where.col) - t.firstCol + 1;
var crit = op.where.equals !== undefined ? SpreadsheetApp.newFilterCriteria().whenTextEqualTo(String(op.where.equals)).build()
: SpreadsheetApp.newFilterCriteria().whenCellNotEmpty().build();
f.setColumnFilterCriteria(ci, crit);
}
chg_(ctx, sh, full.getA1Notation(), 'フィルタを設定');
}
if (!op.col && !op.filter && !op.where) throw new ArgError('棚「sort」に col か filter が要ります');
};
SHELF['filter.where'] = function (ctx, op) {
SHELF['sort'](ctx, { shelf: 'sort', where: { col: op.col, equals: op.equals }, sheet: op.sheet });
};
SHELF['filter.on'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var full = op.range ? sh.getRange(op.range) : (function () {
var t = findTable_(sh);
return t ? sh.getRange(t.headerRow, t.firstCol, t.lastData - t.headerRow + 1, t.lastCol - t.firstCol + 1) : sh.getDataRange();
})();
var f = sh.getFilter(); if (f) f.remove();
full.createFilter();
chg_(ctx, sh, full.getA1Notation(), 'フィルタを設定');
};
SHELF['dedupe'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
var colIndices = [];
if (op.cols) {
var cols = Array.isArray(op.cols) ? op.cols : [op.cols];
colIndices = cols.map(function (c) { return colIndexOf_(t, c) - 1; });
}
var seen = {}, dups = [];
for (var d = t.firstData; d <= t.lastData; d++) {
var row = t.vals[d - 1];
var key = colIndices.length
? JSON.stringify(colIndices.map(function (ci) { return row[ci]; }))
: JSON.stringify(row.slice(t.firstCol - 1, t.lastCol));
if (seen[key]) dups.push(d); else seen[key] = 1;
}
if (!dups.length) {
note_(ctx, '重複行はありませんでした（変更なし）');
return;
}
guardDelete_(ctx, (colIndices.length ? '指定列が同じ' : '全列が同じ') + '重複行 ' + dups.join('・') + ' 行目を消します', wideRowCount_(t, dups.length), dups.length + ' 行');
for (var k = dups.length - 1; k >= 0; k--) sh.deleteRow(dups[k]);
chg_(ctx, sh, dups.join('・') + ' 行目', '重複行を削除（' + dups.length + ' 行）');
};
SHELF['split.col'] = function (ctx, op) {
need_(op, ['col']);
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
var ci = colIndexOf_(t, op.col);
var by = op.by || 'comma';
var re;
if (by === 'comma') re = ',';
else if (by === 'space') re = /\s+/;
else if (by === 'tab') re = '\t';
else if (by === 'slash') re = '/';
else if (by === 'hyphen') re = '-';
else if (by === 'custom') re = op.sep !== undefined ? op.sep : ',';
else throw new ArgError('棚「split.col」の by の値が不正です: ' + by);
var numRows = t.lastData - t.firstData + 1;
var colVals = sh.getRange(t.firstData, ci, numRows, 1).getValues();
var splitRows = [];
var maxParts = 1;
for (var r = 0; r < numRows; r++) {
var str = String(colVals[r][0] !== null && colVals[r][0] !== undefined ? colVals[r][0] : '');
var parts = (str === '') ? [''] : str.split(re);
if (parts.length > maxParts) maxParts = parts.length;
splitRows.push(parts);
}
if (maxParts <= 1) {
note_(ctx, '区切り文字が見つからず、分割されませんでした（変更なし）');
return;
}
var extraCols = maxParts - 1;
if (op.insert) {
sh.insertColumnsAfter(ci, extraCols);
} else {
var checkRg = sh.getRange(t.firstData, ci + 1, numRows, extraCols);
guardOverwrite_(ctx, checkRg, '分割先「' + checkRg.getA1Notation() + '」');
}
var outVals = [];
for (var i = 0; i < numRows; i++) {
var p = splitRows[i];
var row = [];
for (var j = 0; j < maxParts; j++) {
row.push(j < p.length ? p[j] : '');
}
outVals.push(row);
}
sh.getRange(t.firstData, ci, numRows, maxParts).setValues(outVals);
chg_(ctx, sh, a1_(t.firstData, ci, numRows, maxParts), op.col + '列を ' + maxParts + ' 列に分割');
};
SHELF['filter.off'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var f = sh.getFilter();
if (f) {
f.remove();
chg_(ctx, sh, '', 'フィルタを解除');
} else {
note_(ctx, 'フィルタは設定されていません（変更なし）');
}
};
SHELF['calc.col'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['name', 'expr']);
var rawExpr = String(op.expr).trim();
var expr = rawExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/＋/g, '+').replace(/[ー−]/g, '-');
var hdrs = headerNames_(t);
var sortedHdrs = hdrs.slice().sort(function (a, b) { return b.length - a.length; });
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) {
sh.insertColumnsBefore(atCol, 1);
t = needTable_(sh);
}
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var makeFormula = function (r) {
var f = expr;
sortedHdrs.forEach(function (h) {
if (!h) return;
var ci = colIndexOf_(t, h);
var colL = colLetter_(ci);
f = f.split(h).join(colL + r);
});
f = f.replace(/(?<![A-Za-z0-9])([A-Z]{1,3})(?![0-9])/g, '$1' + r);
return f.charAt(0) === '=' ? f : '=' + f;
};
sh.getRange(t.headerRow, atCol).setValue(op.name);
var tmplCell = sh.getRange(t.headerRow, t.lastCol > atCol ? atCol + 1 : t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
formulas.push([makeFormula(r)]);
}
sh.getRange(t.firstData, atCol, numRows, 1).setFormulas(formulas);
}
chg_(ctx, sh, colLetter_(atCol) + '列', '計算列「' + op.name + '」を追加');
};
SHELF['calc.percent'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['col']);
var ci = colIndexOf_(t, op.col);
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) {
sh.insertColumnsBefore(atCol, 1);
t = needTable_(sh);
}
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var name = op.name || '構成比';
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var colL = colLetter_(ci);
var sumRef = t.totalRow ? (colL + '$' + t.totalRow) : ('SUM(' + colL + '$' + t.firstData + ':' + colL + '$' + t.lastData + ')');
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
formulas.push(['=' + colL + r + '/' + sumRef]);
}
var rg = sh.getRange(t.firstData, atCol, numRows, 1);
rg.setFormulas(formulas);
rg.setNumberFormat('0.0%');
}
if (t.totalRow) {
sh.getRange(t.totalRow, atCol).setValue(1.0).setNumberFormat('0.0%').setFontWeight('bold');
}
chg_(ctx, sh, colLetter_(atCol) + '列', '構成比列「' + name + '」を追加');
};
SHELF['stat.row'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
var stat = (op.stat || 'average').toLowerCase();
var fnName = stat === 'average' ? 'AVERAGE' : stat === 'max' ? 'MAX' : 'MIN';
var label = op.label || (stat === 'average' ? '平均' : stat === 'max' ? '最大' : '最小');
var cols = op.cols ? op.cols.map(function (c) { return colIndexOf_(t, c); }) : [];
if (!cols.length) {
for (var ci = t.firstCol; ci <= t.lastCol; ci++) {
if (!isNoCol_(t, ci) && isNumberCol_(t, ci)) cols.push(ci);
}
}
if (!cols.length) throw new ArgError('集計する数値列が見つかりません。cols で指定してください');
var tr = (t.totalRow ? t.totalRow : t.lastData) + 1;
var nc = t.lastCol - t.firstCol + 1;
var rowRg = sh.getRange(tr, t.firstCol, 1, nc);
sh.getRange(tr, t.firstCol).setValue(label);
cols.forEach(function (c) {
var f = '=' + fnName + '(' + colLetter_(c) + t.firstData + ':' + colLetter_(c) + t.lastData + ')';
sh.getRange(tr, c).setFormula(f).setNumberFormat(STYLE.numFmt).setHorizontalAlignment('right');
});
rowRg.setFontWeight('bold').setBackground(STYLE.totalBg).setBorder(true, true, true, true, true, true, STYLE.border, SpreadsheetApp.BorderStyle.SOLID);
chg_(ctx, sh, a1_(tr, t.firstCol, 1, nc), label + '行を追加');
};
SHELF['lookup.add'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['from_sheet', 'val_col']);
var srcSh = sheetOf_(ctx.ss, op.from_sheet, null);
var srcT = needTable_(srcSh);
var vci = colIndexOf_(srcT, op.val_col);
var keyCol = op.key_col ? colIndexOf_(srcT, op.key_col) : null;
var myKey = op.my_key ? colIndexOf_(t, op.my_key) : null;
if (!keyCol || !myKey) {
var myHdrs = headerNames_(t), srcHdrs = headerNames_(srcT);
for (var i = 0; i < myHdrs.length; i++) {
var h = myHdrs[i];
if (h && srcHdrs.indexOf(h) >= 0) {
if (!myKey) myKey = t.firstCol + i;
if (!keyCol) keyCol = srcT.firstCol + srcHdrs.indexOf(h);
break;
}
}
}
if (!keyCol) keyCol = srcT.firstCol;
if (!myKey) myKey = t.firstCol;
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) {
sh.insertColumnsBefore(atCol, 1);
t = needTable_(sh);
}
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var name = op.name || String(op.val_col);
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var srcName = q_(srcSh.getName());
var keyRange = srcName + '!$' + colLetter_(keyCol) + '$' + srcT.firstData + ':$' + colLetter_(keyCol) + '$' + srcT.lastData;
var valRange = srcName + '!$' + colLetter_(vci) + '$' + srcT.firstData + ':$' + colLetter_(vci) + '$' + srcT.lastData;
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
var myKeyCell = colLetter_(myKey) + r;
formulas.push(['=XLOOKUP(' + myKeyCell + ',' + keyRange + ',' + valRange + ',"")']);
}
sh.getRange(t.firstData, atCol, numRows, 1).setFormulas(formulas);
}
chg_(ctx, sh, colLetter_(atCol) + '列', '「' + srcSh.getName() + '」から「' + name + '」を引いて追加');
};
SHELF['calc.diff'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['col_a', 'col_b']);
var ca = colIndexOf_(t, op.col_a), cb = colIndexOf_(t, op.col_b);
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) { sh.insertColumnsBefore(atCol, 1); t = needTable_(sh); }
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var isRate = !!op.rate;
var name = op.name || (isRate ? '増減率' : '差額');
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var la = colLetter_(ca), lb = colLetter_(cb);
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
var f = isRate ? ('=(' + la + r + '-' + lb + r + ')/' + lb + r) : ('=' + la + r + '-' + lb + r);
formulas.push([f]);
}
var rg = sh.getRange(t.firstData, atCol, numRows, 1);
rg.setFormulas(formulas);
if (isRate) rg.setNumberFormat('0.0%');
}
chg_(ctx, sh, colLetter_(atCol) + '列', '差・増減列「' + name + '」を追加');
};
SHELF['calc.running'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['col']);
var ci = colIndexOf_(t, op.col);
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) { sh.insertColumnsBefore(atCol, 1); t = needTable_(sh); }
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var name = op.name || '累計';
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var cl = colLetter_(ci);
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
formulas.push(['=SUM(' + cl + '$' + t.firstData + ':' + cl + r + ')']);
}
sh.getRange(t.firstData, atCol, numRows, 1).setFormulas(formulas);
}
chg_(ctx, sh, colLetter_(atCol) + '列', '累計列「' + name + '」を追加');
};
SHELF['calc.rank'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['col']);
var ci = colIndexOf_(t, op.col);
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) { sh.insertColumnsBefore(atCol, 1); t = needTable_(sh); }
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var name = op.name || '順位';
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var cl = colLetter_(ci), order = op.desc === false ? 1 : 0;
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
var ref = cl + '$' + t.firstData + ':' + cl + '$' + t.lastData;
for (var r = t.firstData; r <= t.lastData; r++) {
formulas.push(['=RANK(' + cl + r + ', ' + ref + ', ' + order + ')']);
}
sh.getRange(t.firstData, atCol, numRows, 1).setFormulas(formulas);
}
chg_(ctx, sh, colLetter_(atCol) + '列', '順位列「' + name + '」を追加');
};
SHELF['count.if'] = function (ctx, op) {
need_(op, ['range', 'criteria']);
var sh = sheetCtx_(ctx, op);
var f = op.sum_range
? ('=SUMIF(' + op.range + ', "' + op.criteria + '", ' + op.sum_range + ')')
: ('=COUNTIF(' + op.range + ', "' + op.criteria + '")');
var targetA1 = op.into;
if (!targetA1) {
var t = findTable_(sh);
targetA1 = t ? colLetter_(t.lastCol + 2) + t.headerRow : 'J1';
}
sh.getRange(targetA1).setFormula(f);
chg_(ctx, sh, targetA1, '式「' + f + '」を設定');
};
SHELF['subtotal'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['key_col']);
var ki = colIndexOf_(t, op.key_col);
var sumIndices = op.sum_cols ? op.sum_cols.map(function (c) { return colIndexOf_(t, c); }) : [];
if (!sumIndices.length) {
for (var c = t.firstCol; c <= t.lastCol; c++) if (isNumberCol_(t, c)) sumIndices.push(c);
}
var vals = sh.getRange(t.firstData, ki, t.lastData - t.firstData + 1, 1).getValues();
var breaks = [];
for (var i = 1; i < vals.length; i++) {
if (vals[i][0] !== vals[i - 1][0] && vals[i][0] !== '' && vals[i - 1][0] !== '') {
breaks.push(t.firstData + i);
}
}
var inserted = 0, lastR = t.firstData;
for (var b = breaks.length - 1; b >= 0; b--) {
var rowIdx = breaks[b];
sh.insertRowBefore(rowIdx);
sh.getRange(rowIdx, t.firstCol).setValue('小計').setFontWeight('bold');
sumIndices.forEach(function (si) {
var cl = colLetter_(si);
sh.getRange(rowIdx, si).setFormula('=SUBTOTAL(9, ' + cl + lastR + ':' + cl + (rowIdx - 1) + ')').setFontWeight('bold');
});
inserted++;
}
chg_(ctx, sh, '表', inserted + ' か所に小計行を挿入');
};
SHELF['formula.guard'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg;
if (op.col) {
var t = needTable_(sh), ci = colIndexOf_(t, op.col);
rg = sh.getRange(t.firstData, ci, t.lastData - t.firstData + 1, 1);
} else if (op.range) {
rg = sh.getRange(op.range);
} else {
var t2 = findTable_(sh);
rg = t2 ? sh.getRange(t2.firstData, t2.firstCol, t2.lastData - t2.firstData + 1, t2.lastCol - t2.firstCol + 1) : sh.getDataRange();
}
var forms = rg.getFormulas(), changed = 0;
var fb = op.fallback !== undefined ? (typeof op.fallback === 'string' ? ('"' + op.fallback + '"') : op.fallback) : '""';
for (var r = 0; r < forms.length; r++) {
for (var c = 0; c < forms[r].length; c++) {
var f = forms[r][c];
if (f && f.indexOf('=IFERROR(') !== 0) {
forms[r][c] = '=IFERROR(' + f.replace(/^=/, '') + ', ' + fb + ')';
changed++;
}
}
}
if (changed) rg.setFormulas(forms);
chg_(ctx, sh, rg.getA1Notation(), changed + ' 個の数式を IFERROR で保護');
};
SHELF['formula.tovalue'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg;
if (op.col) {
var t = needTable_(sh), ci = colIndexOf_(t, op.col);
rg = sh.getRange(t.firstData, ci, t.lastData - t.firstData + 1, 1);
} else if (op.range) {
rg = sh.getRange(op.range);
} else {
var t2 = findTable_(sh);
rg = t2 ? sh.getRange(t2.firstData, t2.firstCol, t2.lastData - t2.firstData + 1, t2.lastCol - t2.firstCol + 1) : sh.getDataRange();
}
guardOverwrite_(ctx, rg, '数式を値に確定「' + rg.getA1Notation() + '」');
var vals = rg.getValues();
rg.setValues(vals);
chg_(ctx, sh, rg.getA1Notation(), '数式を値に固定化');
};
SHELF['round'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg;
if (op.col) {
var t = needTable_(sh), ci = colIndexOf_(t, op.col);
rg = sh.getRange(t.firstData, ci, t.lastData - t.firstData + 1, 1);
} else if (op.range) {
rg = sh.getRange(op.range);
} else throw new ArgError('棚「round」に col または range が要ります');
var fnName = op.mode === 'floor' ? 'ROUNDDOWN' : op.mode === 'ceil' ? 'ROUNDUP' : 'ROUND';
var dig = op.digits !== undefined ? parseInt(op.digits, 10) : 0;
var forms = rg.getFormulas(), vals = rg.getValues();
for (var r = 0; r < forms.length; r++) {
for (var c = 0; c < forms[r].length; c++) {
var src = forms[r][c] ? forms[r][c].replace(/^=/, '') : vals[r][c];
if (src !== '') forms[r][c] = '=' + fnName + '(' + src + ', ' + dig + ')';
}
}
rg.setFormulas(forms);
chg_(ctx, sh, rg.getA1Notation(), fnName + '（桁: ' + dig + '）を適用');
};
SHELF['date.parts'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['col', 'part']);
var ci = colIndexOf_(t, op.col);
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) { sh.insertColumnsBefore(atCol, 1); t = needTable_(sh); }
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var part = String(op.part).toLowerCase();
var nameMap = { year: '年', month: '月', day: '日', weekday: '曜日', quarter: '四半期' };
var name = op.name || nameMap[part] || '日付要素';
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var cl = colLetter_(ci);
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
var cellRef = cl + r;
var f = part === 'year' ? ('=YEAR(' + cellRef + ')')
: part === 'month' ? ('=MONTH(' + cellRef + ')')
: part === 'day' ? ('=DAY(' + cellRef + ')')
: part === 'weekday' ? ('=TEXT(' + cellRef + ', "aaa")')
: ('=ROUNDUP(MONTH(' + cellRef + ')/3)');
formulas.push([f]);
}
sh.getRange(t.firstData, atCol, numRows, 1).setFormulas(formulas);
}
chg_(ctx, sh, colLetter_(atCol) + '列', '日付抽出列「' + name + '」を追加');
};
SHELF['text.join'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
need_(op, ['cols']);
var colList = (Array.isArray(op.cols) ? op.cols : [op.cols]).map(function (c) { return colIndexOf_(t, c); });
var atCol = op.at ? colIndexOf_(t, op.at) : (t.lastCol + 1);
if (op.at && atCol <= t.lastCol) { sh.insertColumnsBefore(atCol, 1); t = needTable_(sh); }
if (atCol > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), atCol - sh.getMaxColumns());
var name = op.name || '結合';
sh.getRange(t.headerRow, atCol).setValue(name);
var tmplCell = sh.getRange(t.headerRow, t.firstCol);
sh.getRange(t.headerRow, atCol).setBackground(tmplCell.getBackground()).setFontColor(tmplCell.getFontColor()).setFontWeight(tmplCell.getFontWeight()).setHorizontalAlignment('center');
var sep = op.sep !== undefined ? String(op.sep) : ' ';
var numRows = t.lastData - t.firstData + 1;
if (numRows > 0) {
var formulas = [];
for (var r = t.firstData; r <= t.lastData; r++) {
var parts = colList.map(function (ci) { return colLetter_(ci) + r; });
var f = sep ? ('=JOIN("' + sep + '", ' + parts.join(', ') + ')') : ('=CONCATENATE(' + parts.join(', ') + ')');
formulas.push([f]);
}
sh.getRange(t.firstData, atCol, numRows, 1).setFormulas(formulas);
}
chg_(ctx, sh, colLetter_(atCol) + '列', '連結列「' + name + '」を追加');
};
SHELF['text.case'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg;
if (op.col) {
var t = needTable_(sh), ci = colIndexOf_(t, op.col);
rg = sh.getRange(t.firstData, ci, t.lastData - t.firstData + 1, 1);
} else if (op.range) {
rg = sh.getRange(op.range);
} else throw new ArgError('棚「text.case」に col または range が要ります');
guardOverwrite_(ctx, rg, '文字列ケース変換「' + rg.getA1Notation() + '」');
var mode = (op.mode || 'upper').toLowerCase();
var fnName = mode === 'lower' ? 'LOWER' : mode === 'proper' ? 'PROPER' : mode === 'asc' ? 'ASC' : mode === 'jis' ? 'JIS' : 'UPPER';
var forms = rg.getFormulas(), vals = rg.getValues(), tmp = [], isText = [], n = 0;
for (var r = 0; r < forms.length; r++) {
tmp.push([]); isText.push([]);
for (var c = 0; c < forms[r].length; c++) {
var f0 = forms[r][c], v0 = vals[r][c], txt = !f0 && typeof v0 === 'string' && v0 !== '';
isText[r].push(txt);
if (f0) { tmp[r].push('=' + fnName + '(' + f0.replace(/^=/, '') + ')'); n++; }
else if (txt) { tmp[r].push('=' + fnName + '("' + v0.replace(/"/g, '""') + '")'); n++; }
else tmp[r].push(v0 === '' ? '' : v0);
}
}
if (!n) { note_(ctx, '文字のセルがないので変えていません（' + rg.getA1Notation() + '）'); return; }
rg.setValues(tmp);
SpreadsheetApp.flush();
var got = rg.getValues();
for (var r2 = 0; r2 < tmp.length; r2++) for (var c2 = 0; c2 < tmp[r2].length; c2++) if (isText[r2][c2]) tmp[r2][c2] = String(got[r2][c2]);
rg.setValues(tmp);
chg_(ctx, sh, rg.getA1Notation(), fnName + ' でそろえた');
};
SHELF['validation.list'] = function (ctx, op) {
need_(op, ['range']);
if (!op.items && !op.from) throw new ArgError('棚「validation.list」に items か from のどちらかが要ります');
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
var builder = SpreadsheetApp.newDataValidation();
if (op.items) {
var items = Array.isArray(op.items) ? op.items : [op.items];
builder.requireValueInList(items, true);
} else if (op.from) {
var fromRg = rangeOf_(ctx.ss, op.from, sh);
builder.requireValueInRange(fromRg, true);
}
var strict = op.strict === undefined ? true : !!op.strict;
builder.setAllowInvalid(!strict);
rg.setDataValidation(builder.build());
chg_(ctx, sh, rg.getA1Notation(), 'プルダウン入力規則を設定');
};
SHELF['validation.number'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
var builder = SpreadsheetApp.newDataValidation();
if (op.min !== undefined && op.max !== undefined) {
builder.requireNumberBetween(Number(op.min), Number(op.max));
} else if (op.min !== undefined) {
builder.requireNumberGreaterThanOrEqualTo(Number(op.min));
} else if (op.max !== undefined) {
builder.requireNumberLessThanOrEqualTo(Number(op.max));
} else {
builder.requireNumberGreaterThanOrEqualTo(-Infinity);
}
builder.setAllowInvalid(false);
rg.setDataValidation(builder.build());
chg_(ctx, sh, rg.getA1Notation(), '数値限定の入力規則を設定');
};
SHELF['validation.date'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
var builder = SpreadsheetApp.newDataValidation()
.requireDate()
.setAllowInvalid(false)
.build();
rg.setDataValidation(builder);
chg_(ctx, sh, rg.getA1Notation(), '日付限定の入力規則を設定');
};
SHELF['checkbox'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
guardOverwrite_(ctx, rg, op);
var builder = SpreadsheetApp.newDataValidation()
.requireCheckbox()
.build();
rg.setDataValidation(builder);
chg_(ctx, sh, rg.getA1Notation(), 'チェックボックスを設定');
};
SHELF['validation.clear'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
rg.clearDataValidations();
chg_(ctx, sh, rg.getA1Notation(), '入力規則を解除');
};
SHELF['protect.sheet'] = function (ctx, op) {
var s = op.name ? sheetOf_(ctx.ss, op.name, '') : sheetCtx_(ctx, op);
var p = s.protect();
if (op.warn) p.setWarningOnly(true);
if (op.except) {
var expRg = s.getRange(op.except);
p.setUnprotectedRanges([expRg]);
}
note_(ctx, '持ち主（実行するアカウント）には保護が効かない所があります');
chg_(ctx, s, '', 'シート「' + s.getName() + '」を保護' + (op.warn ? '（警告のみ）' : ''));
};
SHELF['protect.range'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
var p = rg.protect();
if (op.warn) p.setWarningOnly(true);
note_(ctx, '持ち主（実行するアカウント）には保護が効かない所があります');
chg_(ctx, sh, rg.getA1Notation(), '範囲を保護' + (op.warn ? '（警告のみ）' : ''));
};
SHELF['protect.remove'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var protections = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET).concat(sh.getProtections(SpreadsheetApp.ProtectionType.RANGE));
if (op.range) {
var targetRg = sh.getRange(op.range);
var targetA1 = targetRg.getA1Notation();
var removed = 0;
protections.forEach(function (p) {
if (p.getProtectionType() === SpreadsheetApp.ProtectionType.RANGE) {
if (p.getRange().getA1Notation() === targetA1) { p.remove(); removed++; }
}
});
if (removed) {
note_(ctx, '持ち主（実行するアカウント）には保護が効かない所があります');
chg_(ctx, sh, targetA1, '範囲の保護を解除（' + removed + ' 件）');
} else {
note_(ctx, '指定範囲「' + targetA1 + '」の保護は見つかりませんでした（変更なし）');
}
} else {
if (!protections.length) { note_(ctx, 'このシートに保護はありません（変更なし）'); return; }
protections.forEach(function (p) { p.remove(); });
note_(ctx, '持ち主（実行するアカウント）には保護が効かない所があります');
chg_(ctx, sh, '', 'シート内の全保護を解除（' + protections.length + ' 件）');
}
};
SHELF['name.add'] = function (ctx, op) {
need_(op, ['name', 'range']);
var ss = ctx.ss, sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
ss.getNamedRanges().forEach(function (nr) { if (nr.getName() === op.name) nr.remove(); });
ss.setNamedRange(op.name, rg);
chg_(ctx, sh, rg.getA1Notation(), '名前付き範囲「' + op.name + '」を定義');
};
SHELF['name.delete'] = function (ctx, op) {
need_(op, ['name']);
var ss = ctx.ss;
var found = null;
ss.getNamedRanges().forEach(function (nr) { if (nr.getName() === op.name) found = nr; });
if (!found) { note_(ctx, '名前付き範囲「' + op.name + '」は見つかりませんでした（変更なし）'); return; }
found.remove();
chg_(ctx, null, '', '名前付き範囲「' + op.name + '」を削除');
};
SHELF['name.list'] = function (ctx, op) {
var ss = ctx.ss;
var list = ss.getNamedRanges().map(function (nr) {
return { name: nr.getName(), sheet: nr.getRange().getSheet().getName(), range: nr.getRange().getA1Notation() };
});
if (!list.length) { note_(ctx, '名前付き範囲はありません'); return; }
var lines = list.map(function (x) { return x.name + ': ' + x.sheet + '!' + x.range; });
note_(ctx, '名前付き範囲（' + list.length + ' 件）:\n' + lines.join('\n'));
};
SHELF['backup'] = function (ctx, op) {
chg_(ctx, null, '', 'バックアップ設定: ' + (op.on ? 'ON' : 'OFF'));
};
SHELF['folder'] = function (ctx, op) {
need_(op, ['to']);
var mode = String(op.mode || 'move').toLowerCase();
var create = !!op.create;
if (mode === 'create') {
try {
var ex = resolveFolder_(op.to, false);
chg_(ctx, null, '', 'フォルダ「' + ex.name + '」はすでに存在します（ID: ' + ex.id + '）');
return;
} catch (e) {
if (!e || String(e.message || e).indexOf('見つかりません') < 0) throw e;
var cr = resolveFolder_(op.to, true);
chg_(ctx, null, '', 'フォルダ「' + cr.name + '」を作成しました（ID: ' + cr.id + '）');
return;
}
}
if (mode === 'default') {
var fDef = resolveFolder_(op.to, create);
if (fDef.isRoot) {
ctx.defaultFolder = { id: 'root', name: 'マイドライブ' };
chg_(ctx, null, '', 'これからの新規作成先を「マイドライブ直下（既定解除）」に設定しました');
} else {
ctx.defaultFolder = { id: fDef.id, name: fDef.name };
chg_(ctx, null, '', 'これからの新規作成先を「' + fDef.name + '」フォルダ（ID: ' + fDef.id + '）に設定しました');
}
return;
}
if (!ctx.file) throw new ArgError('移動対象のファイルが開かれていません（target を指定してください）');
var fDest = resolveFolder_(op.to, create);
DriveApp.getFileById(ctx.file.getId()).moveTo(fDest.folder);
chg_(ctx, null, '', 'フォルダ「' + fDest.name + '」へ移動しました' + (fDest.created ? '（フォルダ新設）' : ''));
};
SHELF['drive.list'] = function (ctx, op) {
var kind = String(op.kind || 'all').toLowerCase();
var lim = Math.max(1, Math.min(100, Number(op.limit) || 30));
var q = String(op.query || '').trim();
var items = [];
var wantFolder = kind === 'all' || kind === 'folder';
var wantFile = kind !== 'folder';
var mimeCond = '';
if (kind === 'sheet') mimeCond = " and mimeType = 'application/vnd.google-apps.spreadsheet'";
else if (kind === 'doc') mimeCond = " and mimeType = 'application/vnd.google-apps.document'";
if (q) {
var esc = q.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
var fSpec = String(op.folder || '').trim();
var parentCond = '';
if (fSpec && fSpec !== 'マイドライブ' && fSpec !== 'root' && fSpec !== 'My Drive') {
parentCond = " and '" + resolveFolder_(fSpec, false).id + "' in parents";
}
if (wantFolder) {
var df = DriveApp.searchFolders("title contains '" + esc + "' and trashed = false" + parentCond);
while (df.hasNext() && items.length < lim) {
var d = df.next();
items.push('[フォルダ] ' + d.getName() + ' (ID: ' + d.getId() + ')');
}
}
if (wantFile && items.length < lim) {
var ff = DriveApp.searchFiles("title contains '" + esc + "' and trashed = false" + mimeCond + parentCond);
while (ff.hasNext() && items.length < lim) {
var f = ff.next();
items.push('[' + mimeLabel_(f.getMimeType()) + '] ' + f.getName() + ' (ID: ' + f.getId() + ')');
}
}
} else {
var base = resolveFolder_(op.folder || 'マイドライブ', false).folder;
if (wantFolder) {
var df2 = base.getFolders();
while (df2.hasNext() && items.length < lim) {
var d2 = df2.next();
if (!d2.isTrashed()) items.push('[フォルダ] ' + d2.getName() + ' (ID: ' + d2.getId() + ')');
}
}
if (wantFile && items.length < lim) {
var ff2 = base.getFiles();
while (ff2.hasNext() && items.length < lim) {
var f2 = ff2.next();
if (f2.isTrashed()) continue;
var m2 = f2.getMimeType();
if (kind === 'sheet' && m2 !== 'application/vnd.google-apps.spreadsheet') continue;
if (kind === 'doc' && m2 !== 'application/vnd.google-apps.document') continue;
items.push('[' + mimeLabel_(m2) + '] ' + f2.getName() + ' (ID: ' + f2.getId() + ')');
}
}
}
note_(ctx, items.length ? ('ドライブ一覧（' + items.length + ' 件）:\n' + items.join('\n')) : '該当する項目はありませんでした');
};
SHELF['drive.rename'] = function (ctx, op) {
need_(op, ['name']);
var target = op.item
? resolveDriveItem_(op.item)
: (ctx.file ? wrapDriveObj_(DriveApp.getFileById(ctx.file.getId()), false) : null);
if (!target) throw new ArgError('名前を変える対象（item または target）を指定してください');
var oldName = target.obj.getName();
target.obj.setName(String(op.name));
chg_(ctx, null, '', (target.isFolder ? 'フォルダ' : mimeLabel_(target.mime)) + '名を変更: 「' + oldName + '」→「' + op.name + '」');
};
SHELF['drive.move'] = function (ctx, op) {
need_(op, ['to']);
var target = op.item
? resolveDriveItem_(op.item)
: (ctx.file ? wrapDriveObj_(DriveApp.getFileById(ctx.file.getId()), false) : null);
if (!target) throw new ArgError('移動する対象（item または target）を指定してください');
var dest = resolveFolder_(op.to, !!op.create);
if (target.isFolder && isAncestorFolder_(target.id, dest.folder)) {
throw new ArgError('フォルダ「' + target.name + '」を自分自身または配下のフォルダへは移動できません');
}
target.obj.moveTo(dest.folder);
chg_(ctx, null, '', (target.isFolder ? 'フォルダ' : mimeLabel_(target.mime)) + '「' + target.name + '」を「' + dest.name + '」へ移動しました' + (dest.created ? '（フォルダ新設）' : ''));
};
SHELF['drive.trash'] = function (ctx, op) {
var target = op.item
? resolveDriveItem_(op.item)
: (ctx.file ? wrapDriveObj_(DriveApp.getFileById(ctx.file.getId()), false) : null);
if (!target) throw new ArgError('ゴミ箱に入れる対象（item または target）を指定してください');
var subN = target.isFolder ? countFolderChildren_(target.obj) : undefined;
var desc = (target.isFolder ? 'フォルダ' : mimeLabel_(target.mime)) + '「' + target.name + '」をゴミ箱に入れます'
+ (target.isFolder ? '（中の項目数: ' + subN + '）' : '');
guardDelete_(ctx, desc, target.isFolder, subN);
target.obj.setTrashed(true);
chg_(ctx, null, '', (target.isFolder ? 'フォルダ' : mimeLabel_(target.mime)) + '「' + target.name + '」をゴミ箱に入れました');
};
SHELF['format'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = null, rg;
if (op.header) { t = needTable_(sh); rg = sh.getRange(t.headerRow, t.firstCol, 1, t.lastCol - t.firstCol + 1); }
else if (op.title) { rg = titleRange_(sh); }
else if (op.col) { t = needTable_(sh); var ci = colIndexOf_(t, op.col); rg = sh.getRange(t.firstData, ci, (t.totalRow || t.lastData) - t.firstData + 1, 1); }
else if (op.range) rg = sh.getRange(op.range);
else throw new ArgError('棚「format」に range・col・header・title のどれかが要ります');
var did = [];
var set = function (key, fn) { if (op[key] !== undefined) { fn(op[key]); did.push(key); } };
set('bold', function (v) { rg.setFontWeight(v ? 'bold' : 'normal'); });
set('italic', function (v) { rg.setFontStyle(v ? 'italic' : 'normal'); });
set('color', function (v) { rg.setFontColor(rgb_(v)); });
set('bg', function (v) { rg.setBackground(rgb_(v)); });
set('size', function (v) { rg.setFontSize(v); });
set('font', function (v) { rg.setFontFamily(v); });
set('number_format', function (v) { rg.setNumberFormat(v); });
set('align', function (v) { rg.setHorizontalAlignment(v); });
set('valign', function (v) { rg.setVerticalAlignment(v); });
set('wrap', function (v) { rg.setWrap(!!v); });
set('borders', function (v) { if (v) rg.setBorder(true, true, true, true, v === 'outer' ? false : true, v === 'outer' ? false : true, STYLE.border, SpreadsheetApp.BorderStyle.SOLID); else rg.setBorder(false, false, false, false, false, false); });
set('merge', function (v) { if (v) rg.merge(); else rg.breakApart(); });
if (!did.length) throw new ArgError('棚「format」に書式の指定（bold・color・bg・number_format・align など）がありません');
chg_(ctx, sh, rg.getA1Notation(), did.join('・'));
};
SHELF['bg.clear'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = null, rg;
if (op.header) { t = needTable_(sh); rg = sh.getRange(t.headerRow, t.firstCol, 1, t.lastCol - t.firstCol + 1); }
else if (op.title) { rg = titleRange_(sh); }
else if (op.col) { t = needTable_(sh); var ci = colIndexOf_(t, op.col); rg = sh.getRange(t.firstData, ci, (t.totalRow || t.lastData) - t.firstData + 1, 1); }
else if (op.range) rg = sh.getRange(op.range);
else throw new ArgError('棚「bg.clear」に range・col・header・title のどれかが要ります');
rg.setBackground(null);
chg_(ctx, sh, rg.getA1Notation(), '背景色なし');
};
SHELF['width'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = findTable_(sh), did = [];
var colRef = function (k) { return t ? colIndexOf_(t, k) : colNum_(k); };
if (op.cols) Object.keys(op.cols).forEach(function (k) { sh.setColumnWidth(colRef(k), op.cols[k]); did.push(k + '列'); });
if (op.col && op.width) { sh.setColumnWidth(colRef(op.col), op.width); did.push(op.col + '列'); }
if (op.rows) Object.keys(op.rows).forEach(function (k) { sh.setRowHeight(parseInt(k), op.rows[k]); did.push(k + '行'); });
(op.auto || []).forEach(function (k) {
var ci = colRef(k), lr = sh.getLastRow(), mx = 0;
if (lr > 0) sh.getRange(1, ci, lr, 1).getDisplayValues().forEach(function (x) { mx = Math.max(mx, wlen_(x[0])); });
sh.setColumnWidth(ci, Math.max(STYLE.colMin, Math.min(STYLE.colMax, mx * STYLE.px + STYLE.pad))); did.push(k + '列(自動)');
});
if (!did.length) throw new ArgError('棚「width」に cols・rows・auto のどれかが要ります');
chg_(ctx, sh, did.join('・'), '幅・高さを変更');
};
SHELF['cf.add'] = function (ctx, op) {
need_(op, ['range', 'when']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
var rule = SpreadsheetApp.newConditionalFormatRule().setRanges([rg]);
var w = String(op.when).toLowerCase(), val = op.value !== undefined ? String(op.value) : '';
if (w === 'gt') rule.whenNumberGreaterThan(Number(val));
else if (w === 'ge') rule.whenNumberGreaterThanOrEqualTo(Number(val));
else if (w === 'lt') rule.whenNumberLessThan(Number(val));
else if (w === 'le') rule.whenNumberLessThanOrEqualTo(Number(val));
else if (w === 'eq') rule.whenNumberEqualTo(Number(val));
else if (w === 'ne') rule.whenNumberNotEqualTo(Number(val));
else if (w === 'contains') rule.whenTextContains(val);
else if (w === 'blank') rule.whenCellEmpty();
else if (w === 'notblank') rule.whenCellNotEmpty();
else if (w === 'formula') rule.whenFormulaSatisfied(val);
else throw new ArgError('知らない when: ' + op.when);
if (op.bg) rule.setBackground(rgb_(op.bg));
if (op.color) rule.setFontColor(rgb_(op.color));
if (op.bold) rule.setBold(true);
var rules = sh.getConditionalFormatRules();
rules.push(rule.build());
sh.setConditionalFormatRules(rules);
chg_(ctx, sh, rg.getA1Notation(), '条件付き書式を付与（when: ' + op.when + '）');
};
SHELF['cf.dup'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
var bg = op.bg ? rgb_(op.bg) : '#FCE4D6';
var firstCellA1 = rg.getCell(1, 1).getA1Notation();
var startCol = colLetter_(rg.getColumn()), endCol = colLetter_(rg.getLastColumn());
var startRow = rg.getRow(), endRow = rg.getLastRow();
var absRange = '$' + startCol + '$' + startRow + ':$' + endCol + '$' + endRow;
var formula = '=COUNTIF(' + absRange + ', ' + firstCellA1 + ')>1';
var rule = SpreadsheetApp.newConditionalFormatRule()
.setRanges([rg])
.whenFormulaSatisfied(formula)
.setBackground(bg)
.build();
var rules = sh.getConditionalFormatRules();
rules.push(rule);
sh.setConditionalFormatRules(rules);
chg_(ctx, sh, rg.getA1Notation(), '重複セルの条件付き書式を付与（' + formula + '）');
};
SHELF['cf.scale'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op), rg = sh.getRange(op.range);
var low = rgb_(op.low || '白');
var high = rgb_(op.high || '#2E75B6');
var rule = SpreadsheetApp.newConditionalFormatRule()
.setRanges([rg])
.setGradientMinpoint(low)
.setGradientMaxpoint(high)
.build();
var rules = sh.getConditionalFormatRules();
rules.push(rule);
sh.setConditionalFormatRules(rules);
chg_(ctx, sh, rg.getA1Notation(), 'カラースケール条件付き書式を付与');
};
SHELF['cf.clear'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
if (!op.range) {
sh.clearConditionalFormatRules();
chg_(ctx, sh, 'シート全体', '条件付き書式をすべて解除');
return;
}
var targetRg = sh.getRange(op.range);
var tRow = targetRg.getRow(), tLastRow = targetRg.getLastRow();
var tCol = targetRg.getColumn(), tLastCol = targetRg.getLastColumn();
var rules = sh.getConditionalFormatRules();
var kept = [];
rules.forEach(function (r) {
var rRanges = r.getRanges();
var hit = rRanges.some(function (rg) {
return !(rg.getLastRow() < tRow || rg.getRow() > tLastRow || rg.getLastColumn() < tCol || rg.getColumn() > tLastCol);
});
if (!hit) kept.push(r);
});
sh.setConditionalFormatRules(kept);
chg_(ctx, sh, targetRg.getA1Notation(), '条件付き書式を解除');
};
SHELF['cf.list'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var rules = sh.getConditionalFormatRules();
if (!rules.length) {
ctx.notes.push('シート「' + sh.getName() + '」に条件付き書式はありません');
return;
}
var list = rules.map(function (r, i) {
var ranges = r.getRanges().map(function (rg) { return rg.getA1Notation(); }).join(', ');
var crit = r.getBooleanCondition();
var grad = r.getGradientCondition();
var desc = crit ? ('条件: ' + crit.getCriteriaType()) : (grad ? 'カラースケール' : '書式ルール');
return '#' + (i + 1) + ' ' + ranges + ' (' + desc + ')';
});
ctx.notes.push('シート「' + sh.getName() + '」の条件付き書式（' + rules.length + ' 件）: ' + list.join('； '));
};
SHELF['banding.add'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg;
if (op.range) rg = sh.getRange(op.range);
else {
var t = needTable_(sh);
rg = sh.getRange(t.headerRow, t.firstCol, (t.totalRow || t.lastData) - t.headerRow + 1, t.lastCol - t.firstCol + 1);
}
rg.getBandings().forEach(function (b) { b.remove(); });
var themeStr = (op.theme || 'gray').toLowerCase();
var theme = SpreadsheetApp.BandingTheme.LIGHT_GREY;
if (themeStr === 'blue') theme = SpreadsheetApp.BandingTheme.BLUE;
else if (themeStr === 'green') theme = SpreadsheetApp.BandingTheme.GREEN;
else if (themeStr === 'orange') theme = SpreadsheetApp.BandingTheme.ORANGE;
else if (themeStr === 'gray' || themeStr === 'grey') theme = SpreadsheetApp.BandingTheme.LIGHT_GREY;
var t2 = findTable_(sh);
var hasHeader = t2 ? (rg.getRow() === t2.headerRow) : true;
var hasFooter = t2 && t2.totalRow ? (rg.getLastRow() === t2.totalRow) : false;
rg.applyRowBanding(theme, hasHeader, hasFooter);
chg_(ctx, sh, rg.getA1Notation(), '交互の背景色を付与（テーマ: ' + (op.theme || 'gray') + '）');
};
SHELF['banding.remove'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg;
if (op.range) rg = sh.getRange(op.range);
else {
var t = findTable_(sh);
rg = t ? sh.getRange(t.headerRow, t.firstCol, (t.totalRow || t.lastData) - t.headerRow + 1, t.lastCol - t.firstCol + 1) : sh.getDataRange();
}
var bandings = rg.getBandings();
if (!bandings.length) {
bandings = sh.getBandings();
}
bandings.forEach(function (b) { b.remove(); });
chg_(ctx, sh, rg.getA1Notation(), '交互の背景色を解除');
};
SHELF['table.new'] = function (ctx, op) {
need_(op, ['headers']);
var ss = ctx.ss, rows = op.rows || [], headers = op.headers;
var name = op.sheet || op.title || '表';
var sh = ss.getSheetByName(name);
var title = op.title || '';
var off = title ? 2 : 0;
var hr = 1 + off, nc = headers.length;
var grid = [headers.map(String)];
rows.forEach(function (r, i) {
var row = r.slice(); while (row.length < nc) row.push('');
grid.push(row.slice(0, nc).map(function (v) { return typeof v === 'string' ? shiftFormula_(v, off) : v; }));
});
var colOf = function (ref) { var k = headers.map(String).indexOf(String(ref)); return k >= 0 ? k + 1 : colNum_(ref); };
var numCol = op.number ? colOf(op.number) : 0;
if (numCol) for (var i = 1; i < grid.length; i++) grid[i][numCol - 1] = i;
var totalCols = (op.total || []).map(colOf);
totalCols.concat(numCol ? [numCol] : []).forEach(function (c) { if (c > nc) throw new ArgError('列「' + colLetter_(c) + '」は表の外です（見出しは ' + nc + ' 列）'); });
if (sh) {
var same = false;
if (sh.getLastRow() === hr + rows.length + (totalCols.length ? 1 : 0) && sh.getLastColumn() >= nc) {
var cur = sh.getRange(hr, 1, grid.length, nc).getFormulas();
var curV = sh.getRange(hr, 1, grid.length, nc).getValues();
same = grid.every(function (row, r) { return row.every(function (v, c) { var w = cur[r][c] || curV[r][c]; return String(w) === String(v) || (typeof v === 'string' && v.charAt(0) === '=' && String(cur[r][c]) === v); }); });
}
ctx.curSheet = name;
if (same) { note_(ctx, '同じ表がすでにあります（変更なし）'); return; }
throw new ArgError('シート「' + name + '」はすでにあります（中身が違います）。別の名前にするか、write・format で直してください');
}
if (ctx.isNew) { sh = ss.getSheets()[0]; sh.setName(name); } else { sh = ss.insertSheet(name, ss.getSheets().length); ctx.createdSheets.push(name); }
ctx.curSheet = name;
if (title) { sh.getRange(1, 1).setValue(title).setFontWeight('bold').setFontSize(14); }
var rg = sh.getRange(hr, 1, grid.length, nc);
rg.setValues(grid);
var last = hr + grid.length - 1;
if (totalCols.length) {
var tr = last + 1;
var labelCol = 1;
while (labelCol <= nc && (totalCols.indexOf(labelCol) >= 0 || labelCol === numCol)) labelCol++;
if (labelCol > nc) labelCol = 1;
sh.getRange(tr, labelCol).setValue(op.label || '合計');
totalCols.forEach(function (c) { sh.getRange(tr, c).setFormula('=SUM(' + colLetter_(c) + (hr + 1) + ':' + colLetter_(c) + last + ')'); });
last = tr;
}
chg_(ctx, sh, a1_(1, 1, last, nc), '表を作成（' + rows.length + ' 行' + (totalCols.length ? '・合計行' : '') + '）');
if (op.tidy !== false) tidyRange_(ctx, sh, null);
};
SHELF['total'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), t = needTable_(sh);
var cols = op.cols ? op.cols.map(function (c) { return colIndexOf_(t, c); }) : [];
if (!cols.length) for (var ci = t.firstCol; ci <= t.lastCol; ci++) if (!isNoCol_(t, ci) && isNumberCol_(t, ci)) cols.push(ci);
if (!cols.length) throw new ArgError('合計する列が見つかりません。cols で指定してください');
var tr, existed = !!t.totalRow;
tr = existed ? t.totalRow : t.lastData + 1;
var label = op.label || '合計';
if (!existed) {
var lc = t.firstCol;
while (lc <= t.lastCol && (cols.indexOf(lc) >= 0 || isNoCol_(t, lc))) lc++;
if (lc > t.lastCol) lc = t.firstCol;
sh.getRange(tr, lc).setValue(label);
}
var nc = t.lastCol - t.firstCol + 1;
var rowRg = sh.getRange(tr, t.firstCol, 1, nc);
var fr = rowRg.getFormulas(), vr = rowRg.getValues(), nf = rowRg.getNumberFormats(), al = rowRg.getHorizontalAlignments(), fixed = [];
cols.forEach(function (c) {
var k = c - t.firstCol, f = '=SUM(' + colLetter_(c) + t.firstData + ':' + colLetter_(c) + t.lastData + ')';
if (fr[0][k] !== f) { fr[0][k] = f; fixed.push(colLetter_(c)); }
nf[0][k] = STYLE.numFmt; al[0][k] = 'right';
});
if (existed && !fixed.length) { note_(ctx, '合計行 ' + tr + ' はすでにあります（変更なし）'); return; }
var out = fr[0].map(function (f, k) { return f || vr[0][k]; });
rowRg.setValues([out]).setNumberFormats(nf).setHorizontalAlignments(al);
rowRg.setFontWeight('bold').setBackground(STYLE.totalBg).setBorder(true, true, true, true, true, true, STYLE.border, SpreadsheetApp.BorderStyle.SOLID);
if (existed && !fixed.length) note_(ctx, '合計行 ' + tr + ' はすでにあります（変更なし）');
else chg_(ctx, sh, a1_(tr, t.firstCol, 1, nc), existed ? '合計行の範囲を直した（' + fixed.join('・') + '列）' : '合計行を追加');
};
SHELF['summary'] = function (ctx, op) {
need_(op, ['by', 'values']);
var src = sheetOf_(ctx.ss, op.sheet, ctx.sheetName), t = needTable_(src);
var by = colIndexOf_(t, op.by), vals = (Array.isArray(op.values) ? op.values : [op.values]).map(function (v) { return colIndexOf_(t, v); });
var func = (op.func || 'sum').toLowerCase(), into = op.into || '集計';
var keys = [], seen = {};
for (var r = t.firstData; r <= t.lastData; r++) { var k = t.vals[r - 1][by - 1]; if (isBlank_(k)) continue; k = String(k); if (!seen[k]) { seen[k] = 1; keys.push(k); } }
var sq = q_(src.getName()), rng = function (c) { return sq + '!$' + colLetter_(c) + '$' + t.firstData + ':$' + colLetter_(c) + '$' + t.lastData; };
var hdr = [String(t.vals[t.headerRow - 1][by - 1])].concat(vals.map(function (c) { return String(t.vals[t.headerRow - 1][c - 1]) + (func === 'count' ? '(件数)' : func === 'avg' ? '(平均)' : ''); }));
var grid = [hdr];
keys.forEach(function (k, i) {
var row = [k];
vals.forEach(function (c) {
var rr = i + 2;
row.push(func === 'count' ? '=COUNTIFS(' + rng(by) + ',$A' + rr + ')' : func === 'avg' ? '=IFERROR(AVERAGEIFS(' + rng(c) + ',' + rng(by) + ',$A' + rr + '),0)' : '=SUMIFS(' + rng(c) + ',' + rng(by) + ',$A' + rr + ')');
});
grid.push(row);
});
if (func !== 'avg') {
var tot = ['合計']; vals.forEach(function (c, j) { var L = colLetter_(j + 2); tot.push('=SUM(' + L + '2:' + L + (keys.length + 1) + ')'); });
grid.push(tot);
}
var dst = ctx.ss.getSheetByName(into);
if (dst) {
var cur = dst.getLastRow() ? dst.getRange(1, 1, grid.length, grid[0].length).getFormulas() : [];
var curV = dst.getLastRow() ? dst.getRange(1, 1, grid.length, grid[0].length).getValues() : [];
var same = dst.getLastRow() === grid.length && grid.every(function (row, r2) { return row.every(function (v, c2) { return String(cur[r2][c2] || curV[r2][c2]) === String(v); }); });
ctx.curSheet = src.getName();
if (same) { note_(ctx, '集計シート「' + into + '」は最新です（変更なし）'); return; }
guardDelete_(ctx, '集計シート「' + into + '」はすでにあり、中身が変わります（作り直します）');
dst.clear();
} else { dst = ctx.ss.insertSheet(into, ctx.ss.getSheets().length); ctx.createdSheets.push(into); }
dst.getRange(1, 1, grid.length, grid[0].length).setValues(grid);
ctx.curSheet = src.getName();
chg_(ctx, dst, a1_(1, 1, grid.length, grid[0].length), 'シート「' + into + '」へ「' + src.getName() + '」の ' + hdr[0] + ' ごとの集計（元の表を直すと追従）');
note_(ctx, '別の棚からこの表を参照するときは range:"' + into + '"（または "' + into + '!' + a1_(1, 1, grid.length, grid[0].length) + '"）');
tidyRange_(ctx, dst, null);
};
SHELF['pivot.new'] = function (ctx, op) {
need_(op, ['rows', 'values']);
var src = sheetOf_(ctx.ss, op.sheet, ctx.sheetName), t = needTable_(src);
var into = op.into || ('ピボット_' + src.getName());
if (ctx.ss.getSheetByName(into)) {
throw new ArgError('シート「' + into + '」はすでにあります（上書きしません）');
}
var rows = (Array.isArray(op.rows) ? op.rows : [op.rows]).map(function (c) { return colIndexOf_(t, c); });
var vals = (Array.isArray(op.values) ? op.values : [op.values]).map(function (c) { return colIndexOf_(t, c); });
var cols = op.cols ? (Array.isArray(op.cols) ? op.cols : [op.cols]).map(function (c) { return colIndexOf_(t, c); }) : [];
var funcStr = (op.func || 'sum').toLowerCase();
var sumFn = SpreadsheetApp.PivotTableSummarizeFunction.SUM;
if (funcStr === 'count') sumFn = SpreadsheetApp.PivotTableSummarizeFunction.COUNTA || SpreadsheetApp.PivotTableSummarizeFunction.COUNT;
else if (funcStr === 'avg') sumFn = SpreadsheetApp.PivotTableSummarizeFunction.AVERAGE;
var sourceRange = src.getRange(t.headerRow, t.firstCol, t.lastData - t.headerRow + 1, t.lastCol - t.firstCol + 1);
var dst = ctx.ss.insertSheet(into, ctx.ss.getSheets().length);
ctx.createdSheets.push(into);
var anchor = dst.getRange('A1');
var pivotTable = anchor.createPivotTable(sourceRange);
rows.forEach(function (ci) {
pivotTable.addRowGroup(ci - t.firstCol + 1);
});
cols.forEach(function (ci) {
pivotTable.addColumnGroup(ci - t.firstCol + 1);
});
vals.forEach(function (ci) {
pivotTable.addPivotValue(ci - t.firstCol + 1, sumFn);
});
ctx.curSheet = src.getName();
chg_(ctx, dst, 'A1', '「' + src.getName() + '」からピボットテーブルを作成');
};
SHELF['chart.new'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var charts = sh.getCharts ? sh.getCharts() : [];
var isEdit = Boolean(op.edit || op.target || (!op.range && !op.at && !op.type && op.title && charts.length === 1));
var rangeList = op.range ? String(op.range).split(/\s*,\s*/).filter(function (s) { return s; }) : [];
var resolveRanges_ = function () {
return rangeList.length ? rangeList.map(function (r) {
if (r.indexOf('!') >= 0) return ctx.ss.getRange(r);
var refSh = r.indexOf(':') < 0 ? ctx.ss.getSheetByName(r) : null;
if (refSh) {
var rt = findTable_(refSh);
return rt ? refSh.getRange(rt.headerRow, rt.firstCol, rt.lastData - rt.headerRow + 1, rt.lastCol - rt.firstCol + 1) : refSh.getDataRange();
}
return sh.getRange(r);
}) : [(function () {
var t = findTable_(sh);
return t ? sh.getRange(t.headerRow, t.firstCol, t.lastData - t.headerRow + 1, t.lastCol - t.firstCol + 1) : sh.getDataRange();
})()];
};
var typeMap = {
column: Charts.ChartType.COLUMN,
bar: Charts.ChartType.BAR,
line: Charts.ChartType.LINE,
pie: Charts.ChartType.PIE,
area: Charts.ChartType.AREA,
scatter: Charts.ChartType.SCATTER
};
var typeStr = op.type ? String(op.type).toLowerCase() : '';
if (typeStr && !typeMap[typeStr]) throw new ArgError('種類「' + typeStr + '」は使えません（column/bar/line/pie/area/scatter）');
if (isEdit) {
if (!charts.length) throw new ArgError('シート「' + sh.getName() + '」に変更するグラフがありません');
var targetChart = null;
if (op.target && op.target !== '*' && op.target !== 'last') {
for (var i = 0; i < charts.length; i++) {
var ct = charts[i].getOptions() && charts[i].getOptions().get('title');
if (ct === op.target) { targetChart = charts[i]; break; }
}
if (!targetChart) throw new ArgError('グラフ「' + op.target + '」が見つかりませんでした');
} else {
targetChart = charts[charts.length - 1];
}
var mb = targetChart.modify();
if (typeStr) mb.setChartType(typeMap[typeStr]);
if (op.title !== undefined && op.title !== null) mb.setOption('title', op.title);
if (op.at) {
var editAt = sh.getRange(op.at);
mb.setPosition(editAt.getRow(), editAt.getColumn(), 0, 0);
}
if (rangeList.length) {
var editRanges = resolveRanges_();
if (mb.clearRanges) mb.clearRanges();
editRanges.forEach(function (rg) { mb.addRange(rg); });
}
sh.updateChart(mb.build());
ctx.curSheet = sh.getName();
var parts = [];
if (op.title !== undefined && op.title !== null) parts.push('タイトル「' + op.title + '」');
if (typeStr) parts.push('種類 ' + typeStr);
if (op.at) parts.push('位置 ' + op.at);
chg_(ctx, sh, op.target || '', 'グラフを変更' + (parts.length ? '（' + parts.join('・') + '）' : ''));
return;
}
var ranges = resolveRanges_();
var full = ranges[0];
if (!full || full.getLastRow() === 0 || full.getLastColumn() === 0) {
throw new ArgError('グラフにするデータがありません');
}
typeStr = typeStr || 'column';
var b = sh.newChart().setChartType(typeMap[typeStr]);
ranges.forEach(function (rg) { b.addRange(rg); });
if (op.title) b.setOption('title', op.title);
if (op.at) {
var atRg = sh.getRange(op.at);
b.setPosition(atRg.getRow(), atRg.getColumn(), 0, 0);
} else {
var sameSheet = ranges.every(function (rg) { return !rg.getSheet || rg.getSheet().getName() === sh.getName(); });
var atRow = sameSheet ? full.getRow() : 1;
var atCol = sameSheet
? Math.max.apply(null, ranges.map(function (rg) { return rg.getLastColumn(); })) + 2
: Math.max(1, sh.getLastColumn()) + 2;
b.setPosition(atRow, atCol, 0, 0);
}
sh.insertChart(b.build());
ctx.curSheet = sh.getName();
chg_(ctx, sh, ranges.map(function (rg) {
var sname = rg.getSheet ? rg.getSheet().getName() : sh.getName();
return (sname !== sh.getName() ? sname + '!' : '') + rg.getA1Notation();
}).join(','), 'グラフを作成（' + typeStr + (op.title ? '・' + op.title : '') + '）');
};
SHELF['chart.delete'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var charts = sh.getCharts();
if (!charts.length) {
note_(ctx, 'シート「' + sh.getName() + '」にグラフはありません（変更なし）');
return;
}
var targets = [];
if (op.title) {
charts.forEach(function (c) {
var t = c.getOptions() && c.getOptions().get('title');
if (t === op.title) targets.push(c);
});
if (!targets.length) {
note_(ctx, 'グラフ「' + op.title + '」は見つかりませんでした（変更なし）');
return;
}
} else {
targets = charts;
}
guardDelete_(ctx, 'シート「' + sh.getName() + '」のグラフ' + (op.title ? '「' + op.title + '」' : '（' + targets.length + ' 個）') + 'を削除します');
targets.forEach(function (c) {
sh.removeChart(c);
});
ctx.curSheet = sh.getName();
chg_(ctx, sh, '', 'グラフを削除' + (op.title ? '（' + op.title + '）' : '（' + targets.length + ' 個）'));
};
SHELF['write'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), did = [];
if (op.cells) Object.keys(op.cells).forEach(function (a) { sh.getRange(a).setValue(op.cells[a]); did.push(a); });
if (op.tsv !== undefined) {
need_(op, ['range']);
var start = sh.getRange(op.range.split(':')[0]);
var rows = String(op.tsv).split(/\r?\n/).map(function (l) { return l.split('\t'); });
var nc = Math.max.apply(null, rows.map(function (r) { return r.length; }));
rows = rows.map(function (r) { while (r.length < nc) r.push(''); return r; });
var rg = sh.getRange(start.getRow(), start.getColumn(), rows.length, nc);
rg.setValues(rows); did.push(rg.getA1Notation());
}
if (!did.length) throw new ArgError('棚「write」に cells か（range と tsv）が要ります');
chg_(ctx, sh, did.join('・'), '値・式を書いた');
};
SHELF['replace'] = function (ctx, op) {
need_(op, ['find']);
var sh = sheetCtx_(ctx, op), scope = op.range ? sh.getRange(op.range) : sh.getDataRange();
var tf = scope.createTextFinder(String(op.find)).matchCase(!!op.match_case).matchEntireCell(!!op.whole);
var hits = tf.findAll().map(function (r) { return r.getA1Notation(); });
if (!hits.length) { note_(ctx, '「' + op.find + '」は見つかりませんでした'); return; }
scope.createTextFinder(String(op.find)).matchCase(!!op.match_case).matchEntireCell(!!op.whole).replaceAllWith(String(op['with'] === undefined ? '' : op['with']));
chg_(ctx, sh, hits.slice(0, 4).join('・') + (hits.length > 4 ? ' ほか' + (hits.length - 4) + ' 件' : ''), '「' + op.find + '」→「' + (op['with'] || '') + '」');
};
SHELF['find'] = function (ctx, op) {
need_(op, ['text']);
var ss = ctx.ss;
var hits = [];
if (op.all_sheets) {
ss.getSheets().forEach(function (s) {
var tf = s.getDataRange().createTextFinder(String(op.text)).matchEntireCell(!!op.whole);
var res = tf.findAll();
res.forEach(function (r) { hits.push(s.getName() + '!' + r.getA1Notation()); });
});
} else {
var sh = sheetCtx_(ctx, op);
var scope = op.range ? sh.getRange(op.range) : sh.getDataRange();
var tf = scope.createTextFinder(String(op.text)).matchEntireCell(!!op.whole);
var res = tf.findAll();
res.forEach(function (r) { hits.push(r.getA1Notation()); });
}
if (!hits.length) {
note_(ctx, '「' + op.text + '」は見つかりませんでした');
} else {
var first20 = hits.slice(0, 20);
note_(ctx, '「' + op.text + '」の見つかったセル (' + hits.length + '件): ' + first20.join(', ') + (hits.length > 20 ? ' ほか' + (hits.length - 20) + '件' : ''));
}
};
SHELF['clear.values'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var raw = op.range ? String(op.range).trim() : '';
var rg, label;
if (!raw || /^(all|\*|全体|全セル|シート全体|sheet)$/i.test(raw)) {
rg = sh.getDataRange();
label = 'シート全体（' + rg.getA1Notation() + '）';
} else {
var fixed = raw.replace(/^([A-Za-z]+)1:([A-Za-z]+)$/, '$1:$2');
try {
rg = sh.getRange(fixed);
} catch (e) {
var m = fixed.match(/^([A-Za-z]+)(\d*):([A-Za-z]+)(\d*)$/);
if (!m) throw e;
var colToNum_ = function (col) {
var n = 0; col = col.toUpperCase();
for (var i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
return n;
};
var maxR = sh.getMaxRows(), maxC = sh.getMaxColumns();
var c1 = colToNum_(m[1]), c2 = colToNum_(m[3]);
var r1 = m[2] ? parseInt(m[2], 10) : 1, r2 = m[4] ? parseInt(m[4], 10) : maxR;
if (c1 < 1 || c1 > maxC || r1 < 1 || r1 > maxR) throw e;
c2 = Math.min(c2, maxC); r2 = Math.min(r2, maxR);
if (c2 < c1 || r2 < r1) throw e;
rg = sh.getRange(r1, c1, r2 - r1 + 1, c2 - c1 + 1);
}
label = '範囲「' + op.range + '」';
}
guardDelete_(ctx, label + 'の値を消します', wideRange_(sh, rg), rg.getNumRows() * rg.getNumColumns() + ' セル');
var only = op.only || 'all';
if (only === 'constants') {
var formulas = rg.getFormulas();
var vals = rg.getValues();
var changed = false;
for (var r = 0; r < vals.length; r++) {
for (var c = 0; c < vals[r].length; c++) {
if (!formulas[r][c] && vals[r][c] !== '') {
vals[r][c] = '';
changed = true;
}
}
}
if (changed) rg.setValues(vals);
} else {
rg.clearContent();
}
chg_(ctx, sh, rg.getA1Notation(), '値を消去');
};
SHELF['clear.format'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
rg.clearFormat();
chg_(ctx, sh, rg.getA1Notation(), '書式をクリア');
};
SHELF['clear.all'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
guardDelete_(ctx, '範囲「' + op.range + '」の値と書式を消します', wideRange_(sh, rg), rg.getNumRows() * rg.getNumColumns() + ' セル');
rg.clear();
chg_(ctx, sh, rg.getA1Notation(), '値と書式をクリア');
};
SHELF['copy'] = function (ctx, op) {
need_(op, ['from', 'to']);
var sh = sheetCtx_(ctx, op);
var srcRg = op.from.indexOf('!') >= 0 ? ctx.ss.getRange(op.from) : sh.getRange(op.from);
var destRg = op.to.indexOf('!') >= 0 ? ctx.ss.getRange(op.to) : sh.getRange(op.to);
var destSh = destRg.getSheet();
var targetRg = destSh.getRange(destRg.getRow(), destRg.getColumn(), srcRg.getNumRows(), srcRg.getNumColumns());
guardOverwrite_(ctx, targetRg, '貼り付け先「' + targetRg.getA1Notation() + '」');
srcRg.copyTo(destRg);
chg_(ctx, destSh, targetRg.getA1Notation(), '「' + op.from + '」からコピー');
};
SHELF['copy.values'] = function (ctx, op) {
need_(op, ['from']);
var sh = sheetCtx_(ctx, op);
var srcRg = op.from.indexOf('!') >= 0 ? ctx.ss.getRange(op.from) : sh.getRange(op.from);
var destRg = op.to ? (op.to.indexOf('!') >= 0 ? ctx.ss.getRange(op.to) : sh.getRange(op.to)) : srcRg;
var destSh = destRg.getSheet();
var targetRg = destSh.getRange(destRg.getRow(), destRg.getColumn(), srcRg.getNumRows(), srcRg.getNumColumns());
guardOverwrite_(ctx, targetRg, '値貼り付け先「' + targetRg.getA1Notation() + '」');
srcRg.copyTo(targetRg, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
chg_(ctx, destSh, targetRg.getA1Notation(), '値のみ貼り付け');
};
SHELF['copy.format'] = function (ctx, op) {
need_(op, ['from', 'to']);
var sh = sheetCtx_(ctx, op);
var srcRg = op.from.indexOf('!') >= 0 ? ctx.ss.getRange(op.from) : sh.getRange(op.from);
var destRg = op.to.indexOf('!') >= 0 ? ctx.ss.getRange(op.to) : sh.getRange(op.to);
srcRg.copyTo(destRg, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
chg_(ctx, destRg.getSheet(), destRg.getA1Notation(), '書式のみ貼り付け');
};
SHELF['fill.series'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
guardOverwrite_(ctx, rg, '範囲「' + op.range + '」に連番を記入');
var start = op.start !== undefined ? Number(op.start) : 1;
var step = op.step !== undefined ? Number(op.step) : 1;
var nr = rg.getNumRows(), nc = rg.getNumColumns();
var vals = [];
var cur = start;
for (var r = 0; r < nr; r++) {
var row = [];
for (var c = 0; c < nc; c++) {
row.push(cur);
cur += step;
}
vals.push(row);
}
rg.setValues(vals);
chg_(ctx, sh, rg.getA1Notation(), '連番を記入（' + start + 'から step ' + step + '）');
};
SHELF['date.fix'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), rg, t = null;
if (op.col) { t = needTable_(sh); var ci = colIndexOf_(t, op.col); rg = sh.getRange(t.firstData, ci, t.lastData - t.firstData + 1, 1); }
else if (op.range) rg = sh.getRange(op.range);
else throw new ArgError('棚「date.fix」に col か range が要ります');
var vals = rg.getValues(), forms = rg.getFormulas(), fmts = rg.getNumberFormats();
var year = new Date().getFullYear(), dateFmt = '';
for (var r0 = 0; r0 < vals.length; r0++) for (var c0 = 0; c0 < vals[r0].length; c0++) {
var v0 = vals[r0][c0];
if (v0 instanceof Date && !isNaN(v0.getTime())) { year = v0.getFullYear(); if (!dateFmt && fmts[r0][c0] && fmts[r0][c0] !== '@') dateFmt = fmts[r0][c0]; }
}
var z2h = function (x) { return x.replace(/[０-９]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0); }).replace(/[／－．]/g, function (ch) { return { '／': '/', '－': '-', '．': '.' }[ch]; }); };
var mk = function (y, m, d) { var dt = new Date(y, m - 1, d); return (dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d) ? dt : null; };
var fixed = [];
for (var r = 0; r < vals.length; r++) for (var c = 0; c < vals[r].length; c++) {
var v = vals[r][c];
if (forms[r][c] || typeof v !== 'string' || !v.trim()) continue;
var s = z2h(v.trim()).replace(/\s*[(（][^)）]*[)）]\s*$/, '');
var m = s.match(/^(\d{4})\s*[\/\-.年]\s*(\d{1,2})\s*[\/\-.月]\s*(\d{1,2})\s*日?$/), dt = null;
if (m) dt = mk(+m[1], +m[2], +m[3]);
else if ((m = s.match(/^(\d{1,2})\s*[\/月]\s*(\d{1,2})\s*日?$/))) dt = mk(year, +m[1], +m[2]);
if (!dt) continue;
vals[r][c] = dt;
if (!fmts[r][c] || fmts[r][c] === '@' || fmts[r][c] === 'General') fmts[r][c] = dateFmt || 'yyyy/mm/dd';
fixed.push(rg.getCell(r + 1, c + 1).getA1Notation());
}
if (!fixed.length) { note_(ctx, '文字で入った日付は見つかりませんでした（' + rg.getA1Notation() + '）'); return; }
rg.setNumberFormats(fmts);
rg.setValues(vals);
chg_(ctx, sh, fixed.slice(0, 5).join('・') + (fixed.length > 5 ? ' ほか ' + (fixed.length - 5) + ' 件' : ''), '文字の日付を日付に（' + fixed.length + ' 件）');
};
SHELF['fill.date'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
guardOverwrite_(ctx, rg, '範囲「' + op.range + '」に日付を記入');
var unit = op.unit || 'day';
var dt;
if (op.start) {
dt = new Date(op.start);
} else {
var v = rg.getCell(1, 1).getValue();
dt = (v instanceof Date && !isNaN(v.getTime())) ? new Date(v.getTime()) : new Date();
}
var nr = rg.getNumRows(), nc = rg.getNumColumns();
var vals = [];
var cur = new Date(dt.getTime());
var stepFn = function (d, u) {
var next = new Date(d.getTime());
if (u === 'day') next.setDate(next.getDate() + 1);
else if (u === 'week') next.setDate(next.getDate() + 7);
else if (u === 'month') next.setMonth(next.getMonth() + 1);
else if (u === 'weekday') {
do { next.setDate(next.getDate() + 1); } while (next.getDay() === 0 || next.getDay() === 6);
}
return next;
};
for (var r = 0; r < nr; r++) {
var row = [];
for (var c = 0; c < nc; c++) {
row.push(new Date(cur.getTime()));
cur = stepFn(cur, unit);
}
vals.push(row);
}
rg.setValues(vals);
rg.setNumberFormat(STYLE.dateFmt);
chg_(ctx, sh, rg.getA1Notation(), '日付を記入（unit: ' + unit + '）');
};
SHELF['fill.down'] = function (ctx, op) {
need_(op, ['range']);
var sh = sheetCtx_(ctx, op);
var rg = sh.getRange(op.range);
if (rg.getNumRows() <= 1) throw new ArgError('棚「fill.down」の範囲は2行以上要ります');
var firstRow = rg.offset(0, 0, 1, rg.getNumColumns());
var dest = rg.offset(1, 0, rg.getNumRows() - 1, rg.getNumColumns());
guardOverwrite_(ctx, dest, 'コピー先「' + dest.getA1Notation() + '」');
for (var r = 1; r < rg.getNumRows(); r++) {
firstRow.copyTo(rg.offset(r, 0, 1, rg.getNumColumns()));
}
chg_(ctx, sh, dest.getA1Notation(), '上のセルを下へ複写');
};
SHELF['rows'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op), act = op.action || (op.cols ? 'delete' : 'delete');
var isCol = !!op.cols, list = (isCol ? op.cols : op.rows) || [];
var tw;
var getTw = function () { if (tw === undefined) tw = findTable_(sh); return tw; };
var colRef = function (x) {
if (typeof x === 'number') return x;
if (/^[A-Za-z]{1,3}$/.test(String(x).trim())) return colNum_(x);
return getTw() ? colIndexOf_(getTw(), x) : colNum_(x);
};
if (act === 'insert') {
var at = op.at || list[0]; need_({ shelf: 'rows', at: at }, ['at']);
var cnt = op.count || 1;
var atNum = isCol ? colRef(at) : parseInt(at);
if (isCol) sh.insertColumnsBefore(atNum, cnt); else sh.insertRowsBefore(atNum, cnt);
chg_(ctx, sh, (isCol ? (typeof at === 'number' ? colLetter_(at) : at) + '列の前' : at + '行目の前'), cnt + ' ' + (isCol ? '列' : '行') + '挿入');
} else if (act === 'delete') {
if (!list.length) throw new ArgError('棚「rows」に rows（行番号の配列）か cols が要ります');
var nums = list.map(function (x) { return isCol ? colRef(x) : parseInt(x); }).sort(function (a, b) { return b - a; });
var max = isCol ? sh.getMaxColumns() : sh.getMaxRows();
nums.forEach(function (n) { if (n < 1 || n > max) throw new ArgError((isCol ? '列' : '行') + '番号 ' + n + ' は範囲外です（1〜' + max + '）'); });
var peek = nums.map(function (n) { var v = isCol ? sh.getRange(1, n, Math.min(sh.getLastRow() || 1, 50), 1).getDisplayValues() : sh.getRange(n, 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0]; return (isCol ? colLetter_(n) + '列' : n + '行目') + '「' + String(isCol ? v.map(function (x) { return x[0]; }).filter(Boolean).slice(0, 2).join('/') : v.filter(Boolean).slice(0, 3).join('/')).slice(0, 24) + '」'; });
var wide = false;
if (getTw()) wide = isCol ? nums.some(function (n) { return n < tw.firstCol || n > tw.lastCol; }) : (nums.some(function (n) { return n < tw.headerRow || n > (tw.totalRow || tw.lastData); }) || wideRowCount_(tw, nums.length));
guardDelete_(ctx, peek.reverse().join('、') + ' を削除します', wide, nums.length + (isCol ? ' 列' : ' 行'));
nums.forEach(function (n) { if (isCol) sh.deleteColumn(n); else sh.deleteRow(n); });
chg_(ctx, sh, nums.slice().reverse().join('・') + (isCol ? ' 列' : ' 行目'), '削除');
} else if (act === 'move') {
need_(op, ['from', 'to']);
try {
if (isCol) { var f = colRef(op.from), to = colRef(op.to); sh.moveColumns(sh.getRange(1, f, 1, 1), to > f ? to + 1 : to); }
else { var fr = parseInt(op.from), cn = op.count || 1, tr = parseInt(op.to); sh.moveRows(sh.getRange(fr, 1, cn, 1), tr > fr ? tr + cn : tr); }
SpreadsheetApp.flush();
} catch (e) {
if (e && e.isArg) throw e;
if (/結合|merge/i.test(String(e && e.message || e))) throw new ArgError('結合されたセルをまたぐ位置には動かせません。結合を解除してから（または結合のない列・行で）やり直してください');
throw e;
}
chg_(ctx, sh, op.from + ' → ' + op.to, '移動');
} else throw new ArgError('棚「rows」の action は insert・delete・move です');
};
SHELF['rows.insert'] = function (ctx, op) {
SHELF['rows'](ctx, { shelf: 'rows', action: 'insert', at: op.at, count: op.count, sheet: op.sheet });
};
SHELF['rows.delete'] = function (ctx, op) {
SHELF['rows'](ctx, { shelf: 'rows', action: 'delete', rows: op.rows, sheet: op.sheet });
};
SHELF['rows.move'] = function (ctx, op) {
SHELF['rows'](ctx, { shelf: 'rows', action: 'move', from: op.from, to: op.to, count: op.count, sheet: op.sheet });
};
SHELF['cols.insert'] = function (ctx, op) {
SHELF['rows'](ctx, { shelf: 'rows', action: 'insert', cols: [op.at], at: op.at, count: op.count, sheet: op.sheet });
};
SHELF['cols.delete'] = function (ctx, op) {
SHELF['rows'](ctx, { shelf: 'rows', action: 'delete', cols: op.cols, sheet: op.sheet });
};
SHELF['cols.move'] = function (ctx, op) {
SHELF['rows'](ctx, { shelf: 'rows', action: 'move', cols: [op.from], from: op.from, to: op.to, sheet: op.sheet });
};
SHELF['freeze'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var r = op.rows !== undefined ? parseInt(op.rows) : 1;
var c = op.cols !== undefined ? parseInt(op.cols) : 0;
var sid = sh.getSheetId(), bk = (ctx.bk || []).filter(function (x) { return x.id === sid; })[0];
var curR = bk ? bk.frozenR : sh.getFrozenRows(), curC = bk ? bk.frozenC : sh.getFrozenColumns();
try { if (curR !== r) sh.setFrozenRows(r); if (curC !== c) sh.setFrozenColumns(c); }
catch (e) { throw new ArgError('結合セルの途中では固定できません（行 ' + r + '・列 ' + c + '）。結合を解除するか、結合をすべて含む行・列までを指定してください'); }
chg_(ctx, sh, '', '行固定: ' + r + '、列固定: ' + c);
};
SHELF['unfreeze'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
var sid = sh.getSheetId(), bk = (ctx.bk || []).filter(function (x) { return x.id === sid; })[0];
var curR = bk ? bk.frozenR : sh.getFrozenRows(), curC = bk ? bk.frozenC : sh.getFrozenColumns();
if (curR !== 0) sh.setFrozenRows(0);
if (curC !== 0) sh.setFrozenColumns(0);
chg_(ctx, sh, '', '固定を解除');
};
SHELF['rows.hide'] = function (ctx, op) {
need_(op, ['rows']);
var sh = sheetCtx_(ctx, op);
var list = (Array.isArray(op.rows) ? op.rows : [op.rows]).map(function (x) { return parseInt(x, 10); });
list.forEach(function (r) { sh.hideRows(r); });
chg_(ctx, sh, list.join('・') + ' 行目', '行を非表示');
};
SHELF['rows.show'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
if (op.rows) {
var list = (Array.isArray(op.rows) ? op.rows : [op.rows]).map(function (x) { return parseInt(x, 10); });
list.forEach(function (r) { sh.unhideRow(sh.getRange(r, 1)); });
chg_(ctx, sh, list.join('・') + ' 行目', '行を再表示');
} else {
sh.unhideRow(sh.getRange(1, 1, sh.getMaxRows(), 1));
chg_(ctx, sh, '', '全行を再表示');
}
};
SHELF['cols.hide'] = function (ctx, op) {
need_(op, ['cols']);
var sh = sheetCtx_(ctx, op);
var list = Array.isArray(op.cols) ? op.cols : [op.cols];
list.forEach(function (c) {
var n = typeof c === 'number' ? c : colNum_(c);
sh.hideColumns(n);
});
chg_(ctx, sh, list.join('・') + ' 列', '列を非表示');
};
SHELF['cols.show'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
if (op.cols) {
var list = Array.isArray(op.cols) ? op.cols : [op.cols];
list.forEach(function (c) {
var n = typeof c === 'number' ? c : colNum_(c);
sh.unhideColumn(sh.getRange(1, n));
});
chg_(ctx, sh, list.join('・') + ' 列', '列を再表示');
} else {
sh.unhideColumn(sh.getRange(1, 1, 1, sh.getMaxColumns()));
chg_(ctx, sh, '', '全列を再表示');
}
};
SHELF['group.rows'] = function (ctx, op) {
need_(op, ['rows']);
var sh = sheetCtx_(ctx, op);
var list = (Array.isArray(op.rows) ? op.rows : [op.rows]).map(function (x) { return parseInt(x, 10); }).sort(function (a, b) { return a - b; });
var start = list[0], count = list[list.length - 1] - start + 1;
var rg = sh.getRange(start, 1, count, 1);
rg.shiftRowGroupDepth(1);
if (op.collapse) rg.collapseGroups();
chg_(ctx, sh, start + '〜' + (start + count - 1) + ' 行目', '行をグループ化');
};
SHELF['group.cols'] = function (ctx, op) {
need_(op, ['cols']);
var sh = sheetCtx_(ctx, op);
var list = (Array.isArray(op.cols) ? op.cols : [op.cols]).map(function (x) { return typeof x === 'number' ? x : colNum_(x); }).sort(function (a, b) { return a - b; });
var start = list[0], count = list[list.length - 1] - start + 1;
var rg = sh.getRange(1, start, 1, count);
rg.shiftColumnGroupDepth(1);
if (op.collapse) rg.collapseGroups();
chg_(ctx, sh, colLetter_(start) + '〜' + colLetter_(start + count - 1) + ' 列', '列をグループ化');
};
SHELF['group.remove'] = function (ctx, op) {
var sh = sheetCtx_(ctx, op);
if (op.rows) {
var list = (Array.isArray(op.rows) ? op.rows : [op.rows]).map(function (x) { return parseInt(x, 10); }).sort(function (a, b) { return a - b; });
var start = list[0], count = list[list.length - 1] - start + 1;
sh.getRange(start, 1, count, 1).shiftRowGroupDepth(-1);
chg_(ctx, sh, start + '〜' + (start + count - 1) + ' 行目', '行グループを解除');
} else if (op.cols) {
var list2 = (Array.isArray(op.cols) ? op.cols : [op.cols]).map(function (x) { return typeof x === 'number' ? x : colNum_(x); }).sort(function (a, b) { return a - b; });
var start2 = list2[0], count2 = list2[list2.length - 1] - start2 + 1;
sh.getRange(1, start2, 1, count2).shiftColumnGroupDepth(-1);
chg_(ctx, sh, colLetter_(start2) + '〜' + colLetter_(start2 + count2 - 1) + ' 列', '列グループを解除');
} else {
var all = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
for (var d = 0; d < 8; d++) {
try { all.shiftRowGroupDepth(-1); } catch (eR) { }
try { all.shiftColumnGroupDepth(-1); } catch (eC) { }
}
chg_(ctx, sh, '', '全グループを解除');
}
};
SHELF['sheet.add'] = function (ctx, op) {
var ss = ctx.ss;
if (op.name && !op.rename && !op.move) {
if (ss.getSheetByName(op.name)) { note_(ctx, 'シート「' + op.name + '」はすでにあります（変更なし）'); ctx.curSheet = op.name; return; }
var s = ss.insertSheet(op.name, ss.getSheets().length); ctx.createdSheets.push(op.name);
if (op.before) { var bs = sheetOf_(ss, op.before, ''); ss.setActiveSheet(s); ss.moveActiveSheet(bs.getIndex()); }
ctx.curSheet = op.name; chg_(ctx, s, '', 'シートを追加');
}
if (op.rename) {
need_(op.rename, ['from', 'to']);
var f = sheetOf_(ss, op.rename.from, '');
if (ss.getSheetByName(op.rename.to)) throw new ArgError('シート「' + op.rename.to + '」はすでにあります');
f.setName(op.rename.to); ctx.curSheet = op.rename.to; chg_(ctx, f, '', '名前を「' + op.rename.from + '」から変更');
}
if (op.move) {
need_(op.move, ['name', 'index']);
var m = sheetOf_(ss, op.move.name, ''); ss.setActiveSheet(m); ss.moveActiveSheet(parseInt(op.move.index)); chg_(ctx, m, '', '並び順を ' + op.move.index + ' 番目へ');
}
if (!op.name && !op.rename && !op.move) throw new ArgError('棚「sheet.add」に name・rename・move のどれかが要ります');
};
SHELF['sheet.rename'] = function (ctx, op) {
SHELF['sheet.add'](ctx, { shelf: 'sheet.add', rename: { from: op.name, to: op.to } });
};
SHELF['sheet.move'] = function (ctx, op) {
SHELF['sheet.add'](ctx, { shelf: 'sheet.add', move: { name: op.name, index: op.index } });
};
SHELF['sheet.delete'] = function (ctx, op) {
need_(op, ['name']);
var ss = ctx.ss;
var s = sheetOf_(ss, op.name, '');
if (ss.getSheets().length <= 1) throw new ArgError('シートが1枚しかないため削除できません');
guardDelete_(ctx, 'シート「' + op.name + '」を削除します', true, '1 枚');
ss.deleteSheet(s);
chg_(ctx, null, '', 'シート「' + op.name + '」を削除');
};
SHELF['sheet.copy'] = function (ctx, op) {
need_(op, ['name']);
var ss = ctx.ss;
var s = sheetOf_(ss, op.name, '');
var targetName = op.as;
if (targetName && ss.getSheetByName(targetName)) throw new ArgError('シート「' + targetName + '」はすでにあります');
var bs = op.before ? sheetOf_(ss, op.before, '') : null;
var c = s.copyTo(ss);
ctx.createdSheets.push(c.getName());
if (targetName) { c.setName(targetName); ctx.createdSheets[ctx.createdSheets.length - 1] = targetName; }
if (bs) {
ss.setActiveSheet(c);
ss.moveActiveSheet(bs.getIndex());
}
ctx.curSheet = c.getName();
chg_(ctx, c, '', 'シート「' + op.name + '」を複製' + (targetName ? '（名前: ' + targetName + '）' : ''));
};
SHELF['sheet.hide'] = function (ctx, op) {
need_(op, ['name']);
var ss = ctx.ss;
var s = sheetOf_(ss, op.name, '');
var visible = ss.getSheets().filter(function (sh) { return !sh.isSheetHidden(); });
if (visible.length <= 1 && visible[0].getName() === s.getName()) {
throw new ArgError('すべてのシートを非表示にすることはできません');
}
s.hideSheet();
chg_(ctx, s, '', 'シート「' + op.name + '」を非表示に設定');
};
SHELF['sheet.show'] = function (ctx, op) {
var ss = ctx.ss;
if (op.name) {
var s = sheetOf_(ss, op.name, '');
s.showSheet();
chg_(ctx, s, '', 'シート「' + op.name + '」を再表示');
} else {
var hidden = ss.getSheets().filter(function (sh) { return sh.isSheetHidden(); });
hidden.forEach(function (sh) { sh.showSheet(); });
chg_(ctx, null, '', hidden.length ? hidden.length + ' 枚のシートを再表示' : '非表示シートはありません（変更なし）');
}
};
SHELF['sheet.color'] = function (ctx, op) {
need_(op, ['color']);
var s = op.name ? sheetOf_(ctx.ss, op.name, '') : sheetCtx_(ctx, op);
var c = op.color;
var hex = (c === 'なし' || c === 'none' || c === '') ? null : rgb_(c);
s.setTabColor(hex);
chg_(ctx, s, '', 'タブの色を「' + op.color + '」に変更');
};