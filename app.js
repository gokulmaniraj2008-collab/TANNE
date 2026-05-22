// ══ CONSTANTS ══
const ADMIN_PASSWORD = 'TANNE2026';

// ══ DEFAULT MENU ══
const DEFAULT_MENU = [
  { category: "Main Course", items: [
    {name:"Chicken Biryani",price:250},{name:"Mutton Biryani",price:250},
    {name:"Gilma Biryani",price:250},{name:"Chicken Noodle",price:250},
    {name:"Penne Pasta White Sauce Veg",price:250},{name:"Penne Pasta White Sauce Non-Veg",price:250},
    {name:"Mac & Cheese Pasta Veg",price:250},{name:"Mac & Cheese Pasta Non-Veg",price:250}
  ]},
  { category: "Starters (Non-Veg)", items: [
    {name:"Tanne Spl Chicken",price:220},{name:"Pallipalayam Chicken",price:220},
    {name:"Fish and Chips",price:220},{name:"Crab Lollipop",price:220},
    {name:"Vanjaram Tawa Fish Fry",price:220},{name:"Nethili Rawa Fried Fish",price:220},
    {name:"Beef Chukka with Coin Parotta",price:220},{name:"Yaki Tori Chicken",price:220},
    {name:"Tandoori Chicken Full",price:220},{name:"Tandoori Chicken Half",price:220},
    {name:"Chicken Tikka",price:220}
  ]},
  { category: "Starters (Veg)", items: [
    {name:"Mushroom Nei Roast with Coin Parotta",price:180},{name:"Gobi Veppudu",price:180},
    {name:"Kalan Patani Milagu Pirattal",price:180},{name:"Thread Cottage Cheese",price:180},
    {name:"Thai Chilli Paneer",price:180},{name:"Kunafa Crispy Paneer",price:180},
    {name:"Korean Chilli Tofu",price:180},{name:"Lal Mirchi Paneer Tikka",price:180},
    {name:"Honey Chilli Lotus Stem",price:180},{name:"Malai Cheese Broccoli",price:180}
  ]},
  { category: "Indian Breads", items: [
    {name:"Naan",price:30},{name:"Roti",price:30},{name:"Parotta",price:30}
  ]}
];

// ══ STATE ══
let currentUser = null;
let currentTable = null;
let orders = JSON.parse(localStorage.getItem('tanne_orders') || '{}');
let MENU = JSON.parse(localStorage.getItem('tanne_menu') || 'null') || DEFAULT_MENU;
let accounts = JSON.parse(localStorage.getItem('tanne_accounts') || '[]');
let adminUnlocked = false;

// ══ STORAGE ══
function saveOrders()   { localStorage.setItem('tanne_orders',   JSON.stringify(orders));   }
function saveMenuData() { localStorage.setItem('tanne_menu',     JSON.stringify(MENU));     }
function saveAccounts() { localStorage.setItem('tanne_accounts', JSON.stringify(accounts)); }

// ══ SCREENS ══
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'profile')    loadProfile();
  if (id === 'settings')   loadSettingsMeta();
  if (id === 'menuEditor') { adminUnlocked = false; resetAdminUnlock(); }
}

// ══ TOAST ══
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ══ INIT ══
window.onload = () => {
  setTimeout(() => showScreen('login'), 2200);
};

// ══ SIGNUP ══
function doSignup() {
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('signupPass').value;
  const err   = document.getElementById('signupError');
  err.style.display = 'none';

  if (!name || !email || !pass) {
    err.textContent = 'Please fill in all fields.';
    err.style.display = 'block'; return;
  }
  if (pass.length < 6) {
    err.textContent = 'Password must be at least 6 characters.';
    err.style.display = 'block'; return;
  }
  if (accounts.find(a => a.email === email)) {
    err.textContent = 'An account with this email already exists.';
    err.style.display = 'block'; return;
  }
  accounts.push({ name, email, pass });
  saveAccounts();
  showToast('Account created! Please login.');
  showScreen('login');
}

// ══ LOGIN ══
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginError');
  err.style.display = 'none';

  const account = accounts.find(a => a.email === email && a.pass === pass);
  if (!account) { err.style.display = 'block'; return; }

  currentUser = account;
  const initial = account.name.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent  = initial;
  document.getElementById('orderAvatar').textContent = initial;
  renderDashboard();
  showScreen('dashboard');
}

function doLogout() {
  currentUser = null;
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value  = '';
  showScreen('login');
}

// ══ DASHBOARD ══
function renderDashboard() {
  const grid = document.getElementById('tablesGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 11; i++) {
    const key        = `Table ${i}`;
    const tableOrders = orders[key] || {};
    const count      = Object.values(tableOrders).reduce((a, b) => a + b, 0);
    const hasOrders  = count > 0;
    const fill       = hasOrders ? '#C9A84C' : '#444';
    const fill2      = hasOrders ? '#8B6914' : '#333';
    grid.innerHTML += `
      <div class="table-card ${hasOrders ? 'has-orders' : ''}" onclick="openTable(${i})">
        ${hasOrders ? `<div class="table-badge">${count}</div>` : ''}
        <div style="margin-bottom:8px">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="10" width="22" height="3" rx="1.5" fill="${fill}"/>
            <rect x="6" y="13" width="2" height="9" rx="1" fill="${fill}"/>
            <rect x="20" y="13" width="2" height="9" rx="1" fill="${fill}"/>
            <rect x="5" y="7" width="18" height="4" rx="2" fill="${fill2}"/>
          </svg>
        </div>
        <div class="table-num">Table ${i}</div>
        <div class="table-status">${hasOrders ? count + ' items' : 'Available'}</div>
      </div>`;
  }
}

// ══ ORDER ══
function openTable(num) {
  currentTable = `Table ${num}`;
  if (!orders[currentTable]) orders[currentTable] = {};
  document.getElementById('orderTableTitle').textContent = currentTable;
  document.getElementById('searchInput').value = '';
  renderMenu('');
  updateCartBar();
  showScreen('order');
}

function goBack() {
  renderDashboard();
  showScreen('dashboard');
}

function renderMenu(query) {
  const scroll = document.getElementById('menuScroll');
  const q = query.toLowerCase().trim();
  let html = '', anyResult = false;

  MENU.forEach(cat => {
    const filtered = cat.items.filter(item =>
      !q || item.name.toLowerCase().includes(q)
    );
    if (!filtered.length) return;
    anyResult = true;
    html += `<div class="menu-category"><div class="category-label">${cat.category}</div>`;
    filtered.forEach(item => {
      const qty      = (orders[currentTable] && orders[currentTable][item.name]) || 0;
      const selected = qty > 0;
      const safeName = item.name.replace(/'/g, "\\'");

      // Highlight matched letters in gold
      const displayName = q
        ? item.name.replace(new RegExp(`(${q})`, 'gi'),
            '<span style="color:var(--gold);font-weight:700">$1</span>')
        : item.name;

      html += `
        <div class="menu-item ${selected ? 'selected' : ''}">
          <div>
            <div class="item-name">${displayName}</div>
            <div class="item-price">₹${item.price}</div>
          </div>
          <div class="item-qty-wrap">
            ${selected ? `
              <button class="qty-btn" onclick="changeQty('${safeName}',-1)">−</button>
              <div class="qty-num">${qty}</div>
              <button class="qty-btn" onclick="changeQty('${safeName}',1)">+</button>
            ` : `
              <button class="add-btn" onclick="changeQty('${safeName}',1)">ADD</button>
            `}
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  if (!anyResult) {
    html = `<div class="no-results">
      <svg width="32" height="32" fill="none" stroke="#888" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 10px;display:block">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      No results for "${query}"
    </div>`;
  }
  scroll.innerHTML = html;
}

function changeQty(item, delta) {
  if (!orders[currentTable]) orders[currentTable] = {};
  const cur  = orders[currentTable][item] || 0;
  const next = cur + delta;
  if (next <= 0) delete orders[currentTable][item];
  else orders[currentTable][item] = next;
  saveOrders();
  renderMenu(document.getElementById('searchInput').value);
  updateCartBar();
}

function filterMenu() { renderMenu(document.getElementById('searchInput').value); }
function clearSearch() { document.getElementById('searchInput').value = ''; renderMenu(''); }

function updateCartBar() {
  const tableOrders = orders[currentTable] || {};
  let count = 0, total = 0;
  MENU.forEach(cat => cat.items.forEach(item => {
    const qty = tableOrders[item.name] || 0;
    count += qty;
    total += item.price * qty;
  }));
  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartTotal').textContent = '₹' + total;
}

// ══ BILL ══
function generateBill() {
  const tableOrders = orders[currentTable] || {};
  const items = Object.entries(tableOrders).filter(([, q]) => q > 0);
  if (!items.length) { alert('No items added yet!'); return; }

  const now = new Date();
  document.getElementById('billTable').textContent = currentTable;
  document.getElementById('billDate').textContent  = now.toLocaleDateString('en-IN');
  document.getElementById('billTime').textContent  = now.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'});

  let subtotal = 0, html = '';
  items.forEach(([name, qty]) => {
    const menuItem = MENU.flatMap(c => c.items).find(i => i.name === name);
    const price    = (menuItem ? menuItem.price : 0) * qty;
    subtotal += price;
    html += `<div class="bill-row">
      <div class="item-n">${name}</div>
      <div class="item-q">x${qty}</div>
      <div class="item-p">₹${price}</div>
    </div>`;
  });

  const gst   = Math.round(subtotal * 0.05);
  const total = subtotal + gst;
  document.getElementById('billItems').innerHTML    = html;
  document.getElementById('billSubtotal').textContent = '₹' + subtotal;
  document.getElementById('billGST').textContent    = '₹' + gst;
  document.getElementById('billTotal').textContent  = '₹' + total;
  showScreen('bill');
}

function clearTable() {
  if (confirm(`Clear all orders for ${currentTable}?`)) {
    orders[currentTable] = {};
    saveOrders();
    renderDashboard();
    showScreen('dashboard');
  }
}

// ══ PROFILE ══
function loadProfile() {
  if (!currentUser) return;
  document.getElementById('profileAvatarBig').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('profileNameBig').textContent   = currentUser.name;
  document.getElementById('profileEmailBig').textContent  = currentUser.email;
  document.getElementById('profileName').value  = currentUser.name;
  document.getElementById('profileEmail').value = currentUser.email;
  document.getElementById('profilePass').value  = '';
  document.getElementById('profilePass').placeholder = '••••••••';
  setProfileEditing(false);
}

function loadSettingsMeta() {
  if (currentUser) {
    document.getElementById('settingsProfileSub').textContent =
      currentUser.name + ' · ' + currentUser.email;
  }
}

function setProfileEditing(editing) {
  ['profileName','profileEmail','profilePass'].forEach(id => {
    document.getElementById(id).disabled = !editing;
  });
  document.getElementById('profileEditBtn').style.display = editing ? 'none'  : 'block';
  document.getElementById('profileSaveBtn').style.display = editing ? 'block' : 'none';
}

function toggleProfileEdit() { setProfileEditing(true); }

function saveProfile() {
  const name  = document.getElementById('profileName').value.trim();
  const email = document.getElementById('profileEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('profilePass').value;
  if (!name || !email) { showToast('Name and email are required.'); return; }

  const idx = accounts.findIndex(a => a.email === currentUser.email);
  if (idx === -1) return;
  accounts[idx].name  = name;
  accounts[idx].email = email;
  if (pass && pass.length >= 6) accounts[idx].pass = pass;
  saveAccounts();
  currentUser = accounts[idx];

  const initial = name.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent  = initial;
  document.getElementById('orderAvatar').textContent = initial;
  showToast('Profile updated!');
  loadProfile();
}

// ══ MENU EDITOR ══
function resetAdminUnlock() {
  document.getElementById('adminUnlock').style.display    = 'block';
  document.getElementById('editorContent').style.display  = 'none';
  document.getElementById('adminPassInput').value         = '';
  document.getElementById('adminError').style.display     = 'none';
}

function unlockAdmin() {
  const val = document.getElementById('adminPassInput').value;
  if (val === ADMIN_PASSWORD) {
    adminUnlocked = true;
    document.getElementById('adminUnlock').style.display   = 'none';
    document.getElementById('editorContent').style.display = 'block';
    renderEditor();
  } else {
    document.getElementById('adminError').style.display = 'block';
  }
}

function renderEditor() {
  const list = document.getElementById('categoriesList');
  list.innerHTML = '';
  MENU.forEach((cat, ci) => {
    const itemsHtml = cat.items.map((item, ii) => `
      <div class="editor-item-row">
        <input class="editor-item-name"  value="${item.name}"  onchange="MENU[${ci}].items[${ii}].name=this.value"/>
        <input class="editor-item-price" type="number" value="${item.price}" onchange="MENU[${ci}].items[${ii}].price=parseInt(this.value)||0"/>
        <button class="del-item-btn" onclick="deleteItem(${ci},${ii})">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>`).join('');

    list.innerHTML += `
      <div class="editor-cat">
        <div class="editor-cat-header">
          <div class="editor-cat-name">${cat.category}</div>
          <button class="del-cat-btn" onclick="deleteCategory(${ci})">Delete Category</button>
        </div>
        ${itemsHtml}
        <div class="add-item-row">
          <input class="add-item-input"       id="newItem_${ci}"      placeholder="New item name..."/>
          <input class="add-item-price-input" id="newItemPrice_${ci}" type="number" placeholder="0"/>
          <button class="add-item-btn-sm" onclick="addItem(${ci})">+</button>
        </div>
      </div>`;
  });
}

function addItem(ci) {
  const nameEl  = document.getElementById(`newItem_${ci}`);
  const priceEl = document.getElementById(`newItemPrice_${ci}`);
  const name    = nameEl.value.trim();
  const price   = parseInt(priceEl.value) || 0;
  if (!name) { showToast('Enter item name.'); return; }
  MENU[ci].items.push({ name, price });
  nameEl.value = ''; priceEl.value = '';
  renderEditor();
}

function deleteItem(ci, ii) {
  if (!confirm(`Remove "${MENU[ci].items[ii].name}"?`)) return;
  MENU[ci].items.splice(ii, 1);
  renderEditor();
}

function deleteCategory(ci) {
  if (!confirm(`Delete entire category "${MENU[ci].category}"?`)) return;
  MENU.splice(ci, 1);
  renderEditor();
}

function addCategory() {
  const input = document.getElementById('newCatInput');
  const name  = input.value.trim();
  if (!name) { showToast('Enter category name.'); return; }
  MENU.push({ category: name, items: [] });
  input.value = '';
  renderEditor();
}

function saveMenu() {
  saveMenuData();
  showToast('Menu saved successfully!');
}
