/**
 * GASクイック 大元（サーバー側の実行・操作窓・マクロの一覧）。AI は使わない
 *
 * コンテナバインドスクリプト（サイドバー）およびヘッドレス API（run_function）の両方から
 * 0.2〜0.5秒台の高速実行・即座の選択範囲取得・高速アンドゥ・AI連携（API直結 / 郵便受け）を提供する。
 * Engine（workspace_engine.gs + Catalog + ApiTypes + ws_shelves/*.gs）および
 * ComboPlanner（combo_planner_template.js）と同居して動作する。
 */

// ビルド時（gas_ws_combo.py）に target_ss_id が指定されると埋め込まれる既定ターゲットID
var DEFAULT_TARGET_SS_ID = '';
// 軽量モード（サーバー側 ComboPlanner 除外時）に注入される最小棚サマリー
var COMBO_MINI_SHELVES = null;

// プロパティ・キャッシュキー定数
var COMBO_PROP_TARGET = 'COMBO_TARGET_SS_ID';
var COMBO_PROP_CONFIG = 'COMBO_CONFIG';
var COMBO_PROP_FAST_UNDO = 'COMBO_FAST_UNDO';
var COMBO_TBL_CACHE_PREFIX = 'COMBO_TBL_';
var COMBO_TBL_CACHE_TTL = 21600; // 6時間

// ---------------------------------------------------------------- メニュー・サイドバー入口

/**
 * スプレッドシートを開いたときにカスタムメニューを追加する。
 * @param {Object} e イベントオブジェクト
 */
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
    // トリガー外（APIテスト等）でのエラーは無視する
  }
}

/**
 * サイドバー用の HtmlOutput を生成して返す（ライブラリ呼び出し用）。
 */
function createComboSidebarHtml() {
  return HtmlService.createHtmlOutputFromFile('ComboSidebar')
    .setTitle('GASクイック')
    .setWidth(300);
}

/**
 * GASクイックの操作窓（幅300px）を開く。
 */
function showGasComboSidebar() {
  SpreadsheetApp.getUi().showSidebar(createComboSidebarHtml());
}

/**
 * 大元シートのメニューから、自分の大元 ID が埋まったつなぎ用 appsscript.json のコピー窓を表示する。
 */
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

/**
 * メニューから直前の操作を取り消す。
 */
function comboMenuUndo() {
  var res = comboUndo({ ok: false });
  try {
    var ss = comboOpenSs_({});
    ss.toast(res.ok ? ('取り消しました: ' + (res.what || '')) : (res.error || '取り消せませんでした'), 'GASクイック', 4);
  } catch (err) {}
  return res;
}

// ---------------------------------------------------------------- 対象スプレッドシート・選択範囲

/**
 * ヘッドレス API テスト用にターゲットスプレッドシート ID を ScriptProperties へ保存する。
 * @param {string} ssId スプレッドシート ID
 */
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

/**
 * コンテナバインドでは getActiveSpreadsheet() を 0ms で使い、
 * ヘッドレス実行時は req.targetId / COMBO_TARGET_SS_ID / DEFAULT_TARGET_SS_ID で開く。
 * @param {Object} req リクエスト
 * @return {Spreadsheet}
 */
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

/**
 * 現在のシート名と選択セル範囲（A1表記）を取得する。
 * @param {Spreadsheet} ss
 * @param {Object} req
 * @return {{sheet: string, selection: string}}
 */
function comboGetSelectionInfo_(ss, req, skipLookup) {
  req = req || {};
  var reqSheet = String(req.sheet || (req.target && req.target.sheet) || '').trim();
  // sheet が指定済みで selection 指定済み、または選択範囲不要な ops 実行時は API 呼び出しを省略する
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

// ---------------------------------------------------------------- 表メタデータキャッシュ

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
      // 巨大シートでも先頭行を残して titleRange_ が 0ms でタイトルを特定できるようにする
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

// ---------------------------------------------------------------- 初期化・選択監視・Look

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

/**
 * サイドバー起動時・リロード時の初期情報を一括取得する（includeQuick=true で一覧情報も 1 往復に同梱）。
 * @param {Object} req
 * @param {Array} sheetFns
 */
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

/**
 * サイドバーからの軽量ポーリング：現在のシート・選択範囲を返す。シート切替時は表情報も 1 往復で返す。
 * @param {Object} req
 */
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

/**
 * look 結果を見やすいテキスト（ws_look 互換）に整形する。
 */
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

/**
 * 指定シート・アクティブシートの表構造を検査し、CacheService にキャッシュする。
 * @param {Object} req
 */
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

// ---------------------------------------------------------------- 高速アンドゥ（backup=false 用）

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

/** つなぎコード等から現在のユーザーの高速控えを消去する。 */
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

/**
 * backup=false の高速実行時、安全に戻せる棚に限り対象範囲の状態を UserCache へスナップショットする。
 * format / bg.clear のみの場合は変更する属性だけを取得し、API 往復を最小化する。
 */
function comboFastUndoSave_(sh, ops, table, optSsId, optSs) {
  var ssId = optSsId || (typeof sh.getParent === 'function' ? sh.getParent().getId() : '');
  try {
    var cache = CacheService.getUserCache();
    var fastKey = comboFastUndoKey_(ssId);
    // 安全に戻せる棚のホワイトリスト外が含まれる場合は控えを作らず、既存控えも消す
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

/**
 * UserCache（または互換 ScriptCache / ScriptProperties）の高速アンドゥスナップショットからシート状態を即時復元する。
 */
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
  // 書式・色・固定・幅のみの部分復元では表構造が変わらないためキャッシュを温存する
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

// ---------------------------------------------------------------- ops 実行・報告整形

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

/**
 * ops 配列を直接実行する（backup=false 時はロックや外部控えを省略した 0.5秒以下の高速経路）。
 * @param {Object} req { ops, ok, backup, sheet, selection, table }
 */
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

  // フル控えモード（backup=true）：Engine の actDo_ に委譲
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

  // 高速パス（backup=false）：ロック・外部控えブックなしで即時実行
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

  // format(title/header) の事前解決：1セルタイトルの帯展開・見出し範囲解決で重い RPC を省く
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

// ---------------------------------------------------------------- 覚えた言い方（［はい］で決めた頼み→ops。使う人ごと）
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
    // 呼び手（サイドバー・アドオンのカード）の棚当てが作った鍵をそのまま使う（軽量版はここに棚当てが無い）
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

/**
 * 自然文または事前解決済み ops を受け取り、棚ヒット即実行または AI 解釈・郵便受け投入を行う。
 * @param {Object} req { ask, ops, ok, backup, sheet, selection, table }（GASクイックは AI へ回さない）
 */
function comboRunAsk(req) {
  req = req || {};
  req.aiAuto = false;
  var t0 = Date.now();
  req = req || {};
  var askText = String(req.ask || '').trim();

  // フロント側ですでに棚ヒット済み ops が渡された場合は最速で実行する
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

    // 棚に一発ヒットしなかった場合（GASクイックは AI へ回さず止める）
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

// ---------------------------------------------------------------- 棚検索・アンドゥ・設定

/**
 * 棚の札を検索する。
 * @param {Object} req { ask, kind }
 */
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

/**
 * 直前の操作を取り消す（高速スナップショットがあれば即時復元、無ければ Engine の actUndo_ を呼ぶ）。
 * @param {Object} req { ok, to, targetId }
 */
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

/**
 * 標準サイドバーから「直した所」へカーソル移動する。
 * @param {Object} req { range, sheet, targetId, assumeActive }
 */
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

/**
 * 設定を UserProperties（人ごと）から読み込む。
 */
function comboGetConfig() {
  return comboGetRawConfig_();
}

/**
 * 設定を UserProperties（人ごと）へ保存する。
 * @param {Object} cfg
 */
function comboSaveConfig(cfg) {
  cfg = cfg || {};
  var cur = comboGetRawConfig_();
  if (cfg.backupDefault !== undefined) cur.backupDefault = !!cfg.backupDefault;
  if (cfg.defaultTab === 'list' || cfg.defaultTab === 'auto') cur.defaultTab = cfg.defaultTab;
  PropertiesService.getUserProperties().setProperty(COMBO_PROP_CONFIG, JSON.stringify(cur));
  return { ok: true, config: cur };
}

/**
 * 軽量ピン（V8 Isolate 起動時間＋通信往復時間の計測用）。
 */
function comboPing() {
  return { ok: true, ts: Date.now() };
}

// ---------------------------------------------------------------- Engine WebApp (doPost) 用 EXTRA_ACTIONS 登録

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

// ===================== GASクイック: マクロの一覧（シートのマクロ・マイマクロ） =====================
// マイマクロ＝使う人の Drive にある単体のスクリプト「GASクイック マイマクロ」。Drive から中身を読んで一覧にし、
// 選ばれたら中身を組み立てて実行する（ライブラリの登録も Apps Script API も要らない）。
var QUICK_MY_TITLE = 'GASクイック マイマクロ';
// 大元の版の印（組み立てのときに quick.py が埋める）。操作窓は自分の印と比べ、違えば自分で開き直す
var QUICK_BUILD = '';
var QUICK_DRAFT_KEY = 'QUICK_DRAFT';

/** 今の大元の版の印を返す（操作窓が押されるたびに軽く聞く）。 */
function comboQuickBuild() {
  return { ok: true, build: QUICK_BUILD, oauthToken: comboGetOAuthToken_() };
}

/** 操作窓を新しい版で開き直す。打ちかけの文字は 2 分だけ預かり、新しい操作窓が受け取る。 */
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

// 一覧の並び（区切りごと）。マイマクロと棚はどのシートでも同じ、シートのマクロはシートごと
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

/** 一覧のピン留め（★）状態をユーザーごとに保存する。 */
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

/** 区切りの中の並びを覚える（names＝上からの名前の並び）。 */
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
// 大元そのものの関数名（組み立てのときに quick.py が埋める）。1 枚版で、シートのマクロと大元の関数を見分けるのに使う
var QUICK_LIB_FNS = null;

function quickSkip_(k) {
  return /_$/.test(k) || /^(combo|__gm|onOpen$|onEdit$|onInstall$|onSelectionChange$|onChange$|onFormSubmit$|doGet$|doPost$|showGasComboSidebar$|createComboSidebarHtml$)/.test(k);
}

// 手順文字列を安全に分割する（エスケープされた \/・\／ や URL・日付 2026/11/21 を保護）
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

// 関数本体（String(fn)）の { 直後にある先頭コメントから説明・棚キーワード・手順・控えなしを拾う
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

// 1 枚版: 同じプロジェクトにある関数から、大元の物を除いた残り＝そのシートのマクロ
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

// マイマクロの更新時刻を取る（キャッシュ照合用）
function quickMyStamp_(id) {
  try { return String(DriveApp.getFileById(id).getLastUpdated().getTime()); } catch (e) { return ''; }
}

// マイマクロのキャッシュ（一覧・ソース本体）を消す
function quickMyInvalidate_(id) {
  if (!id) return;
  try {
    var cache = CacheService.getUserCache();
    cache.remove('QUICK_MY_LIST_' + id);
    cache.remove('QUICK_MY_SRC_' + id);
  } catch (e) {}
}

// マイマクロのソース本体を、中身が変わっていなければ覚えから返す（実行時の Drive API 取得を省く）
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

// マイマクロの一覧を、中身が変わっていなければ覚えから返す（Drive から読む 0.4 秒を省く）
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

// 「function 名前(」を拾う。すぐ上の「// 棚: 言い方, 言い方」は頼みの語、「// 説明」は表示に使う。末尾 _ の関数は部品なので並べない
// 新しいマクロはコードの先頭に足す（頭の手引きのコメントと、その下の空行のすぐ後）
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
    // 空行で直前までのコメント蓄積をリセット（先頭手引きコメント等の誤紐付けを防止）
    if (!ln) { words = []; desc = ''; steps = []; noBackup = false; continue; }
    if (/^\/\/\s*控えなし(?:\s|$)/.test(ln)) { noBackup = true; continue; }
    var mw = ln.match(/^\/\/\s*棚\s*[:：]\s*(.+)$/);
    if (mw) { words = words.concat(mw[1].split(/[,、，]/).map(function (s) { return s.trim(); }).filter(String)); continue; }
    var ms = ln.match(/^\/\/\s*手順\s*[:：]\s*(.+)$/);
    if (ms) { steps = steps.concat(quickSplitSteps_(ms[1])); continue; }
    // 字下げの無い行（いちばん外）だけをマクロとして拾う＝マクロの中の部品（const fmt = () => …）は並べない
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

/** 一覧を返す。sheetFns はつなぎコードが拾ったシートの関数（[{name, head}]）。 */
function comboQuickList(req, sheetFns) {
  var t0 = Date.now();
  req = req || {};
  if (!sheetFns) sheetFns = quickSheetFnsHere_();
  var res = { ok: true, sheet: (sheetFns || []).map(function (f) {
    // ライブラリ版: つなぎコードが関数の頭（head）を渡すので、ここで説明・棚の言い方・手順を読む
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

/** 前の控え（隠しシート）があれば消す。 */
function quickDropBackup_(ss) {
  try {
    var old = ss.getSheetByName(QUICK_BK_NAME);
    if (old) ss.deleteSheet(old);
  } catch (e) {}
}

/**
 * マクロを撃つ前に、今のシートを丸ごと隠しシート「_GASクイックの控え」へ写して控える（値・式・書式・結合・列の幅・入力規則・条件付き書式）。
 * マクロはどこを触るか前もって分からないので、範囲を当てずにシートごと取る。控えは 1 つだけ（次のマクロで入れ替わる）。
 * 「直前を取り消す」はこの控えからシートを丸ごと戻し、控えを消す。取れなかったときは false。
 */
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

/** 隠しシートの控えから、シートを丸ごと戻す。 */
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

// マイマクロのエラーから行番号の目安を添えて分かりやすく整形する
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

/** マクロを撃った後に、表の読み込みの控え（キャッシュ）を捨てる。 */
function comboQuickAfter() {
  try {
    var ss = SpreadsheetApp.getActive();
    comboCacheInvalidate_(ss.getId(), ss.getActiveSheet().getName());
  } catch (e) {}
}


/** マイマクロの 1 本を実行する。 */
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
    // 毎回最新スタンプを照合して編集直後のコード変更を確実に反映する
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

/** マイマクロを作る（あれば番地を返すだけ）。 */
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

// 取り込む関数本体の中から、未移植の部品関数（末尾 _ の呼び出し）を拾う
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

/** シートのマクロ（記録したマクロ等）をマイマクロへ写す。src はつなぎコードが渡す関数の中身。 */
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

/** 履歴や入力から「⚡ 手順つきマクロ」をマイマクロの先頭へ直接保存する。 */
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

/** 今開いているブックのつなぎコード（大元 ID 付き）を引き継いだ、真っ新な新規スプレッドシートを作成する。 */
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

/** ソースコードから指定関数（直上の連続コメント含む）の [start, end] 文字位置を返す。見つからなければ null。 */
function quickFindFnSpan_(src, name) {
  src = String(src || '');
  var esc = String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!esc) return null;
  var re = new RegExp('^(?:async\\s+)?function\\s+' + esc + '\\s*\\(|^(?:const|let|var)\\s+' + esc + '\\s*=\\s*(?:async\\s+)?(?:function\\s*\\(|\\([^)]*\\)\\s*=>|[\\w$]+\\s*=>)', 'm');
  var m = re.exec(src);
  if (!m) return null;
  var defStart = m.index;
  // 直上の連続する // コメント行を含める
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
  // 関数本体の { ... } の対応を辿る（文字列・コメントをスキップ）
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

/** マイマクロから指定関数のコードだけを抜き出して返す。 */
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

/** マイマクロの指定関数だけを編集後のコードでピンポイント上書き保存する。 */
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

/** チャット AI 等で作った新しい関数をマイマクロの先頭へ追加する（未作成なら自動作成）。 */
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
