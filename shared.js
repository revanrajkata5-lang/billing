/* ============================================================
   Revanraj Restaurant Platform — Shared State, Auth & Helpers
   Loaded on every page. Persists data in localStorage so all
   pages stay in sync as you navigate between them.
   ============================================================ */

const STATE_KEY = 'revanraj_state';
const AUTH_KEY = 'revanraj_auth';
const ROLE_KEY = 'revanraj_role';

/* ---------- Roles ---------- */
// Each role has its own login, its own home page, and its own label.
const ROLES = {
  admin:   { user:'revanraj', pass:'123456789', label:'Super Admin', home:'dashboard.html' },
  waiter:  { user:'waiter',   pass:'waiter123',  label:'Waiter',      home:'waiter.html'    },
  cashier: { user:'cashier',  pass:'cashier123', label:'Cashier',     home:'pos.html'       },
  kitchen: { user:'kitchen',  pass:'kitchen123', label:'Kitchen Staff', home:'kds.html'     },
};

function defaultState(){
  return {
    // Fresh install — no sample data. Add your own branches, menu items,
    // tables, inventory and staff from within the app.
    branches: [],
    currentBranch: null,
    categories: [],
    menu: [],
    nextMenuId: 1,
    inventory: [],
    employees: [],
    tables: [],
    nextTableNo: 1,
    notifications: [],
    activeWaiterTable: null,
    activeMenuCat: null,
    kotSeq: 100,
    kots: []
  };
}

function loadState(){
  const raw = localStorage.getItem(STATE_KEY);
  if(raw){
    try{ return JSON.parse(raw); }catch(e){ /* fall through to default */ }
  }
  const def = defaultState();
  localStorage.setItem(STATE_KEY, JSON.stringify(def));
  return def;
}
function saveState(state){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
function resetState(){ localStorage.removeItem(STATE_KEY); }

/* ---------- Auth ---------- */
function doLogin(username, password){
  for(const roleKey in ROLES){
    const r = ROLES[roleKey];
    if(r.user === username && r.pass === password){
      localStorage.setItem(AUTH_KEY, '1');
      localStorage.setItem(ROLE_KEY, roleKey);
      return roleKey;
    }
  }
  return null;
}
function logout(){
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(ROLE_KEY);
  window.location.href = 'login.html';
}
function currentRole(){ return localStorage.getItem(ROLE_KEY); }

// Call at the top of every protected page.
// allowedRoles: array of role keys permitted to view this page.
// If the logged-in role isn't in that list, silently send them to their own home page.
function checkAuth(allowedRoles){
  if(localStorage.getItem(AUTH_KEY) !== '1'){
    window.location.href = 'login.html';
    return;
  }
  const role = currentRole();
  if(!role || !ROLES[role]){
    logout();
    return;
  }
  if(allowedRoles && !allowedRoles.includes(role)){
    window.location.href = ROLES[role].home;
  }
}

/* ---------- Formatting / small helpers ---------- */
function fmt(n){ return '₹' + Number(n).toLocaleString('en-IN'); }
function menuById(state, id){ return state.menu.find(m => m.id === id); }
function tableByNo(state, no){ return state.tables.find(t => t.no === no); }

/* ---------- Toast ---------- */
function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ---------- Modal ---------- */
function openModal(html){
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-bg').classList.add('show');
}
function closeModal(){
  const bg = document.getElementById('modal-bg');
  if(bg) bg.classList.remove('show');
}

/* ---------- Sidebar: active link + role-based visibility + user badge ---------- */
function highlightActiveNav(){
  const path = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(item=>{
    if(item.getAttribute('data-page') === path){ item.classList.add('active'); }
    else{ item.classList.remove('active'); }
  });
}
function filterNavByRole(){
  const role = currentRole();
  document.querySelectorAll('.nav-item[data-roles]').forEach(item=>{
    const allowed = item.getAttribute('data-roles').split(',');
    item.style.display = allowed.includes(role) ? '' : 'none';
  });
  // Hide nav-group labels whose entire group is now empty
  document.querySelectorAll('.nav-group').forEach(group=>{
    const visible = Array.from(group.querySelectorAll('.nav-item')).some(i=>i.style.display !== 'none');
    group.style.display = visible ? '' : 'none';
  });
}
function renderUserBadge(){
  const role = currentRole();
  if(!role || !ROLES[role]) return;
  const roleEl = document.getElementById('user-role-label');
  const nameEl = document.getElementById('user-name-label');
  if(roleEl) roleEl.textContent = ROLES[role].label;
  if(nameEl) nameEl.textContent = ROLES[role].user;
}

document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'modal-bg'){ closeModal(); }
});
document.addEventListener('click', (e)=>{
  if(e.target && e.target.id === 'logout-btn'){ logout(); }
});
document.addEventListener('DOMContentLoaded', ()=>{
  highlightActiveNav();
  filterNavByRole();
  renderUserBadge();
});
