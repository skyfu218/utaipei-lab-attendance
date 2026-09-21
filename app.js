const STORAGE_KEY = "utaipei-lab-attendance-v1";

const seed = {
  session: null,
  attendance: [
    { id: 1, userId: "u1", name: "王小明", date: "2026-09-21", checkIn: "08:51", checkOut: null, place: "運動能力分析實驗室", status: "準時", source: "NFC" },
    { id: 2, userId: "u2", name: "陳怡安", date: "2026-09-21", checkIn: "09:08", checkOut: null, place: "運動能力分析實驗室", status: "遲到", source: "NFC" },
    { id: 3, userId: "u3", name: "林冠宇", date: "2026-09-21", checkIn: null, checkOut: null, place: "校外公務", status: "請假", source: "申請" },
    { id: 4, userId: "u4", name: "張雅婷", date: "2026-09-21", checkIn: "08:44", checkOut: null, place: "運動能力分析實驗室", status: "準時", source: "NFC" },
    { id: 5, userId: "u1", name: "王小明", date: "2026-09-20", checkIn: "08:56", checkOut: "18:04", place: "運動能力分析實驗室", status: "準時", source: "NFC" },
  ],
  requests: [
    { id: 1, userId: "u3", name: "林冠宇", type: "公假", date: "2026-09-21", reason: "校外體適能測試支援", status: "已核准" },
    { id: 2, userId: "u2", name: "陳怡安", type: "補登", date: "2026-09-19", reason: "離開時漏刷簽退", status: "待審核" },
  ],
  messages: [
    { id: 1, to: "u2", from: "admin", title: "今日出勤確認", body: "今天 09:08 完成簽到，想確認早上是否遇到交通或工作安排上的狀況？", time: "今天 09:16", unread: true },
    { id: 2, to: "u1", from: "admin", title: "系統測試通知", body: "第一版打卡系統正在測試，若遇到無法掃描或紀錄異常，請從補登申請回報。", time: "昨天 16:30", unread: false },
  ],
};

const users = {
  staff: { id: "u1", name: "王小明", role: "同仁", initials: "王" },
  admin: { id: "admin", name: "傅老師", role: "系統總管", initials: "傅" },
};

let state = loadState();
let view = "dashboard";
const app = document.querySelector("#app");

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...seed, ...saved } : structuredClone(seed);
  } catch { return structuredClone(seed); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function currentUser() { return state.session ? users[state.session] : null; }
function today() { return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(new Date()); }
function timeNow() { return new Intl.DateTimeFormat("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }).format(new Date()); }
function dateLabel() { return new Intl.DateTimeFormat("zh-TW", { dateStyle: "full", timeZone: "Asia/Taipei" }).format(new Date()); }
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}
function statusBadge(status) {
  const kind = ["準時", "已核准"].includes(status) ? "good" : ["遲到", "待審核"].includes(status) ? "warn" : status === "異常" ? "bad" : "neutral";
  return `<span class="badge ${kind}">${status}</span>`;
}

function checkTagEntry() {
  const params = new URLSearchParams(location.search);
  const tag = params.get("tag");
  if (!tag) return false;
  if (!state.session) { sessionStorage.setItem("pendingTag", tag); renderLogin("請先完成身分驗證，系統將接續處理現場打卡。"); return true; }
  processPunch(tag); return true;
}

function processPunch(tag) {
  const user = currentUser();
  if (!user || user.id === "admin") { renderPunchError("總管帳號不能建立個人出勤紀錄。", "請切換為同仁帳號後重新掃描。"); return; }
  const map = {
    "lab-checkin": { type: "簽到", field: "checkIn", place: "運動能力分析實驗室" },
    "lab-checkout": { type: "簽退", field: "checkOut", place: "運動能力分析實驗室" },
  };
  const config = map[tag];
  if (!config) { renderPunchError("無法驗證這張 Tag", "請使用實驗室核發的 NFC Tag，或聯絡系統總管。"); return; }
  let record = state.attendance.find(r => r.userId === user.id && r.date === today());
  if (!record) {
    record = { id: Date.now(), userId: user.id, name: user.name, date: today(), checkIn: null, checkOut: null, place: config.place, status: "準時", source: "NFC" };
    state.attendance.unshift(record);
  }
  const duplicate = Boolean(record[config.field]);
  if (!duplicate) record[config.field] = timeNow();
  saveState();
  renderPunchSuccess(config.type, record[config.field], config.place, duplicate);
}

function renderPunchSuccess(type, time, place, duplicate) {
  app.innerHTML = `<main class="punch-screen"><section class="punch-card">
    <div class="success-ring">✓</div>
    <h1>${duplicate ? `已完成${type}` : `${type}成功`}</h1>
    <p>${duplicate ? "本次掃描未重複新增紀錄。" : "紀錄已由系統接收，您可以放心離開。"}</p>
    <div class="receipt">
      <div><span>人員</span><strong>${currentUser().name}</strong></div>
      <div><span>時間</span><strong>${today()} ${time}</strong></div>
      <div><span>地點</span><strong>${place}</strong></div>
      <div><span>驗證</span><strong>示範 Tag 已通過</strong></div>
    </div>
    <div class="security-note">目前為第一版測試環境。正式上線時將以安全型動態 Tag、一次性驗證碼及伺服器時間取代示範參數。</div>
    <button class="primary-btn" style="width:100%;margin-top:18px" data-action="home">查看我的紀錄</button>
  </section></main>`;
  document.querySelector('[data-action="home"]').onclick = () => { history.replaceState({}, "", location.pathname); view = "dashboard"; renderApp(); };
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
}
function renderPunchError(title, message) {
  app.innerHTML = `<main class="punch-screen"><section class="punch-card"><div class="success-ring" style="background:var(--red-soft);color:var(--red)">!</div><h1>${title}</h1><p>${message}</p><button class="secondary-btn" style="width:100%;margin-top:16px" onclick="location.href=location.pathname">返回系統</button></section></main>`;
}

function renderLogin(note = "使用個人帳號登入；日常掃描 Tag 後不必再次輸入密碼。") {
  app.innerHTML = `<main class="login-page">
    <section class="login-brand">
      <div class="brand-mark">SPA</div>
      <h1>實驗室<br>智慧出勤</h1>
      <p>臺北市立大學運動能力分析實驗室，以個人裝置與現場 NFC Tag 建立快速、可追溯的出勤紀錄。</p>
      <div class="privacy-note"><span>⌾</span><span>僅在打卡當下驗證必要資訊，不進行持續位置追蹤。</span></div>
    </section>
    <section class="login-panel">
      <h2>歡迎使用</h2><p>${note}</p>
      <div class="demo-actions">
        <button class="login-option" data-login="staff"><span class="avatar">王</span><span><strong>同仁示範入口</strong><small>打卡紀錄、申請與訊息</small></span><span class="login-arrow">›</span></button>
        <button class="login-option" data-login="admin"><span class="avatar">傅</span><span><strong>系統總管示範入口</strong><small>今日出勤、異常與人員管理</small></span><span class="login-arrow">›</span></button>
      </div>
      <div class="demo-disclaimer"><strong>第一版安全說明</strong><br>目前公開測試僅使用瀏覽器內的示範資料，不包含真實人事資料。正式帳號、權限與多人同步將接入受保護的免費後端後才啟用。</div>
    </section>
  </main>`;
  document.querySelectorAll("[data-login]").forEach(btn => btn.onclick = () => {
    state.session = btn.dataset.login; saveState();
    const pending = sessionStorage.getItem("pendingTag");
    if (pending) { sessionStorage.removeItem("pendingTag"); processPunch(pending); }
    else renderApp();
  });
}

function navItems(role) {
  return role === "系統總管"
    ? [["dashboard","⌂","總覽"],["attendance","◫","出勤紀錄"],["exceptions","!","異常與申請"],["messages","✉","訊息中心"],["people","♙","人員與 Tag"]]
    : [["dashboard","⌂","我的首頁"],["attendance","◫","打卡紀錄"],["requests","＋","請假／補登"],["messages","✉","訊息"]];
}

function renderApp() {
  const user = currentUser();
  if (!user) { renderLogin(); return; }
  const nav = navItems(user.role);
  const title = nav.find(n => n[0] === view)?.[2] || "總覽";
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="side-brand"><div class="brand-mark">SPA</div><div><strong>運動能力分析<br>實驗室</strong><small>智慧出勤系統</small></div></div>
      <nav class="nav">${nav.map(n => `<button data-view="${n[0]}" class="${view===n[0]?"active":""}"><span class="icon">${n[1]}</span>${n[2]}</button>`).join("")}</nav>
      <div class="side-bottom"><div class="user-mini"><span class="avatar sm">${user.initials}</span><div><strong>${user.name}</strong><small>${user.role}</small></div></div><button class="logout" data-action="logout">登出示範帳號</button></div>
    </aside>
    <main class="main"><header class="topbar"><div><h1>${title}</h1><p>臺北市立大學運動能力分析實驗室</p></div><div class="top-actions"><span class="chip hide-mobile">測試環境</span><span class="chip">${user.name}</span></div></header><div class="content">${renderView(user)}</div></main>
    <nav class="mobile-bar">${nav.slice(0,4).map(n => `<button data-view="${n[0]}" class="${view===n[0]?"active":""}"><span>${n[1]}</span>${n[2]}</button>`).join("")}</nav>
  </div>`;
  bindEvents();
}

function renderView(user) {
  if (view === "dashboard") return user.role === "系統總管" ? adminDashboard() : staffDashboard(user);
  if (view === "attendance") return attendancePage(user);
  if (view === "requests") return requestsPage(user);
  if (view === "exceptions") return exceptionsPage();
  if (view === "messages") return messagesPage(user);
  if (view === "people") return peoplePage();
  return "";
}

function adminDashboard() {
  const todayRows = state.attendance.filter(r => r.date === "2026-09-21");
  return `<section class="hero-card"><div><h2>今日出勤概況</h2><p>目前有 4 位排定人員，1 件事項需要確認。</p></div><div class="clock"><strong id="clock">${timeNow()}</strong><small>${dateLabel()}</small></div></section>
  <section class="stats">
    ${stat("已簽到","3 / 4","✓","75% 已完成")}${stat("準時","2","◷","今日準時")}${stat("遲到","1","!","等待確認")}${stat("請假／公出","1","↗","已核准")}
  </section>
  <section class="grid-2"><div class="card"><div class="card-head"><div><h3>今日人員狀況</h3><p>最後更新：剛剛</p></div><button class="link-btn" data-go="attendance">查看全部</button></div>${attendanceTable(todayRows)}</div>
  <div class="card"><div class="card-head"><div><h3>需要處理</h3><p>異常與待辦事項</p></div></div><div class="card-body"><div class="timeline">
    <div class="timeline-item"><span class="timeline-dot" style="background:var(--amber)"></span><div><strong>陳怡安今日遲到</strong><p>09:08 完成 NFC 簽到，可傳送訊息確認。</p></div></div>
    <div class="timeline-item"><span class="timeline-dot"></span><div><strong>1 件補登申請</strong><p>陳怡安申請補登 09/19 簽退紀錄。</p></div></div>
    <div class="timeline-item"><span class="timeline-dot" style="background:var(--green)"></span><div><strong>林冠宇公假已核准</strong><p>今日前往校外進行體適能測試。</p></div></div>
  </div></div></div></section>`;
}

function staffDashboard(user) {
  const record = state.attendance.find(r => r.userId === user.id && r.date === today()) || state.attendance.find(r => r.userId === user.id);
  return `<section class="hero-card"><div><h2>${record?.checkIn ? "今天已完成簽到" : "今天尚未簽到"}</h2><p>${record?.checkIn ? `${record.place}・${record.checkIn}` : "請至指定工作地點掃描 NFC Tag。"}</p></div><div class="clock"><strong id="clock">${timeNow()}</strong><small>${dateLabel()}</small></div></section>
  <section class="stats">${stat("本月出勤","18 天","✓","目前紀錄")}${stat("準時率","94%","◷","17 次準時")}${stat("異常紀錄","0","!","無待處理")}${stat("未讀訊息",String(state.messages.filter(m=>m.to===user.id&&m.unread).length),"✉","管理者訊息")}</section>
  <section class="grid-2"><div class="card"><div class="card-head"><div><h3>最近打卡紀錄</h3><p>所有時間均以伺服器為準</p></div><button class="link-btn" data-go="attendance">查看全部</button></div>${attendanceTable(state.attendance.filter(r=>r.userId===user.id).slice(0,5))}</div>
  <div class="card"><div class="card-head"><div><h3>快速測試 NFC 流程</h3><p>模擬現場兩張 Tag</p></div></div><div class="card-body"><p style="color:var(--muted);line-height:1.6;margin-top:0">正式版需掃描實體安全 Tag。此處只供第一版流程驗收。</p><div style="display:grid;gap:10px"><a class="primary-btn" style="text-align:center;text-decoration:none" href="?tag=lab-checkin">模擬掃描「簽到」Tag</a><a class="secondary-btn" style="text-align:center;text-decoration:none" href="?tag=lab-checkout">模擬掃描「簽退」Tag</a></div></div></div></section>`;
}

function stat(label, value, icon, note) { return `<div class="stat"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><strong>${value}</strong><small>${note}</small></div>`; }
function attendanceTable(rows) {
  if (!rows.length) return `<div class="empty">目前沒有紀錄</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>人員</th><th>日期</th><th>簽到</th><th>簽退</th><th>地點</th><th>狀態</th></tr></thead><tbody>${rows.map(r=>`<tr><td><div class="person"><span class="avatar sm">${r.name[0]}</span><div><strong>${r.name}</strong><small>${r.source}</small></div></div></td><td>${r.date}</td><td>${r.checkIn||"—"}</td><td>${r.checkOut||"—"}</td><td>${r.place}</td><td>${statusBadge(r.status)}</td></tr>`).join("")}</tbody></table></div>`;
}
function attendancePage(user) {
  const rows = user.role === "系統總管" ? state.attendance : state.attendance.filter(r=>r.userId===user.id);
  return `<div class="page-title"><div><h2>${user.role === "系統總管" ? "全體出勤紀錄" : "我的打卡紀錄"}</h2><p>依人員、日期與狀態查閱已接收的紀錄。</p></div><div class="toolbar"><button class="secondary-btn" data-action="export">匯出 CSV</button></div></div><div class="card">${attendanceTable(rows)}</div>`;
}
function requestsPage(user) {
  const rows = state.requests.filter(r=>r.userId===user.id);
  return `<div class="page-title"><div><h2>請假與補登</h2><p>原始打卡紀錄不直接修改，申請與核准過程會完整保留。</p></div></div>
  <div class="grid-2"><div class="card"><div class="card-head"><h3>提出新申請</h3></div><form class="card-body" id="request-form"><div class="form-grid"><div class="field"><label>申請類型</label><select name="type"><option>補登</option><option>請假</option><option>公出</option><option>紀錄更正</option></select></div><div class="field"><label>日期</label><input name="date" type="date" required value="${today()}"></div></div><div class="field" style="margin-top:16px"><label>原因說明</label><textarea name="reason" required placeholder="請簡要說明情況"></textarea></div><div class="form-actions"><button class="primary-btn">送出申請</button></div></form></div>
  <div class="card"><div class="card-head"><h3>申請紀錄</h3></div><div class="card-body"><div class="message-list">${rows.length?rows.map(r=>`<div class="message"><div class="message-head"><strong>${r.type}・${r.date}</strong>${statusBadge(r.status)}</div><p>${r.reason}</p></div>`).join(""):'<div class="empty">尚無申請</div>'}</div></div></div></div>`;
}
function exceptionsPage() {
  return `<div class="page-title"><div><h2>異常與申請</h2><p>先聯繫、再確認；系統標記不等於直接判定違規。</p></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>人員</th><th>事項</th><th>日期</th><th>說明</th><th>狀態</th><th>處理</th></tr></thead><tbody>${state.requests.map(r=>`<tr><td>${r.name}</td><td>${r.type}</td><td>${r.date}</td><td>${r.reason}</td><td>${statusBadge(r.status)}</td><td><button class="link-btn" data-message="${r.name}">傳訊關心</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function messagesPage(user) {
  const msgs = user.role === "系統總管" ? state.messages : state.messages.filter(m=>m.to===user.id);
  return `<div class="page-title"><div><h2>訊息中心</h2><p>將出勤事件與溝通留在同一筆可追溯紀錄中。</p></div>${user.role === "系統總管"?'<button class="primary-btn" data-action="compose">新增訊息</button>':''}</div><div class="card"><div class="card-body"><div class="message-list">${msgs.map(m=>`<article class="message ${m.unread?"unread":""}"><div class="message-head"><strong>${m.title}</strong><time>${m.time}</time></div><p>${m.body}</p><div style="margin-top:12px"><button class="link-btn" data-action="read" data-id="${m.id}">${m.unread?"標記已讀":"回覆"}</button></div></article>`).join("")}</div></div></div>`;
}
function peoplePage() {
  return `<div class="page-title"><div><h2>人員與 Tag</h2><p>管理身分、角色及指定打卡位置。</p></div><button class="primary-btn" data-action="not-ready">新增人員</button></div><div class="grid-2"><div class="card"><div class="card-head"><h3>人員清單</h3></div><div class="table-wrap"><table><thead><tr><th>姓名</th><th>角色</th><th>裝置</th><th>狀態</th></tr></thead><tbody>${["王小明","陳怡安","林冠宇","張雅婷"].map((n,i)=>`<tr><td><div class="person"><span class="avatar sm">${n[0]}</span><strong>${n}</strong></div></td><td>研究助理</td><td>${i<2?"已驗證":"待綁定"}</td><td>${statusBadge("啟用")}</td></tr>`).join("")}</tbody></table></div></div><div class="card"><div class="card-head"><h3>打卡位置</h3></div><div class="card-body"><div class="message"><div class="message-head"><strong>運動能力分析實驗室</strong>${statusBadge("測試中")}</div><p>簽到 Tag：lab-checkin<br>簽退 Tag：lab-checkout<br>正式版將改用安全動態驗證。</p></div></div></div></div>`;
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{view=b.dataset.view;renderApp();});
  document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{view=b.dataset.go;renderApp();});
  document.querySelector('[data-action="logout"]')?.addEventListener("click",()=>{state.session=null;saveState();renderLogin();});
  document.querySelector('[data-action="export"]')?.addEventListener("click",exportCsv);
  document.querySelectorAll('[data-action="not-ready"], [data-action="compose"]').forEach(b=>b.onclick=()=>toast("此功能將在正式帳號後端接入後啟用。"));
  document.querySelectorAll('[data-message]').forEach(b=>b.onclick=()=>{view="messages";renderApp();toast(`已開啟 ${b.dataset.message} 的訊息管道`);});
  document.querySelectorAll('[data-action="read"]').forEach(b=>b.onclick=()=>{const m=state.messages.find(x=>x.id===Number(b.dataset.id));if(m){m.unread=false;saveState();renderApp();}});
  document.querySelector("#request-form")?.addEventListener("submit", e=>{e.preventDefault();const f=new FormData(e.currentTarget);state.requests.unshift({id:Date.now(),userId:currentUser().id,name:currentUser().name,type:f.get("type"),date:f.get("date"),reason:f.get("reason"),status:"待審核"});saveState();renderApp();toast("申請已送出");});
  const clock = document.querySelector("#clock"); if(clock) setTimeout(()=>{if(document.querySelector("#clock")) document.querySelector("#clock").textContent=timeNow();},30000);
}
function exportCsv() {
  const rows = [["人員","日期","簽到","簽退","地點","狀態"],...state.attendance.map(r=>[r.name,r.date,r.checkIn||"",r.checkOut||"",r.place,r.status])];
  const csv = "\ufeff"+rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="出勤紀錄.csv";a.click();URL.revokeObjectURL(a.href);toast("CSV 已匯出");
}

if ("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
if (!checkTagEntry()) state.session ? renderApp() : renderLogin();
