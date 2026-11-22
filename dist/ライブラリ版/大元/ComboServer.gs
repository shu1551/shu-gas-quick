var DEFAULT_TARGET_SS_ID = '';
var COMBO_MINI_SHELVES = [{"name":"api","t":"棚に無い設定を API で撃つ","a":"requests*=配列, why=文字"},{"name":"tidy","t":"表の見た目を整える","a":"range=範囲"},{"name":"seiri","t":"表のデータを整理する","a":"trim=真偽, halfwidth=真偽, numbers=真偽, blank_rows=真偽, dedupe=真偽, renumber=列, tidy=真偽"},{"name":"renumber","t":"表の番号の列を振り直す","a":"col*=列, start=数"},{"name":"sort","t":"表を並べ替える","a":"col=列, cols=配列, desc=真偽, filter=真偽, where=対応"},{"name":"filter.where","t":"条件に合う行だけ表示","a":"col*=列, equals=文字, when=選択(eq/ne/contains/gt/ge/lt/le/blank/notblank), value=文字"},{"name":"filter.on","t":"フィルタを付ける","a":"range=範囲"},{"name":"dedupe","t":"重複した行を消す","a":"cols=列[]"},{"name":"split.col","t":"文字を列に分ける","a":"col*=列, by=選択(comma/space/tab/slash/hyphen/custom)=comma, sep=文字, insert=真偽"},{"name":"filter.off","t":"フィルタを外す","a":"なし"},{"name":"filter.delete","t":"条件に合う行を一括削除する","a":"col*=列, equals=文字, when=選択(eq/ne/gt/ge/lt/le/contains/blank/notblank), value=文字"},{"name":"filter.extract","t":"条件に合う行を別シートへ抽出する","a":"col*=列, equals=文字, when=選択(eq/ne/gt/ge/lt/le/contains/blank/notblank), value=文字, into=文字=抽出"},{"name":"audit.check","t":"表のエラー・重複・空欄を診断する","a":"key_col=列"},{"name":"top.n","t":"上位N件・下位N件を抽出する","a":"col*=列, count=数=5, bottom=真偽=false, into=文字=上位抽出"},{"name":"calc.col","t":"計算の列を足す","a":"name*=文字, expr*=文字, at=列"},{"name":"calc.percent","t":"構成比の列を足す","a":"col*=列, name=文字, at=列"},{"name":"stat.row","t":"平均・最大・最小の行を表の下に足す","a":"stat=選択(average/max/min)=average, cols=列[], label=文字"},{"name":"lookup.add","t":"別の表から列を引いて足す","a":"from_sheet*=文字, val_col*=列, key_col=列, my_key=列, name=文字, at=列"},{"name":"calc.diff","t":"差や増減率の列を足す","a":"col_a*=列, col_b*=列, rate=真偽, name=文字, at=列"},{"name":"calc.running","t":"累計の列を足す","a":"col*=列, name=文字, at=列"},{"name":"calc.rank","t":"順位の列を足す","a":"col*=列, desc=真偽, name=文字, at=列"},{"name":"count.if","t":"条件に合う数を数える・合計する式を入れる","a":"range*=範囲, criteria*=文字, sum_range=範囲, into=範囲"},{"name":"subtotal","t":"区分ごとに小計の行を入れる","a":"key_col*=列, sum_cols=列[]"},{"name":"formula.guard","t":"エラー表示を消す（IFERRORで包む）","a":"col=列, range=範囲, fallback=文字"},{"name":"formula.tovalue","t":"計算式を確定した値に変える","a":"col=列, range=範囲"},{"name":"round","t":"数値を四捨五入・切り捨て・切り上げする","a":"col=列, range=範囲, mode=選択(round/floor/ceil)=round, digits=数=0"},{"name":"date.parts","t":"日付から年・月・曜日・年度の列を足す","a":"col*=列, part*=選択(year/month/day/weekday/quarter), name=文字, at=列"},{"name":"text.join","t":"複数の列をつないで新しい列を作る","a":"cols*=列[], sep=文字, name=文字, at=列"},{"name":"text.case","t":"文字列の大文字・小文字・全角・半角をそろえる","a":"col=列, range=範囲, mode*=選択(upper/lower/proper/asc/jis)=upper"},{"name":"text.affix","t":"文字の先頭・末尾に文字を付ける","a":"col=列, range=範囲, prefix=文字, suffix=文字, remove=真偽=false"},{"name":"validation.list","t":"プルダウンを付ける","a":"range*=範囲, items=配列, from=範囲, strict=真偽=true"},{"name":"validation.number","t":"数だけ入るようにする","a":"range*=範囲, min=数, max=数"},{"name":"validation.date","t":"日付だけ入るようにする","a":"range*=範囲"},{"name":"checkbox","t":"チェックボックスを付ける","a":"range*=範囲"},{"name":"validation.clear","t":"入力規則を外す","a":"range*=範囲"},{"name":"protect.sheet","t":"シートを保護する","a":"name=シート, except=範囲, warn=真偽"},{"name":"protect.range","t":"範囲を保護する","a":"range*=範囲, warn=真偽"},{"name":"protect.remove","t":"保護を外す","a":"range=範囲"},{"name":"name.add","t":"名前付き範囲を作る","a":"name*=文字, range*=範囲"},{"name":"name.delete","t":"名前付き範囲を消す","a":"name*=文字"},{"name":"name.list","t":"名前付き範囲を一覧にする","a":"なし"},{"name":"backup","t":"バックアップのオン・オフを切り替える","a":"on*=真偽"},{"name":"folder","t":"フォルダの作成・移動・保存先を設定する","a":"to*=文字, mode=選択(move/default/create)=move, create=真偽=false"},{"name":"drive.list","t":"ドライブ内のファイル・フォルダ一覧を見る","a":"folder=文字=マイドライブ, query=文字, kind=選択(all/folder/file/sheet/doc)=all, limit=数=30"},{"name":"drive.rename","t":"ファイルやフォルダの名前を変える","a":"name*=文字, item=文字"},{"name":"drive.move","t":"ファイルやフォルダを別のフォルダへ移動する","a":"to*=文字, item=文字, create=真偽=false"},{"name":"drive.trash","t":"不要なファイルやフォルダをゴミ箱に入れる","a":"item=文字"},{"name":"print.setup","t":"シートの印刷設定を保存する","a":"paper=選択(a4/a3/b4/b5/letter)=a4, landscape=真偽=true, fit_width=真偽=true, gridlines=真偽=false, margins=選択(narrow/normal/wide)=narrow"},{"name":"export.pdf","t":"シートをPDFにして保存する","a":"name=文字, folder=文字, paper=選択(a4/a3/b4/b5/letter), landscape=真偽, fit_width=真偽, gridlines=真偽, all_sheets=真偽=false"},{"name":"export.csv","t":"シートをCSVでDriveに保存する","a":"name=文字, folder=文字, bom=真偽=true"},{"name":"drive.share","t":"ファイルやフォルダを共有・リンク取得する","a":"item=文字, email=文字, role=選択(viewer/editor/commenter)=viewer, anyone=真偽=false"},{"name":"protect.list","t":"保護中のシートと範囲を一覧にする","a":"なし"},{"name":"format","t":"範囲の書式を変える","a":"range=範囲, col=列, header=真偽, title=真偽, bold=真偽, italic=真偽, color=色, bg=色, size=数, font=文字, number_format=文字, align=文字, valign=文字, wrap=真偽, borders=文字, merge=真偽"},{"name":"bg.clear","t":"背景色を消す（塗りつぶしなしに戻す）","a":"range=範囲, col=列, header=真偽, title=真偽"},{"name":"width","t":"列の幅・行の高さを変える","a":"cols=対応, col=列, width=数, rows=対応, auto=列[], all_sheets=真偽=false, auto_rows=真偽=false"},{"name":"cf.add","t":"条件付き書式を付ける","a":"range*=範囲, when*=選択(gt/ge/lt/le/eq/ne/contains/blank/notblank/formula), value=文字, bg=色, color=色, bold=真偽"},{"name":"cf.dup","t":"重複に色を付ける","a":"range*=範囲, bg=色"},{"name":"cf.scale","t":"カラースケールを付ける","a":"range*=範囲, low=色, high=色"},{"name":"cf.clear","t":"条件付き書式を外す","a":"range=範囲"},{"name":"cf.list","t":"条件付き書式を一覧にする","a":"なし"},{"name":"banding.add","t":"交互の色を付ける","a":"range=範囲, theme=選択(gray/blue/green/orange)=gray"},{"name":"banding.remove","t":"交互の色を外す","a":"range=範囲"},{"name":"sheet.gridlines","t":"枠線（グリッド線）を表示・非表示","a":"show=真偽, all_sheets=真偽=false"},{"name":"table.new","t":"表を新しく作る","a":"headers*=配列, title=文字, rows=表, number=列, total=列[], label=文字, tidy=真偽"},{"name":"total","t":"表の下に合計行を足す","a":"cols=列[], label=文字"},{"name":"summary","t":"項目ごとの集計表を作る","a":"by*=列, values*=列[], func=選択(sum/count/avg)=sum, into=文字"},{"name":"pivot.new","t":"ピボットテーブルを作る","a":"rows*=列[], values*=列[], cols=列[], func=選択(sum/count/avg)=sum, into=文字"},{"name":"chart.new","t":"グラフを作る・直す","a":"range=範囲, type=選択(column/bar/line/pie/area/scatter)=column, title=文字, at=範囲, target=文字, edit=真偽"},{"name":"chart.delete","t":"グラフを消す","a":"title=文字"},{"name":"write","t":"セルに値・式を書く","a":"cells=対応, range=範囲, tsv=文字"},{"name":"replace","t":"文字を探して置き換える","a":"find*=文字, with=文字, range=範囲, match_case=真偽, whole=真偽, all_sheets=真偽=false"},{"name":"find","t":"値を探して番地を返す","a":"text*=文字, range=範囲, whole=真偽, all_sheets=真偽"},{"name":"clear.values","t":"範囲の値を消す（書式は残す）","a":"range=範囲, only=選択(all/constants)=all"},{"name":"clear.format","t":"範囲の書式を消す（値は残す）","a":"range*=範囲"},{"name":"clear.all","t":"範囲の値と書式を消す","a":"range*=範囲"},{"name":"copy","t":"範囲を写す","a":"from*=範囲, to*=範囲"},{"name":"copy.values","t":"値だけ貼り付ける・式を値にする","a":"from*=範囲, to=範囲"},{"name":"copy.format","t":"書式だけ貼り付ける","a":"from*=範囲, to*=範囲"},{"name":"fill.series","t":"範囲に連番を埋める","a":"range*=範囲, start=数=1, step=数=1"},{"name":"date.fix","t":"文字で入った日付を本物の日付に直す","a":"col=列, range=範囲"},{"name":"fill.date","t":"日付を下へ埋める","a":"range*=範囲, start=文字, unit=選択(day/week/month/weekday)=day"},{"name":"fill.down","t":"上のセルを下へ写す","a":"range*=範囲"},{"name":"note.set","t":"セルにメモを付ける","a":"range*=範囲, text*=文字"},{"name":"note.clear","t":"セルのメモを消す","a":"range=範囲"},{"name":"link.set","t":"セルや列にリンクを付ける","a":"range=範囲, url=文字, text=文字, col=列, url_col=列"},{"name":"merge.unmerge","t":"結合セルを解除して値を埋める","a":"range=範囲"},{"name":"fill.blank","t":"空白セルを上の値で穴埋めする","a":"range=範囲, col=列"},{"name":"transpose","t":"行と列を入れ替える（転置）","a":"range=範囲, to=範囲, into=文字"},{"name":"number.fix","t":"文字の数字を本物の数値に直す","a":"col=列, range=範囲"},{"name":"link.clear","t":"セルのハイパーリンクを外す","a":"range=範囲, col=列"},{"name":"link.extract","t":"埋め込みリンクのURLを隣列へ抽出","a":"col*=列, name=文字=URL"},{"name":"note.list","t":"セルのメモ一覧を別シートに出す","a":"all_sheets=真偽=false, into=文字=メモ一覧"},{"name":"rows","t":"行・列の挿入・削除・移動","a":"action=選択(insert/delete/move)=delete, rows=行[], cols=列[], at=文字, count=数, from=文字, to=文字"},{"name":"rows.insert","t":"行を挿入する","a":"at*=文字, count=数"},{"name":"rows.delete","t":"行を削除する","a":"rows*=行[]"},{"name":"rows.move","t":"行を移動する","a":"from*=文字, to*=文字, count=数"},{"name":"cols.insert","t":"列を挿入する","a":"at*=列, count=数"},{"name":"cols.delete","t":"列を削除する","a":"cols*=列[]"},{"name":"cols.move","t":"列を移動する","a":"from*=列, to*=列"},{"name":"freeze","t":"見出しを固定する","a":"rows=数=1, cols=数=0"},{"name":"unfreeze","t":"固定を外す","a":"なし"},{"name":"rows.hide","t":"行を隠す","a":"rows*=行[]"},{"name":"rows.show","t":"隠した行を出す","a":"rows=行[]"},{"name":"cols.hide","t":"列を隠す","a":"cols*=列[]"},{"name":"cols.show","t":"隠した列を出す","a":"cols=列[]"},{"name":"group.rows","t":"行をグループ化する","a":"rows*=行[], collapse=真偽"},{"name":"group.cols","t":"列をグループ化する","a":"cols*=列[], collapse=真偽"},{"name":"group.remove","t":"グループ化を外す","a":"rows=行[], cols=列[]"},{"name":"sheet.add","t":"シートを追加する","a":"name=シート, before=シート, rename=対応, move=対応"},{"name":"sheet.rename","t":"シートの名前を変える","a":"name*=シート, to*=文字"},{"name":"sheet.move","t":"シートの並び順を変える","a":"name*=シート, index*=数"},{"name":"sheet.delete","t":"シートを消す","a":"name*=シート"},{"name":"sheet.copy","t":"シートを複製する","a":"name*=シート, as=文字, before=シート"},{"name":"sheet.hide","t":"シートを隠す","a":"name*=シート"},{"name":"sheet.show","t":"隠したシートを出す","a":"name=シート"},{"name":"sheet.color","t":"タブの色を変える","a":"name=シート, color*=色"},{"name":"sheet.merge","t":"複数シートの表を1つのシートに縦結合する","a":"sheets=配列, into=文字=統合, skip_header=真偽=true"},{"name":"sheet.split","t":"列の値ごとにシートを自動分割する","a":"col*=列, prefix=文字"},{"name":"sheet.diff","t":"2つのシートの差分を比較する","a":"from*=シート, to*=シート, into=文字=差分"},{"name":"sheet.toc","t":"全シートの目次シートを作る","a":"into=文字=目次"},{"name":"book.finish","t":"全シートをA1に揃え提出前仕上げ","a":"gridlines=真偽"},{"name":"sheet.sort","t":"シートを名前順に並べ替える","a":"desc=真偽=false"},{"name":"sheet.snapshot","t":"日付つきでシートの控えを複製保存","a":"name=シート, suffix=文字"}];
var COMBO_PROP_TARGET = 'COMBO_TARGET_SS_ID';
var COMBO_PROP_CONFIG = 'COMBO_CONFIG';
var COMBO_PROP_FAST_UNDO = 'COMBO_FAST_UNDO';
var COMBO_TBL_CACHE_PREFIX = 'COMBO_TBL_';
var COMBO_TBL_CACHE_TTL = 21600;
function onOpen(e) {
try {
SpreadsheetApp.getUi()
.createMenu('⚡ GASクイック')
.addItem('操作窓を開く', 'showGasComboSidebar')
.addItem('直前を取り消す', 'comboMenuUndo')
.addSeparator()
.addItem('つなぎ用 JSON を表示（コピー）', 'showConnectorJsonDialog')
.addToUi();
} catch (err) {
}
}
function createComboSidebarHtml() {
return HtmlService.createHtmlOutputFromFile('ComboSidebar')
.setTitle('GASクイック')
.setWidth(300);
}
function showGasComboSidebar() {
SpreadsheetApp.getUi().showSidebar(createComboSidebarHtml());
}
function showConnectorJsonDialog() {
var engineId = '';
try { engineId = ScriptApp.getScriptId(); } catch (e) {}
var jsonStr = JSON.stringify({
timeZone: 'Asia/Tokyo',
exceptionLogging: 'STACKDRIVER',
runtimeVersion: 'V8',
dependencies: {
libraries: [
{ userSymbol: 'shuquickengine', version: '1', libraryId: engineId, developmentMode: false }
],
enabledAdvancedServices: [
{ userSymbol: 'Drive', serviceId: 'drive', version: 'v3' },
{ userSymbol: 'Sheets', serviceId: 'sheets', version: 'v4' }
]
},
oauthScopes: [
'https://www.googleapis.com/auth/spreadsheets',
'https://www.googleapis.com/auth/drive',
'https://www.googleapis.com/auth/drive.scripts',
'https://www.googleapis.com/auth/script.container.ui',
'https://www.googleapis.com/auth/script.external_request'
],
webapp: { executeAs: 'USER_DEPLOYING', access: 'MYSELF' }
}, null, 2);
var esc = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
var html = '<!doctype html><html><head><meta charset="utf-8"><style>'
+ 'body{font-family:sans-serif;margin:12px;font-size:13px;color:#1e293b;}'
+ 'textarea{width:100%;height:230px;font-family:monospace;font-size:11px;box-sizing:border-box;padding:8px;border:1px solid #cbd5e1;border-radius:4px;}'
+ '.row{display:flex;gap:8px;align-items:center;margin-top:10px;}'
+ 'button{padding:7px 14px;border:none;border-radius:4px;background:#2563eb;color:#fff;font-weight:bold;cursor:pointer;}'
+ 'button.sub{background:#e2e8f0;color:#1e293b;font-weight:normal;}'
+ '#msg{font-size:12px;color:#15803d;font-weight:bold;}'
+ '</style></head><body>'
+ '<div style="margin-bottom:6px;">テンプレートの <b>appsscript.json</b> を全選択して、下の内容を貼り付けて保存してください。</div>'
+ '<textarea id="j" readonly>' + esc + '</textarea>'
+ '<div class="row">'
+ '<button id="cp" type="button">JSON をコピー</button>'
+ '<button class="sub" type="button" onclick="google.script.host.close()">閉じる</button>'
+ '<span id="msg"></span></div>'
+ '<script>'
+ 'var ta=document.getElementById("j"),msg=document.getElementById("msg");'
+ 'ta.focus();ta.select();'
+ 'document.getElementById("cp").onclick=function(){'
+ '  ta.focus();ta.select();'
+ '  if(navigator.clipboard&&navigator.clipboard.writeText){'
+ '    navigator.clipboard.writeText(ta.value).then(function(){msg.textContent="コピーしました！";}).catch(function(){document.execCommand("copy");msg.textContent="コピーしました！";});'
+ '  }else{document.execCommand("copy");msg.textContent="コピーしました！";}'
+ '};'
+ '</script></body></html>';
SpreadsheetApp.getUi().showModalDialog(
HtmlService.createHtmlOutput(html).setWidth(480).setHeight(340),
'つなぎ用 appsscript.json（大元 ID 入り）'
);
}
function comboMenuUndo() {
var res = comboUndo({ ok: false });
try {
var ss = comboOpenSs_({});
ss.toast(res.ok ? ('取り消しました: ' + (res.what || '')) : (res.error || '取り消せませんでした'), 'GASクイック', 4);
} catch (err) {}
return res;
}
function comboSetTestTarget(ssId) {
var p = PropertiesService.getScriptProperties();
var val = String(ssId || '').trim();
if (val) {
p.setProperty(COMBO_PROP_TARGET, val);
} else {
p.deleteProperty(COMBO_PROP_TARGET);
}
return { ok: true, targetId: val };
}
function comboOpenSs_(req) {
req = req || {};
var reqId = String(req.targetId || (req.target && req.target.id) || '').trim();
var active = null;
try {
active = SpreadsheetApp.getActiveSpreadsheet();
} catch (e) {}
if (active && (!reqId || req.assumeActive === true || active.getId() === reqId)) {
return active;
}
var propId = '';
try {
propId = PropertiesService.getScriptProperties().getProperty(COMBO_PROP_TARGET) || '';
} catch (e2) {}
var id = reqId || propId || DEFAULT_TARGET_SS_ID || '';
if (id) {
return SpreadsheetApp.openById(id);
}
if (active) {
return active;
}
throw new ArgError('対象のスプレッドシートを開けません（COMBO_TARGET_SS_ID を設定してください）');
}
function comboGetSelectionInfo_(ss, req, skipLookup) {
req = req || {};
var reqSheet = String(req.sheet || (req.target && req.target.sheet) || '').trim();
if (reqSheet && (req.selection !== undefined || skipLookup)) {
return { sheet: reqSheet, selection: String(req.selection || '').trim().toUpperCase() };
}
var activeSh = null;
try {
activeSh = ss.getActiveSheet();
} catch (e) {}
var sh = null;
if (reqSheet) {
sh = ss.getSheetByName(reqSheet);
if (!sh) {
throw new ArgError('シート「' + reqSheet + '」がありません。あるのは: ' + quickVisibleSheets_(ss).map(function (s) { return s.getName(); }).join('、'));
}
} else {
sh = (activeSh && activeSh.getName() !== QUICK_BK_NAME) ? activeSh : (quickVisibleSheets_(ss)[0] || ss.getSheets()[0]);
}
var sheetName = sh.getName();
var sel = String(req.selection || '').trim().toUpperCase();
if (!sel && activeSh && activeSh.getName() === sheetName) {
try {
var rg = activeSh.getActiveRange();
if (rg) sel = rg.getA1Notation();
} catch (e2) {}
}
if (!sel && !reqSheet) {
try {
var rg2 = ss.getActiveRange();
if (rg2) sel = rg2.getA1Notation();
} catch (e3) {}
}
return { sheet: sheetName, selection: sel };
}
function comboTblCacheKey_(ssId, sheetName) {
if (sheetName === undefined) {
sheetName = ssId;
ssId = '';
}
return COMBO_TBL_CACHE_PREFIX + String(ssId || '').slice(0, 44) + '_' + String(sheetName || '').slice(0, 150);
}
function comboCacheGet_(ssId, sheetName) {
try {
var raw = CacheService.getUserCache().get(comboTblCacheKey_(ssId, sheetName));
if (!raw) return null;
var obj = JSON.parse(raw);
if (obj && obj.ssId === ssId) return obj;
} catch (e) {}
return null;
}
function comboComputeTitleA1_(sh, tb) {
if (!sh || !tb || !tb.headerRow || tb.headerRow <= 1) return '';
var prevCache = _TBL_CACHE;
try {
if (!_TBL_CACHE) _TBL_CACHE = {};
if (typeof sh.getSheetId === 'function') _TBL_CACHE[sh.getSheetId()] = tb;
return titleRange_(sh).getA1Notation();
} catch (e) {
return '';
} finally {
_TBL_CACHE = prevCache || null;
}
}
function comboCachePut_(ssId, sheetName, table, sheets, tb, ssName, titleA1) {
try {
var effTitleA1 = titleA1 || (table && table.title_a1) || '';
if (table && effTitleA1 && !table.title_a1) table.title_a1 = effTitleA1;
var payload = {
ssId: ssId,
ssName: ssName || '',
titleA1: effTitleA1,
table: table || null,
sheets: sheets || null,
ts: Date.now()
};
if (tb && tb.vals) {
payload.rawTable = {
headerRow: tb.headerRow,
firstCol: tb.firstCol,
lastCol: tb.lastCol,
firstData: tb.firstData,
lastData: tb.lastData,
totalRow: tb.totalRow,
vals: tb.vals
};
}
var s = JSON.stringify(payload);
if (s.length >= 95000 && payload.rawTable) {
var headKeep = Math.max(10, (tb.headerRow || 1) + 2);
payload.rawTable.vals = tb.vals.slice(0, headKeep);
payload.rawTable.headOnly = true;
s = JSON.stringify(payload);
if (s.length >= 95000) {
delete payload.rawTable;
s = JSON.stringify(payload);
}
}
if (s.length < 95000) {
CacheService.getUserCache().put(comboTblCacheKey_(ssId, sheetName), s, COMBO_TBL_CACHE_TTL);
}
} catch (e) {}
}
function comboCacheInvalidate_(ssId, sheetName) {
try {
CacheService.getUserCache().remove(comboTblCacheKey_(ssId, sheetName));
} catch (e) {}
}
function quickVisibleSheets_(ss) {
return ss.getSheets().filter(function (s) { return s.getName() !== QUICK_BK_NAME; });
}
function comboParseScope_(selection) {
if (!selection || typeof ComboPlanner === 'undefined' || typeof ComboPlanner.parseSelectionScope !== 'function') {
return null;
}
try {
return ComboPlanner.parseSelectionScope(selection);
} catch (e) {
return null;
}
}
function comboGetOAuthToken_() {
try {
if (typeof ScriptApp !== 'undefined' && typeof ScriptApp.getOAuthToken === 'function') {
return ScriptApp.getOAuthToken() || '';
}
} catch (e) {}
return '';
}
function comboSheetInfos_(ss) {
return quickVisibleSheets_(ss).map(function (s) {
return {
name: s.getName(),
sheetId: typeof s.getSheetId === 'function' ? s.getSheetId() : 0,
rows: s.getLastRow(),
cols: s.getLastColumn()
};
});
}
function comboInit(req, sheetFns) {
var t0 = Date.now();
try {
req = req || {};
var ss = comboOpenSs_(req);
var selInfo = comboGetSelectionInfo_(ss, req);
var sh = sheetOf_(ss, selInfo.sheet, '');
var sheetInfos = comboSheetInfos_(ss);
var sheets = sheetInfos.map(function (s) { return s.name; });
var ssId = ss.getId();
var ssName = ss.getName();
var tb = findTable_(sh);
var table = tb ? tableOut_(tb) : null;
var titleA1 = comboComputeTitleA1_(sh, tb);
if (table && titleA1) table.title_a1 = titleA1;
comboCachePut_(ssId, sh.getName(), table, sheets, tb, ssName, titleA1);
var token = comboGetOAuthToken_();
var out = {
ok: true,
target: {
id: ssId,
name: ssName,
kind: 'sheet',
url: 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit',
sheet: sh.getName()
},
sheetId: typeof sh.getSheetId === 'function' ? sh.getSheetId() : 0,
oauthToken: token,
sheets: sheets,
sheetInfos: sheetInfos,
table: table,
selection: selInfo.selection,
scope: comboParseScope_(selInfo.selection),
config: comboGetConfig(),
learned: comboGetLearned().learned
};
if (req.includeQuick) {
out.quick = comboQuickList({ force: !!req.forceQuick, _skipToken: true }, sheetFns);
}
if (sheetFns === undefined) {
try { out.engineScriptId = ScriptApp.getScriptId(); } catch (eSid) {}
}
out.gasMs = Date.now() - t0;
return out;
} catch (err) {
return {
ok: false,
error: String(err && err.message || err),
gasMs: Date.now() - t0
};
}
}
function comboPollSelection(req) {
var t0 = Date.now();
try {
req = req || {};
var ss = comboOpenSs_(req);
var selInfo = comboGetSelectionInfo_(ss, req);
var out = {
ok: true,
sheet: selInfo.sheet,
selection: selInfo.selection,
scope: comboParseScope_(selInfo.selection),
oauthToken: comboGetOAuthToken_()
};
var prevSheet = String(req.prevSheet || '').trim();
if (prevSheet && selInfo.sheet && selInfo.sheet !== prevSheet) {
var sh = sheetOf_(ss, selInfo.sheet, '');
var sheetInfos = comboSheetInfos_(ss);
var sheets = sheetInfos.map(function (s) { return s.name; });
var ssId = ss.getId();
var ssName = ss.getName();
var tb = findTable_(sh);
var table = tb ? tableOut_(tb) : null;
var titleA1 = comboComputeTitleA1_(sh, tb);
if (table && titleA1) table.title_a1 = titleA1;
comboCachePut_(ssId, sh.getName(), table, sheets, tb, ssName, titleA1);
out.sheetChanged = true;
out.sheetId = typeof sh.getSheetId === 'function' ? sh.getSheetId() : 0;
out.sheets = sheets;
out.sheetInfos = sheetInfos;
out.table = table;
}
out.gasMs = Date.now() - t0;
return out;
} catch (err) {
return {
ok: false,
error: String(err && err.message || err),
gasMs: Date.now() - t0
};
}
}
function comboFormatLookText_(target, sheetInfos, table, side, rangeInfo) {
var lines = [
'対象: ' + target.name + ' › ' + target.sheet,
'URL: ' + target.url,
'シート: ' + sheetInfos.map(function (s) { return s.name + '（' + s.rows + '行×' + s.cols + '列）'; }).join('、')
];
if (table) {
lines.push(
'表: 見出し ' + table.header_row + ' 行目・' + table.first_col + '〜' + table.last_col +
' 列・明細 ' + table.data + ' 行目' + (table.total_row ? '・合計行 ' + table.total_row + ' 行目' : '・合計行なし')
);
lines.push('列: ' + table.columns.map(function (c) { return c.col + '=' + c.name + (c.number ? '(数値)' : ''); }).join('、'));
} else {
lines.push('表: 見つかりません（空のシート、または見出しの行がありません）');
}
(side || []).forEach(function (ln) { lines.push(ln); });
if (rangeInfo && rangeInfo.values) {
lines.push('中身 ' + rangeInfo.range + ':');
var fm = rangeInfo.formulas || [];
var lim = Math.min(rangeInfo.values.length, 60);
for (var i = 0; i < lim; i++) {
var row = rangeInfo.values[i];
var cells = [];
for (var j = 0; j < row.length; j++) {
var f = (fm[i] && fm[i][j]) ? fm[i][j] : '';
cells.push(row[j] + (f ? '  {' + f + '}' : ''));
}
lines.push(cells.join('\t'));
}
}
return lines.join('\n');
}
function comboLook(req) {
var t0 = Date.now();
try {
req = req || {};
var ss = comboOpenSs_(req);
var selInfo = comboGetSelectionInfo_(ss, req);
var sh = sheetOf_(ss, req.sheet || selInfo.sheet, '');
var sheetInfos = comboSheetInfos_(ss);
var sheets = sheetInfos.map(function (s) { return s.name; });
var ssId = ss.getId();
var ssName = ss.getName();
var tb = findTable_(sh);
var table = tb ? tableOut_(tb) : null;
var titleA1 = comboComputeTitleA1_(sh, tb);
if (table && titleA1) table.title_a1 = titleA1;
comboCachePut_(ssId, sh.getName(), table, sheets, tb, ssName, titleA1);
var side = [];
if (!req.fast) {
try { side = lookSide_(ss, sh); } catch (eS) {}
}
var rangeInfo = null;
if (req.range) {
var rg = sh.getRange(req.range);
rangeInfo = {
range: req.range,
values: rg.getDisplayValues(),
formulas: rg.getFormulas()
};
}
var target = {
id: ssId,
name: ssName,
kind: 'sheet',
url: 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit',
sheet: sh.getName()
};
var text = comboFormatLookText_(target, sheetInfos, table, side, rangeInfo);
return {
ok: true,
target: target,
sheetId: typeof sh.getSheetId === 'function' ? sh.getSheetId() : 0,
oauthToken: comboGetOAuthToken_(),
sheets: sheets,
sheetInfos: sheetInfos,
table: table,
selection: selInfo.selection,
scope: comboParseScope_(selInfo.selection),
side: side,
values: rangeInfo ? rangeInfo.values : undefined,
formulas: rangeInfo ? rangeInfo.formulas : undefined,
text: text,
gasMs: Date.now() - t0
};
} catch (err) {
return {
ok: false,
error: String(err && err.message || err),
text: 'エラー: ' + String(err && err.message || err),
gasMs: Date.now() - t0
};
}
}
var COMBO_FAST_UNDO_SAFE_SHELVES_ = {
'format': 1, 'bg.clear': 1, 'freeze': 1, 'unfreeze': 1, 'width': 1,
'write': 1, 'clear.values': 1, 'clear.format': 1, 'clear.all': 1,
'renumber': 1, 'formula.guard': 1, 'formula.tovalue': 1, 'round': 1,
'text.case': 1, 'text.affix': 1, 'date.fix': 1, 'number.fix': 1, 'fill.series': 1, 'fill.date': 1,
'fill.down': 1, 'fill.blank': 1, 'replace': 1, 'copy': 1, 'copy.values': 1, 'copy.format': 1
};
function comboFastUndoKey_(ssId) {
return COMBO_PROP_FAST_UNDO + '_' + String(ssId || '').slice(0, 60);
}
function comboFastUndoLoadRaw_(ssId) {
var raw = null, fromUser = false, fromProp = false;
try {
raw = CacheService.getUserCache().get(comboFastUndoKey_(ssId));
if (raw) fromUser = true;
} catch (eU) {}
if (!raw) {
try { raw = CacheService.getScriptCache().get(COMBO_PROP_FAST_UNDO); } catch (eS) {}
}
if (!raw) {
try {
raw = PropertiesService.getScriptProperties().getProperty(COMBO_PROP_FAST_UNDO);
if (raw) fromProp = true;
} catch (eP) {}
}
return { raw: raw, fromUser: fromUser, fromProp: fromProp };
}
function comboFastUndoClear_(ssId, optSs) {
try {
var uc = CacheService.getUserCache();
var k = comboFastUndoKey_(ssId);
if (optSs) {
var prev = uc.get(k);
if (prev && prev.indexOf('"sheetcopy"') >= 0) quickDropBackup_(optSs);
}
uc.remove(k);
} catch (eU) {}
try { CacheService.getScriptCache().remove(COMBO_PROP_FAST_UNDO); } catch (eS) {}
try { PropertiesService.getScriptProperties().deleteProperty(COMBO_PROP_FAST_UNDO); } catch (eP) {}
}
function comboQuickClearFastUndo(ssId) {
var id = String(ssId || '').trim();
var ss = null;
if (!id) {
try { ss = SpreadsheetApp.getActive(); id = ss.getId(); } catch (e) {}
}
if (id) comboFastUndoClear_(id, ss);
return { ok: true };
}
function comboEncodeCellVal_(v, formula) {
if (formula && String(formula).charAt(0) === '=') return formula;
if (v instanceof Date) return { __dt: v.getTime() };
return v;
}
function comboDecodeCellVal_(v) {
if (v && typeof v === 'object' && v.__dt !== undefined) return new Date(v.__dt);
return v;
}
function comboFastUndoSave_(sh, ops, table, optSsId, optSs) {
var ssId = optSsId || (typeof sh.getParent === 'function' ? sh.getParent().getId() : '');
try {
var cache = CacheService.getUserCache();
var fastKey = comboFastUndoKey_(ssId);
for (var i = 0; i < ops.length; i++) {
var op0 = ops[i];
if (!op0 || !COMBO_FAST_UNDO_SAFE_SHELVES_[op0.shelf] ||
(op0.shelf === 'format' && (op0.borders !== undefined || op0.merge !== undefined)) ||
(op0.shelf === 'write' && op0.tsv !== undefined)) {
comboFastUndoClear_(ssId, optSs);
return false;
}
}
var minR = Infinity, minC = Infinity, maxR = 0, maxC = 0;
var addRange = function (rg) {
if (!rg) return;
var r0 = rg.getRow(), c0 = rg.getColumn();
var r1 = r0 + rg.getNumRows() - 1, c1 = c0 + rg.getNumColumns() - 1;
if (r0 < minR) minR = r0;
if (c0 < minC) minC = c0;
if (r1 > maxR) maxR = r1;
if (c1 > maxC) maxC = c1;
};
var hasWidth = false;
var needFullSheet = false;
var formatOnly = true;
var freezeOnly = true;
var widthOnly = true;
var fmtFlags = {};
for (var j = 0; j < ops.length; j++) {
var op = ops[j];
if ((op.shelf !== 'format' && op.shelf !== 'bg.clear') || op.merge !== undefined || op.borders !== undefined) formatOnly = false;
if (op.shelf !== 'freeze' && op.shelf !== 'unfreeze') freezeOnly = false;
if (op.shelf !== 'width') widthOnly = false;
if (op.shelf === 'bg.clear') fmtFlags.bgs = true;
if (op.shelf === 'format') {
if (op.color !== undefined) fmtFlags.colors = true;
if (op.bg !== undefined) fmtFlags.bgs = true;
if (op.bold !== undefined) fmtFlags.weights = true;
if (op.italic !== undefined) fmtFlags.styles = true;
if (op.size !== undefined) fmtFlags.sizes = true;
if (op.font !== undefined) fmtFlags.fonts = true;
if (op.align !== undefined) fmtFlags.aligns = true;
if (op.valign !== undefined) fmtFlags.valigns = true;
if (op.number_format !== undefined) fmtFlags.numFmts = true;
if (op.wrap !== undefined) fmtFlags.wraps = true;
}
if (op.shelf === 'width') hasWidth = true;
if (op.to) {
if (String(op.to).indexOf('!') >= 0) { comboFastUndoClear_(ssId, optSs); return false; }
try { addRange(sh.getRange(op.to)); continue; } catch (eTo) {}
}
if (op.range && !/^(all|\*|全体|全セル|シート全体|sheet)$/i.test(String(op.range).trim())) {
try { addRange(sh.getRange(op.range)); continue; } catch (eR) {}
}
if (op.title) {
try { addRange(titleRange_(sh)); continue; } catch (eT) {}
}
if (op.header && table && table.header_row && table.first_col && table.last_col) {
try {
var fc = colNum_(table.first_col), lc = colNum_(table.last_col);
addRange(sh.getRange(table.header_row, fc, 1, lc - fc + 1));
continue;
} catch (eH) {}
}
if (op.col && table) {
try {
var tObj = findTable_(sh);
if (tObj) {
var ci = colIndexOf_(tObj, op.col);
var endR = tObj.totalRow || tObj.lastData;
addRange(sh.getRange(tObj.firstData, ci, Math.max(1, endR - tObj.firstData + 1), 1));
continue;
}
} catch (eC) {}
}
if (op.cells && typeof op.cells === 'object') {
var keys = Object.keys(op.cells);
if (keys.length) {
keys.forEach(function (k) { try { addRange(sh.getRange(k)); } catch (eK) {} });
continue;
}
}
if (op.shelf === 'freeze' || op.shelf === 'unfreeze') {
addRange(sh.getRange(1, 1));
continue;
}
needFullSheet = true;
}
if (needFullSheet || minR === Infinity) {
var lr = sh.getLastRow(), lc2 = sh.getLastColumn();
if (lr < 1 || lc2 < 1) {
minR = 1; minC = 1; maxR = 1; maxC = 1;
} else if (lr * lc2 <= 800) {
minR = 1; minC = 1; maxR = lr; maxC = lc2;
} else {
comboFastUndoClear_(ssId, optSs);
return false;
}
}
var nr = maxR - minR + 1, nc = maxC - minC + 1;
if (nr * nc > 800) {
comboFastUndoClear_(ssId, optSs);
return false;
}
var targetRg = sh.getRange(minR, minC, nr, nc);
var snap = {
ssId: ssId,
sheetName: sh.getName(),
r: minR,
c: minC,
nr: nr,
nc: nc,
a1: targetRg.getA1Notation(),
what: ops.map(function (o) { return o.shelf; }).join('・'),
ts: Date.now()
};
if (formatOnly && Object.keys(fmtFlags).length) {
snap.partial = true;
if (fmtFlags.colors) snap.colors = targetRg.getFontColors();
if (fmtFlags.bgs) snap.bgs = targetRg.getBackgrounds();
if (fmtFlags.weights) snap.weights = targetRg.getFontWeights();
if (fmtFlags.styles) snap.styles = targetRg.getFontStyles();
if (fmtFlags.sizes) snap.sizes = targetRg.getFontSizes();
if (fmtFlags.fonts) snap.fonts = targetRg.getFontFamilies();
if (fmtFlags.aligns) snap.aligns = targetRg.getHorizontalAlignments();
if (fmtFlags.valigns) snap.valigns = targetRg.getVerticalAlignments();
if (fmtFlags.numFmts) snap.numFmts = targetRg.getNumberFormats();
if (fmtFlags.wraps) snap.wraps = targetRg.getWraps();
} else if (freezeOnly) {
snap.partial = true;
snap.frozenR = sh.getFrozenRows();
snap.frozenC = sh.getFrozenColumns();
} else if (widthOnly) {
snap.partial = true;
} else {
var rawVals = targetRg.getValues();
var rawFormulas = targetRg.getFormulas();
var vals = [];
for (var r = 0; r < nr; r++) {
var rowOut = [];
for (var c = 0; c < nc; c++) {
rowOut.push(comboEncodeCellVal_(rawVals[r][c], rawFormulas[r][c]));
}
vals.push(rowOut);
}
snap.vals = vals;
snap.bgs = targetRg.getBackgrounds();
snap.colors = targetRg.getFontColors();
snap.weights = targetRg.getFontWeights();
snap.styles = targetRg.getFontStyles();
snap.sizes = targetRg.getFontSizes();
snap.fonts = targetRg.getFontFamilies();
snap.aligns = targetRg.getHorizontalAlignments();
snap.valigns = targetRg.getVerticalAlignments();
snap.numFmts = targetRg.getNumberFormats();
snap.wraps = targetRg.getWraps();
snap.frozenR = sh.getFrozenRows();
snap.frozenC = sh.getFrozenColumns();
}
if (hasWidth) {
var cw = {};
var wEnd = Math.min(maxC, Math.max(sh.getLastColumn(), maxC));
for (var wc = minC; wc <= wEnd; wc++) {
cw[wc] = sh.getColumnWidth(wc);
}
snap.colWidths = cw;
}
var jsonStr = JSON.stringify(snap);
if (jsonStr.length > 50000) {
var gz = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(jsonStr, 'application/json')).getBytes());
jsonStr = JSON.stringify({ __gz: gz, ssId: snap.ssId });
}
if (jsonStr.length > 95000) {
comboFastUndoClear_(ssId, optSs);
return false;
}
if (optSs) {
var prevRaw = cache.get(fastKey);
if (prevRaw && prevRaw.indexOf('"sheetcopy"') >= 0) quickDropBackup_(optSs);
}
cache.put(fastKey, jsonStr, COMBO_TBL_CACHE_TTL);
return true;
} catch (err) {
comboFastUndoClear_(ssId, optSs);
return false;
}
}
function comboFastUndoRestore_(ss, optRaw) {
var t0 = Date.now();
var ssId = ss.getId();
var loaded = optRaw ? { raw: optRaw } : comboFastUndoLoadRaw_(ssId);
var raw = loaded.raw;
if (!raw) {
return { ok: false, error: '戻せる高速控えがありません' };
}
var snap;
try {
snap = JSON.parse(raw);
if (snap && snap.__gz) {
var unz = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(snap.__gz), 'application/x-gzip')).getDataAsString('utf-8');
snap = JSON.parse(unz);
}
} catch (e) {
comboFastUndoClear_(ssId);
return { ok: false, error: '高速控えのデータが壊れていました' };
}
if (!snap || snap.ssId !== ssId) {
return { ok: false, error: '現在のスプレッドシートの高速控えがありません' };
}
if (snap.kind === 'sheetcopy') return quickRestoreSheetCopy_(ss, snap);
var sh = ss.getSheetByName(snap.sheetName);
if (!sh) {
return { ok: false, error: 'シート「' + snap.sheetName + '」が見つかりません' };
}
var rg = sh.getRange(snap.r, snap.c, snap.nr, snap.nc);
if (snap.vals !== undefined) {
var restoredVals = snap.vals.map(function (row) {
return row.map(comboDecodeCellVal_);
});
rg.setValues(restoredVals);
}
if (snap.bgs !== undefined) rg.setBackgrounds(snap.bgs);
if (snap.colors !== undefined) rg.setFontColors(snap.colors);
if (snap.weights !== undefined) rg.setFontWeights(snap.weights);
if (snap.styles !== undefined) rg.setFontStyles(snap.styles);
if (snap.sizes !== undefined) rg.setFontSizes(snap.sizes);
if (snap.fonts !== undefined) rg.setFontFamilies(snap.fonts);
if (snap.aligns !== undefined) rg.setHorizontalAlignments(snap.aligns);
if (snap.valigns !== undefined) rg.setVerticalAlignments(snap.valigns);
if (snap.numFmts !== undefined) rg.setNumberFormats(snap.numFmts);
if (snap.wraps !== undefined) rg.setWraps(snap.wraps);
if (snap.wrapStrats !== undefined) {
rg.setWrapStrategies(snap.wrapStrats.map(function (row) {
return row.map(function (w) { return SpreadsheetApp.WrapStrategy[w] || SpreadsheetApp.WrapStrategy.OVERFLOW; });
}));
}
if (snap.frozenR !== undefined && sh.getFrozenRows() !== snap.frozenR) sh.setFrozenRows(snap.frozenR);
if (snap.frozenC !== undefined && sh.getFrozenColumns() !== snap.frozenC) sh.setFrozenColumns(snap.frozenC);
if (snap.colWidths) {
Object.keys(snap.colWidths).forEach(function (k) {
sh.setColumnWidth(parseInt(k, 10), snap.colWidths[k]);
});
}
comboFastUndoClear_(ssId);
if (!snap.partial) {
comboCacheInvalidate_(ssId, snap.sheetName);
}
var cachedUndo = comboCacheGet_(ssId, sh.getName());
var target = {
id: ssId,
name: (cachedUndo && cachedUndo.ssName) || ss.getName(),
kind: 'sheet',
url: 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit',
sheet: sh.getName()
};
var text = [
'対象: ' + target.name + ' › ' + target.sheet,
'戻した: ' + snap.a1 + '（' + (snap.what || '直前の変更') + '）を取り消しました（高速戻し）'
].join('\n');
return {
ok: true,
fast: true,
undone: 'fast',
what: snap.what,
target: target,
text: text,
gasMs: Date.now() - t0
};
}
function comboFormatOpsShort_(ops) {
if (typeof ComboPlanner !== 'undefined' && typeof ComboPlanner.formatOpsShort === 'function') {
return ComboPlanner.formatOpsShort(ops);
}
return (ops || []).map(function (o) {
var args = Object.keys(o).filter(function (k) { return k !== 'shelf'; }).map(function (k) {
return k + '=' + JSON.stringify(o[k]);
}).join(', ');
return (o.shelf || '?') + '(' + args + ')';
}).join(', ');
}
function comboFormatDoText_(res, backupOn) {
var tgt = res.target || {};
var head = '対象: ' + (tgt.name || '(名前なし)') + (tgt.sheet ? ' › ' + tgt.sheet : '');
var lines = [head];
if (res.ok) {
var ch = res.changed || [];
if (ch.length) {
lines.push('直した所: ' + ch.slice(0, 2).join(' ／ ') + (ch.length > 2 ? '（ほか ' + (ch.length - 2) + ' 件）' : ''));
} else {
lines.push('直した所: なし');
}
var rest = [];
if (res.notes && res.notes.length) rest.push('メモ: ' + res.notes.slice(0, 3).join(' ／ '));
if (res.remaining && res.remaining.length) rest.push('残り: ' + res.remaining.slice(0, 3).join(' ／ '));
if (rest.length) lines.push(rest.join('　'));
var tail = [];
if (res.backup) tail.push('控え #' + res.backup + '（戻す で取り消せます）');
else if (res.fastUndo) tail.push('高速控えあり（戻す で取り消せます）');
else if (!backupOn) tail.push('控えなし（取り消し不可・Ctrl+Z 推奨）');
if (tail.length) lines.push(tail.join(' ／ '));
return lines.join('\n');
}
if (res.blocked) {
lines.push('止めました: ' + (res.error || '確認が必要です'));
lines.push('何も変えていません。「確認なし」にチェックを入れて再実行してください。');
} else {
lines.push('失敗: ' + (res.where ? res.where + ' ' : '') + (res.error || '不明なエラー'));
}
return lines.join('\n');
}
function comboKeepsShape_(ops) {
for (var i = 0; i < ops.length; i++) {
var op = ops[i];
if (!op || op.shelf === 'api') return false;
var c = CATALOG[op.shelf];
if (!c) return false;
var touch = c.touch || [];
if (touch.indexOf('値') >= 0 || touch.indexOf('シート構成') >= 0) return false;
}
return true;
}
function comboRunOps(req) {
var t0 = Date.now();
req = req || {};
var ops = req.ops;
if (typeof ops === 'string') {
try { ops = JSON.parse(ops); } catch (e) {
return { ok: false, error: 'ops が JSON として読めません', text: 'エラー: ops が JSON として読めません', gasMs: Date.now() - t0 };
}
}
if (ops && !Array.isArray(ops) && ops.shelf) ops = [ops];
if (!Array.isArray(ops) || !ops.length) {
return { ok: false, error: 'ops が空です', text: 'エラー: ops が空です', gasMs: Date.now() - t0 };
}
var ss;
try {
ss = req._ss || comboOpenSs_(req);
} catch (errOpen) {
return { ok: false, error: String(errOpen && errOpen.message || errOpen), text: 'エラー: ' + String(errOpen && errOpen.message || errOpen), gasMs: Date.now() - t0 };
}
var ssId = String(req.targetId || (req.target && req.target.id) || '').trim() || ss.getId();
var ssUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit';
var selInfo;
try {
selInfo = comboGetSelectionInfo_(ss, req, true);
} catch (errSel) {
return { ok: false, error: String(errSel && errSel.message || errSel), text: 'エラー: ' + String(errSel && errSel.message || errSel), gasMs: Date.now() - t0 };
}
var curSheet = selInfo.sheet;
var backupOn = !!req.backup;
var effOk = !!req.ok || ops.some(function (o) { return !!(o && o.ok === true); });
if (backupOn) {
comboFastUndoClear_(ssId, ss);
var fullRes = actDo_({
target: { id: ssId, kind: 'sheet', sheet: curSheet },
ops: ops,
ok: effOk,
backup: true,
want_table: true
});
if (fullRes.ok) {
comboCacheInvalidate_(ssId, curSheet);
if (fullRes.table !== undefined) {
comboCachePut_(ssId, (fullRes.target && fullRes.target.sheet) || curSheet, fullRes.table, fullRes.sheets, null, (fullRes.target && fullRes.target.name) || '');
}
}
fullRes.text = comboFormatDoText_(fullRes, true);
fullRes.gasMs = Date.now() - t0;
return fullRes;
}
var sh = sheetOf_(ss, curSheet, '');
var needTitleA1 = ops.some(function (o) { return o && o.shelf === 'format' && o.title === true; });
var hasFrontMeta = !!(req.targetName && req.sheets && req.table !== undefined);
var hasFrontTitle = !needTitleA1 || !!(req.table && req.table.title_a1);
var cached = (req._cached !== undefined)
? req._cached
: ((hasFrontMeta && hasFrontTitle) ? null : comboCacheGet_(ssId, curSheet));
var ssName = req.targetName || req._ssName || (cached && cached.ssName) || ss.getName();
var table = req.table !== undefined ? req.table : (cached && cached.table ? cached.table : null);
var sheets = req.sheets || (cached && cached.sheets) || null;
var keepsShape = comboKeepsShape_(ops);
var titleA1 = (table && table.title_a1) || (cached && cached.titleA1) || '';
var resolvedOps = ops.map(function (op) {
if (!op || op.shelf !== 'format') return op;
if (op.title === true && titleA1) {
var bandA1 = titleA1;
if (op.merge === undefined && titleA1.indexOf(':') < 0 && table && table.last_col) {
var tm = /^([A-Z]+)(\d+)$/.exec(titleA1);
if (tm && colNum_(table.last_col) > colNum_(tm[1])) {
var c0 = Math.min(colNum_(table.first_col || tm[1]), colNum_(tm[1]));
var c1 = colNum_(table.last_col);
var rIdx = parseInt(tm[2], 10) - 1;
var rawRow = (cached && cached.rawTable && cached.rawTable.vals && cached.rawTable.vals[rIdx]) ? cached.rawTable.vals[rIdx].slice(c0 - 1, c1) : null;
if (!rawRow || rawRow.filter(function (v) { return !isBlank_(v); }).length <= 1) {
bandA1 = (colNum_(table.first_col || tm[1]) < colNum_(tm[1]) ? table.first_col : tm[1]) + tm[2] + ':' + table.last_col + tm[2];
}
}
}
var nextOp = Object.assign({}, op, { range: bandA1, title: false });
if (bandA1 !== titleA1 && (op.align === 'center' || op.align === 'right')) nextOp.align = 'left';
return nextOp;
}
if (op.header === true && table && table.header_row && table.first_col && table.last_col) {
var hdrA1 = table.first_col + table.header_row + ':' + table.last_col + table.header_row;
return Object.assign({}, op, { range: hdrA1, header: false });
}
return op;
});
_TBL_CACHE = {};
if (cached && cached.rawTable && (keepsShape || !cached.rawTable.headOnly)) {
_TBL_CACHE[sh.getSheetId()] = cached.rawTable;
}
var fastSaved = false;
var ctx = {
wideKey: digest_(ssId + '|' + JSON.stringify(ops), FP_VER),
kind: 'sheet',
file: ss,
ss: ss,
doc: null,
sheetName: curSheet,
curSheet: curSheet,
ok: effOk,
changed: [],
notes: [],
remaining: [],
createdSheets: [],
n: 0,
isNew: false,
_file: { id: ssId, name: ssName, url: ssUrl }
};
try {
if (req.fastUndo === true) {
fastSaved = comboFastUndoSave_(sh, resolvedOps, table, ssId, ss);
} else {
comboFastUndoClear_(ssId, ss);
}
if (!keepsShape && _TBL_CACHE) _TBL_CACHE._once = true;
for (var i = 0; i < resolvedOps.length; i++) {
var op = resolvedOps[i];
var fn = SHELF[op.shelf];
if (!fn) throw new ArgError('棚「' + op.shelf + '」はありません');
if (fn.kind && fn.kind !== 'sheet') {
throw new ArgError('棚「' + op.shelf + '」は文書用です（今の相手はスプレッドシート）');
}
ctx.opNo = i + 1;
ctx.opName = op.shelf;
fn(ctx, op);
if (!keepsShape) _TBL_CACHE = null;
}
var finalSheet = ctx.curSheet || curSheet;
if (!keepsShape) {
SpreadsheetApp.flush();
comboCacheInvalidate_(ssId, curSheet);
if (finalSheet !== curSheet) comboCacheInvalidate_(ssId, finalSheet);
try {
var finalSh = ss.getSheetByName(finalSheet);
if (finalSh) {
var tbNew = findTable_(finalSh);
table = tbNew ? tableOut_(tbNew) : null;
var newTitleA1 = comboComputeTitleA1_(finalSh, tbNew);
if (table && newTitleA1) table.title_a1 = newTitleA1;
sheets = quickVisibleSheets_(ss).map(function (s) { return s.getName(); });
comboCachePut_(ssId, finalSheet, table, sheets, tbNew, ssName, newTitleA1);
}
} catch (eTbl) {}
} else if (!sheets) {
sheets = quickVisibleSheets_(ss).map(function (s) { return s.getName(); });
}
var out = {
ok: true,
target: {
id: ssId,
name: ssName,
kind: 'sheet',
url: ssUrl,
sheet: finalSheet
},
changed: ctx.changed,
notes: ctx.notes,
remaining: ctx.remaining,
backup: 0,
fastUndo: fastSaved,
selection: selInfo.selection || req.selection || '',
table: table,
sheets: sheets
};
out.text = comboFormatDoText_(out, false);
out.gasMs = Date.now() - t0;
return out;
} catch (err) {
var errOut = {
ok: false,
error: String(err && err.message || err),
where: '棚 #' + (ctx.opNo || 0) + ' ' + (ctx.opName || ''),
blocked: !!(err && err.isBlocked),
needs_ok: !!(err && err.isBlocked),
arg: !!(err && err.isArg),
target: {
id: ssId,
name: ssName,
kind: 'sheet',
url: ssUrl,
sheet: ctx.curSheet || curSheet
}
};
errOut.text = comboFormatDoText_(errOut, false);
errOut.gasMs = Date.now() - t0;
return errOut;
} finally {
_TBL_CACHE = null;
}
}
var COMBO_PROP_LEARNED = 'COMBO_LEARNED';
function comboGetLearned(req) {
var map = {};
try { map = JSON.parse(PropertiesService.getUserProperties().getProperty(COMBO_PROP_LEARNED) || '{}') || {}; } catch (e) { map = {}; }
return { ok: true, learned: map };
}
function comboLearn(req) {
req = req || {};
var ask = String(req.ask || '').trim();
var ops = req.ops;
if (!ask || !Array.isArray(ops) || !ops.length) return { ok: false, text: '覚える頼みと ops がありません' };
var map = comboGetLearned().learned;
if (req.key) {
delete map[req.key];
map[String(req.key)] = ops;
var ks = Object.keys(map);
while (ks.length > 300) delete map[ks.shift()];
} else if (typeof ComboPlanner !== 'undefined' && typeof ComboPlanner.learn === 'function') {
ComboPlanner.setLearned(map);
map = ComboPlanner.learn(ask, ops);
} else {
var key = ask.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[。．.!！?？]+$/g, '');
map[key] = ops;
}
try { PropertiesService.getUserProperties().setProperty(COMBO_PROP_LEARNED, JSON.stringify(map)); } catch (e) {
return { ok: false, text: '覚えを保存できませんでした: ' + String(e && e.message || e) };
}
return { ok: true, text: '覚えました: ' + ask };
}
function comboRenderUnfired_(plan) {
var lines = ['撃っていません: ' + ((plan.reasons && plan.reasons.length) ? plan.reasons.join('／') : '引数が決まりません')];
if (plan.suggest && plan.suggest.length) {
lines.push('近い候補: ' + comboFormatOpsShort_(plan.suggest));
}
if (plan.missing && plan.missing.length) {
lines.push('足りない引数: ' + plan.missing.join('、'));
}
if (plan.ops && plan.ops.length) {
lines.push('組みかけ: ' + comboFormatOpsShort_(plan.ops));
}
if (plan.guide && plan.guide.length) {
plan.guide.slice(0, 2).forEach(function (g) { lines.push('案内: ' + g); });
}
return lines.join('\n');
}
function comboRunAsk(req) {
req = req || {};
req.aiAuto = false;
var t0 = Date.now();
req = req || {};
var askText = String(req.ask || '').trim();
if (Array.isArray(req.ops) && req.ops.length) {
var preRes = comboRunOps({
ops: req.ops,
ok: !!req.ok,
backup: !!req.backup,
fastUndo: req.fastUndo,
sheet: req.sheet,
selection: req.selection,
table: req.table,
sheets: req.sheets,
targetName: req.targetName || req._ssName,
targetId: req.targetId
});
if (preRes.ok) {
preRes.source = 'shelf';
preRes.text = '[棚ヒット] ' + comboFormatOpsShort_(req.ops) + '\n' + preRes.text;
}
preRes.gasMs = Date.now() - t0;
return preRes;
}
if (!askText) {
return { ok: false, error: '依頼文が空です', text: '依頼文が空です', gasMs: Date.now() - t0 };
}
var ss;
try {
ss = comboOpenSs_(req);
} catch (errOpen) {
return { ok: false, error: String(errOpen && errOpen.message || errOpen), text: 'エラー: ' + String(errOpen && errOpen.message || errOpen), gasMs: Date.now() - t0 };
}
var ssId = ss.getId();
var selInfo;
try {
selInfo = comboGetSelectionInfo_(ss, req);
} catch (errSel) {
return { ok: false, error: String(errSel && errSel.message || errSel), text: 'エラー: ' + String(errSel && errSel.message || errSel), gasMs: Date.now() - t0 };
}
var curSheet = selInfo.sheet;
var selection = selInfo.selection;
var scope = comboParseScope_(selection);
var cached = (req.targetName && req.sheets && req.table !== undefined && req.table && req.table.title_a1)
? null
: comboCacheGet_(ssId, curSheet);
var ssName = req.targetName || (cached && cached.ssName) || '';
var table = req.table !== undefined ? req.table : (cached ? cached.table : undefined);
var sheets = req.sheets || (cached ? cached.sheets : null);
if (table === undefined || !sheets) {
var sh = sheetOf_(ss, curSheet, '');
var tb = findTable_(sh);
table = tb ? tableOut_(tb) : null;
var titleA1 = comboComputeTitleA1_(sh, tb);
if (table && titleA1) table.title_a1 = titleA1;
sheets = quickVisibleSheets_(ss).map(function (s) { return s.getName(); });
ssName = ssName || ss.getName();
comboCachePut_(ssId, curSheet, table, sheets, tb, ssName, titleA1);
cached = comboCacheGet_(ssId, curSheet);
}
if (typeof ComboPlanner !== 'undefined' && typeof ComboPlanner.plan === 'function') {
if (typeof ComboPlanner.setLearned === 'function') ComboPlanner.setLearned(comboGetLearned().learned);
var plan = ComboPlanner.plan(askText, 'sheet', table, sheets, curSheet, scope);
if (plan && plan.fire && plan.ops && plan.ops.length) {
var hitRes = comboRunOps({
ops: plan.ops,
ok: !!req.ok,
backup: !!req.backup,
fastUndo: req.fastUndo,
sheet: curSheet,
selection: selection,
table: table,
sheets: sheets,
targetId: ssId,
assumeActive: !!req.assumeActive,
_ss: ss,
_ssName: ssName,
_cached: cached
});
if (hitRes.ok) {
hitRes.source = 'shelf';
hitRes.text = '[棚ヒット] ' + comboFormatOpsShort_(plan.ops) + '\n' + hitRes.text;
}
hitRes.gasMs = Date.now() - t0;
return hitRes;
}
return {
ok: false,
unfired: true,
plan: plan,
text: comboRenderUnfired_(plan),
gasMs: Date.now() - t0
};
}
return {
ok: false,
unfired: true,
text: '撃っていません: 棚にもマクロにも当たらない指示です（言い方を変えるか、一覧から選んでください）',
gasMs: Date.now() - t0
};
}
function comboFind(req) {
var t0 = Date.now();
req = req || {};
try {
var ask = String(req.ask || '').trim();
var kind = String(req.kind || 'sheet').trim();
if (typeof ComboPlanner !== 'undefined') {
var text = (typeof ComboPlanner.ask === 'function')
? ComboPlanner.ask(ask, kind)
: String(ComboPlanner.find(ask, kind) || '');
return { ok: true, text: text, gasMs: Date.now() - t0 };
}
var list = Array.isArray(COMBO_MINI_SHELVES) ? COMBO_MINI_SHELVES : [];
var hits = list.filter(function (s) {
if (!ask) return true;
var hay = (s.name || '') + ' ' + (s.t || s.title || '') + ' ' + (s.a || s.args_raw || '');
return hay.indexOf(ask) >= 0;
}).slice(0, 15).map(function (s) {
return '- ' + s.name + ': ' + (s.t || s.title || '') + ' (' + (s.a || s.args_raw || 'なし') + ')';
});
var fbText = hits.length ? ('棚一覧（軽量検索）:\n' + hits.join('\n')) : ('該当する棚が見つかりませんでした: ' + ask);
return { ok: true, text: fbText, gasMs: Date.now() - t0 };
} catch (err) {
return { ok: false, error: String(err && err.message || err), text: 'エラー: ' + String(err && err.message || err), gasMs: Date.now() - t0 };
}
}
function comboUndo(req) {
var t0 = Date.now();
req = req || {};
try {
var ss = comboOpenSs_(req);
var ssId = ss.getId();
if (!req.to) {
var loaded = comboFastUndoLoadRaw_(ssId);
if (loaded.raw) {
var fastRes = comboFastUndoRestore_(ss, loaded.raw);
if (fastRes.ok || String(fastRes.error || '').indexOf('現在のスプレッドシート') < 0) {
fastRes.gasMs = Date.now() - t0;
return fastRes;
}
}
}
var res = actUndo_({
target_id: ssId,
ok: !!req.ok,
to: req.to ? String(req.to) : ''
});
var t = res.target || {};
if (res.ok) {
comboCacheInvalidate_(ssId, t.sheet || '');
res.text = [
'対象: ' + (t.name || ss.getName()),
'戻した: #' + res.undone + '（' + (res.what || '') + '）を取り消しました',
'控え #' + res.backup + '（もう一度 戻す で元に戻せます）'
].join('\n');
} else {
res.text = (res.needs_ok ? '止めました: ' : '戻せませんでした: ') + (res.error || '');
}
res.gasMs = Date.now() - t0;
return res;
} catch (err) {
return {
ok: false,
error: String(err && err.message || err),
text: '戻せませんでした: ' + String(err && err.message || err),
gasMs: Date.now() - t0
};
}
}
function comboGotoRange(req) {
var t0 = Date.now();
req = req || {};
try {
var raw = String(req.range || '').trim();
if (!raw) return { ok: false, error: '移動先の番地が空です', gasMs: Date.now() - t0 };
var ss = comboOpenSs_(req);
var shName = String(req.sheet || '').trim();
var a1 = raw;
var bang = raw.lastIndexOf('!');
if (bang > 0) {
shName = raw.slice(0, bang).trim().replace(/^'|'$/g, '').replace(/''/g, "'");
a1 = raw.slice(bang + 1).trim();
}
var sh = sheetOf_(ss, shName, '');
if (ss.getActiveSheet().getName() !== sh.getName()) {
sh.activate();
}
sh.getRange(a1).activate();
return { ok: true, sheet: sh.getName(), range: a1, gasMs: Date.now() - t0 };
} catch (err) {
return { ok: false, error: String(err && err.message || err), gasMs: Date.now() - t0 };
}
}
function comboGetRawConfig_() {
var def = { backupDefault: false, defaultTab: 'auto' };
try {
var raw = PropertiesService.getUserProperties().getProperty(COMBO_PROP_CONFIG);
if (!raw) return def;
var parsed = JSON.parse(raw);
if (parsed && typeof parsed === 'object') {
if (parsed.backupDefault !== undefined) def.backupDefault = !!parsed.backupDefault;
if (parsed.defaultTab === 'list' || parsed.defaultTab === 'auto') def.defaultTab = parsed.defaultTab;
}
} catch (e) {}
return def;
}
function comboGetConfig() {
return comboGetRawConfig_();
}
function comboSaveConfig(cfg) {
cfg = cfg || {};
var cur = comboGetRawConfig_();
if (cfg.backupDefault !== undefined) cur.backupDefault = !!cfg.backupDefault;
if (cfg.defaultTab === 'list' || cfg.defaultTab === 'auto') cur.defaultTab = cfg.defaultTab;
PropertiesService.getUserProperties().setProperty(COMBO_PROP_CONFIG, JSON.stringify(cur));
return { ok: true, config: cur };
}
function comboPing() {
return { ok: true, ts: Date.now() };
}
if (typeof EXTRA_ACTIONS !== 'undefined') {
EXTRA_ACTIONS.combo_ping = comboPing;
EXTRA_ACTIONS.combo_init = comboInit;
EXTRA_ACTIONS.combo_look = comboLook;
EXTRA_ACTIONS.combo_find = comboFind;
EXTRA_ACTIONS.combo_ask = comboRunAsk;
EXTRA_ACTIONS.combo_ops = comboRunOps;
EXTRA_ACTIONS.combo_undo = comboUndo;
EXTRA_ACTIONS.combo_poll = comboPollSelection;
EXTRA_ACTIONS.combo_goto = comboGotoRange;
EXTRA_ACTIONS.combo_set_target = function (req) {
return comboSetTestTarget((req && (req.targetId || req.ssId)) || '');
};
}
var QUICK_MY_TITLE = 'GASクイック マイマクロ';
var QUICK_BUILD = 'b6c124b66d';
var QUICK_DRAFT_KEY = 'QUICK_DRAFT';
function comboQuickBuild() {
return { ok: true, build: QUICK_BUILD, oauthToken: comboGetOAuthToken_() };
}
function comboQuickReopen(req) {
req = req || {};
try {
if (req.draft) CacheService.getUserCache().put(QUICK_DRAFT_KEY, String(req.draft).slice(0, 2000), 120);
SpreadsheetApp.getUi().showSidebar(createComboSidebarHtml());
return { ok: true };
} catch (e) {
return { ok: false, error: String(e && e.message || e) };
}
}
function quickOrderKey_(kind) {
if (kind === 'sheet') {
var id = '';
try { id = SpreadsheetApp.getActive().getId(); } catch (e) {}
return 'QUICK_ORDER_sheet_' + id;
}
return 'QUICK_ORDER_' + (kind === 'my' ? 'my' : 'shelf');
}
function quickGetOrders_() {
var props = PropertiesService.getUserProperties(), out = {};
['sheet', 'my', 'shelf'].forEach(function (k) {
try { out[k] = JSON.parse(props.getProperty(quickOrderKey_(k)) || '[]'); } catch (e) { out[k] = []; }
});
return out;
}
var QUICK_PINS_KEY = 'QUICK_PINS';
function quickGetPins_() {
try {
var raw = PropertiesService.getUserProperties().getProperty(QUICK_PINS_KEY);
var parsed = raw ? JSON.parse(raw) : {};
return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
} catch (e) { return {}; }
}
function comboQuickSavePins(req) {
req = req || {};
var raw = (req.pins && typeof req.pins === 'object' && !Array.isArray(req.pins)) ? req.pins : {};
var clean = {}, keys = Object.keys(raw).slice(0, 400);
for (var i = 0; i < keys.length; i++) {
if (raw[keys[i]]) clean[String(keys[i])] = 1;
}
try {
PropertiesService.getUserProperties().setProperty(QUICK_PINS_KEY, JSON.stringify(clean));
return { ok: true, pins: clean };
} catch (e) {
return { ok: false, error: String(e && e.message || e) };
}
}
function comboQuickSaveOrder(req) {
req = req || {};
var kind = req.kind === 'sheet' ? 'sheet' : (req.kind === 'my' ? 'my' : 'shelf');
var names = (req.names || []).map(String).slice(0, 400);
try {
PropertiesService.getUserProperties().setProperty(quickOrderKey_(kind), JSON.stringify(names));
return { ok: true };
} catch (e) {
return { ok: false, error: String(e && e.message || e) };
}
}
function quickTakeDraft_() {
try {
var c = CacheService.getUserCache(), d = c.get(QUICK_DRAFT_KEY);
if (d) c.remove(QUICK_DRAFT_KEY);
return d || '';
} catch (e) { return ''; }
}
var QUICK_LIB_FNS = ["ArgError", "Blocked", "a1_", "actDo_", "actUndo_", "activeDriveList_", "activeFiles_", "activeFolders_", "apiColor_", "apiDefaultSheet_", "apiDig_", "apiGrid_", "apiScan_", "apiSheetId_", "apiSheetNames_", "apiWalk_", "backupDoc_", "backupSheetsLite_", "backupSheets_", "batchRetry_", "bkBook_", "bkLap_", "bkTabName_", "byId_", "call_", "capList_", "captureSide_", "chg_", "clearBody_", "colIndexOf_", "colLetter_", "colNum_", "colRuns_", "colWidths_", "comboCacheGet_", "comboCacheInvalidate_", "comboCachePut_", "comboComputeTitleA1_", "comboDecodeCellVal_", "comboEncodeCellVal_", "comboFastUndoClear_", "comboFastUndoKey_", "comboFastUndoLoadRaw_", "comboFastUndoRestore_", "comboFastUndoSave_", "comboFind", "comboFormatDoText_", "comboFormatLookText_", "comboFormatOpsShort_", "comboGetConfig", "comboGetLearned", "comboGetOAuthToken_", "comboGetRawConfig_", "comboGetSelectionInfo_", "comboGotoRange", "comboInit", "comboKeepsShape_", "comboLearn", "comboLook", "comboMenuUndo", "comboOpenSs_", "comboParseScope_", "comboPing", "comboPollSelection", "comboQuickAddFn", "comboQuickAfter", "comboQuickBuild", "comboQuickClearFastUndo", "comboQuickGetFn", "comboQuickImport", "comboQuickList", "comboQuickMake", "comboQuickNewBook", "comboQuickReopen", "comboQuickRun", "comboQuickSaveFn", "comboQuickSaveOrder", "comboQuickSavePins", "comboQuickSaveSteps", "comboQuickSnap", "comboRenderUnfired_", "comboRunAsk", "comboRunOps", "comboSaveConfig", "comboSetTestTarget", "comboSheetInfos_", "comboTblCacheKey_", "comboUndo", "copyBody_", "countFolderChildren_", "createComboSidebarHtml", "dataRange_", "deleteRowRuns_", "digest_", "discardBackup_", "docBkIds_", "docBkSlotDoc_", "docStructure_", "errReport_", "errScanNeeded_", "errScan_", "extractDriveId_", "filterChanged_", "filterSpanOf_", "findTable_", "fingerDoc_", "fingerOnly_", "fingerSheet_", "folderLabel_", "getJson_", "gridA1_", "guardDelete_", "guardOverwrite_", "guardWide_", "headerNames_", "hexColor_", "hiddenRuns_", "isAncestorFolder_", "isBlank_", "isNoCol_", "isNoop_", "isNumberCol_", "json_", "lap_", "ledgerBrief_", "ledgerSave_", "ledger_", "liteTouch_", "loadSide_", "lookSide_", "matchRowCond_", "mimeLabel_", "msOut_", "needTable_", "need_", "normJson_", "note_", "numRuns_", "onOpen", "openTarget_", "packDim_", "packRects_", "packSide_", "parseDateText_", "pickSlot_", "props_", "pruneTabs_", "q_", "qs_", "quickDrive_", "quickDropBackup_", "quickFindFnSpan_", "quickFindHelperRefs_", "quickFnBodyMeta_", "quickFormatMyErr_", "quickGetOrders_", "quickGetPins_", "quickInsertTop_", "quickMyContent_", "quickMyFind_", "quickMyInvalidate_", "quickMyListCached_", "quickMySourceCached_", "quickMySource_", "quickMyStamp_", "quickMyUrl_", "quickOrderKey_", "quickParseFns_", "quickRestoreSheetCopy_", "quickSheetFnsHere_", "quickSkip_", "quickSplitSteps_", "quickTakeDraft_", "quickUndoNote_", "quickVisibleSheets_", "resetNew_", "resolveDriveItem_", "resolveFolder_", "restoreAll_", "restoreChartApp_", "restoreDoc_", "restoreFilter_", "restoreSheet_", "restoreSide_", "rgb_", "runDo_", "sameFinger_", "sameTable_", "saveSide_", "setJson_", "sheetCtx_", "sheetOf_", "shiftFormula_", "showConnectorJsonDialog", "showGasComboSidebar", "sideFields_", "sideItems_", "stripId_", "stripSide_", "summarizeOps_", "tableOfSheet_", "tableOut_", "tgt_", "tidyColSpec_", "tidyNumText_", "tidyRangeLegacy_", "tidyRange_", "titleRange_", "touchedSheets_", "touchesItem_", "validationLabel_", "wideRange_", "wideRowCount_", "wlen_", "wrapDriveObj_"];
function quickSkip_(k) {
return /_$/.test(k) || /^(combo|__gm|onOpen$|onEdit$|onInstall$|onSelectionChange$|onChange$|onFormSubmit$|doGet$|doPost$|showGasComboSidebar$|createComboSidebarHtml$)/.test(k);
}
function quickSplitSteps_(raw) {
var s = String(raw || '').trim();
if (!s) return [];
var tokens = [], idx = 0;
var protect = function (re) {
s = s.replace(re, function (m) {
var key = '\uE002' + (idx++) + '\uE003';
tokens.push(m);
return key;
});
};
protect(/\\\//g);
protect(/\\／/g);
protect(/https?:\/\/[^\s]+/g);
protect(/\d+(?:\/\d+)+/g);
var parts = (/／|\s+\/\s+/.test(s)) ? s.split(/\s*／\s*|\s+\/\s+/) : s.split(/\s*\/\s*/);
return parts.map(function (st) {
var restored = st.replace(/\uE002(\d+)\uE003/g, function (_, n) {
var t = tokens[parseInt(n, 10)] || '';
if (t === '\\/') return '/';
if (t === '\\／') return '／';
return t;
});
return restored.trim();
}).filter(Boolean);
}
function quickFnBodyMeta_(fn) {
var desc = '', words = [], steps = [], noBackup = false;
try {
var s = String(fn || '');
var idx = s.indexOf('{');
if (idx < 0) return { desc: '', words: [], steps: [], noBackup: false };
var lines = s.slice(idx + 1).split('\n');
for (var i = 0; i < lines.length; i++) {
var ln = lines[i].trim();
if (!ln) continue;
if (/^\/\/\s*控えなし(?:\s|$)/.test(ln)) {
noBackup = true;
continue;
}
var mw = ln.match(/^\/\/\s*棚\s*[:：]\s*(.+)$/);
if (mw) {
words = words.concat(mw[1].split(/[,、，]/).map(function (w) { return w.trim(); }).filter(String));
continue;
}
var ms = ln.match(/^\/\/\s*手順\s*[:：]\s*(.+)$/);
if (ms) {
steps = steps.concat(quickSplitSteps_(ms[1]));
continue;
}
var mc = ln.match(/^\/\/\s*(.+)$/);
if (mc) {
if (!desc) desc = mc[1].trim();
continue;
}
break;
}
} catch (e) {}
return { desc: desc, words: words, steps: steps, noBackup: noBackup };
}
function quickSheetFnsHere_() {
var skip = {}, g = globalThis, out = [];
(QUICK_LIB_FNS || []).forEach(function (n) { skip[n] = 1; });
Object.keys(g).forEach(function (k) {
if (typeof g[k] === 'function' && !skip[k] && !quickSkip_(k)) {
var meta = quickFnBodyMeta_(g[k]);
out.push({ name: k, desc: meta.desc, words: meta.words, steps: meta.steps, noBackup: !!meta.noBackup });
}
});
return out;
}
var QUICK_SCRIPT_JSON = 'application/vnd.google-apps.script+json';
var QUICK_MY_ID_KEY = 'QUICK_MY_ID';
function quickMyFind_(wantMeta) {
var props = PropertiesService.getUserProperties();
var known = props.getProperty(QUICK_MY_ID_KEY);
if (known) {
try {
var f = DriveApp.getFileById(known);
if (!f.isTrashed() && f.getName() === QUICK_MY_TITLE) {
return wantMeta ? { id: known, stamp: String(f.getLastUpdated().getTime()) } : known;
}
} catch (e) {}
props.deleteProperty(QUICK_MY_ID_KEY);
}
var q = DriveApp.searchFiles("title = '" + QUICK_MY_TITLE + "' and mimeType = 'application/vnd.google-apps.script' and trashed = false");
if (q.hasNext()) {
var nf = q.next();
var id = nf.getId();
props.setProperty(QUICK_MY_ID_KEY, id);
return wantMeta ? { id: id, stamp: String(nf.getLastUpdated().getTime()) } : id;
}
return wantMeta ? { id: '', stamp: '' } : '';
}
function quickMyStamp_(id) {
try { return String(DriveApp.getFileById(id).getLastUpdated().getTime()); } catch (e) { return ''; }
}
function quickMyInvalidate_(id) {
if (!id) return;
try {
var cache = CacheService.getUserCache();
cache.remove('QUICK_MY_LIST_' + id);
cache.remove('QUICK_MY_SRC_' + id);
} catch (e) {}
}
function quickMySourceCached_(id, optStamp, fastMode) {
var cache = CacheService.getUserCache(), key = 'QUICK_MY_SRC_' + id;
var raw = cache.get(key);
var readCached = function (c) {
if (!c) return null;
if (c.__gz) {
return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(c.__gz), 'application/x-gzip')).getDataAsString('utf-8');
}
return typeof c.src === 'string' ? c.src : null;
};
if (fastMode && raw) {
try {
var cf = JSON.parse(raw);
if (cf && cf.cachedAt && (Date.now() - cf.cachedAt < 60000) && (!optStamp || cf.stamp === optStamp)) {
var fastSrc = readCached(cf);
if (fastSrc !== null) return fastSrc;
}
} catch (eF) {}
}
var stamp = optStamp !== undefined ? optStamp : quickMyStamp_(id);
if (raw && stamp) {
try {
var c = JSON.parse(raw);
if (c && c.stamp === stamp) {
var hitSrc = readCached(c);
if (hitSrc !== null) return hitSrc;
}
} catch (e2) {}
}
var src = quickMySource_(quickMyContent_(id));
if (stamp) {
try {
var nowTs = Date.now();
var payload = JSON.stringify({ stamp: stamp, cachedAt: nowTs, src: src });
if (payload.length > 50000) {
var gz = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(src, 'text/plain')).getBytes());
payload = JSON.stringify({ stamp: stamp, cachedAt: nowTs, __gz: gz });
}
if (payload.length < 95000) cache.put(key, payload, 21600);
} catch (e3) {}
}
return src;
}
function quickMyListCached_(id, optStamp) {
var cache = CacheService.getUserCache(), key = 'QUICK_MY_LIST_' + id;
var stamp = optStamp !== undefined ? optStamp : quickMyStamp_(id);
var raw = cache.get(key);
if (raw && stamp) {
try {
var c = JSON.parse(raw);
if (c.stamp === stamp && c.v === 3) return c.list;
} catch (e2) {}
}
var list = quickParseFns_(quickMySourceCached_(id, stamp));
if (stamp) { try { cache.put(key, JSON.stringify({ v: 3, stamp: stamp, list: list }), 21600); } catch (e3) {} }
return list;
}
function quickMyUrl_(id) {
return 'https://script.google.com/d/' + id + '/edit';
}
function quickDrive_(method, url, payload, ctype) {
var o = { method: method, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
if (payload !== undefined) { o.payload = payload; o.contentType = ctype; }
var r = UrlFetchApp.fetch(url, o);
var code = r.getResponseCode();
if (code !== 200) {
var msg = r.getContentText().slice(0, 300);
if (/drive\.scripts/.test(msg)) msg = 'マイマクロに書き込む許可がありません。メニューの「⚡ GASクイック」から操作窓を開き直して、許可を押してください';
throw new Error(msg);
}
return r.getContentText();
}
function quickMyContent_(id) {
return JSON.parse(quickDrive_('get', 'https://www.googleapis.com/drive/v3/files/' + id + '/export?mimeType=' + encodeURIComponent(QUICK_SCRIPT_JSON)));
}
function quickMySource_(content) {
return (content.files || []).filter(function (f) { return f.type === 'server_js'; }).map(function (f) { return f.source; }).join('\n');
}
function quickInsertTop_(source, block) {
var lines = String(source || '').split('\n'), i = 0;
while (i < lines.length && /^\s*\/\//.test(lines[i])) i++;
while (i < lines.length && lines[i].trim() === '') i++;
var head = lines.slice(0, i).join('\n').replace(/\s*$/, '');
var rest = lines.slice(i).join('\n').replace(/^\s*/, '');
return (head ? head + '\n\n' : '') + String(block).replace(/\s*$/, '') + '\n' + (rest ? '\n' + rest : '');
}
function quickParseFns_(src) {
var lines = String(src || '').split('\n'), out = [], words = [], desc = '', steps = [], noBackup = false;
var inBlock = false;
for (var i = 0; i < lines.length; i++) {
var rawLine = lines[i];
var ln = rawLine.trim();
if (inBlock) {
var endIdx = ln.indexOf('*/');
if (endIdx < 0) continue;
ln = ln.slice(endIdx + 2).trim();
inBlock = false;
if (!ln) continue;
}
while (/^\/\*/.test(ln)) {
var closeIdx = ln.indexOf('*/', 2);
if (closeIdx < 0) { inBlock = true; ln = ''; break; }
ln = ln.slice(closeIdx + 2).trim();
}
if (inBlock) continue;
if (!ln) { words = []; desc = ''; steps = []; noBackup = false; continue; }
if (/^\/\/\s*控えなし(?:\s|$)/.test(ln)) { noBackup = true; continue; }
var mw = ln.match(/^\/\/\s*棚\s*[:：]\s*(.+)$/);
if (mw) { words = words.concat(mw[1].split(/[,、，]/).map(function (s) { return s.trim(); }).filter(String)); continue; }
var ms = ln.match(/^\/\/\s*手順\s*[:：]\s*(.+)$/);
if (ms) { steps = steps.concat(quickSplitSteps_(ms[1])); continue; }
var top = !/^\s/.test(rawLine);
var mf = top && (ln.match(/^(?:async\s+)?function\s+([^\s(]+)\s*\(/) ||
ln.match(/^(?:const|let|var)\s+([^\s=]+)\s*=\s*(?:async\s+)?(?:function\s*\(|\([^)]*\)\s*=>|[\w$]+\s*=>)/));
if (mf) {
if (!/_$/.test(mf[1])) out.push({ name: mf[1], words: words, desc: desc, steps: steps, noBackup: noBackup });
words = []; desc = ''; steps = []; noBackup = false;
continue;
}
var mc = ln.match(/^\/\/\s*(.+)$/);
if (mc) { if (!desc) desc = mc[1].trim(); continue; }
words = []; desc = ''; steps = []; noBackup = false;
}
return out;
}
function comboQuickList(req, sheetFns) {
var t0 = Date.now();
req = req || {};
if (!sheetFns) sheetFns = quickSheetFnsHere_();
var res = { ok: true, sheet: (sheetFns || []).map(function (f) {
if (f.head && (!f.desc || !Array.isArray(f.steps) || f.noBackup === undefined)) {
var hm = quickFnBodyMeta_(f.head);
if (!f.desc) f.desc = hm.desc;
if (!Array.isArray(f.words) || !f.words.length) f.words = hm.words;
if (!Array.isArray(f.steps) || !f.steps.length) f.steps = hm.steps;
if (hm.noBackup) f.noBackup = true;
}
return { name: f.name, desc: f.desc || '', words: Array.isArray(f.words) ? f.words : [], steps: Array.isArray(f.steps) ? f.steps : [], noBackup: !!f.noBackup };
}), my: [], myId: '', myUrl: '', myStamp: '',
oauthToken: req._skipToken ? '' : comboGetOAuthToken_(), build: QUICK_BUILD, draft: quickTakeDraft_(),
order: quickGetOrders_(), pins: quickGetPins_() };
try {
var meta = quickMyFind_(true);
if (meta && meta.id) {
if (req.force) quickMyInvalidate_(meta.id);
res.myId = meta.id; res.myUrl = quickMyUrl_(meta.id); res.myStamp = meta.stamp || '';
res.my = quickMyListCached_(meta.id, meta.stamp || undefined);
}
} catch (e) {
res.myError = String(e && e.message || e);
}
res.gasMs = Date.now() - t0;
return res;
}
var QUICK_BK_NAME = '_GASクイックの控え';
function quickDropBackup_(ss) {
try {
var old = ss.getSheetByName(QUICK_BK_NAME);
if (old) ss.deleteSheet(old);
} catch (e) {}
}
function comboQuickSnap(what) {
try {
var ss = SpreadsheetApp.getActive();
var sh = ss.getActiveSheet();
if (sh.getName() === QUICK_BK_NAME) return false;
var ssId = ss.getId();
quickDropBackup_(ss);
var bk = sh.copyTo(ss);
bk.setName(QUICK_BK_NAME);
bk.hideSheet();
var snap = { kind: 'sheetcopy', ssId: ssId, sheetName: sh.getName(), bk: QUICK_BK_NAME,
a1: 'シート全体', what: String(what || 'マクロ'), ts: Date.now(),
frozenR: sh.getFrozenRows(), frozenC: sh.getFrozenColumns() };
CacheService.getUserCache().put(comboFastUndoKey_(ssId), JSON.stringify(snap), COMBO_TBL_CACHE_TTL);
return true;
} catch (e) {
try { comboFastUndoClear_(SpreadsheetApp.getActive().getId()); } catch (e2) {}
return false;
}
}
function quickRestoreSheetCopy_(ss, snap) {
var t0 = Date.now();
var ssId = ss.getId();
var sh = ss.getSheetByName(snap.sheetName);
var bk = ss.getSheetByName(snap.bk || QUICK_BK_NAME);
if (!sh) return { ok: false, error: 'シート「' + snap.sheetName + '」が見つかりません' };
if (!bk) {
comboFastUndoClear_(ssId);
return { ok: false, error: '控えのシートが見つかりません（消されたか、次のマクロで入れ替わりました）' };
}
var maxR = bk.getMaxRows(), maxC = bk.getMaxColumns();
var isHuge = (maxR * maxC > 50000);
var nr = isHuge ? Math.min(maxR, Math.max(bk.getLastRow() + 20, sh.getLastRow() + 20, 50)) : maxR;
var nc = isHuge ? Math.min(maxC, Math.max(bk.getLastColumn() + 5, sh.getLastColumn() + 5, 26)) : maxC;
if (sh.getMaxRows() < nr) sh.insertRowsAfter(sh.getMaxRows(), nr - sh.getMaxRows());
if (sh.getMaxColumns() < nc) sh.insertColumnsAfter(sh.getMaxColumns(), nc - sh.getMaxColumns());
var clrR = isHuge ? Math.min(sh.getMaxRows(), Math.max(sh.getLastRow() + 20, nr)) : sh.getMaxRows();
var clrC = isHuge ? Math.min(sh.getMaxColumns(), Math.max(sh.getLastColumn() + 5, nc)) : sh.getMaxColumns();
var all = sh.getRange(1, 1, clrR, clrC);
all.breakApart();
all.clear();
all.clearDataValidations();
try { sh.getBandings().forEach(function (b) { b.remove(); }); } catch (eB) {}
try { var flt = sh.getFilter(); if (flt) flt.remove(); } catch (eF) {}
var src = bk.getRange(1, 1, nr, nc);
src.copyTo(sh.getRange(1, 1, nr, nc));
src.copyTo(sh.getRange(1, 1, nr, nc), SpreadsheetApp.CopyPasteType.PASTE_COLUMN_WIDTHS, false);
if (!isHuge) {
if (sh.getMaxRows() > nr) sh.deleteRows(nr + 1, sh.getMaxRows() - nr);
if (sh.getMaxColumns() > nc) sh.deleteColumns(nc + 1, sh.getMaxColumns() - nc);
}
if (snap.frozenR !== undefined && sh.getFrozenRows() !== snap.frozenR) sh.setFrozenRows(snap.frozenR);
if (snap.frozenC !== undefined && sh.getFrozenColumns() !== snap.frozenC) sh.setFrozenColumns(snap.frozenC);
ss.deleteSheet(bk);
comboFastUndoClear_(ssId);
comboCacheInvalidate_(ssId, sh.getName());
var target = { id: ssId, name: ss.getName(), kind: 'sheet', url: 'https://docs.google.com/spreadsheets/d/' + ssId + '/edit', sheet: sh.getName() };
return { ok: true, fast: true, undone: 'fast', what: snap.what, target: target,
text: '対象: ' + target.name + ' › ' + target.sheet + '\n戻した: シート全体（' + snap.what + ' の前）に戻しました',
gasMs: Date.now() - t0 };
}
function quickUndoNote_(snapped, backupOn, noBackup) {
if (noBackup) return '（控えなし指定）';
if (backupOn === false) return '（控えなし・取り消し不可・Ctrl+Z 推奨）';
return snapped ? '' : '（控えを取れませんでした。取り消しは Ctrl+Z で）';
}
function quickFormatMyErr_(name, err, isCompile) {
var msg = String(err && err.message || err);
if (isCompile) {
return 'マイマクロの構文エラーで実行できません: ' + msg + '（「編集」で赤い波線の箇所を確認してください）';
}
var lineHint = '';
try {
var st = String(err && err.stack || '');
var m = st.match(/<anonymous>:(\d+)(?::\d+)?/);
if (m) {
var ln = parseInt(m[1], 10);
if (ln > 2) lineHint = '（マイマクロ ' + (ln - 2) + ' 行目付近）';
}
} catch (e) {}
return name + ' でエラー' + lineHint + ': ' + msg;
}
function comboQuickAfter() {
try {
var ss = SpreadsheetApp.getActive();
comboCacheInvalidate_(ss.getId(), ss.getActiveSheet().getName());
} catch (e) {}
}
function comboQuickRun(req) {
var t0 = Date.now();
req = req || {};
var name = String(req.name || '');
var backupOn = req.backup === undefined ? true : !!req.backup;
if (req.src === 'sheet') {
var f = globalThis[name];
if (typeof f !== 'function' || quickSkip_(name) || (QUICK_LIB_FNS || []).indexOf(name) >= 0) {
return { ok: false, error: 'このシートに「' + name + '」がありません（一覧を更新してください）' };
}
var noBkS = !!(quickFnBodyMeta_(f).noBackup);
try {
var ssS = null;
try { ssS = SpreadsheetApp.getActive(); } catch (eActS) {}
var snappedS = false;
if (backupOn && !noBkS) {
snappedS = comboQuickSnap(name);
} else {
if (ssS) { comboFastUndoClear_(ssS.getId(), ssS); }
else { comboQuickClearFastUndo(); }
}
var rs = f();
comboQuickAfter();
return { ok: true, snapped: snappedS, text: name + ' を実行しました' + (rs !== undefined && rs !== null && rs !== '' && typeof rs.then !== 'function' ? '（' + String(rs).slice(0, 200) + '）' : '') + quickUndoNote_(snappedS, backupOn, noBkS), gasMs: Date.now() - t0 };
} catch (eS) {
return { ok: false, error: name + ' でエラー: ' + String(eS && eS.message || eS), gasMs: Date.now() - t0 };
}
}
try {
var reqId = String(req.myId || '').trim();
var meta = reqId ? { id: reqId, stamp: quickMyStamp_(reqId) } : quickMyFind_(true);
if (!meta || !meta.id || !meta.stamp) {
meta = quickMyFind_(true);
}
if (!meta || !meta.id) return { ok: false, error: 'マイマクロがまだありません。一覧の「マイマクロを作る」を押してください' };
var id = meta.id;
var src = quickMySourceCached_(id, meta.stamp);
var parsed = quickParseFns_(src);
var hit = parsed.filter(function (f) { return f.name === name; })[0];
if (!hit) return { ok: false, error: 'マイマクロに「' + name + '」が見つかりません（一覧を更新してください）' };
var mod;
try {
mod = new Function(src + '\nreturn {' + JSON.stringify(name) + ': ' + name + '};')();
} catch (eComp) {
return { ok: false, error: quickFormatMyErr_(name, eComp, true), gasMs: Date.now() - t0 };
}
var noBkM = !!hit.noBackup;
var ssM = null;
try { ssM = SpreadsheetApp.getActive(); } catch (eActM) {}
var snapped = false;
if (backupOn && !noBkM) {
snapped = comboQuickSnap(name);
} else {
if (ssM) { comboFastUndoClear_(ssM.getId(), ssM); }
else { comboQuickClearFastUndo(); }
}
var r = mod[name]();
comboQuickAfter();
return { ok: true, snapped: snapped, myStamp: meta.stamp, text: name + ' を実行しました' + (r !== undefined && r !== null && r !== '' && typeof r.then !== 'function' ? '（' + String(r).slice(0, 200) + '）' : '') + quickUndoNote_(snapped, backupOn, noBkM), gasMs: Date.now() - t0 };
} catch (e) {
return { ok: false, error: quickFormatMyErr_(name, e, false), gasMs: Date.now() - t0 };
}
}
function comboQuickMake(req) {
try {
var id = quickMyFind_();
if (id) return { ok: true, myId: id, myUrl: quickMyUrl_(id), created: false, text: 'マイマクロはもうあります' };
var guide = [
'// GASクイック マイマクロ',
'// ここに置いた関数は、どのシートでも GASクイックの一覧に並び、選んで実行できます。',
'// 作り方: function 名前() { ... } を書く。すぐ上に「// 棚: 言い方, 言い方」と書くと、頼みの欄の言葉でも当たります。',
'// 棚の言葉を「// 手順: 見出しを黄色に / 太字にして」と書くと、GAS を動かさず 0.5 秒でまとめて撃てます。',
'// 今のシートは SpreadsheetApp.getActive() で取れます。名前の末尾が _ の関数は部品として一覧に出しません。',
'// エディタの Gemini に頼むときは「GASクイックのマイマクロとして、〜する関数を作って」と言えば、この決まりで書いてくれます。',
'// 新しいマクロは、この手引きのすぐ下（先頭）に足します。一覧でも、新しい物は一番上に出ます。',
'',
'// 選んでいる範囲を太字にする（もう一度押すと太字を外す）',
'// 棚: 太字にする, 選んだ所を太字, 太字を外す',
'function 選んだ所を太字() {',
'  var list = SpreadsheetApp.getActive().getActiveRangeList();',
'  var first = list.getRanges()[0];',
"  var isBold = first && first.getFontWeight() === 'bold';",
"  list.setFontWeight(isBold ? 'normal' : 'bold');",
'}',
''
].join('\n');
var content = { files: [
{ name: 'appsscript', type: 'json', source: JSON.stringify({ timeZone: 'Asia/Tokyo', runtimeVersion: 'V8', exceptionLogging: 'STACKDRIVER' }) },
{ name: 'マイマクロ', type: 'server_js', source: guide }
] };
var b = 'gasquick' + Date.now();
var body = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
JSON.stringify({ name: QUICK_MY_TITLE, mimeType: 'application/vnd.google-apps.script' }) +
'\r\n--' + b + '\r\nContent-Type: ' + QUICK_SCRIPT_JSON + '\r\n\r\n' + JSON.stringify(content) + '\r\n--' + b + '--';
var made = JSON.parse(quickDrive_('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', body, 'multipart/related; boundary=' + b));
try { PropertiesService.getUserProperties().setProperty(QUICK_MY_ID_KEY, made.id); } catch (eP) {}
return { ok: true, myId: made.id, myUrl: quickMyUrl_(made.id), created: true, text: 'マイマクロを作りました' };
} catch (e) {
return { ok: false, error: 'マイマクロを作れませんでした: ' + String(e && e.message || e) };
}
}
function quickFindHelperRefs_(src, selfName, existingAll) {
var cleaned = String(src || '')
.replace(/\/\*[\s\S]*?\*\//g, '')
.replace(/\/\/[^\n]*/g, '');
var defined = {};
if (selfName) defined[selfName] = 1;
var markDefined = function (code) {
var s = String(code || '');
var reDef = /(?:^|[\n;{}])\s*(?:async\s+)?function\s+([^\s(]+)\s*\(|(?:^|[\n;{}])\s*(?:var|let|const)\s+([^\s=]+)\s*=/g;
var m;
while ((m = reDef.exec(s)) !== null) {
var nm = m[1] || m[2];
if (nm) defined[nm] = 1;
}
};
markDefined(cleaned);
markDefined(existingAll);
var reCall = /(^|[^\w$.\u3040-\u30ff\u4e00-\u9faf])([A-Za-z$\u3040-\u30ff\u4e00-\u9faf][\w$\u3040-\u30ff\u4e00-\u9faf]*_)\s*\(/g;
var seen = {}, out = [], mc;
while ((mc = reCall.exec(cleaned)) !== null) {
var fnName = mc[2];
if (!defined[fnName] && !seen[fnName]) {
seen[fnName] = 1;
out.push(fnName);
}
}
return out;
}
function comboQuickImport(req, src) {
req = req || {};
var name = String(req.name || '');
try {
if (!src) {
var fi = globalThis[name];
if (typeof fi === 'function' && (QUICK_LIB_FNS || []).indexOf(name) < 0) src = String(fi);
}
if (!src) return { ok: false, error: 'シートのマクロ「' + name + '」の中身が取れませんでした' };
var made = comboQuickMake({});
if (!made.ok) return made;
var content = quickMyContent_(made.myId);
var all = quickMySource_(content);
if (quickParseFns_(all).some(function (f) { return f.name === name; })) {
return { ok: false, error: 'マイマクロに同じ名前「' + name + '」があります（どちらかの名前を変えてください）' };
}
var file = (content.files || []).filter(function (f) { return f.type === 'server_js'; })[0];
if (!file) return { ok: false, error: 'マイマクロのコードファイルが見つかりません' };
var sheetName = '';
try { sheetName = SpreadsheetApp.getActive().getName(); } catch (e2) {}
file.source = quickInsertTop_(file.source, '// ' + sheetName + ' から取り込み（' +
Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd') + '）\n' + String(src).replace(/\s*$/, ''));
quickDrive_('patch', 'https://www.googleapis.com/upload/drive/v3/files/' + made.myId + '?uploadType=media', JSON.stringify(content), QUICK_SCRIPT_JSON);
quickMyInvalidate_(made.myId);
var deps = quickFindHelperRefs_(src, name, all);
var note = deps.length
? '（注意: 部品 ' + deps.slice(0, 5).join('・') + (deps.length > 5 ? ' ほか ' + (deps.length - 5) + ' 件' : '') + ' を呼んでいます。必要なら一緒にマイマクロへ写してください）'
: '（どのシートでも使えます）';
return { ok: true, myId: made.myId, myUrl: made.myUrl, text: name + ' をマイマクロに入れました' + note };
} catch (e) {
return { ok: false, error: name + ' を写せませんでした: ' + String(e && e.message || e) };
}
}
var QUICK_JS_RESERVED_ = {
'break': 1, 'case': 1, 'catch': 1, 'class': 1, 'const': 1, 'continue': 1, 'debugger': 1,
'default': 1, 'delete': 1, 'do': 1, 'else': 1, 'enum': 1, 'export': 1, 'extends': 1,
'false': 1, 'finally': 1, 'for': 1, 'function': 1, 'if': 1, 'import': 1, 'in': 1,
'instanceof': 1, 'let': 1, 'new': 1, 'null': 1, 'return': 1, 'static': 1, 'super': 1,
'switch': 1, 'this': 1, 'throw': 1, 'true': 1, 'try': 1, 'typeof': 1, 'var': 1,
'void': 1, 'while': 1, 'with': 1, 'yield': 1, 'await': 1, 'eval': 1, 'arguments': 1
};
function comboQuickSaveSteps(req) {
req = req || {};
try {
var rawName = String(req.name || '').trim();
var safeName = rawName.replace(/[\s　.,:;!?()\[\]{}'"`/\\+\-*=<>|&^%$#@~]+/g, '_').replace(/^_+|_+$/g, '');
if (!safeName) return { ok: false, error: 'マクロ名を入力してください' };
if (/^\d/.test(safeName) || QUICK_JS_RESERVED_[safeName]) safeName = '手順_' + safeName;
if (/_$/.test(safeName)) safeName = safeName.replace(/_+$/, '') + '実行';
var steps = Array.isArray(req.steps)
? req.steps.map(function (s) { return String(s || '').trim().replace(/\r?\n/g, ' '); }).filter(String)
: quickSplitSteps_(String(req.steps || '').replace(/\r?\n/g, ' ／ '));
if (!steps.length) return { ok: false, error: '手順が空です' };
var desc = (String(req.desc || '').trim() || ('手順マクロ（' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd') + ' 登録）')).replace(/\r?\n/g, ' ');
var stepLines = steps.map(function (st) {
return '// 手順: ' + String(st).replace(/\//g, '\\/').replace(/／/g, '\\／');
});
var block = ['// ' + desc].concat(stepLines, [
'function ' + safeName + '() {',
'  // GASクイックの一覧から実行すると、上の手順を直結APIで高速実行します',
'}'
]).join('\n');
try {
new Function(block);
} catch (eSyn) {
return { ok: false, error: 'マクロ名または構文が不正です: ' + String(eSyn && eSyn.message || eSyn) };
}
var made = comboQuickMake({});
if (!made.ok) return made;
var content = quickMyContent_(made.myId);
var all = quickMySource_(content);
if (quickParseFns_(all).some(function (f) { return f.name === safeName; })) {
return { ok: false, error: 'マイマクロに同じ名前「' + safeName + '」があります（別の名前にしてください）' };
}
var file = (content.files || []).filter(function (f) { return f.type === 'server_js'; })[0];
if (!file) return { ok: false, error: 'マイマクロのコードファイルが見つかりません' };
file.source = quickInsertTop_(file.source, block);
quickDrive_('patch', 'https://www.googleapis.com/upload/drive/v3/files/' + made.myId + '?uploadType=media', JSON.stringify(content), QUICK_SCRIPT_JSON);
quickMyInvalidate_(made.myId);
return { ok: true, name: safeName, myId: made.myId, myUrl: made.myUrl, text: '⚡ 手順マクロ「' + safeName + '」をマイマクロに保存しました' };
} catch (e) {
return { ok: false, error: '手順マクロを保存できませんでした: ' + String(e && e.message || e) };
}
}
function comboQuickNewBook(req) {
req = req || {};
try {
var name = String(req.name || '').trim() || ('GASクイック 新規シート ' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd_HHmm'));
var src = SpreadsheetApp.getActive();
if (!src) return { ok: false, error: '元のスプレッドシートが見つかりません' };
var srcFile = DriveApp.getFileById(src.getId());
var parents = srcFile.getParents();
var copyFile = parents.hasNext() ? srcFile.makeCopy(name, parents.next()) : srcFile.makeCopy(name);
var newSs = SpreadsheetApp.openById(copyFile.getId());
var tmpName = '_tmp_init_' + Date.now();
var fresh = newSs.insertSheet(tmpName);
var sheets = newSs.getSheets();
for (var i = 0; i < sheets.length; i++) {
if (sheets[i].getSheetId() !== fresh.getSheetId()) {
newSs.deleteSheet(sheets[i]);
}
}
fresh.setName('シート1');
return { ok: true, id: newSs.getId(), url: newSs.getUrl(), name: name, text: '「' + name + '」を作成しました' };
} catch (e) {
return { ok: false, error: '新規ファイルを作成できませんでした: ' + String(e && e.message || e) };
}
}
function quickFindFnSpan_(src, name) {
src = String(src || '');
var esc = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
if (!esc) return null;
var re = new RegExp('^(?:async\\s+)?function\\s+' + esc + '\\s*\\(|^(?:const|let|var)\\s+' + esc + '\\s*=\\s*(?:async\\s+)?(?:function\\s*\\(|\\([^)]*\\)\\s*=>|[\\w$]+\\s*=>)', 'm');
var m = re.exec(src);
if (!m) return null;
var defStart = m.index;
var start = defStart;
while (start > 0) {
var prevNl = src.lastIndexOf('\n', start - 2);
var lineStart = prevNl < 0 ? 0 : prevNl + 1;
var prevLine = src.slice(lineStart, start - 1);
if (/^\s*\/\//.test(prevLine)) {
start = lineStart;
} else {
break;
}
}
var i = defStart, n = src.length, depth = 0, opened = false;
var inStr = '', inLineCom = false, inBlkCom = false;
for (; i < n; i++) {
var ch = src[i], nx = i + 1 < n ? src[i + 1] : '';
if (inLineCom) { if (ch === '\n') inLineCom = false; continue; }
if (inBlkCom) { if (ch === '*' && nx === '/') { inBlkCom = false; i++; } continue; }
if (inStr) {
if (ch === '\\') { i++; continue; }
if (ch === inStr) inStr = '';
continue;
}
if (ch === '/' && nx === '/') { inLineCom = true; i++; continue; }
if (ch === '/' && nx === '*') { inBlkCom = true; i++; continue; }
if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
if (ch === '{') { depth++; opened = true; }
else if (ch === '}') {
depth--;
if (opened && depth === 0) {
var end = i + 1;
if (src[end] === ';') end++;
return { start: start, end: end };
}
}
}
return null;
}
function comboQuickGetFn(req) {
req = req || {};
var name = String(req.name || '').trim();
if (!name) return { ok: false, error: '関数名が指定されていません' };
try {
var id = quickMyFind_();
if (!id) return { ok: false, error: 'マイマクロが見つかりません' };
var content = quickMyContent_(id);
var files = (content.files || []).filter(function (f) { return f.type === 'server_js'; });
for (var i = 0; i < files.length; i++) {
var sp = quickFindFnSpan_(files[i].source, name);
if (sp) {
return { ok: true, name: name, fileName: files[i].name, code: files[i].source.slice(sp.start, sp.end), myUrl: quickMyUrl_(id) };
}
}
return { ok: false, error: 'マイマクロ内に「' + name + '」が見つかりませんでした' };
} catch (e) {
return { ok: false, error: 'コードを読めませんでした: ' + String(e && e.message || e) };
}
}
function comboQuickSaveFn(req) {
req = req || {};
var name = String(req.name || '').trim();
var code = String(req.code || '').replace(/\r\n/g, '\n').replace(/\s*$/, '');
if (!name) return { ok: false, error: '関数名が指定されていません' };
if (!code) return { ok: false, error: 'コードが空です' };
try {
new Function(code);
} catch (eSyn) {
return { ok: false, error: '構文エラーがあります: ' + String(eSyn && eSyn.message || eSyn) };
}
try {
var id = quickMyFind_();
if (!id) return { ok: false, error: 'マイマクロが見つかりません' };
var content = quickMyContent_(id);
var files = (content.files || []).filter(function (f) { return f.type === 'server_js'; });
for (var i = 0; i < files.length; i++) {
var sp = quickFindFnSpan_(files[i].source, name);
if (sp) {
files[i].source = files[i].source.slice(0, sp.start) + code + files[i].source.slice(sp.end);
quickDrive_('patch', 'https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', JSON.stringify(content), QUICK_SCRIPT_JSON);
quickMyInvalidate_(id);
return { ok: true, name: name, text: '「' + name + '」を保存しました' };
}
}
return { ok: false, error: 'マイマクロ内に「' + name + '」が見つかりませんでした' };
} catch (e) {
return { ok: false, error: '保存できませんでした: ' + String(e && e.message || e) };
}
}
function comboQuickAddFn(req) {
req = req || {};
var code = String(req.code || '').replace(/\r\n/g, '\n').replace(/^\s*\n+/, '').replace(/\s*$/, '');
if (!code) return { ok: false, error: 'コードが空です' };
try {
new Function(code);
} catch (eSyn) {
return { ok: false, error: '構文エラーがあります: ' + String(eSyn && eSyn.message || eSyn) };
}
var parsed = quickParseFns_(code);
if (!parsed.length) {
return { ok: false, error: '関数定義（function 名前() { ... }）が見つかりません' };
}
try {
var made = comboQuickMake({});
if (!made.ok) return made;
var content = quickMyContent_(made.myId);
var all = quickMySource_(content);
var existing = {};
quickParseFns_(all).forEach(function (f) { existing[f.name] = true; });
var dup = parsed.filter(function (f) { return existing[f.name]; }).map(function (f) { return f.name; });
if (dup.length) {
return { ok: false, error: '同じ名前「' + dup.join('・') + '」がすでにあります（編集から直すか別の名前にしてください）' };
}
var file = (content.files || []).filter(function (f) { return f.type === 'server_js'; })[0];
if (!file) return { ok: false, error: 'マイマクロのコードファイルが見つかりません' };
file.source = quickInsertTop_(file.source, code);
quickDrive_('patch', 'https://www.googleapis.com/upload/drive/v3/files/' + made.myId + '?uploadType=media', JSON.stringify(content), QUICK_SCRIPT_JSON);
quickMyInvalidate_(made.myId);
var names = parsed.map(function (f) { return f.name; });
return { ok: true, names: names, myId: made.myId, myUrl: made.myUrl, text: '「' + names.join('・') + '」をマイマクロに追加しました' };
} catch (e) {
return { ok: false, error: '追加できませんでした: ' + String(e && e.message || e) };
}
}