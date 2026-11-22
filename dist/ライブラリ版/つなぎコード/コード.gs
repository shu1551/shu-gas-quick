/**
 * GASクイック（スプレッドシート側 つなぎコード）
 * 本体・棚・操作窓は大元ライブラリ shuquickengine 側にある。このシートに書いたマクロも一覧に並ぶ。
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('⚡ GASクイック')
    .addItem('操作窓を開く', 'showGasComboSidebar')
    .addItem('直前を取り消す', 'comboMenuUndo')
    .addToUi();
}

function showGasComboSidebar() {
  SpreadsheetApp.getUi().showSidebar(shuquickengine.createComboSidebarHtml());
}

function comboMenuUndo() { return shuquickengine.comboMenuUndo(); }
function comboInit(req) { return shuquickengine.comboInit(req, comboQuickSheetFns_()); }
function comboLook(req) { return shuquickengine.comboLook(req); }
function comboRunAsk(req) { return shuquickengine.comboRunAsk(req); }
function comboRunOps(req) { return shuquickengine.comboRunOps(req); }
function comboFind(req) { return shuquickengine.comboFind(req); }
function comboUndo(req) { return shuquickengine.comboUndo(req); }
function comboGetConfig() { return shuquickengine.comboGetConfig(); }
function comboSaveConfig(cfg) { return shuquickengine.comboSaveConfig(cfg); }
function comboPollSelection(req) { return shuquickengine.comboPollSelection(req); }
function comboGotoRange(req) { return shuquickengine.comboGotoRange(req); }
function comboGetLearned(req) { return shuquickengine.comboGetLearned(req); }
function comboLearn(req) { return shuquickengine.comboLearn(req); }

// ---- マクロの一覧（このシートのマクロ＋マイマクロ） ----
function comboQuickList(req) { return shuquickengine.comboQuickList(req, comboQuickSheetFns_()); }
function comboQuickMake(req) { return shuquickengine.comboQuickMake(req); }
function comboQuickBuild(req) { return shuquickengine.comboQuickBuild(req); }
function comboQuickSaveOrder(req) { return shuquickengine.comboQuickSaveOrder(req); }
function comboQuickSavePins(req) { return shuquickengine.comboQuickSavePins(req); }
function comboQuickSaveSteps(req) { return shuquickengine.comboQuickSaveSteps(req); }
function comboQuickReopen(req) { return shuquickengine.comboQuickReopen(req); }
function comboQuickNewBook(req) { return shuquickengine.comboQuickNewBook(req); }
function comboQuickGetFn(req) { return shuquickengine.comboQuickGetFn(req); }
function comboQuickSaveFn(req) { return shuquickengine.comboQuickSaveFn(req); }
function comboQuickAddFn(req) { return shuquickengine.comboQuickAddFn(req); }
function comboQuickDeleteFn(req) { return shuquickengine.comboQuickDeleteFn(req); }
function comboQuickImport(req) {
  var f = globalThis[String((req || {}).name || '')];
  return shuquickengine.comboQuickImport(req, typeof f === 'function' ? String(f) : '');
}
function comboQuickRun(req) {
  req = req || {};
  if (req.src === 'my') return shuquickengine.comboQuickRun(req);
  var t0 = Date.now(), name = String(req.name || ''), f = globalThis[name];
  if (typeof f !== 'function' || comboQuickSkip_(name)) return { ok: false, error: 'このシートに「' + name + '」がありません（一覧を更新してください）' };
  var backupOn = req.backup === undefined ? true : !!req.backup;
  var noBk = /\/\/\s*控えなし/.test(String(f).slice(0, 600));
  try {
    var snapped = false;
    if (backupOn && !noBk) {
      snapped = shuquickengine.comboQuickSnap(name);
    } else {
      shuquickengine.comboQuickClearFastUndo();
    }
    var r = f();
    shuquickengine.comboQuickAfter();
    var note = noBk ? '（控えなし指定）' : (backupOn ? (snapped ? '' : '（控えを取れませんでした。取り消しは Ctrl+Z で）') : '（控えなし・取り消し不可・Ctrl+Z 推奨）');
    return { ok: true, snapped: snapped, text: name + ' を実行しました' + (r !== undefined && r !== null && r !== '' && typeof r.then !== 'function' ? '（' + String(r).slice(0, 200) + '）' : '') + note, gasMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: name + ' でエラー: ' + String(e && e.message || e), gasMs: Date.now() - t0 };
  }
}
function comboQuickSkip_(k) {
  return /_$/.test(k) || /^(combo|__gm|onOpen$|onEdit$|onInstall$|onSelectionChange$|onChange$|onFormSubmit$|doGet$|doPost$|showGasComboSidebar$)/.test(k);
}
function comboQuickSheetFns_() {
  var g = globalThis, out = [];
  // head＝関数の頭（{ のすぐ内側の「// 説明」「// 棚: 言い方」を大元が読む）
  Object.keys(g).forEach(function (k) { if (typeof g[k] === 'function' && !comboQuickSkip_(k)) out.push({ name: k, head: String(g[k]).slice(0, 600) }); });
  return out;
}
