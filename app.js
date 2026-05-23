// ══ CONFIG LOADER ══
// NOTE: Firebase SDK pinned to 10.12.0 — update periodically to avoid deprecation
import { initializeApp }                            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

async function loadConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to load config');
  return res.json();
}

// ══ DEFAULT MENU ══
const DEFAULT_MENU = [
  { category: "Main Course", items: [
    { name: "Chicken Biryani", price: 250 },
    { name: "Mutton Biryani", price: 250 },
    { name: "Gilma Biryani", price: 250 },
    { name: "Chicken Noodle", price: 250 },
    { name: "Penne Pasta White Sauce Veg", price: 250 },
    { name: "Penne Pasta White Sauce Non-Veg", price: 250 },
    { name: "Mac & Cheese Pasta Veg", price: 250 },
    { name: "Mac & Cheese Pasta Non-Veg", price: 250 }
  ]},
  { category: "Starters (Non-Veg)", items: [
    { name: "Tanne Spl Chicken", price: 220 },
    { name: "Pallipalayam Chicken", price: 220 },
    { name: "Fish and Chips", price: 220 },
    { name: "Crab Lollipop", price: 220 },
    { name: "Vanjaram Tawa Fish Fry", price: 220 },
    { name: "Nethili Rawa Fried Fish", price: 220 },
    { name: "Beef Chukka with Coin Parotta", price: 220 },
    { name: "Yaki Tori Chicken", price: 220 },
    { name: "Tandoori Chicken Full", price: 220 },
    { name: "Tandoori Chicken Half", price: 220 },
    { name: "Chicken Tikka", price: 220 }
  ]},
  { category: "Starters (Veg)", items: [
    { name: "Mushroom Nei Roast with Coin Parotta", price: 180 },
    { name: "Gobi Veppudu", price: 180 },
    { name: "Kalan Patani Milagu Pirattal", price: 180 },
    { name: "Thread Cottage Cheese", price: 180 },
    { name: "Thai Chilli Paneer", price: 180 },
    { name: "Kunafa Crispy Paneer", price: 180 },
    { name: "Korean Chilli Tofu", price: 180 },
    { name: "Lal Mirchi Paneer Tikka", price: 180 },
    { name: "Honey Chilli Lotus Stem", price: 180 },
    { name: "Malai Cheese Broccoli", price: 180 }
  ]},
  { category: "Indian Breads", items: [
    { name: "Naan", price: 30 },
    { name: "Roti", price: 30 },
    { name: "Parotta", price: 30 }
  ]}
];

// ══ STATE ══
let db;
let MENU               = JSON.parse(JSON.stringify(DEFAULT_MENU));
let isEditingMenu      = false;
let currentUser        = "Staff";
let currentUserEmail   = "";
let currentUserId      = null;
let currentTable       = null;
let orders             = {};
let savedOrders        = {};
let adminUnlocked      = false;
let adminAttempts      = 0;
let lockoutTimer       = null;
let TABLE_COUNT        = 11;
let settings           = { name: "TANNE RESTOBAR", gst: 5, tables: 11, currency: "₹", footer: "Thank you for dining with us!", adminCode: "TANNE2026" };

// ══ PRICE LOOKUP ══
function getPrice(itemName) {
  for (const cat of MENU) {
    const found = cat.items.find(i => i.name === itemName);
    if (found) return found.price;
  }
  return 0;
}

// ══ HELPERS ══
function currency() { return settings.currency || "₹"; }
function gstRate()  { return (settings.gst || 5) / 100; }
function sanitize(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ══ CRYPTO ══
async function hashPass(pass) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function saveAllOrders() {
  try {
    await set(ref(db, 'orders'), orders);
    await set(ref(db, 'savedOrders'), savedOrders);
  } catch { showToast('Failed to save. Check connection.'); }
}

// ══ SESSION TIMEOUT ══
let sessionTimer = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetSessionTimer() {
  if (!currentUserId) return;
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => {
    showToast('Session expired. Please sign in again.');
    setTimeout(() => doLogout(), 2500);
  }, SESSION_TIMEOUT);
}

function startSessionTracking() {
  ['click', 'touchstart', 'keydown'].forEach(e =>
    document.addEventListener(e, resetSessionTimer, { passive: true })
  );
  resetSessionTimer();
}

// ══ TOAST ══
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

// ══ SCREEN ══
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id !== 'admin') adminUnlocked = false;
}
window.showScreen = showScreen;

// ══ MODAL HELPERS ══
window.closeModal = function(id) {
  document.getElementById(id).classList.remove('active');
};

// ══ TOGGLE PASSWORD VISIBILITY ══
window.togglePass = function(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.style.color = isHidden ? 'var(--gold)' : 'var(--gray)';
};

// ══ THEME ══
window.toggleTheme = function(isLight) {
  if (isLight) {
    document.body.classList.add('light-mode');
    document.getElementById('themeModeLabel').textContent = 'LIGHT';
    localStorage.setItem('tanne_theme', 'light');
  } else {
    document.body.classList.remove('light-mode');
    document.getElementById('themeModeLabel').textContent = 'DARK';
    localStorage.setItem('tanne_theme', 'dark');
  }
};

function applyThemeOnLoad() {
  const saved = localStorage.getItem('tanne_theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
  }
}

// ══ LISTENER CLEANUP ══
const unsubscribers = [];
function unsubscribeAll() {
  unsubscribers.forEach(fn => fn());
  unsubscribers.length = 0;
}

let dashboardRenderTimer = null;
function scheduleDashboardRender() {
  if (dashboardRenderTimer) clearTimeout(dashboardRenderTimer);
  dashboardRenderTimer = setTimeout(() => renderDashboard(), 50);
}

// ══ INIT ══
applyThemeOnLoad();

window.addEventListener('DOMContentLoaded', async () => {
  showScreen('splash');
  try {
    const config = await loadConfig();
    const app = initializeApp(config);
    db = getDatabase(app);

    unsubscribers.push(onValue(ref(db, 'orders'), snap => {
      orders = snap.val() || {};
      if (document.getElementById('dashboard').classList.contains('active')) scheduleDashboardRender();
    }));
    unsubscribers.push(onValue(ref(db, 'savedOrders'), snap => {
      savedOrders = snap.val() || {};
      if (document.getElementById('dashboard').classList.contains('active')) scheduleDashboardRender();
      if (currentTable && document.getElementById('order').classList.contains('active')) renderSavedOrders();
      if (document.getElementById('admin').classList.contains('active')) renderAdmin();
    }));
    unsubscribers.push(onValue(ref(db, 'config/settings'), snap => {
      if (snap.exists()) applySettings(snap.val());
    }));
    unsubscribers.push(onValue(ref(db, 'config/menu'), snap => {
      if (isEditingMenu) return;
      if (snap.exists() && snap.val() && snap.val().length > 0) {
        MENU = snap.val();
      } else {
        set(ref(db, 'config/menu'), DEFAULT_MENU);
      }
    }));
    setTimeout(() => showScreen('login'), 2200);
  } catch (err) {
    console.error('Init failed:', err);
    setTimeout(() => {
      showScreen('login');
      showToast('Connection failed. Please refresh.');
    }, 2200);
  }
});

function applySettings(s) {
  settings = { ...settings, ...s };
  const newCount = parseInt(s.tables);
  TABLE_COUNT = (newCount > 0 && newCount <= 100) ? newCount : 11;
}

// ══ AUTH ══
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('visible');
}
function hideError(id) {
  document.getElementById(id).classList.remove('visible');
}

window.doSignup = function() {
  hideError('signupError');
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('signupPass').value;
  if (!name || !email || !pass)  return showError('signupError', 'Please fill in all fields.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('signupError', 'Please enter a valid email address.');
  if (pass.length < 6)           return showError('signupError', 'Password must be at least 6 characters.');

  const btn = document.querySelector('#signupScreen .btn-gold') || document.querySelector('[onclick="doSignup()"]');
  if (btn) btn.disabled = true;

  const safeEmail = email.replace(/\./g, '_').replace(/@/g, '_at_');
  get(ref(db, `accounts/${safeEmail}`)).then(async snap => {
    if (snap.exists()) {
      if (btn) btn.disabled = false;
      return showError('signupError', 'An account with this email already exists.');
    }
    const hashed = await hashPass(pass);
    set(ref(db, `accounts/${safeEmail}`), { name, email, pass: hashed });
    if (btn) btn.disabled = false;
    showToast('Account created. Please sign in.');
    showScreen('login');
  }).catch(() => { if (btn) btn.disabled = false; });
};

window.doLogin = function() {
  hideError('loginError');
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  if (!email || !pass) return showError('loginError', 'Please fill in all fields.');

  const btn = document.querySelector('[onclick="doLogin()"]');
  if (btn) btn.disabled = true;

  const safeEmail = email.replace(/\./g, '_').replace(/@/g, '_at_');
  get(ref(db, `accounts/${safeEmail}`)).then(async snap => {
    if (!snap.exists()) {
      if (btn) btn.disabled = false;
      return showError('loginError', 'Incorrect email or password.');
    }
    const account = snap.val();
    const hashed = await hashPass(pass);
    if (hashed !== account.pass) {
      if (btn) btn.disabled = false;
      return showError('loginError', 'Incorrect email or password.');
    }
    currentUser      = account.name;
    currentUserEmail = account.email;
    currentUserId    = safeEmail;
    const initial = account.name.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent  = initial;
    document.getElementById('orderAvatar').textContent = initial;
    if (btn) btn.disabled = false;
    renderDashboard();
    showScreen('dashboard');
    startSessionTracking();
  }).catch(() => { if (btn) btn.disabled = false; });
};

window.doLogout = function() {
  currentUser      = "Staff";
  currentUserEmail = "";
  currentUserId    = null;
  adminUnlocked    = false;
  isEditingMenu    = false;
  orders           = {};
  savedOrders      = {};
  if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
  if (lockoutTimer) { clearInterval(lockoutTimer); lockoutTimer = null; }
  clearTablePresence();
  ['click', 'touchstart', 'keydown'].forEach(e =>
    document.removeEventListener(e, resetSessionTimer)
  );
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value  = '';
  showScreen('login');
};

// ══ SETTINGS SCREEN ══
window.openSettings = function() {
  document.getElementById('profileAvatarLg').textContent = currentUser.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent     = currentUser;
  document.getElementById('profileEmail').textContent    = currentUserEmail || '—';
  // Sync theme toggle to current body state
  const isLight = document.body.classList.contains('light-mode');
  const tog = document.getElementById('themeToggle');
  const lbl = document.getElementById('themeModeLabel');
  if (tog) tog.checked = isLight;
  if (lbl) lbl.textContent = isLight ? 'LIGHT' : 'DARK';
  showScreen('settings');
};

window.openEditProfile = function() {
  document.getElementById('editNameInput').value = currentUser;
  hideError('editProfileError');
  document.getElementById('editProfileModal').classList.add('active');
};

window.saveProfile = async function() {
  const newName = document.getElementById('editNameInput').value.trim();
  if (!newName) return showError('editProfileError', 'Name cannot be empty.');
  if (!currentUserId) return showError('editProfileError', 'Session error. Please re-login.');
  await set(ref(db, `accounts/${currentUserId}/name`), newName);
  currentUser = newName;
  const initial = newName.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent      = initial;
  document.getElementById('orderAvatar').textContent     = initial;
  document.getElementById('profileAvatarLg').textContent = initial;
  document.getElementById('profileName').textContent     = newName;
  closeModal('editProfileModal');
  showToast('Profile updated.');
};

window.openChangePassword = function() {
  document.getElementById('currentPassInput').value = '';
  document.getElementById('newPassInput').value     = '';
  hideError('changePassError');
  document.getElementById('changePassModal').classList.add('active');
};

window.savePassword = async function() {
  const current = document.getElementById('currentPassInput').value;
  const next    = document.getElementById('newPassInput').value;
  if (!current || !next) return showError('changePassError', 'Please fill in both fields.');
  if (next.length < 6)   return showError('changePassError', 'New password must be at least 6 characters.');
  if (!currentUserId)    return showError('changePassError', 'Session error. Please re-login.');

  const snap = await get(ref(db, `accounts/${currentUserId}`));
  const hashedCurrent = await hashPass(current);
  if (!snap.exists() || snap.val().pass !== hashedCurrent)
    return showError('changePassError', 'Current password is incorrect.');
  const hashedNext = await hashPass(next);
  await set(ref(db, `accounts/${currentUserId}/pass`), hashedNext);
  closeModal('changePassModal');
  showToast('Password updated.');
};

// ══ DASHBOARD ══
function renderDashboard() {
  const grid = document.getElementById('tablesGrid');
  let gridHtml = '';
  for (let i = 1; i <= TABLE_COUNT; i++) {
    const key         = `Table_${i}`;
    const tableOrders = (orders && orders[key]) || {};
    const saved       = (savedOrders && savedOrders[key]) || [];
    const count       = Object.values(tableOrders).reduce((a, b) => a + b, 0);
    const savedCount  = Array.isArray(saved) ? saved.reduce((a, e) => a + Object.values(e.items || {}).reduce((x,y) => x+y, 0), 0) : 0;
    const hasActivity = count > 0 || savedCount > 0;
    const totalBadge  = count + savedCount;
    const fill        = hasActivity ? '#C9A84C' : '#3a3a3a';
    const fill2       = hasActivity ? '#8B6914' : '#2a2a2a';

    gridHtml += `
      <div class="table-card ${hasActivity ? 'has-orders' : ''}" onclick="openTable(${i})">
        ${hasActivity ? `<div class="table-badge">${totalBadge}</div>` : ''}
        <div style="margin-bottom:6px">
          <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="10" width="22" height="3" rx="1.5" fill="${fill}"/>
            <rect x="6" y="13" width="2" height="9" rx="1" fill="${fill}"/>
            <rect x="20" y="13" width="2" height="9" rx="1" fill="${fill}"/>
            <rect x="5" y="7" width="18" height="4" rx="2" fill="${fill2}"/>
          </svg>
        </div>
        <div class="table-num">Table ${i}</div>
        <div class="table-status">${hasActivity ? totalBadge + ' items' : 'Available'}</div>
      </div>`;
  }
  grid.innerHTML = gridHtml;

  const oldBtn = document.querySelector('.admin-btn');
  if (oldBtn) oldBtn.remove();

  grid.insertAdjacentHTML('afterend', `
    <button class="admin-btn" onclick="openAdminModal()" style="grid-column:1/-1">
      <svg width="14" height="14" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
      ADMIN PANEL
    </button>
  `);
}
window.renderDashboard = renderDashboard;

// ══ ADMIN MODAL ══
window.openAdminModal = function() {
  if (adminUnlocked) { showScreen('admin'); renderAdmin(); loadSettingsIntoForm(); renderMenuEditor(); return; }
  if (lockoutTimer) {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminCodeInput').disabled = true;
    return;
  }
  document.getElementById('adminCodeInput').value      = '';
  document.getElementById('modalAttempts').textContent  = '';
  document.getElementById('modalTimer').textContent     = '';
  document.getElementById('adminCodeInput').disabled    = false;
  document.getElementById('adminModal').classList.add('active');
  setTimeout(() => document.getElementById('adminCodeInput').focus(), 100);
};

window.closeAdminModal = function() {
  document.getElementById('adminModal').classList.remove('active');
};

window.submitAdminCode = async function() {
  if (lockoutTimer) return;
  const entered = document.getElementById('adminCodeInput').value.trim();
  const correct = settings.adminCode || 'TANNE2026';

  if (entered === correct) {
    adminUnlocked = true; adminAttempts = 0;
    document.getElementById('adminModal').classList.remove('active');
    showScreen('admin'); renderAdmin(); loadSettingsIntoForm(); renderMenuEditor();
  } else {
    adminAttempts++;
    const remaining = 3 - adminAttempts;
    const card = document.querySelector('.modal-card');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');

    if (adminAttempts >= 3) {
      document.getElementById('adminCodeInput').disabled = true;
      document.getElementById('modalAttempts').textContent = 'Too many attempts.';
      let secs = 30;
      document.getElementById('modalTimer').textContent = `Try again in ${secs}s`;
      lockoutTimer = setInterval(() => {
        secs--;
        document.getElementById('modalTimer').textContent = `Try again in ${secs}s`;
        if (secs <= 0) {
          clearInterval(lockoutTimer); lockoutTimer = null; adminAttempts = 0;
          document.getElementById('adminCodeInput').disabled    = false;
          document.getElementById('adminCodeInput').value       = '';
          document.getElementById('modalAttempts').textContent  = '';
          document.getElementById('modalTimer').textContent     = '';
        }
      }, 1000);
    } else {
      document.getElementById('modalAttempts').textContent =
        `Wrong code — ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining`;
    }
  }
};

function loadSettingsIntoForm() {
  get(ref(db, 'config/settings')).then(snap => {
    if (!snap.exists()) return;
    const s = snap.val();
    if (s.name)      document.getElementById('setName').value      = s.name;
    if (s.gst)       document.getElementById('setGST').value       = s.gst;
    if (s.tables)    document.getElementById('setTables').value    = s.tables;
    if (s.currency)  document.getElementById('setCurrency').value  = s.currency;
    if (s.footer)    document.getElementById('setFooter').value    = s.footer;
    if (s.adminCode) document.getElementById('setAdminCode').value = s.adminCode;
  });
}

window.saveSettings = async function() {
  const newSettings = {
    name:      document.getElementById('setName').value.trim()      || 'TANNE RESTOBAR',
    gst:       parseFloat(document.getElementById('setGST').value)  || 5,
    tables:    parseInt(document.getElementById('setTables').value) || 11,
    currency:  document.getElementById('setCurrency').value.trim()  || '₹',
    footer:    document.getElementById('setFooter').value.trim()    || 'Thank you for dining with us!',
  };
  const newCode = document.getElementById('setAdminCode').value.trim();
  if (newCode.length > 0 && newCode.length < 4) {
    showToast('Admin code must be at least 4 characters. Code not changed.');
  } else if (newCode.length >= 4) {
    newSettings.adminCode = newCode;
  } else {
    newSettings.adminCode = settings.adminCode || 'TANNE2026';
  }
  await set(ref(db, 'config/settings'), newSettings);
  applySettings(newSettings);
  showToast('Settings saved.');
};

// ══ TABLE PRESENCE ══
let presenceRef = null;

function setTablePresence(tableKey) {
  if (presenceRef) set(presenceRef, null);
  if (!tableKey || !currentUserId) return;
  presenceRef = ref(db, `presence/${tableKey}/${currentUserId}`);
  set(presenceRef, { name: currentUser, time: Date.now() });
}

function clearTablePresence() {
  if (presenceRef) { set(presenceRef, null); presenceRef = null; }
}

function checkTablePresence(tableKey) {
  const ONE_HOUR = 60 * 60 * 1000;
  get(ref(db, `presence/${tableKey}`)).then(snap => {
    if (!snap.exists()) return;
    const now = Date.now();
    const entries = snap.val();
    const others = [];
    Object.entries(entries).forEach(([id, v]) => {
      if (id === currentUserId) return;
      if (now - (v.time || 0) > ONE_HOUR) {
        // Stale entry — remove it
        set(ref(db, `presence/${tableKey}/${id}`), null);
      } else {
        others.push(v.name);
      }
    });
    if (others.length > 0) {
      showToast(`⚠️ ${others.join(', ')} also on this table`);
    }
  });
}
window.openTable = function(num) {
  currentTable = `Table_${num}`;
  if (!orders[currentTable]) orders[currentTable] = {};
  document.getElementById('orderTableTitle').textContent = `Table ${num}`;
  document.getElementById('searchInput').value = '';
  setTablePresence(currentTable);
  checkTablePresence(currentTable);
  renderSavedOrders();
  renderMenu('');
  updateCartBar();
  showScreen('order');
};

window.goBack = function() {
  isEditingMenu = false;
  clearTablePresence();
  if (saveOrdersTimer) { clearTimeout(saveOrdersTimer); saveOrdersTimer = null; }
  renderDashboard();
  showScreen('dashboard');
};

// ══ SAVED ORDERS ══
let editingSavedIndex = null;

function renderSavedOrders() {
  const wrap  = document.getElementById('savedOrdersWrap');
  const saved = (savedOrders && savedOrders[currentTable]) || [];
  if (!Array.isArray(saved) || saved.length === 0) { wrap.innerHTML = ''; return; }

  let html = `<div class="saved-orders-section">
    <div class="saved-orders-header">
      <svg width="13" height="13" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
      Saved Orders
    </div>`;

  saved.forEach((entry, idx) => {
    const lines = Object.entries(entry.items || {})
      .map(([item, qty]) => `${sanitize(item)} x${qty} — ${currency()}${getPrice(item) * qty}`)
      .join('<br>');
    html += `
      <div class="saved-order-entry">
        <div class="saved-order-meta">
          <svg width="12" height="12" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          ${sanitize(entry.by)}
          <svg width="12" height="12" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
          ${sanitize(entry.time)}
          <button class="edit-saved-btn" onclick="openEditSaved(${idx})">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            EDIT
          </button>
        </div>
        <div class="saved-order-items">${lines}</div>
      </div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

window.openEditSaved = function(idx) {
  editingSavedIndex = idx;
  const tableSnap = currentTable;
  const entry = savedOrders[tableSnap] && savedOrders[tableSnap][idx];
  if (!entry) { showToast('Order no longer exists.'); return; }
  document.getElementById('editSavedMeta').textContent = `By ${entry.by} at ${entry.time}`;
  document.getElementById('editSavedError').classList.remove('visible');
  renderEditSavedItems(entry.items);
  document.getElementById('editSavedModal').classList.add('active');
};

function renderEditSavedItems(items) {
  const wrap = document.getElementById('editSavedItems');
  let html = `<div class="edit-saved-list">`;

  Object.entries(items).forEach(([item, qty]) => {
    const safeName = item.replace(/'/g, "\\'");
    html += `
      <div class="edit-saved-row" id="editRow_${btoa(item).replace(/=/g,'')}">
        <div class="edit-saved-name">${sanitize(item)}</div>
        <div class="edit-saved-price">${currency()}${getPrice(item)}</div>
        <div class="edit-saved-qty-wrap">
          <button class="qty-btn" onclick="changeEditQty('${safeName}', -1)">−</button>
          <div class="qty-num" id="editQty_${btoa(item).replace(/=/g,'')}">${qty}</div>
          <button class="qty-btn" onclick="changeEditQty('${safeName}', 1)">+</button>
        </div>
      </div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

window.changeEditQty = function(itemName, delta) {
  const entry = savedOrders[currentTable][editingSavedIndex];
  const cur   = entry.items[itemName] || 0;
  const next  = cur + delta;
  const key   = btoa(itemName).replace(/=/g, '');

  if (next <= 0) {
    delete entry.items[itemName];
    const row = document.getElementById(`editRow_${key}`);
    if (row) row.remove();
  } else {
    entry.items[itemName] = next;
    const qtyEl = document.getElementById(`editQty_${key}`);
    if (qtyEl) qtyEl.textContent = next;
  }
};

window.saveEditedOrder = async function() {
  const entry = savedOrders[currentTable][editingSavedIndex];
  if (!entry) return;

  if (Object.keys(entry.items).length === 0) {
    savedOrders[currentTable].splice(editingSavedIndex, 1);
  } else {
    savedOrders[currentTable][editingSavedIndex] = entry;
  }

  await saveAllOrders();
  closeModal('editSavedModal');
  renderSavedOrders();
  showToast('Order updated.');
};

// ══ SAVE ORDER ══
window.saveOrder = async function() {
  const tableOrders = orders[currentTable] || {};
  const items = Object.entries(tableOrders).filter(([, q]) => q > 0);
  if (items.length === 0) { showToast('No items to save.'); return; }
  if (!savedOrders[currentTable]) savedOrders[currentTable] = [];
  const now  = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  savedOrders[currentTable].push({ by: currentUser, time, items: JSON.parse(JSON.stringify(tableOrders)) });
  orders[currentTable] = {};
  await saveAllOrders();
  renderSavedOrders();
  renderMenu('');
  updateCartBar();
  showToast(`Order saved by ${currentUser} at ${time}`);
};

// ══ MENU RENDER ══
function renderMenu(query) {
  const scroll = document.getElementById('menuScroll');
  const q      = query.toLowerCase().trim();
  let html = '', anyResult = false;

  MENU.forEach(cat => {
    const filtered = cat.items.filter(item => !q || item.name.toLowerCase().includes(q));
    if (!filtered.length) return;
    anyResult = true;
    html += `<div class="menu-category"><div class="category-label">${sanitize(cat.category)}</div>`;
    filtered.forEach(item => {
      const qty      = (orders[currentTable] && orders[currentTable][item.name]) || 0;
      const selected = qty > 0;
      const display  = q
        ? item.name.replace(new RegExp(`(${q})`, 'gi'), '<span style="color:var(--gold);font-weight:700">$1</span>')
        : item.name;
      const safeName = item.name.replace(/'/g, "\\'");
      html += `
        <div class="menu-item ${selected ? 'selected' : ''}">
          <div>
            <div class="item-name">${display}</div>
            <div class="item-price">${currency()}${item.price}</div>
          </div>
          <div class="item-qty-wrap">
            ${selected ? `
              <button class="qty-btn" onclick="changeQty('${safeName}', -1)">−</button>
              <div class="qty-num">${qty}</div>
              <button class="qty-btn" onclick="changeQty('${safeName}', 1)">+</button>
            ` : `
              <button class="add-btn" onclick="changeQty('${safeName}', 1)">ADD</button>
            `}
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  if (!anyResult) {
    html = `<div class="no-results">
      <svg width="32" height="32" fill="none" stroke="#888" stroke-width="1.5" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      No results for "${query}"
    </div>`;
  }
  scroll.innerHTML = html;
}

let saveOrdersTimer = null;
function debounceSaveOrders() {
  const tableAtCall = currentTable;
  if (saveOrdersTimer) clearTimeout(saveOrdersTimer);
  saveOrdersTimer = setTimeout(async () => {
    if (tableAtCall === currentTable) { try { await set(ref(db, "orders"), orders); } catch { showToast("Failed to save. Check connection."); } }
  }, 800);
}

window.changeQty = async function(item, delta) {
  if (!orders[currentTable]) orders[currentTable] = {};
  const cur  = orders[currentTable][item] || 0;
  const next = cur + delta;
  if (next <= 0) delete orders[currentTable][item];
  else orders[currentTable][item] = next;
  debounceSaveOrders();
  renderMenu(document.getElementById('searchInput').value);
  updateCartBar();
};

window.filterMenu = function() {
  const q = document.getElementById('searchInput').value.trim();
  renderMenu(q);
};

window.clearSearch = function() {
  document.getElementById('searchInput').value = '';
  renderMenu('');
};

function updateCartBar() {
  const tableOrders = orders[currentTable] || {};
  let count = 0, total = 0;
  Object.entries(tableOrders).forEach(([item, qty]) => {
    count += qty; total += getPrice(item) * qty;
  });
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = currency() + total;
}

// ══ BILL ══
window.generateBill = function() {
  const saved        = (savedOrders && savedOrders[currentTable]) || [];
  const current      = orders[currentTable] || {};
  const currentItems = Object.entries(current).filter(([, q]) => q > 0);
  if ((!Array.isArray(saved) || saved.length === 0) && currentItems.length === 0) {
    showToast('No items added yet.'); return;
  }

  const merged = {};
  if (Array.isArray(saved)) {
    saved.forEach(entry => {
      Object.entries(entry.items || {}).forEach(([item, qty]) => {
        merged[item] = (merged[item] || 0) + qty;
      });
    });
  }
  currentItems.forEach(([item, qty]) => { merged[item] = (merged[item] || 0) + qty; });

  const now = new Date();
  document.getElementById('billTable').textContent = currentTable.replace(/_/g, ' ');
  document.getElementById('billDate').textContent  = now.toLocaleDateString('en-IN');
  document.getElementById('billTime').textContent  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let subtotal = 0, html = '';
  Object.entries(merged).forEach(([item, qty]) => {
    const price = getPrice(item) * qty;
    subtotal += price;
    html += `<div class="bill-row">
      <div class="item-n">${sanitize(item)}</div>
      <div class="item-q">x${qty}</div>
      <div class="item-p">${currency()}${price}</div>
    </div>`;
  });

  const gst   = Math.round(subtotal * gstRate());
  const total = subtotal + gst;
  document.getElementById('billItems').innerHTML      = html;
  document.getElementById('billSubtotal').textContent  = currency() + subtotal;
  document.getElementById('billGSTLabel').textContent  = `GST (${settings.gst || 5}%)`;
  document.getElementById('billGST').textContent       = currency() + gst;
  document.getElementById('billTotal').textContent     = currency() + total;
  document.getElementById('billFooterText').textContent = settings.footer || '';
  showScreen('bill');
};

window.clearTable = async function() {
  if (!confirm(`Clear all orders for ${currentTable.replace(/_/g, ' ')}?`)) return;
  orders[currentTable]      = {};
  savedOrders[currentTable] = [];
  await saveAllOrders();
  currentTable = null;
  renderDashboard();
  showScreen('dashboard');
};

// ══ ADMIN PANEL ══
window.renderAdmin = function() {
  let totalSales = 0, activeTables = 0, totalItems = 0, html = '';
  for (let i = 1; i <= TABLE_COUNT; i++) {
    const key         = `Table_${i}`;
    const tableOrders = (orders && orders[key]) || {};
    const saved       = (savedOrders && savedOrders[key]) || [];
    const merged      = {};
    if (Array.isArray(saved)) {
      saved.forEach(entry => {
        Object.entries(entry.items || {}).forEach(([item, qty]) => {
          merged[item] = (merged[item] || 0) + qty;
        });
      });
    }
    Object.entries(tableOrders).forEach(([item, qty]) => { merged[item] = (merged[item] || 0) + qty; });
    const itemCount  = Object.values(merged).reduce((a, b) => a + b, 0);
    let   tableTotal = 0;
    Object.entries(merged).forEach(([item, qty]) => { tableTotal += getPrice(item) * qty; });

    if (itemCount > 0) {
      activeTables++; totalItems += itemCount; totalSales += tableTotal;
      html += `<div class="admin-table-row active-table">
        <div>
          <div class="admin-table-name">Table ${i}</div>
          <div class="admin-table-info">${itemCount} items</div>
        </div>
        <div class="admin-table-amount">${currency()}${tableTotal}</div>
      </div>`;
    } else {
      html += `<div class="admin-table-row">
        <div>
          <div class="admin-table-name">Table ${i}</div>
          <div class="admin-table-info">Available</div>
        </div>
        <div class="admin-table-amount" style="color:var(--gray)">—</div>
      </div>`;
    }
  }

  document.getElementById('adminStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${currency()}${totalSales}</div>
      <div class="stat-label">Total Sales</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${activeTables}</div>
      <div class="stat-label">Active Tables</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalItems}</div>
      <div class="stat-label">Items Ordered</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${TABLE_COUNT - activeTables}</div>
      <div class="stat-label">Free Tables</div>
    </div>`;
  document.getElementById('adminTableList').innerHTML = html;
};

// ══ MENU EDITOR ══
function renderMenuEditor() {
  isEditingMenu = true;
  const wrap = document.getElementById('menuEditorWrap');
  let html = `<div class="menu-editor">`;

  MENU.forEach((cat, catIdx) => {
    html += `
      <div class="editor-category" id="editorCat_${catIdx}">
        <div class="editor-cat-header">
          <input class="editor-cat-name" value="${cat.category}"
            onchange="updateCategoryName(${catIdx}, this.value)" placeholder="Category name"/>
          <button class="editor-delete-cat" onclick="deleteCategory(${catIdx})" title="Delete category">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>`;

    cat.items.forEach((item, itemIdx) => {
      html += `
        <div class="editor-item" id="editorItem_${catIdx}_${itemIdx}">
          <input class="editor-item-name" value="${item.name}"
            onchange="updateItemName(${catIdx},${itemIdx},this.value)" placeholder="Item name"/>
          <div class="editor-price-wrap">
            <span class="editor-currency">${currency()}</span>
            <input class="editor-item-price" type="number" value="${item.price}"
              onchange="updateItemPrice(${catIdx},${itemIdx},this.value)" placeholder="0"/>
          </div>
          <button class="editor-delete-item" onclick="deleteItem(${catIdx},${itemIdx})" title="Delete item">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>`;
    });

    html += `
        <button class="editor-add-item" onclick="addItem(${catIdx})">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add Item
        </button>
      </div>`;
  });

  html += `
    <button class="editor-add-cat" onclick="addCategory()">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      Add Category
    </button>
    <button class="btn-gold" style="margin-top:16px" onclick="saveMenuEditor()">
      <span>SAVE MENU</span>
      <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
      </svg>
    </button>
  </div>`;

  wrap.innerHTML = html;
}

window.updateCategoryName = function(catIdx, val) { MENU[catIdx].category = val; };
window.updateItemName     = function(catIdx, itemIdx, val) { MENU[catIdx].items[itemIdx].name = val; };
window.updateItemPrice    = function(catIdx, itemIdx, val) { MENU[catIdx].items[itemIdx].price = parseFloat(val) || 0; };

window.deleteItem = async function(catIdx, itemIdx) {
  MENU[catIdx].items.splice(itemIdx, 1);
  await set(ref(db, `config/menu/${catIdx}/items`), MENU[catIdx].items);
  renderMenuEditor();
};

window.deleteCategory = async function(catIdx) {
  if (!confirm(`Delete category "${MENU[catIdx].category}" and all its items?`)) return;
  MENU.splice(catIdx, 1);
  await set(ref(db, 'config/menu'), MENU);
  renderMenuEditor();
};

window.addItem = function(catIdx) {
  MENU[catIdx].items.push({ name: '', price: 0 });
  renderMenuEditor();
  const items = document.querySelectorAll(`#editorCat_${catIdx} .editor-item-name`);
  if (items.length) items[items.length - 1].focus();
};

window.addCategory = function() {
  MENU.push({ category: 'New Category', items: [] });
  renderMenuEditor();
};

window.saveMenuEditor = async function() {
  document.querySelectorAll('.editor-cat-name').forEach((el, i) => {
    if (MENU[i]) MENU[i].category = el.value.trim() || MENU[i].category;
  });
  const saves = MENU.map((cat, i) =>
    set(ref(db, `config/menu/${i}`), cat)
  );
  await Promise.all(saves);
  isEditingMenu = false;
  showToast('Menu saved.');
};
