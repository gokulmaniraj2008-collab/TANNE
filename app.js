import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// ── FIREBASE CONFIG ── paste your own config here
const firebaseConfig = {
  apiKey: "AIzaSyAINxTtXeNe93rlFb-xHbEeCIaMBFbminY",
  authDomain: "tanne-cb8d4.firebaseapp.com",
  projectId: "tanne-cb8d4",
  storageBucket: "tanne-cb8d4.firebasestorage.app",
  messagingSenderId: "701467555469",
  appId: "1:701467555469:web:b268ae55ba501840b4d4c4",
  measurementId: "G-YNZXHXRHD7",
  databaseURL: "https://tanne-cb8d4-default-rtdb.firebaseio.com"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ── MENU ──
const MENU = [
  {
    category: "Main Course",
    items: [
      "Chicken Biryani","Mutton Biryani","Gilma Biryani",
      "Chicken Noodle",
      "Penne Pasta White Sauce Veg","Penne Pasta White Sauce Non-Veg",
      "Mac & Cheese Pasta Veg","Mac & Cheese Pasta Non-Veg"
    ]
  },
  {
    category: "Starters (Non-Veg)",
    items: [
      "Tanne Spl Chicken","Pallipalayam Chicken","Fish and Chips",
      "Crab Lollipop","Vanjaram Tawa Fish Fry","Nethili Rawa Fried Fish",
      "Beef Chukka with Coin Parotta","Yaki Tori Chicken",
      "Tandoori Chicken Full","Tandoori Chicken Half","Chicken Tikka"
    ]
  },
  {
    category: "Starters (Veg)",
    items: [
      "Mushroom Nei Roast with Coin Parotta","Gobi Veppudu",
      "Kalan Patani Milagu Pirattal","Thread Cottage Cheese",
      "Thai Chilli Paneer","Kunafa Crispy Paneer","Korean Chilli Tofu",
      "Lal Mirchi Paneer Tikka","Honey Chilli Lotus Stem","Malai Cheese Broccoli"
    ]
  },
  {
    category: "Indian Breads",
    items: ["Naan","Roti","Parotta"]
  }
];

const PRICE = {};
MENU.forEach(cat => cat.items.forEach(item => {
  if (cat.category === "Indian Breads") PRICE[item] = 30;
  else if (cat.category.includes("Veg")) PRICE[item] = 180;
  else if (cat.category === "Main Course") PRICE[item] = 250;
  else PRICE[item] = 220;
}));

// ── STATE ──
let currentUser = "Staff";
let currentTable = null;
let orders = {};
let savedOrders = {};
let adminUnlocked = false;  // session memory — stays true until logout
let adminAttempts = 0;
let lockoutTimer = null;
let TABLE_COUNT = 11;

// ── INIT ──
window.onload = () => {
  showScreen('splash');
  setTimeout(() => showScreen('login'), 2200);

  onValue(ref(db, 'orders'), snapshot => {
    orders = snapshot.val() || {};
    if (document.getElementById('dashboard').classList.contains('active')) renderDashboard();
  });

  onValue(ref(db, 'savedOrders'), snapshot => {
    savedOrders = snapshot.val() || {};
    if (document.getElementById('dashboard').classList.contains('active')) renderDashboard();
    if (currentTable && document.getElementById('order').classList.contains('active')) renderSavedOrders();
    if (document.getElementById('admin').classList.contains('active')) renderAdmin();
  });

  // Load settings from Firebase
  get(ref(db, 'config/settings')).then(snap => {
    if (snap.exists()) applySettings(snap.val());
  });
};

// ── SCREENS ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}
window.showScreen = showScreen;

// ── SETTINGS ──
function applySettings(s) {
  if (s.tables) TABLE_COUNT = parseInt(s.tables);
  if (s.gst) window._GST = parseFloat(s.gst) / 100;
  if (s.currency) window._CURRENCY = s.currency;
  if (s.name) document.querySelectorAll('.logo-name').forEach(el => {
    if (el.textContent !== 'ADMIN') el.textContent = s.name.toUpperCase();
  });
}

window.saveSettings = async function() {
  const settings = {
    name:     document.getElementById('setName').value || 'TANNE',
    gst:      document.getElementById('setGST').value || '5',
    tables:   document.getElementById('setTables').value || '11',
    currency: document.getElementById('setCurrency').value || '₹',
    footer:   document.getElementById('setFooter').value || 'Thank you for dining with us!'
  };
  await set(ref(db, 'config/settings'), settings);
  applySettings(settings);
  alert('✓ Settings saved!');
};

// helpers
function currency() { return window._CURRENCY || '₹'; }
function gstRate()  { return window._GST !== undefined ? window._GST : 0.05; }

// ── FIREBASE WRITE ──
async function saveOrders()      { await set(ref(db, 'orders'), orders); }
async function saveSavedOrders() { await set(ref(db, 'savedOrders'), savedOrders); }

// ── LOGIN ──
window.doLogin = function() {
  const email = document.getElementById('loginEmail').value || "staff@tanne.com";
  currentUser = email.split('@')[0] || "Staff";
  currentUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
  document.getElementById('userAvatar').textContent  = currentUser.charAt(0).toUpperCase();
  document.getElementById('orderAvatar').textContent = currentUser.charAt(0).toUpperCase();
  adminUnlocked = false;  // reset admin session on new login
  adminAttempts = 0;
  renderDashboard();
  showScreen('dashboard');
};

window.doLogout = function() {
  adminUnlocked = false;
  adminAttempts = 0;
  showScreen('login');
};

// ── DASHBOARD ──
function renderDashboard() {
  const grid = document.getElementById('tablesGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= TABLE_COUNT; i++) {
    const key = `Table_${i}`;
    const tableOrders = (orders && orders[key]) || {};
    const saved = (savedOrders && savedOrders[key]) || [];
    const count = Object.values(tableOrders).reduce((a, b) => a + b, 0);
    const savedCount = Array.isArray(saved)
      ? saved.reduce((total, entry) => total + Object.values(entry.items || {}).reduce((a, b) => a + b, 0), 0)
      : 0;
    const hasActivity = count > 0 || savedCount > 0;
    grid.innerHTML += `
      <div class="table-card ${hasActivity ? 'has-orders' : ''}" onclick="openTable(${i})">
        ${hasActivity ? `<div class="table-badge">${count + savedCount}</div>` : ''}
        <div class="table-icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="10" width="22" height="3" rx="1.5" fill="${hasActivity ? '#C9A84C' : '#444'}"/>
            <rect x="6" y="13" width="2" height="9" rx="1" fill="${hasActivity ? '#C9A84C' : '#444'}"/>
            <rect x="20" y="13" width="2" height="9" rx="1" fill="${hasActivity ? '#C9A84C' : '#444'}"/>
            <rect x="5" y="7" width="18" height="4" rx="2" fill="${hasActivity ? '#8B6914' : '#333'}"/>
          </svg>
        </div>
        <div class="table-num">Table ${i}</div>
        <div class="table-status">${hasActivity ? (count + savedCount) + ' items' : 'Available'}</div>
      </div>`;
  }

  // Admin button — always visible, but protected by secret code
  grid.insertAdjacentHTML('afterend', `
    <button class="admin-btn" onclick="openAdminModal()">
      <svg width="15" height="15" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
      ADMIN PANEL
    </button>
  `);
}
window.renderDashboard = renderDashboard;

// ── ADMIN MODAL ──
window.openAdminModal = function() {
  // If already unlocked this session, go straight in
  if (adminUnlocked) {
    showScreen('admin');
    renderAdmin();
    loadSettingsIntoForm();
    return;
  }

  // If locked out, show remaining time
  if (lockoutTimer) {
    document.getElementById('modalAttempts').textContent = '';
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminCodeInput').disabled = true;
    return;
  }

  document.getElementById('adminCodeInput').value = '';
  document.getElementById('modalAttempts').textContent = '';
  document.getElementById('modalTimer').textContent = '';
  document.getElementById('adminCodeInput').disabled = false;
  document.getElementById('adminModal').classList.add('active');
  setTimeout(() => document.getElementById('adminCodeInput').focus(), 100);
};

window.closeAdminModal = function() {
  document.getElementById('adminModal').classList.remove('active');
};

window.toggleCodeVisibility = function() {
  const input = document.getElementById('adminCodeInput');
  const btn   = document.getElementById('eyeBtn');
  if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈'; }
  else                           { input.type = 'password'; btn.textContent = '👁'; }
};

window.submitAdminCode = async function() {
  if (lockoutTimer) return;

  const entered = document.getElementById('adminCodeInput').value.trim();

  // Fetch secret code from Firebase
  const snap = await get(ref(db, 'config/adminCode'));
  const correct = snap.exists() ? snap.val() : 'TANNE2026';

  if (entered === correct) {
    // ✓ Correct
    adminUnlocked = true;
    adminAttempts = 0;
    document.getElementById('adminModal').classList.remove('active');
    showScreen('admin');
    renderAdmin();
    loadSettingsIntoForm();
  } else {
    // × Wrong
    adminAttempts++;
    const remaining = 3 - adminAttempts;

    const card = document.querySelector('.modal-card');
    card.classList.remove('shake');
    void card.offsetWidth; // reflow to restart animation
    card.classList.add('shake');

    if (adminAttempts >= 3) {
      // Lockout for 30 seconds
      document.getElementById('adminCodeInput').disabled = true;
      document.getElementById('modalAttempts').textContent = '❌ Too many attempts!';
      let secs = 30;
      document.getElementById('modalTimer').textContent = `Try again in ${secs}s`;
      lockoutTimer = setInterval(() => {
        secs--;
        document.getElementById('modalTimer').textContent = `Try again in ${secs}s`;
        if (secs <= 0) {
          clearInterval(lockoutTimer);
          lockoutTimer = null;
          adminAttempts = 0;
          document.getElementById('adminCodeInput').disabled = false;
          document.getElementById('adminCodeInput').value = '';
          document.getElementById('modalAttempts').textContent = '';
          document.getElementById('modalTimer').textContent = '';
        }
      }, 1000);
    } else {
      document.getElementById('modalAttempts').textContent =
        `× Wrong code — ${remaining} attempt${remaining !== 1 ? 's' : ''} left`;
    }
  }
};

function loadSettingsIntoForm() {
  get(ref(db, 'config/settings')).then(snap => {
    if (!snap.exists()) return;
    const s = snap.val();
    if (s.name)     document.getElementById('setName').value     = s.name;
    if (s.gst)      document.getElementById('setGST').value      = s.gst;
    if (s.tables)   document.getElementById('setTables').value   = s.tables;
    if (s.currency) document.getElementById('setCurrency').value = s.currency;
    if (s.footer)   document.getElementById('setFooter').value   = s.footer;
  });
}

// ── ORDER ──
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

window.goBack = function() {
  renderDashboard();
  showScreen('dashboard');
};

// ── SAVED ORDERS ──
function renderSavedOrders() {
  const wrap = document.getElementById('savedOrdersWrap');
  const saved = (savedOrders && savedOrders[currentTable]) || [];
  if (!Array.isArray(saved) || saved.length === 0) { wrap.innerHTML = ''; return; }

  let html = `<div class="saved-orders-section">
    <div class="saved-orders-header">
      <svg width="14" height="14" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
      Previous Orders
    </div>`;

  saved.forEach(entry => {
    const itemLines = Object.entries(entry.items || {})
      .map(([item, qty]) => `${item} x${qty} — ${currency()}${(PRICE[item] || 0) * qty}`)
      .join('<br>');
    html += `
      <div class="saved-order-entry">
        <div class="saved-order-meta">
          <svg width="13" height="13" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          ${entry.by} &nbsp;·&nbsp;
          <svg width="13" height="13" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 7v5l3 3"/>
          </svg>
          ${entry.time}
        </div>
        <div class="saved-order-items">${itemLines}</div>
      </div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

// ── SAVE ORDER ──
window.saveOrder = async function() {
  const tableOrders = orders[currentTable] || {};
  const items = Object.entries(tableOrders).filter(([, q]) => q > 0);
  if (items.length === 0) { alert('No items to save!'); return; }

  if (!savedOrders[currentTable]) savedOrders[currentTable] = [];

  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  savedOrders[currentTable].push({ by: currentUser, time, items: { ...tableOrders } });
  orders[currentTable] = {};

  await saveOrders();
  await saveSavedOrders();
  renderSavedOrders();
  renderMenu('');
  updateCartBar();
  alert(`Order saved by ${currentUser} at ${time}`);
};

// ── MENU ──
function renderMenu(query) {
  const scroll = document.getElementById('menuScroll');
  const q = query.toLowerCase().trim();
  let html = '';
  let anyResult = false;

  MENU.forEach(cat => {
    const filtered = cat.items.filter(item => !q || item.toLowerCase().startsWith(q));
    if (filtered.length === 0) return;
    anyResult = true;
    html += `<div class="menu-category">
      <div class="category-label">${cat.category}</div>`;
    filtered.forEach(item => {
      const qty = (orders[currentTable] && orders[currentTable][item]) || 0;
      const selected = qty > 0;
      html += `
        <div class="menu-item ${selected ? 'selected' : ''}">
          <div>
            <div class="item-name">${item}</div>
            <div class="item-price">${currency()}${PRICE[item] || 0}</div>
          </div>
          <div class="item-qty-wrap">
            ${selected ? `
              <button class="qty-btn" onclick="changeQty('${item}',-1);event.stopPropagation()">−</button>
              <div class="qty-num">${qty}</div>
              <button class="qty-btn" onclick="changeQty('${item}',1);event.stopPropagation()">+</button>
            ` : `
              <button class="add-btn" onclick="changeQty('${item}',1);event.stopPropagation()">ADD</button>
            `}
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  if (!anyResult) html = `<div class="no-results"><div>🔍</div>No results for "${query}"</div>`;
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
    count += qty;
    total += (PRICE[item] || 0) * qty;
  });
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = currency() + total;
}

// ── BILL ──
window.generateBill = function() {
  const saved   = (savedOrders && savedOrders[currentTable]) || [];
  const current = orders[currentTable] || {};
  const currentItems = Object.entries(current).filter(([, q]) => q > 0);

  if ((!Array.isArray(saved) || saved.length === 0) && currentItems.length === 0) {
    alert('No items added yet!'); return;
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

  let subtotal = 0;
  let html = '';
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

  document.getElementById('billItems').innerHTML    = html;
  document.getElementById('billSubtotal').textContent = currency() + subtotal;
  document.getElementById('billGST').textContent      = currency() + gst;
  document.getElementById('billTotal').textContent    = currency() + total;

  showScreen('bill');
};

window.clearTable = async function() {
  if (confirm(`Clear all orders for ${currentTable.replace('_', ' ')}?`)) {
    orders[currentTable]      = {};
    savedOrders[currentTable] = [];
    await saveOrders();
    await saveSavedOrders();
    renderDashboard();
    showScreen('dashboard');
  }
};

// ── ADMIN ──
window.renderAdmin = function() {
  let totalSales = 0, activeTables = 0, totalItems = 0;
  let html = '';

  for (let i = 1; i <= TABLE_COUNT; i++) {
    const key         = `Table_${i}`;
    const tableOrders = (orders && orders[key]) || {};
    const saved       = (savedOrders && savedOrders[key]) || [];

    const merged = {};
    if (Array.isArray(saved)) {
      saved.forEach(entry => {
        Object.entries(entry.items || {}).forEach(([item, qty]) => {
          merged[item] = (merged[item] || 0) + qty;
        });
      });
    }
    Object.entries(tableOrders).forEach(([item, qty]) => {
      merged[item] = (merged[item] || 0) + qty;
    });

    const itemCount  = Object.values(merged).reduce((a, b) => a + b, 0);
    let   tableTotal = 0;
    Object.entries(merged).forEach(([item, qty]) => { tableTotal += (PRICE[item] || 0) * qty; });

    if (itemCount > 0) {
      activeTables++;
      totalItems += itemCount;
      totalSales += tableTotal;
      html += `
        <div class="admin-table-row active-table">
          <div>
            <div class="admin-table-name">Table ${i}</div>
            <div class="admin-table-info">${itemCount} items</div>
          </div>
          <div class="admin-table-amount">${currency()}${tableTotal}</div>
        </div>`;
    } else {
      html += `
        <div class="admin-table-row">
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
      <div class="stat-label">Total Items</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${TABLE_COUNT - activeTables}</div>
      <div class="stat-label">Free Tables</div>
    </div>
  `;
  document.getElementById('adminTableList').innerHTML = html;
};
