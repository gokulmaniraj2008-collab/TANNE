// ══ CONFIG LOADER ══
// NOTE: Firebase SDK pinned to 10.12.0 — update periodically to avoid deprecation
import { initializeApp }                            from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

let auth;
const pageLoadTime = Date.now();

async function loadConfig() {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to load config');
  return res.json();
}

// ══ DEFAULT MENU ══
const DEFAULT_MENU = [
  { category: "Classic Cocktails", items: [
    { name: "Cosmopolitan", price: 549 },
    { name: "Margarita", price: 549 },
    { name: "Whisky Sour", price: 549 },
    { name: "Bloody Mary", price: 549 },
    { name: "Pina Colada", price: 549 },
    { name: "Sex On The Beach", price: 549 },
    { name: "Mojito", price: 549 },
    { name: "Martini", price: 549 },
    { name: "Caipiroska", price: 549 },
    { name: "Tequila Sunrise", price: 549 }
  ]},
  { category: "Lit - Long Way To Drink", items: [
    { name: "LIIT", price: 799 },
    { name: "Bull Frog", price: 799 },
    { name: "Off Duty", price: 799 },
    { name: "Electric Blue LIT", price: 799 },
    { name: "Green Apple LIT", price: 799 },
    { name: "Peach Passion LIT", price: 799 },
    { name: "Desi Masala LIT", price: 799 },
    { name: "Tanne SPL LIT", price: 799 }
  ]},
  { category: "Craft Cut – Shots", items: [
    { name: "Blue Kamikaze", price: 329 },
    { name: "B 52 Classic", price: 329 },
    { name: "Dark Chocolate Shot", price: 329 },
    { name: "Fire Shot", price: 329 },
    { name: "Poison Apple", price: 329 },
    { name: "Pink Lady Shot", price: 329 },
    { name: "Jager Bomb", price: 529 }
  ]},
  { category: "Uniquely Crafted Cocktails", items: [
    { name: "Velvet Sunset", price: 549 },
    { name: "Midnight Affair", price: 549 },
    { name: "Spice Route", price: 549 },
    { name: "Mango Mystique", price: 549 },
    { name: "Smoked Temptation", price: 549 },
    { name: "Berry Bliss", price: 549 },
    { name: "Tropic Thunder", price: 549 },
    { name: "Desert Rose", price: 549 },
    { name: "Golden Hour", price: 549 },
    { name: "Electric Blue", price: 549 }
  ]},
  { category: "Signature Mocktails", items: [
    { name: "Citrus Bloom", price: 249 },
    { name: "Green Zest", price: 249 },
    { name: "Berry Cooler", price: 249 },
    { name: "Mango Splash", price: 249 },
    { name: "Pink Sunrise", price: 249 },
    { name: "Sparkling Jamun", price: 249 },
    { name: "Tropical Fizz", price: 249 },
    { name: "Cool Blue Lagoon", price: 249 },
    { name: "Honey Ginger Spritz", price: 249 },
    { name: "Classic Virgin Mojito", price: 249 }
  ]},
  { category: "Fizzy Drinks", items: [
    { name: "Mineral Water", price: 49 },
    { name: "Soda", price: 59 },
    { name: "Sprite", price: 59 },
    { name: "Coke", price: 59 },
    { name: "Diet Coke", price: 139 },
    { name: "Tonic Water", price: 139 },
    { name: "Ginger Ale", price: 139 },
    { name: "Red Bull", price: 199 },
    { name: "Canned Juice", price: 119 }
  ]},
  { category: "Fresh Juices", items: [
    { name: "Apple", price: 160 },
    { name: "Watermelon", price: 120 },
    { name: "Pomegranate", price: 160 },
    { name: "Orange", price: 140 },
    { name: "Pineapple Juice", price: 140 },
    { name: "Rose Milk", price: 120 },
    { name: "Grape", price: 140 },
    { name: "Lime Juice", price: 100 },
    { name: "Lime Soda", price: 110 }
  ]},
  { category: "Shakes", items: [
    { name: "Butter Scotch", price: 150 },
    { name: "Black Current", price: 150 },
    { name: "KitKat", price: 160 },
    { name: "Vannila", price: 120 },
    { name: "Chocolate", price: 140 },
    { name: "Strawberry", price: 150 },
    { name: "Biscoff", price: 160 },
    { name: "Cold Coffee", price: 120 },
    { name: "Tanne SPL Shake", price: 180 }
  ]},
  { category: "Hot Beverages", items: [
    { name: "Tea", price: 40 },
    { name: "Coffee", price: 50 },
    { name: "Horlicks", price: 59 },
    { name: "Boost", price: 59 }
  ]},
  { category: "Liqueur", items: [
    { name: "Jagermeister (30 ML)", price: 499 },
    { name: "Sambuca Zappa (30 ML)", price: 399 },
    { name: "Amarula (30 ML)", price: 399 },
    { name: "Absinthe (30 ML)", price: 699 },
    { name: "Bardinet Coffee (30 ML)", price: 499 }
  ]},
  { category: "Graceful Blends - Scotch", items: [
    { name: "JW Double Black (30 ML)", price: 549 },
    { name: "JW Black Label (30 ML)", price: 499 },
    { name: "Chivas Regal 12 YRS (30 ML)", price: 549 },
    { name: "JW Red Label (30 ML)", price: 349 }
  ]},
  { category: "American / Irish Whisky", items: [
    { name: "Jack Daniel's Honey (30 ML)", price: 449 },
    { name: "Jack Daniel's (30 ML)", price: 349 },
    { name: "Jim Beam Orange (30 ML)", price: 449 },
    { name: "Jim Beam Bourbon (30 ML)", price: 449 }
  ]},
  { category: "Single Malt Whiskey", items: [
    { name: "Glenfiddich 12 YRS (30 ML)", price: 679 },
    { name: "Glenlivet 12 YRS (30 ML)", price: 599 }
  ]},
  { category: "Indian Blended Scotch", items: [
    { name: "Black & White (30 ML)", price: 299 },
    { name: "J&B Rare (30 ML)", price: 399 },
    { name: "VAT 69 (30 ML)", price: 369 },
    { name: "Ballantines Finest (30 ML)", price: 399 },
    { name: "Teachers Highland Cream (30 ML)", price: 399 }
  ]},
  { category: "Domestic Whiskey", items: [
    { name: "Signature (30 ML)", price: 269 },
    { name: "Royal Challenge (30 ML)", price: 269 },
    { name: "1848 Whiskey (30 ML)", price: 269 },
    { name: "100 Pipers (30 ML)", price: 329 },
    { name: "Royal Ratam (30 ML)", price: 329 },
    { name: "Antiquity Blue (30 ML)", price: 319 }
  ]},
  { category: "Classic Domestic Brandy", items: [
    { name: "1848 XO (30 ML)", price: 299 },
    { name: "Louis Ventant (30 ML)", price: 299 },
    { name: "MC VSOP (30 ML)", price: 319 },
    { name: "King Louis (30 ML)", price: 299 },
    { name: "Hobson (30 ML)", price: 319 },
    { name: "Morpheus XO (30 ML)", price: 299 },
    { name: "Morpheus Blue (30 ML)", price: 319 }
  ]},
  { category: "Brandy & Cognac", items: [
    { name: "Nepolean VSOP (30 ML)", price: 459 },
    { name: "Bardinet (30 ML)", price: 479 },
    { name: "Martel VSOP (30 ML)", price: 599 },
    { name: "Beehive VSOP (30 ML)", price: 599 }
  ]},
  { category: "Domestic Rum", items: [
    { name: "Bacardi Classic (30 ML)", price: 249 },
    { name: "Bacardi Lemon (30 ML)", price: 249 },
    { name: "Bacardi Black (30 ML)", price: 249 },
    { name: "Old Monk (30 ML)", price: 249 }
  ]},
  { category: "Vodka", items: [
    { name: "Juno (30 ML)", price: 219 },
    { name: "Magic Moments (30 ML)", price: 219 },
    { name: "Smirnoff (30 ML)", price: 249 },
    { name: "Eristoff (30 ML)", price: 249 },
    { name: "Grey Goose (30 ML)", price: 349 },
    { name: "Absolute (30 ML)", price: 349 },
    { name: "Kettle One (30 ML)", price: 249 }
  ]},
  { category: "Tequila", items: [
    { name: "Cammino (30 ML)", price: 399 },
    { name: "Patron Silver (30 ML)", price: 679 },
    { name: "Don Angel (30 ML)", price: 399 },
    { name: "Mexicana (30 ML)", price: 399 }
  ]},
  { category: "Gin", items: [
    { name: "Bombay Sapphire (30 ML)", price: 349 },
    { name: "Gordons (30 ML)", price: 349 },
    { name: "Tanqueray (30 ML)", price: 349 },
    { name: "Beefeater (30 ML)", price: 349 },
    { name: "Hichki (30 ML)", price: 249 },
    { name: "The Fox (30 ML)", price: 349 },
    { name: "Kingston (30 ML)", price: 269 }
  ]},
  { category: "Wine", items: [
    { name: "Sula Red Wine", price: 899 },
    { name: "Sula White Wine", price: 899 },
    { name: "Jacob Creeks Shiraz", price: 899 },
    { name: "Jacob Creeks Chardonnay", price: 899 }
  ]},
  { category: "Tanne Signature Dish", items: [
    { name: "Tanne SPL Chicken", price: 320 },
    { name: "Nawabi Paneer Tikka", price: 380 },
    { name: "Veg Seek Kebab", price: 380 },
    { name: "Thread Cottage Cheese", price: 350 },
    { name: "Cheese Croquetts", price: 350 },
    { name: "Cone Chicken Pizza", price: 400 },
    { name: "Crispy Cone Chicken & Corn Cheesy Bites", price: 400 },
    { name: "Tandoori Makhani Roll Chicken", price: 380 },
    { name: "Phadi Murgh Tikka", price: 380 },
    { name: "Sangu Poo Thenga Pal Sadham", price: 450 },
    { name: "Thenga Pal Sadham With Chamandhi", price: 400 }
  ]},
  { category: "Soup", items: [
    { name: "Tanne Laksha Soup (Veg)", price: 149 },
    { name: "Tanne Laksha Soup (Chicken)", price: 199 },
    { name: "Mushroom Cappuccino Soup", price: 169 },
    { name: "Murgh Badami Shorba", price: 199 },
    { name: "Kadaloor Nandu Chaaru", price: 239 }
  ]},
  { category: "Salad", items: [
    { name: "Chicken Sausage With Mix Veg", price: 279 },
    { name: "Lebanon Seafood", price: 290 },
    { name: "Arabbic Fattoush", price: 249 }
  ]},
  { category: "Asian Veg Starters", items: [
    { name: "Thai Chilly Paneer", price: 280 },
    { name: "Honey Chilly Lotus Stem", price: 300 },
    { name: "Cream Cheese Dimsum", price: 350 },
    { name: "Veg Momos", price: 285 },
    { name: "Kunafa Crispy Paneer", price: 275 },
    { name: "Korean Chilly Toffu", price: 270 }
  ]},
  { category: "Asian Non-Veg Starters", items: [
    { name: "Har Gow Prawn", price: 400 },
    { name: "Pan Fried Fish In Mango Pulp", price: 380 },
    { name: "Golden Fried Prawn", price: 400 },
    { name: "Crispy Shredded Lamb In Sesame Sauce", price: 380 },
    { name: "Yaki Tori Chicken", price: 320 },
    { name: "Thai Style Satay Chicken", price: 300 },
    { name: "Drums Of Heaven", price: 320 },
    { name: "Mongolian Chicken Bread Pocket", price: 300 },
    { name: "Chicken Dim Sum", price: 350 },
    { name: "Asian Style Lemon Garlic Prawn", price: 420 },
    { name: "Sliced Beef In Hoisin Sauce", price: 350 }
  ]},
  { category: "Western", items: [
    { name: "Fallefel With Hummus", price: 270 },
    { name: "Baby Corn Fritters", price: 249 },
    { name: "Truffle Fries", price: 250 },
    { name: "Baked Cheese Nachos", price: 270 },
    { name: "Duplex Mushroom", price: 300 },
    { name: "Crab Lolly Pop", price: 380 },
    { name: "Fish & Chips", price: 380 },
    { name: "Chicken Marry Land", price: 350 },
    { name: "Roasted Prawn With Rosemary Jus", price: 420 },
    { name: "Butter Garlic Prawn", price: 400 },
    { name: "Grilled Herbs Lobster (Big)", price: 3400 },
    { name: "Grilled Herbs Lobster (Small)", price: 1800 }
  ]},
  { category: "Tandoor Veg", items: [
    { name: "Angoori Paneer Tikka", price: 350 },
    { name: "ABC Kebab", price: 300 },
    { name: "Malai Cheesy Broccoli", price: 300 },
    { name: "Lalmirchi Paneer Tikka", price: 340 },
    { name: "Tandoori Veg Platter", price: 450 }
  ]},
  { category: "Tandoor Non-Veg", items: [
    { name: "Tandoori Murgh Half", price: 350 },
    { name: "Tandoori Murgh Full", price: 700 },
    { name: "Tandoori Jinga", price: 490 },
    { name: "Reshmi Kebab", price: 350 },
    { name: "Ajiwani Fish Tikka", price: 420 },
    { name: "Tangiri Kebab", price: 370 },
    { name: "Tandoori Non-Veg Platter", price: 950 }
  ]},
  { category: "South Indian Starters", items: [
    { name: "Mushroom Ghee Roast With Coin Parotta", price: 300 },
    { name: "Vazhaipoo Kola Urundai", price: 280 },
    { name: "Gobi Veppudu", price: 300 },
    { name: "Pal Katti Pattani Milagu Pirattal", price: 290 },
    { name: "Rava Fried Fish In Nethili", price: 380 },
    { name: "Kothamalli Vanjaram Tava Fried Fish", price: 400 },
    { name: "Meen Pollichathu", price: 410 },
    { name: "Karaikudi Earl Thokku", price: 420 },
    { name: "Madurai Mutton Nei Chukka", price: 450 },
    { name: "Kozhi Kuru Milagu", price: 320 },
    { name: "Kethal Fried Chicken", price: 320 },
    { name: "Payoli Chicken", price: 310 },
    { name: "Beef Chukka With Coin Paratha", price: 380 }
  ]},
  { category: "Thai Main Course", items: [
    { name: "Nasi Goreng Chicken", price: 350 },
    { name: "Nasi Goreng Prawn", price: 450 },
    { name: "Thai Basil Fried Rice (Veg)", price: 250 },
    { name: "Thai Basil Fried Rice (Chicken)", price: 350 },
    { name: "Thai Basil Fried Rice (Prawn)", price: 450 },
    { name: "Raman Noodles (Veg)", price: 250 },
    { name: "Raman Noodles (Chicken)", price: 350 },
    { name: "Shangai Noodle (Veg)", price: 250 },
    { name: "Shangai Noodle (Chicken)", price: 350 },
    { name: "Thai Green Curry Veg With Jasmine Rice", price: 300 },
    { name: "Thai Red Curry Chicken With Jasmine Rice", price: 350 },
    { name: "Thai Red Curry Prawn With Jasmine Rice", price: 450 },
    { name: "Asian Stir-Fried Broccoli And Mushroom", price: 280 },
    { name: "Sliced Chicken Black Bean Sauce", price: 300 },
    { name: "Sweet And Sour Fish", price: 350 },
    { name: "Steam Rice Ponni", price: 100 },
    { name: "Steam Rice Basmathi", price: 120 }
  ]},
  { category: "Pizza", items: [
    { name: "Pesto Chicken Pizza", price: 380 },
    { name: "BBQ Chicken Pizza", price: 390 },
    { name: "Sezwan Chicken Pizza", price: 380 },
    { name: "Pepproni Pork Pizza", price: 400 },
    { name: "Classic Maragaritta", price: 300 },
    { name: "Pesto Paneer Pizza", price: 420 },
    { name: "Exotic Veg Pizza", price: 320 }
  ]},
  { category: "Continental Main Course", items: [
    { name: "Penne Alfrado Veg", price: 250 },
    { name: "Penne Alfrado Chicken", price: 300 },
    { name: "Penne Arrabiatta Veg", price: 250 },
    { name: "Penne Arrabiatta Chicken", price: 300 },
    { name: "Macc N Cheese Pasta Veg", price: 250 },
    { name: "Macc N Cheese Pasta Chicken", price: 300 },
    { name: "Spegatti Aglio Olio Chicken", price: 350 },
    { name: "Spegatti Aglio Olio Prawn", price: 450 },
    { name: "Pesto Penne Veg", price: 250 },
    { name: "Pesto Penne Chicken", price: 350 },
    { name: "Pesto Penne Prawn", price: 400 }
  ]},
  { category: "South Indian Main Course", items: [
    { name: "Kaalan Pattani Chettinad", price: 280 },
    { name: "Thalaseri Veg Koruma", price: 270 },
    { name: "Attu Iraichi Kurumilagu Masala", price: 370 },
    { name: "Aleppy Fish Curry", price: 380 },
    { name: "Neelagiri Kozhi Curry", price: 320 },
    { name: "Chicken Chettinad", price: 340 }
  ]},
  { category: "Indian Main Course Cuisine", items: [
    { name: "Paneer Tikka Masala", price: 320 },
    { name: "Malai Kofta", price: 320 },
    { name: "Tawa Paneer", price: 320 },
    { name: "Lasooni Dal Tadka", price: 250 },
    { name: "Aloo Gobi Masala", price: 240 },
    { name: "Kadai Veg", price: 270 },
    { name: "Angara Mutton", price: 400 },
    { name: "Hydrabadi Chicken Curry", price: 320 },
    { name: "Murgh Tikka Makhni", price: 300 },
    { name: "Butter Chicken Masala", price: 360 }
  ]},
  { category: "Rice And Pulao", items: [
    { name: "Gilma Biriyani", price: 350 },
    { name: "Chicken Biriyani", price: 299 },
    { name: "Mutton Biriyani", price: 370 },
    { name: "Jeera Rice", price: 230 },
    { name: "Ghee Rice", price: 230 },
    { name: "Kashmiri Veg Pulao", price: 240 },
    { name: "Dal Kitchadi", price: 230 },
    { name: "Chicken Tikka Pudhina Pulao", price: 320 },
    { name: "Curd Rice", price: 180 }
  ]},
  { category: "Indian Breads", items: [
    { name: "Malabar Paratha (1 Pc)", price: 70 },
    { name: "Malabar Paratha (2 Pcs)", price: 100 },
    { name: "Naan Plain", price: 80 },
    { name: "Naan Butter", price: 90 },
    { name: "Roti Plain", price: 80 },
    { name: "Roti Butter", price: 90 },
    { name: "Chappathi Plain", price: 30 },
    { name: "Chappathi Butter", price: 40 },
    { name: "Phulka Plain (2 Pcs)", price: 40 },
    { name: "Phulka Butter (2 Pcs)", price: 60 }
  ]},
  { category: "Sandwich", items: [
    { name: "Veg Club", price: 120 },
    { name: "Grilled Paneer", price: 150 },
    { name: "Chicken Club", price: 160 },
    { name: "BBQ Chicken", price: 160 },
    { name: "Mexican Chicken", price: 180 },
    { name: "Chicken Tikka", price: 180 }
  ]},
  { category: "Snacks", items: [
    { name: "Veg Spring Roll", price: 160 },
    { name: "French Fries", price: 120 },
    { name: "Peri Peri Fries", price: 140 },
    { name: "Cheeesy Fries", price: 150 },
    { name: "Cheese Chilly Toast", price: 150 },
    { name: "Veg Katti Roll", price: 150 },
    { name: "Paneer Katti Roll", price: 160 }
  ]},
  { category: "Dessert", items: [
    { name: "Mango Fried Ice Cream", price: 370 },
    { name: "Thai Red Rubbies", price: 300 },
    { name: "Blueberry Pannacotta", price: 270 }
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
    auth = getAuth(app);

    // Wait for splash (2200ms), then check auth state ONCE
    let authResolved = false;
    onAuthStateChanged(auth, user => {
      if (!authResolved) {
        // First fire: handle splash then route
        authResolved = true;
        const splashDelay = Math.max(0, 2200 - (Date.now() - pageLoadTime));
        setTimeout(() => {
          if (user) {
            loginWithUser(user);
          } else {
            showScreen('login');
          }
        }, splashDelay);
      } else if (user && !currentUserId) {
        // User just signed in via Google popup
        loginWithUser(user);
      }
    });

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

    // Load menu from Firebase; only write DEFAULT_MENU if none exists yet
    const menuSnap = await get(ref(db, 'config/menu'));
    if (!menuSnap.exists() || !menuSnap.val() || menuSnap.val().length === 0) {
      await set(ref(db, 'config/menu'), DEFAULT_MENU);
      MENU = JSON.parse(JSON.stringify(DEFAULT_MENU));
    } else {
      MENU = menuSnap.val();
    }

    unsubscribers.push(onValue(ref(db, 'config/menu'), snap => {
      if (isEditingMenu) return;
      if (snap.exists() && snap.val() && snap.val().length > 0) {
        MENU = snap.val();
      }
    }));
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

function loginWithUser(user) {
  currentUser      = user.displayName || user.email.split('@')[0];
  currentUserEmail = user.email;
  currentUserId    = user.uid;
  const initial    = currentUser.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent  = initial;
  document.getElementById('orderAvatar').textContent = initial;
  renderDashboard();
  showScreen('dashboard');
  startSessionTracking();
}

window.doGoogleLogin = async function() {
  const btn = document.getElementById('googleLoginBtn');
  if (btn) btn.disabled = true;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    // onAuthStateChanged will handle the rest
  } catch (err) {
    showToast('Google sign-in failed. Please try again.');
    if (btn) btn.disabled = false;
  }
};

window.doLogout = async function() {
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
  await signOut(auth);
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
window.openTable = async function(num) {
  currentTable = `Table_${num}`;
  if (!orders[currentTable]) orders[currentTable] = {};
  document.getElementById('orderTableTitle').textContent = `Table ${num}`;
  document.getElementById('searchInput').value = '';
  setTablePresence(currentTable);
  checkTablePresence(currentTable);

  // Always fetch fresh data from Firebase before rendering
  try {
    const [ordSnap, savedSnap] = await Promise.all([
      get(ref(db, `orders/${currentTable}`)),
      get(ref(db, `savedOrders/${currentTable}`))
    ]);
    if (ordSnap.exists()) orders[currentTable] = ordSnap.val();
    savedOrders[currentTable] = savedSnap.exists() ? savedSnap.val() : [];
  } catch { /* fall back to in-memory data */ }

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
          <button class="copy-saved-btn" onclick="copySavedOrder(${idx})">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            COPY
          </button>
        </div>
        <div class="saved-order-items">${lines}</div>
      </div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

window.copySavedOrder = function(idx) {
  const entry = savedOrders[currentTable] && savedOrders[currentTable][idx];
  if (!entry) { showToast('Order not found.'); return; }
  const lines = Object.entries(entry.items || {})
    .map(([item, qty]) => `${item} x${qty} — ${currency()}${getPrice(item) * qty}`)
    .join('\n');
  const subtotal = Object.entries(entry.items || {})
    .reduce((sum, [item, qty]) => sum + getPrice(item) * qty, 0);
  const gst = Math.round(subtotal * gstRate());
  const total = subtotal + gst;
  const text = `${settings.name || 'TANNE RESTOBAR'}\n${currentTable.replace('table_','Table ')}\nBy: ${entry.by} | ${entry.time}\n${'─'.repeat(30)}\n${lines}\n${'─'.repeat(30)}\nSubtotal: ${currency()}${subtotal}\nGST: ${currency()}${gst}\nTOTAL: ${currency()}${total}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Order copied to clipboard!');
  }).catch(() => {
    showToast('Copy failed. Try again.');
  });
};

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
    const filtered = cat.items.filter(item => !q || item.name.toLowerCase().startsWith(q));
    if (!filtered.length) return;
    anyResult = true;
    html += `<div class="menu-category"><div class="category-label">${sanitize(cat.category)}</div>`;
    filtered.forEach(item => {
      const qty      = (orders[currentTable] && orders[currentTable][item.name]) || 0;
      const selected = qty > 0;
      const display  = q
        ? `<span style="color:var(--gold);font-weight:700">${sanitize(item.name.slice(0, q.length))}</span>${sanitize(item.name.slice(q.length))}`
        : sanitize(item.name);
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
