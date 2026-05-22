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

let currentUser = "Staff";
let currentTable = null;
let orders = JSON.parse(localStorage.getItem('tanne_orders') || '{}');
let savedOrders = JSON.parse(localStorage.getItem('tanne_saved_orders') || '{}');

window.onload = () => {
  showScreen('splash');
  setTimeout(() => showScreen('login'), 2200);
};

function saveData() {
  localStorage.setItem('tanne_orders', JSON.stringify(orders));
  localStorage.setItem('tanne_saved_orders', JSON.stringify(savedOrders));
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// LOGIN
function doLogin() {
  const email = document.getElementById('loginEmail').value || "staff@tanne.com";
  currentUser = email.split('@')[0] || "Staff";
  currentUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1);
  document.getElementById('userAvatar').textContent = currentUser.charAt(0).toUpperCase();
  document.getElementById('orderAvatar').textContent = currentUser.charAt(0).toUpperCase();
  renderDashboard();
  showScreen('dashboard');
}

function doLogout() {
  showScreen('login');
}

// DASHBOARD
function renderDashboard() {
  const grid = document.getElementById('tablesGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 11; i++) {
    const key = `Table ${i}`;
    const tableOrders = orders[key] || {};
    const saved = savedOrders[key] || [];
    const count = Object.values(tableOrders).reduce((a, b) => a + b, 0);
    const savedCount = saved.reduce((total, entry) =>
      total + Object.values(entry.items).reduce((a, b) => a + b, 0), 0);
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
}

// ORDER
function openTable(num) {
  currentTable = `Table ${num}`;
  if (!orders[currentTable]) orders[currentTable] = {};
  document.getElementById('orderTableTitle').textContent = currentTable;
  document.getElementById('searchInput').value = '';
  renderSavedOrders();
  renderMenu('');
  updateCartBar();
  showScreen('order');
}

function goBack() {
  renderDashboard();
  showScreen('dashboard');
}

// SAVED ORDERS
function renderSavedOrders() {
  const wrap = document.getElementById('savedOrdersWrap');
  const saved = savedOrders[currentTable] || [];
  if (saved.length === 0) { wrap.innerHTML = ''; return; }

  let html = `<div class="saved-orders-section">
    <div class="saved-orders-header">
      <svg width="14" height="14" fill="none" stroke="#C9A84C" stroke-width="2" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
      Previous Orders
    </div>`;

  saved.forEach((entry) => {
    const itemLines = Object.entries(entry.items)
      .map(([item, qty]) => `${item} x${qty} — ₹${(PRICE[item] || 0) * qty}`)
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

// SAVE ORDER
function saveOrder() {
  const tableOrders = orders[currentTable] || {};
  const items = Object.entries(tableOrders).filter(([, q]) => q > 0);
  if (items.length === 0) { alert('No items to save!'); return; }

  if (!savedOrders[currentTable]) savedOrders[currentTable] = [];

  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  savedOrders[currentTable].push({
    by: currentUser,
    time: time,
    items: { ...tableOrders }
  });

  orders[currentTable] = {};
  saveData();
  renderSavedOrders();
  renderMenu('');
  updateCartBar();
  alert(`Order saved by ${currentUser} at ${time}`);
}

// MENU
function renderMenu(query) {
  const scroll = document.getElementById('menuScroll');
  const q = query.toLowerCase().trim();
  let html = '';
  let anyResult = false;

  MENU.forEach(cat => {
    const filtered = cat.items.filter(item =>
      !q || item.toLowerCase().startsWith(q)
    );
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
            <div class="item-price">₹${PRICE[item] || 0}</div>
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

  if (!anyResult) {
    html = `<div class="no-results"><div>🔍</div>No results for "${query}"</div>`;
  }
  scroll.innerHTML = html;
}

function changeQty(item, delta) {
  if (!orders[currentTable]) orders[currentTable] = {};
  const cur = orders[currentTable][item] || 0;
  const next = cur + delta;
  if (next <= 0) delete orders[currentTable][item];
  else orders[currentTable][item] = next;
  saveData();
  renderMenu(document.getElementById('searchInput').value);
  updateCartBar();
}

function filterMenu() {
  renderMenu(document.getElementById('searchInput').value);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  renderMenu('');
}

function updateCartBar() {
  const tableOrders = orders[currentTable] || {};
  let count = 0, total = 0;
  Object.entries(tableOrders).forEach(([item, qty]) => {
    count += qty;
    total += (PRICE[item] || 0) * qty;
  });
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = '₹' + total;
}

// BILL
function generateBill() {
  const saved = savedOrders[currentTable] || [];
  const current = orders[currentTable] || {};
  const currentItems = Object.entries(current).filter(([, q]) => q > 0);

  if (saved.length === 0 && currentItems.length === 0) {
    alert('No items added yet!'); return;
  }

  const merged = {};
  saved.forEach(entry => {
    Object.entries(entry.items).forEach(([item, qty]) => {
      merged[item] = (merged[item] || 0) + qty;
    });
  });
  currentItems.forEach(([item, qty]) => {
    merged[item] = (merged[item] || 0) + qty;
  });

  const now = new Date();
  document.getElementById('billTable').textContent = currentTable;
  document.getElementById('billDate').textContent = now.toLocaleDateString('en-IN');
  document.getElementById('billTime').textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let subtotal = 0;
  let html = '';
  Object.entries(merged).forEach(([item, qty]) => {
    const price = (PRICE[item] || 0) * qty;
    subtotal += price;
    html += `<div class="bill-row">
      <div class="item-n">${item}</div>
      <div class="item-q">x${qty}</div>
      <div class="item-p">₹${price}</div>
    </div>`;
  });

  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;

  document.getElementById('billItems').innerHTML = html;
  document.getElementById('billSubtotal').textContent = '₹' + subtotal;
  document.getElementById('billGST').textContent = '₹' + gst;
  document.getElementById('billTotal').textContent = '₹' + total;

  showScreen('bill');
}

function clearTable() {
  if (confirm(`Clear all orders for ${currentTable}?`)) {
    orders[currentTable] = {};
    savedOrders[currentTable] = [];
    saveData();
    renderDashboard();
    showScreen('dashboard');
  }
}
