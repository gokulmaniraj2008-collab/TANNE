// ══ CONFIG LOADER — fetches Firebase keys from Vercel env via /api/config ══
import { initializeApp }                            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue }      from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

async function loadConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to load config');
  return res.json();
}

// ══ MENU ══
const MENU = [
  { category: "Main Course", items: [
    "Chicken Biryani","Mutton Biryani","Gilma Biryani","Chicken Noodle",
    "Penne Pasta White Sauce Veg","Penne Pasta White Sauce Non-Veg",
    "Mac & Cheese Pasta Veg","Mac & Cheese Pasta Non-Veg"
  ]},
  { category: "Starters (Non-Veg)", items: [
    "Tanne Spl Chicken","Pallipalayam Chicken","Fish and Chips","Crab Lollipop",
    "Vanjaram Tawa Fish Fry","Nethili Rawa Fried Fish","Beef Chukka with Coin Parotta",
    "Yaki Tori Chicken","Tandoori Chicken Full","Tandoori Chicken Half","Chicken Tikka"
  ]},
  { category: "Starters (Veg)", items: [
    "Mushroom Nei Roast with Coin Parotta","Gobi Veppudu","Kalan Patani Milagu Pirattal",
    "Thread Cottage Cheese","Thai Chilli Paneer","Kunafa Crispy Paneer","Korean Chilli Tofu",
    "Lal Mirchi Paneer Tikka","Honey Chilli Lotus Stem","Malai Cheese Broccoli"
  ]},
  { category: "Indian Breads", items: ["Naan","Roti","Parotta"] }
];

const PRICE = {};
MENU.forEach(cat => cat.items.forEach(item => {
  if      (cat.category === "Indian Breads")           PRICE[item] = 30;
  else if (cat.category.includes("Veg"))               PRICE[item] = 180;
  else if (cat.category === "Main Course")             PRICE[item] = 250;
  else                                                 PRICE[item] = 220;
}));

// ══ STATE ══
let db;
let currentUser    = "Staff";
let currentTable   = null;
let orders         = {};
let savedOrders    = {};
let adminUnlocked  = false;
let adminAttempts  = 0;
let lockoutTimer   = null;
let TABLE_COUNT    = 11;
let settings       = { name: "TANNE RESTOBAR", gst: 5, tables: 11, currency: "₹", footer: "Thank you for dining with us!", adminCode: "TANNE2026" };

// ══ HELPERS ══
function currency() { return settings.currency || "₹"; }
function gstRate()  { return (settings.gst || 5) / 100; }

// ══ FIREBASE SAVE ══
async function saveOrders()      { await set(ref(db, 'orders'),      orders);      }
async function saveSavedOrders() { await set(ref(db, 'savedOrders'), savedOrders); }

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
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}
window.showScreen = showScreen;

// ══ TOGGLE PASSWORD VISIBILITY ══
window.togglePass = function(inputId, btn) {
  const input = document.getElementById(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.style.color = isHidden ? 'var(--gold)' : 'var(--gray)';
};

// ══ INIT ══
window.onload = async () => {
  showScreen('splash');
  try {
    const config = await loadConfig();
    const app = initializeApp(config);
    db = getDatabase(app);

    // Real-time listeners
    onValue(ref(db, 'orders'), snap => {
      orders = snap.val() || {};
      if (document.getElementById('dashboard').classList.contains('active')) renderDashboard();
    });
    onValue(ref(db, 'savedOrders'), snap => {
      savedOrders = snap.val() || {};
      if (document.getElementById('dashboard').classList.contains('active')) renderDashboard();
      if (currentTable && document.getElementById('order').classList.contains('active')) renderSavedOrders();
      if (document.getElementById('admin').classList.contains('active')) renderAdmin();
    });
    onValue(ref(db, 'config/settings'), snap => {
      if (snap.exists()) applySettings(snap.val());
    });

    setTimeout(() => showScreen('login'), 2200);
  } catch (err) {
    console.error('Init failed:', err);
    setTimeout(() => showScreen('login'), 2200);
  }
};

function applySettings(s) {
  settings = { ...settings, ...s };
  TABLE_COUNT = parseInt(s.tables) || 11;
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
  if (pass.length < 6)           return showError('signupError', 'Password must be at least 6 characters.');

  get(ref(db, 'accounts')).then(snap => {
    const accounts = snap.val() || {};
    const exists = Object.values(accounts).some(a => a.email === email);
    if (exists) return showError('signupError', 'An account with this email already exists.');
    const id = Date.now().toString();
    set(ref(db, `accounts/${id}`), { name, email, pass });
    showToast('Account created. Please sign in.');
    showScreen('login');
  });
};

window.doLogin = function() {
  hideError('loginError');
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;

  get(ref(db, 'accounts')).then(snap => {
    const accounts = snap.val() || {};
    const account  = Object.values(accounts).find(a => a.email === email && a.pass === pass);
    if (!account) return showError('loginError', 'Incorrect email or password.');
    currentUser = account.name;
    const initial = account.name.charAt(0).toUpperCase();
    document.getElementById('userAvatar').textContent  = initial;
    document.getElementById('orderAvatar').textContent = initial;
    renderDashboard();
    showScreen('dashboard');
  });
};

window.doLogout = function() {
  currentUser   = "Staff";
  adminUnlocked = false;
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value  = '';
  showScreen('login');
};

// ══ DASHBOARD ══
function renderDashboard() {
  const grid = document.getElementById('tablesGrid');
  grid.innerHTML = '';
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

    grid.innerHTML += `
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
  if (adminUnlocked) { showScreen('admin'); renderAdmin(); loadSettingsIntoForm(); return; }
  if (lockoutTimer) {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminCodeInput').disabled = true;
    return;
  }
  document.getElementById('adminCodeInput').value   = '';
  document.getElementById('modalAttempts').textContent = '';
  document.getElementById('modalTimer').textContent    = '';
  document.getElementById('adminCodeInput').disabled   = false;
  document.getElementById('adminModal').classList.add('active');
  setTimeout(() => document.getElementById('adminCodeInput').focus(), 100);
};

window.closeAdminModal = function() {
  document.getElementById('adminModal').classList.remove('active');
};

window.submitAdminCode = async function() {
  if (lockoutTimer) return;
  const entered = document.getElementById('adminCodeInput').value.trim();
  const snap    = await get(ref(db, 'config/settings'));
  const correct = snap.exists() && snap.val().adminCode ? snap.val().adminCode : 'TANNE2026';

  if (entered === correct) {
    adminUnlocked = true; adminAttempts = 0;
    document.getElementById('adminModal').classList.remove('active');
    showScreen('admin'); renderAdmin(); loadSettingsIntoForm();
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
          document.getElementById('adminCodeInput').disabled = false;
          document.getElementById('adminCodeInput').value    = '';
          document.getElementById('modalAttempts').textContent = '';
          document.getElementById('modalTimer').textContent    = '';
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
    if (s.adminCode) document.getElementById('setAdminCode').value = '';
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
  if (newCode.length >= 4) newSettings.adminCode = newCode;
  await set(ref(db, 'config/settings'), newSettings);
  applySettings(newSettings);
  showToast('Settings saved.');
};

// ══ ORDER ══
window.openTable = function(num) {
  currentTable = `Table_${num}`;
  if (!orders[currentTable]) orders[currentTable] = {};
  document.getElementById('orderTableTitle').textContent = `Table ${num}`;
  document.getElementById('searchInput').value = '';
  renderSavedOrders();
  renderMenu('');
  updateCartBar();
  showScreen('order');
};

window.goBack = function() { renderDashboard(); showScreen('dashboard'); };

// ══ SAVED ORDERS ══
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
  saved.forEach(entry => {
    const lines = Object.entries(entry.items || {})
      .map(([item, qty]) => `${item} x${qty} — ${currency()}${(PRICE[item] || 0) * qty}`)
      .join('<br>');
    html += `
      <div class="saved-order-entry">
        <div class="saved-order-meta">
          <svg width="12" height="12" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          ${entry.by}
          <svg width="12" height="12" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
          </svg>
          ${entry.time}
        </div>
        <div class="saved-order-items">${lines}</div>
      </div>`;
  });
  html += `</div>`;
  wrap.innerHTML = html;
}

// ══ SAVE ORDER ══
window.saveOrder = async function() {
  const tableOrders = orders[currentTable] || {};
  const items = Object.entries(tableOrders).filter(([, q]) => q > 0);
  if (items.length === 0) { showToast('No items to save.'); return; }
  if (!savedOrders[currentTable]) savedOrders[currentTable] = [];
  const now  = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  savedOrders[currentTable].push({ by: currentUser, time, items: { ...tableOrders } });
  orders[currentTable] = {};
  await saveOrders();
  await saveSavedOrders();
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
    const filtered = cat.items.filter(item => !q || item.toLowerCase().includes(q));
    if (!filtered.length) return;
    anyResult = true;
    html += `<div class="menu-category"><div class="category-label">${cat.category}</div>`;
    filtered.forEach(item => {
      const qty      = (orders[currentTable] && orders[currentTable][item]) || 0;
      const selected = qty > 0;
      const display  = q
        ? item.replace(new RegExp(`(${q})`, 'gi'), '<span style="color:var(--gold);font-weight:700">$1</span>')
        : item;
      html += `
        <div class="menu-item ${selected ? 'selected' : ''}">
          <div>
            <div class="item-name">${display}</div>
            <div class="item-price">${currency()}${PRICE[item] || 0}</div>
          </div>
          <div class="item-qty-wrap">
            ${selected ? `
              <button class="qty-btn" onclick="changeQty('${item.replace(/'/g,"\\'")}', -1)">−</button>
              <div class="qty-num">${qty}</div>
              <button class="qty-btn" onclick="changeQty('${item.replace(/'/g,"\\'")}', 1)">+</button>
            ` : `
              <button class="add-btn" onclick="changeQty('${item.replace(/'/g,"\\'")}', 1)">ADD</button>
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

window.changeQty = async function(item, delta) {
  if (!orders[currentTable]) orders[currentTable] = {};
  const cur  = orders[currentTable][item] || 0;
  const next = cur + delta;
  if (next <= 0) delete orders[currentTable][item];
  else orders[currentTable][item] = next;
  await saveOrders();
  renderMenu(document.getElementById('searchInput').value);
  updateCartBar();
};

window.filterMenu = function() { renderMenu(document.getElementById('searchInput').value); };
window.clearSearch = function() { document.getElementById('searchInput').value = ''; renderMenu(''); };

function updateCartBar() {
  const tableOrders = orders[currentTable] || {};
  let count = 0, total = 0;
  Object.entries(tableOrders).forEach(([item, qty]) => {
    count += qty; total += (PRICE[item] || 0) * qty;
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
  document.getElementById('billTable').textContent = currentTable.replace('_', ' ');
  document.getElementById('billDate').textContent  = now.toLocaleDateString('en-IN');
  document.getElementById('billTime').textContent  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let subtotal = 0, html = '';
  Object.entries(merged).forEach(([item, qty]) => {
    const price = (PRICE[item] || 0) * qty;
    subtotal += price;
    html += `<div class="bill-row">
      <div class="item-n">${item}</div>
      <div class="item-q">x${qty}</div>
      <div class="item-p">${currency()}${price}</div>
    </div>`;
  });

  const gst   = Math.round(subtotal * gstRate());
  const total = subtotal + gst;
  document.getElementById('billItems').innerHTML     = html;
  document.getElementById('billSubtotal').textContent = currency() + subtotal;
  document.getElementById('billGSTLabel').textContent = `GST (${settings.gst || 5}%)`;
  document.getElementById('billGST').textContent      = currency() + gst;
  document.getElementById('billTotal').textContent    = currency() + total;
  document.getElementById('billFooterText').textContent = settings.footer || '';
  showScreen('bill');
};

window.clearTable = async function() {
  if (!confirm(`Clear all orders for ${currentTable.replace('_', ' ')}?`)) return;
  orders[currentTable]      = {};
  savedOrders[currentTable] = [];
  await saveOrders();
  await saveSavedOrders();
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
    Object.entries(merged).forEach(([item, qty]) => { tableTotal += (PRICE[item] || 0) * qty; });

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
