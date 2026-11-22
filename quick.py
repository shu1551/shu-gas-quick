"""GASクイック の組み立てと入れ方（作り手の作業台）。

GASクイック＝AI を使わない GAS の道具。スプレッドシートのメニュー「⚡ GASクイック」から操作窓を開き、
棚（GASコンボと同じ元）と、自分のマクロ（そのシートのマクロ・どのシートでも使えるマイマクロ）を一覧から撃つ。

  py quick.py engine            大元ライブラリ（shu-gas-quick-engine）を作る・入れ直す
  py quick.py connect <シート>   スプレッドシートにつなぎコードを置く（URL か ID）
  py quick.py template          「コピーを作成」だけで使えるテンプレートを作る・入れ直す
  py quick.py dist              職場などへテキストで持ち込むファイルを dist/ライブラリ版/ に書き出す
                                （大元・つなぎコード・はじめに.txt。マイマクロは操作窓の「編集」で中身を写す）

組み立ての部品（棚の元・GAS の読み書き）は隣の shu-gas-manager の物を借りる。GASコンボとは大元もテンプレートも別。
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GM = HERE.parent / "shu-gas-manager"
sys.path.insert(0, str(GM))

import gas_ws_combo as C  # noqa: E402

STATE_PATH = HERE / ".quick_state.json"
ENGINE_TITLE = "shu-gas-quick-engine"
TEMPLATE_TITLE = "GASクイック テンプレート"
LIB = "shuquickengine"
SERVER_TEMPLATE = HERE / "quick_server_template.gs"
SIDEBAR_TEMPLATE = HERE / "quick_sidebar_template.html"
DIST_DIR = HERE / "dist" / "ライブラリ版"

CONNECTOR_CODE = """/**
 * GASクイック（スプレッドシート側 つなぎコード）
 * 本体・棚・操作窓は大元ライブラリ {lib} 側にある。このシートに書いたマクロも一覧に並ぶ。
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('⚡ GASクイック')
    .addItem('操作窓を開く', 'showGasComboSidebar')
    .addItem('直前を取り消す', 'comboMenuUndo')
    .addToUi();
}

function showGasComboSidebar() {
  SpreadsheetApp.getUi().showSidebar({lib}.createComboSidebarHtml());
}

function comboMenuUndo() { return {lib}.comboMenuUndo(); }
function comboInit(req) { return {lib}.comboInit(req, comboQuickSheetFns_()); }
function comboLook(req) { return {lib}.comboLook(req); }
function comboRunAsk(req) { return {lib}.comboRunAsk(req); }
function comboRunOps(req) { return {lib}.comboRunOps(req); }
function comboFind(req) { return {lib}.comboFind(req); }
function comboUndo(req) { return {lib}.comboUndo(req); }
function comboGetConfig() { return {lib}.comboGetConfig(); }
function comboSaveConfig(cfg) { return {lib}.comboSaveConfig(cfg); }
function comboPollSelection(req) { return {lib}.comboPollSelection(req); }
function comboGotoRange(req) { return {lib}.comboGotoRange(req); }
function comboGetLearned(req) { return {lib}.comboGetLearned(req); }
function comboLearn(req) { return {lib}.comboLearn(req); }

// ---- マクロの一覧（このシートのマクロ＋マイマクロ） ----
function comboQuickList(req) { return {lib}.comboQuickList(req, comboQuickSheetFns_()); }
function comboQuickMake(req) { return {lib}.comboQuickMake(req); }
function comboQuickBuild(req) { return {lib}.comboQuickBuild(req); }
function comboQuickSaveOrder(req) { return {lib}.comboQuickSaveOrder(req); }
function comboQuickSavePins(req) { return {lib}.comboQuickSavePins(req); }
function comboQuickSaveSteps(req) { return {lib}.comboQuickSaveSteps(req); }
function comboQuickReopen(req) { return {lib}.comboQuickReopen(req); }
function comboQuickNewBook(req) { return {lib}.comboQuickNewBook(req); }
function comboQuickGetFn(req) { return {lib}.comboQuickGetFn(req); }
function comboQuickSaveFn(req) { return {lib}.comboQuickSaveFn(req); }
function comboQuickAddFn(req) { return {lib}.comboQuickAddFn(req); }
function comboQuickDeleteFn(req) { return {lib}.comboQuickDeleteFn(req); }
function comboCall(name, req) { return {lib}.comboCall(name, req); }
function comboQuickImport(req) {
  var f = globalThis[String((req || {}).name || '')];
  return {lib}.comboQuickImport(req, typeof f === 'function' ? String(f) : '');
}
function comboQuickRun(req) {
  req = req || {};
  if (req.src === 'my') return {lib}.comboQuickRun(req);
  var t0 = Date.now(), name = String(req.name || ''), f = globalThis[name];
  if (typeof f !== 'function' || comboQuickSkip_(name)) return { ok: false, error: 'このシートに「' + name + '」がありません（一覧を更新してください）' };
  var backupOn = req.backup === undefined ? true : !!req.backup;
  var noBk = /\\/\\/\\s*控えなし/.test(String(f).slice(0, 600));
  try {
    var snapped = false;
    if (backupOn && !noBk) {
      snapped = {lib}.comboQuickSnap(name);
    } else {
      {lib}.comboQuickClearFastUndo();
    }
    var r = f();
    {lib}.comboQuickAfter();
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
"""

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    # マイマクロ（Drive の単体スクリプト）に書き足す許可
    "https://www.googleapis.com/auth/drive.scripts",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/script.external_request",
]


def _client():
    from gas_client import GasClient
    return GasClient()


def _load_state():
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}


def _save_state(st):
    STATE_PATH.write_text(json.dumps(st, ensure_ascii=False, indent=2), encoding="utf-8")


def build_engine_files():
    """GASコンボと同じ棚の元から、GASクイックの元（server・操作窓）で大元のファイルを組む。"""
    keep = (C.SERVER_TEMPLATE, C.SIDEBAR_TEMPLATE)
    C.SERVER_TEMPLATE, C.SIDEBAR_TEMPLATE = SERVER_TEMPLATE, SIDEBAR_TEMPLATE
    try:
        files = C.build_combo_files(combo_lite=True)
    finally:
        C.SERVER_TEMPLATE, C.SIDEBAR_TEMPLATE = keep
    # 大元の関数名を埋める（1 枚版で、シートのマクロと大元の関数を見分ける）
    names = set()
    for f in files:
        if f["type"] == "SERVER_JS":
            names.update(re.findall(r"^function\s+([^\s(]+)", f["source"], re.M))
    import hashlib
    build = hashlib.sha1("".join(f["source"] for f in files).encode("utf-8")).hexdigest()[:10]
    for f in files:
        if f["name"] == "ComboSidebar":
            assert 'var QUICK_SIDEBAR_BUILD = "";' in f["source"]
            f["source"] = f["source"].replace('var QUICK_SIDEBAR_BUILD = "";', 'var QUICK_SIDEBAR_BUILD = "' + build + '";', 1)
        if f["name"] == "ComboServer":
            assert "var QUICK_BUILD = '';" in f["source"]
            f["source"] = f["source"].replace("var QUICK_BUILD = '';", "var QUICK_BUILD = '" + build + "';", 1)
    for f in files:
        if f["name"] == "ComboServer":
            assert "var QUICK_LIB_FNS = null;" in f["source"]
            f["source"] = f["source"].replace("var QUICK_LIB_FNS = null;",
                                              "var QUICK_LIB_FNS = " + json.dumps(sorted(names), ensure_ascii=False) + ";", 1)
    return files


def ensure_engine(client=None, force=False, dev=False):
    client = client or _client()
    st = _load_state()
    files = build_engine_files()
    fhash = C._combo_files_hash(files)
    sid = str(st.get("engine_sid") or "").strip()
    if not sid:
        sid = str(client.create_project(ENGINE_TITLE)["scriptId"]).strip()
    ver = str(st.get("engine_ver") or "").strip()
    if dev:
        # 開発モード＝最新のコードでつなぐ（持ち主だけ）。版を作らず中身だけ送る（版は 200 までしか持てない）
        if force or st.get("engine_head_hash") != fhash or st.get("engine_sid") != sid:
            client._put_content(sid, files)
            C._clear_runner_cache(client, sid)
            st.update({"engine_sid": sid, "engine_head_hash": fhash})
            _save_state(st)
        return sid, ver or "1"
    if force or st.get("engine_hash") != fhash or st.get("engine_sid") != sid or not ver:
        client._put_content(sid, files)
        C._clear_runner_cache(client, sid)
        ver = str(client.create_version(sid, description=f"GASクイック 大元 ({fhash})") or "1")
        st.update({"engine_sid": sid, "engine_ver": ver, "engine_hash": fhash, "engine_head_hash": fhash})
        _save_state(st)
    return sid, ver


def write_dist():
    """持ち込み用に、エディタへ貼る形のファイルを書き出す（名前と拡張子はエディタのファイルと同じ）。
    大元/ … 単体のプロジェクト「GASクイック 大元」に貼る 4 ファイル
    つなぎコード/ … 使うシートのスクリプトに貼る 2 ファイル（appsscript.json の大元の ID は職場で入れ替える）"""
    ext = {"JSON": ".json", "SERVER_JS": ".gs", "HTML": ".html"}
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    eng_dir, con_dir = DIST_DIR / "大元", DIST_DIR / "つなぎコード"
    eng_dir.mkdir(parents=True)
    con_dir.mkdir(parents=True)
    out = []
    eng_files = build_engine_files()
    build_id = ""
    for f in eng_files:
        path = eng_dir / (f["name"] + ext[f["type"]])
        path.write_text(f["source"], encoding="utf-8")
        out.append("大元/" + path.name)
        if f["name"] == "ComboServer":
            m_b = re.search(r"var QUICK_BUILD = '([^']+)';", f["source"])
            if m_b:
                build_id = m_b.group(1)
    for f in connector_files("ここに大元のスクリプトIDを入れる", "1"):
        path = con_dir / (f["name"] + ext[f["type"]])
        path.write_text(f["source"], encoding="utf-8")
        out.append("つなぎコード/" + path.name)
    from datetime import datetime
    built_at = datetime.now().strftime("%Y/%m/%d %H:%M")
    (DIST_DIR / "はじめに.txt").write_text(
        f"GASクイック（ライブラリ版）の持ち込み方  [版: {build_id or '-'} / 作成: {built_at}]\n"
        "\n"
        "【1 回だけ】大元を作る\n"
        "1. https://script.google.com で「新しいプロジェクト」→ 名前を「GASクイック 大元」\n"
        "2. 左の「プロジェクトの設定（歯車）」で「appsscript.json をエディタで表示する」に印\n"
        "3. appsscript.json を 大元/appsscript.json の中身に貼り替える\n"
        "4. 「＋ → スクリプト」で Engine と ComboServer を作り、大元/ の同じ名前の .gs を貼る（最初の コード.gs は消す）\n"
        "5. 「＋ → HTML」で ComboSidebar を作り、大元/ComboSidebar.html を貼る\n"
        "6. 「デプロイ → 新しいデプロイ → 種類: ライブラリ」でデプロイ（版 1 ができる）\n"
        "7. 「プロジェクトの設定」のスクリプト ID を写しておく\n"
        "\n"
        "【使うシートごと】つなぎコードを置く\n"
        "1. シートで「拡張機能 → Apps Script」\n"
        "2. 「プロジェクトの設定」で「appsscript.json をエディタで表示する」に印\n"
        "3. appsscript.json を つなぎコード/appsscript.json の中身に貼り、「ここに大元のスクリプトIDを入れる」を 7 の ID に替える\n"
        "4. コード.gs を つなぎコード/コード.gs の中身に貼り替える\n"
        "5. 保存 → シートを読み込み直す（F5）→「⚡ GASクイック」→「操作窓を開く」→ 初回の許可\n"
        "\n"
        "【マイマクロ】操作窓の「マイマクロを作る」→「編集」で開き、家のマイマクロの中身を貼り替える\n"
        "\n"
        "大元を直したら: 大元のプロジェクトで「デプロイを管理」→ 新しい版、つなぎコードの appsscript.json の version を その版の番号に替える\n",
        encoding="utf-8")
    return out


def connector_files(lib_id, ver, dev=False):
    manifest = {
        "timeZone": "Asia/Tokyo",
        "exceptionLogging": "STACKDRIVER",
        "runtimeVersion": "V8",
        "dependencies": {
            "libraries": [{"userSymbol": LIB, "version": str(ver), "libraryId": lib_id, "developmentMode": bool(dev)}],
            # Drive＝マイマクロを読み書きする道・Sheets＝操作窓から直接書く速い道（どちらもこの裏の Cloud で API を通す）
            "enabledAdvancedServices": [
                {"userSymbol": "Drive", "serviceId": "drive", "version": "v3"},
                {"userSymbol": "Sheets", "serviceId": "sheets", "version": "v4"},
            ],
        },
        "oauthScopes": SCOPES,
        "webapp": {"executeAs": "USER_DEPLOYING", "access": "MYSELF"},
    }
    return [
        {"name": "appsscript", "type": "JSON", "source": json.dumps(manifest, ensure_ascii=False, indent=2)},
        {"name": "コード", "type": "SERVER_JS", "source": CONNECTOR_CODE.replace("{lib}", LIB).strip() + "\n"},
    ]


def connect(ss_url_or_id, client=None, title="GASクイック", force=False, dev=None):
    """シートにつなぎコードを置く。そのシートのスクリプトにある他のファイル（記録したマクロ等）は残す。"""
    client = client or _client()
    ss_id = C._extract_ss_id(ss_url_or_id)
    if not ss_id:
        raise ValueError("スプレッドシートの URL か ID を指定してください")
    st = _load_state()
    # 開発モードかどうかはシートごとに覚える（一度 --dev でつないだシートは、次からも最新のコードのまま）
    devs = st.get("dev_sheets") or {}
    if dev is None:
        dev = bool(devs.get(ss_id))
    lib_id, ver = ensure_engine(client, force=force, dev=dev)
    st = _load_state()
    devs = st.get("dev_sheets") or {}
    if dev:
        devs[ss_id] = True
    else:
        devs.pop(ss_id, None)
    st["dev_sheets"] = devs
    sheets = st.get("sheets") or {}
    sid = str(sheets.get(ss_id) or "").strip()
    keep = []
    if sid:
        cur = client.get_content(sid, use_cache=False)
        cur = cur.get("files") if isinstance(cur, dict) else cur
        keep = [{"name": f["name"], "type": f["type"], "source": f["source"]} for f in (cur or [])
                if f["name"] not in ("appsscript", "コード")]
    else:
        sid = str(client.create_project(title, parent_id=ss_id)["scriptId"]).strip()
    client._put_content(sid, connector_files(lib_id, ver, dev=dev) + keep)
    C._clear_runner_cache(client, sid)
    sheets[ss_id] = sid
    st["sheets"] = sheets
    _save_state(st)
    return {"ok": True, "spreadsheetId": ss_id, "scriptId": sid, "engineVersion": "最新のコード（開発モード）" if dev else ver,
            "url": f"https://docs.google.com/spreadsheets/d/{ss_id}/edit"}


def template(client=None, new=False, force=False, dev=None):
    client = client or _client()
    st = _load_state()
    ss_id = str(st.get("template_ss_id") or "").strip()
    if new or not ss_id:
        ss_id, _ = C._create_spreadsheet(TEMPLATE_TITLE, client)
        st["template_ss_id"] = ss_id
        _save_state(st)
    res = connect(ss_id, client=client, title=TEMPLATE_TITLE, force=force, dev=dev)
    res.update({
        "mode": "template",
        "copy_url": f"https://docs.google.com/spreadsheets/d/{ss_id}/copy",
        "install_guide": [
            {"step": 1, "say": f"この番地を開いてください: https://docs.google.com/spreadsheets/d/{ss_id}/copy"},
            {"step": 2, "say": "「コピーを作成」を押してください（コピーはご自分の Drive に入ります）"},
            {"step": 3, "say": "開いたコピーのメニューの右端の「⚡ GASクイック」→「操作窓を開く」",
             "if_stuck": "メニューに出ないときは数秒待つか、F5 で読み込み直し"},
            {"step": 4, "say": "初回だけ許可を求められます。「続行」→ アカウント →「詳細」→「〜（安全ではないページ）に移動」→「すべて選択」→「続行」"},
            {"step": 5, "say": "操作窓の「一覧」にマクロと棚が並びます。選んで「実行」、または上の欄に言葉を打って Enter"},
        ],
    })
    return res


def engine_sheet(client=None, new=False):
    """配布用の「大元シート」（スプレッドシートに大元 4 ファイルを内蔵した版）を作る・更新する。"""
    client = client or _client()
    st = _load_state()
    ss_id = str(st.get("engine_sheet_ss_id") or "").strip()
    sid = str(st.get("engine_sheet_sid") or "").strip()
    if new or not ss_id:
        ss_id, _ = C._create_spreadsheet("GASクイック 大元", client)
        sid = ""
        st["engine_sheet_ss_id"] = ss_id
        st["engine_sheet_sid"] = ""
        _save_state(st)
    if not sid:
        sid = str(client.create_project("GASクイック 大元", parent_id=ss_id)["scriptId"]).strip()
        st["engine_sheet_sid"] = sid
        _save_state(st)
    files = build_engine_files()
    client._put_content(sid, files)
    C._clear_runner_cache(client, sid)
    return {
        "ok": True,
        "mode": "engine-sheet",
        "spreadsheetId": ss_id,
        "scriptId": sid,
        "url": f"https://docs.google.com/spreadsheets/d/{ss_id}/edit",
        "copy_url": f"https://docs.google.com/spreadsheets/d/{ss_id}/copy",
    }


def main(argv=None):
    p = argparse.ArgumentParser(description="GASクイック の組み立てと入れ方")
    sub = p.add_subparsers(dest="cmd", required=True)
    e = sub.add_parser("engine", help="大元ライブラリを作る・入れ直す")
    e.add_argument("--force", action="store_true")
    es = sub.add_parser("engine-sheet", help="配布用の「大元シート」を作る・入れ直す")
    es.add_argument("--new", action="store_true")
    c = sub.add_parser("connect", help="スプレッドシートにつなぎコードを置く")
    c.add_argument("sheet")
    c.add_argument("--force", action="store_true")
    c.add_argument("--dev", action="store_true", help="最新のコードでつなぐ（持ち主だけ・直したら版を上げずに届く）")
    c.add_argument("--release", action="store_true", help="版でつなぐ（人に配る形）")
    sub.add_parser("dist", help="持ち込み用のファイルを dist/ライブラリ版/ に書き出す")
    t = sub.add_parser("template", help="テンプレートを作る・入れ直す")
    t.add_argument("--new", action="store_true")
    t.add_argument("--force", action="store_true")
    t.add_argument("--dev", action="store_true", help="最新のコードでつなぐ（持ち主だけ）")
    t.add_argument("--release", action="store_true", help="版でつなぐ（人に配る前に必ず）")
    a = p.parse_args(argv)
    if a.cmd == "engine":
        sid, ver = ensure_engine(force=a.force)
        out = {"ok": True, "engineId": sid, "engineVersion": ver}
    elif a.cmd == "engine-sheet":
        out = engine_sheet(new=a.new)
    elif a.cmd == "connect":
        out = connect(a.sheet, force=a.force, dev=True if a.dev else (False if a.release else None))
    elif a.cmd == "dist":
        out = {"ok": True, "dist": str(DIST_DIR), "files": write_dist()}
    else:
        out = template(new=a.new, force=a.force, dev=True if a.dev else (False if a.release else None))
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
