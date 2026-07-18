/* ============================================================
   Revanraj Restaurant Platform — Shared State, Auth & Helpers
   Loaded on every page.

   Business data (branches, menu, inventory, tables, KOTs, etc.)
   lives in Firestore under appstate/main, so every device stays
   in sync in real time. Login/session info stays in localStorage
   since that's per-device, not shared business data.
   ============================================================ */

const AUTH_KEY = 'revanraj_auth';
const ROLE_KEY = 'revanraj_role';

/* ---------- Firebase ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAJNhEiI5xPu6U6ZlDJkZvGIA_CtUgEL10",
  authDomain: "revanraj-billing.firebaseapp.com",
  projectId: "revanraj-billing",
  storageBucket: "revanraj-billing.firebasestorage.app",
  messagingSenderId: "252803254404",
  appId: "1:252803254404:web:5f6c9b711f40dd7cd4dad1",
  measurementId: "G-J0ZG63DTDT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const STATE_DOC = db.collection('appstate').doc('main');

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

/* ---------- Shared state, kept live via Firestore ---------- */
// _state is a singleton object. Pages keep a reference to it via loadState().
// We mutate its properties in place (rather than replacing the object) so
// that reference stays valid, then fire a 'state-updated' event so pages
// know to re-render.
let _state = defaultState();
let _stateReady = false;

function loadState(){
  return _state;
}

function saveState(state){
  // Fire-and-forget write to Firestore. All connected devices (including
  // this one) get the update back through the onSnapshot listener below.
  STATE_DOC.set(state).catch(err=>{
    console.error('Failed to save to Firestore:', err);
    showToast('⚠ Could not save — check your connection');
  });
}

function resetState(){
  const def = defaultState();
  STATE_DOC.set(def).catch(err=>console.error('Failed to reset state:', err));
}

// Real-time listener: whenever the shared document changes (from any
// device), update our local copy and tell the current page to re-render.
STATE_DOC.onSnapshot(
  (doc)=>{
    if(doc.exists){
      const data = doc.data();
      Object.keys(_state).forEach(k=>delete _state[k]);
      Object.assign(_state, defaultState(), data);
    } else {
      // First run ever — seed the document.
      STATE_DOC.set(defaultState()).catch(err=>console.error('Failed to seed state:', err));
    }
    _stateReady = true;
    document.dispatchEvent(new Event('state-updated'));
  },
  (err)=>{
    console.error('Firestore listener error:', err);
    showToast('⚠ Lost connection to database');
  }
);

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
  window.location.href = 'index.html';
}
function currentRole(){ return localStorage.getItem(ROLE_KEY); }

// Call at the top of every protected page.
// allowedRoles: array of role keys permitted to view this page.
// If the logged-in role isn't in that list, silently send them to their own home page.
function checkAuth(allowedRoles){
  if(localStorage.getItem(AUTH_KEY) !== '1'){
    window.location.href = 'index.html';
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
