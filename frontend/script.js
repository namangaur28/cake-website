/* ===================================================
   SILKOVEN — Complete Script
   =================================================== */

/* ── CAKE DATA ── */
const CAKES = [
    { id: 1, name: 'Rose Garden', desc: 'Rose-infused sponge, lychee cream, candied petals & 24k gold leaf.', emoji: '🌹', price: 1899, tags: ['popular', 'premium'], rating: 4.8, reviews: 128, badge: 'BEST SELLER', bg: '#fce8f0' },
    { id: 2, name: 'Midnight Velvet', desc: 'Dark Valrhona ganache, espresso layers, hand-crumbled cocoa crust.', emoji: '🍫', price: 2199, tags: ['popular', 'chocolate'], rating: 4.7, reviews: 84, badge: 'NEW', bg: '#f5e8d8' },
    { id: 3, name: 'Citrus Bloom', desc: 'Meyer lemon curd, elderflower cream, toasted meringue crown.', emoji: '🍋', price: 1599, tags: ['fruit'], rating: 4.6, reviews: 61, badge: null, bg: '#fef9e0' },
    { id: 4, name: 'Strawberry Fields', desc: 'Fresh strawberry compote, vanilla mascarpone, almond dacquoise.', emoji: '🍓', price: 1699, tags: ['popular', 'fruit'], rating: 4.8, reviews: 102, badge: 'POPULAR', bg: '#fce8f0' },
    { id: 5, name: 'Matcha Ceremony', desc: 'Ceremonial-grade matcha, white chocolate ganache, sesame brittle.', emoji: '🍵', price: 1999, tags: ['premium'], rating: 4.9, reviews: 47, badge: 'PREMIUM', bg: '#e8f5e8' },
    { id: 6, name: 'Classic Celebration', desc: 'Vanilla sponge, buttercream swirls, rainbow sprinkle cascade.', emoji: '🧁', price: 1499, tags: ['popular'], rating: 4.7, reviews: 215, badge: "CHEF'S PICK", bg: '#fff8e0' },
];

/* ── GAMIFICATION ── */
const LEVEL_NAMES = ['Beginner', 'Home Baker', 'Artisan', 'Master Baker', 'Cake Legend'];
const ACHIEVEMENTS = [
    { id: 'first_add', icon: '🎂', name: 'First Taste', desc: 'Added your first cake' },
    { id: 'wishlist3', icon: '❤️', name: 'Cake Lover', desc: 'Wishlisted 3 cakes' },
    { id: 'cart5k', icon: '💎', name: 'Connoisseur', desc: 'Cart above ₹5,000' },
    { id: 'builder', icon: '🏗️', name: 'Master Baker', desc: 'Opened 3D Builder' },
    { id: 'download', icon: '📸', name: 'Influencer', desc: 'Downloaded cake design' },
    { id: 'order', icon: '🔥', name: 'Cake Addict', desc: 'Placed your first order' },
];

let points = 0, level = 1, achievements = [];
try { points = parseInt(localStorage.getItem('sk_pts') || 0); level = parseInt(localStorage.getItem('sk_lvl') || 1); achievements = JSON.parse(localStorage.getItem('sk_ach') || '[]'); } catch (e) { }

function saveGam() { try { localStorage.setItem('sk_pts', points); localStorage.setItem('sk_lvl', level); localStorage.setItem('sk_ach', JSON.stringify(achievements)); } catch (e) { } }

function addPoints(n, label) {
    points += n;
    const newLevel = Math.floor(points / 500) + 1;
    if (newLevel > level) { level = newLevel; showLvlUp(level); }
    saveGam(); updateGamHUD(); showPtsToast('+' + n + ' pts · ' + label);
}

function showPtsToast(msg) {
    const t = document.getElementById('pointsToast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function showLvlUp(lv) {
    document.getElementById('lvlNum').textContent = lv;
    const t = document.getElementById('levelToast');
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800);
}

function unlockAchievement(id) {
    if (achievements.includes(id)) return;
    achievements.push(id); saveGam();
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    document.getElementById('achIcon').textContent = a.icon;
    document.getElementById('achTitle').textContent = a.name + ' Unlocked!';
    document.getElementById('achDesc').textContent = a.desc;
    const t = document.getElementById('achToast');
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200);
}

function updateGamHUD() {
    document.getElementById('gPoints').textContent = points + ' pts';
    document.getElementById('gLevel').textContent = 'Lv.' + level;
    const pct = ((points % 500) / 500) * 100;
    document.getElementById('gBar').style.width = pct + '%';
}

function openGamPanel() {
    document.getElementById('gpPts').textContent = points;
    const lname = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];
    document.getElementById('gpLevel').textContent = 'Level ' + level + ' · ' + lname;
    const pct = Math.round((points % 500) / 500 * 100);
    document.getElementById('gpBar').style.width = pct + '%';
    document.getElementById('gpBarLabel').textContent = (points % 500) + ' / 500 to next level';
    const grid = document.getElementById('gamAchGrid');
    grid.innerHTML = ACHIEVEMENTS.map(a => {
        const has = achievements.includes(a.id);
        return `<div class="ach-item ${has ? 'unlocked' : 'locked'}">
      <div class="ai-ico">${a.icon}</div>
      <div class="ai-name">${a.name}</div>
      <div class="ai-desc">${a.desc}</div>
    </div>`;
    }).join('');
    openOverlay('gamOverlay');
}
function closeGamPanel() { closeOverlay('gamOverlay'); }

/* ── OVERLAY HELPERS ── */
function openOverlay(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeOverlay(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow = ''; }

/* ── NIGHT MODE ── */
function toggleNight() {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    document.getElementById('nightKnob').textContent = dark ? '☀️' : '🌙';
}

/* ── MOBILE MENU ── */
function toggleMenu() { document.getElementById('mobileMenu').classList.toggle('open'); }
function closeMenu() { document.getElementById('mobileMenu').classList.remove('open'); }

/* ── SHOP DATA ── */
let wishlist = [], cart = [], currentFilter = 'all';

function renderShop() {
    const grid = document.getElementById('cakeGrid');
    const q = document.getElementById('searchInput').value.toLowerCase();
    let visible = 0;
    grid.innerHTML = CAKES.map((c, i) => {
        let show = (currentFilter === 'all' || c.tags.includes(currentFilter)) && (!q || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));

        if (currentFilter === 'favorites') {
            show = wishlist.some(w => w.id === c.id) && (!q || c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q));
        }

        if (show) visible++;
        const liked = wishlist.some(w => w.id === c.id);
        const inCart = cart.some(x => x.id === c.id);
        return `<div class="cake-card ${show ? '' : 'hidden'}" style="animation-delay:${i * 0.06}s">
      ${c.badge ? `<div class="cake-badge">${c.badge}</div>` : ''}
      <button class="heart-btn ${liked ? 'liked' : ''}" onclick="toggleWish(${c.id})" aria-label="Wishlist">♡</button>
      <div class="cake-img-wrap" style="background:${c.bg}" onclick="openQV(${c.id})">
        <span class="cake-emoji">${c.emoji}</span>
        <div class="qv-hint">Quick View</div>
      </div>
      <div class="cake-body">
        <div class="cake-name">${c.name}</div>
        <div class="cake-desc">${c.desc}</div>
        <div class="cake-rating"><span class="stars">${'★'.repeat(Math.round(c.rating))}</span><small>(${c.reviews})</small></div>
        <div class="cake-footer">
          <div class="cake-price">₹${c.price.toLocaleString('en-IN')}</div>
          <button class="add-btn ${inCart ? 'added' : ''}" onclick="addToCart(${c.id})">${inCart ? '✓ Added' : '+ Add'}</button>
        </div>
      </div>
    </div>`;
    }).join('');
    document.getElementById('resultsCount').textContent = visible + ' cake' + (visible !== 1 ? 's' : '');
}

function setFilter(f, btn) {
    currentFilter = f;
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderShop();
}

function filterShop() { renderShop(); }

/* ── WISHLIST ── */
function toggleWish(id) {
    const idx = wishlist.findIndex(w => w.id === id);
    if (idx >= 0) { wishlist.splice(idx, 1); }
    else {
        const cake = CAKES.find(c => c.id === id);
        wishlist.push(cake);
        addPoints(10, 'Wishlisted a cake');
        if (!achievements.includes('first_add')) { }
        if (wishlist.length >= 3) unlockAchievement('wishlist3');
    }
    document.getElementById('wishCount').textContent = wishlist.length;
    renderShop(); renderWish();
}

function openWish() {
    renderWish();
    document.getElementById('wishOverlay').classList.add('open');
    document.getElementById('wishDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeWish() {
    document.getElementById('wishOverlay').classList.remove('open');
    document.getElementById('wishDrawer').classList.remove('open');
    document.body.style.overflow = '';
}

function renderWish() {
    const el = document.getElementById('wishItems');
    if (!wishlist.length) { el.innerHTML = '<div class="wish-empty">Nothing saved yet. Tap ♡ on a cake!</div>'; return; }
    el.innerHTML = wishlist.map(c => `
    <div class="wish-item">
      <div class="wi-ico">${c.emoji}</div>
      <div class="wi-info">
        <strong>${c.name}</strong>
        <span>${c.desc.slice(0, 40)}…</span>
      </div>
      <div class="wi-right">
        <div class="wi-price">₹${c.price.toLocaleString('en-IN')}</div>
        <button class="wi-add" onclick="addToCart(${c.id});closeWish()">Add to Cart</button>
        <button class="wi-rem" onclick="toggleWish(${c.id})">Remove</button>
      </div>
    </div>`).join('');
}

/* ── CART ── */
function addToCart(id) {
    const existing = cart.find(c => c.id === id);
    if (existing) { existing.qty = (existing.qty || 1) + 1; }
    else { const cake = CAKES.find(c => c.id === id); if (!cake) return; cart.push({ ...cake, qty: 1 }); addPoints(20, 'Added to cart'); unlockAchievement('first_add'); }
    const total = cart.reduce((s, c) => s + c.price * (c.qty || 1), 0);
    if (total >= 5000) unlockAchievement('cart5k');
    updateCartBadge();
    document.getElementById('orderBtn').disabled = cart.length === 0;
    renderShop(); renderCart();
    const btn = document.getElementById('cartBtn');
    btn.style.transform = 'scale(1.25)'; setTimeout(() => btn.style.transform = '', 220);
}
function increaseQty(id) { const it = cart.find(c => c.id === id); if (it) { it.qty = (it.qty || 1) + 1; updateCartBadge(); renderCart(); } }
function decreaseQty(id) { const it = cart.find(c => c.id === id); if (it) { it.qty = (it.qty || 1) - 1; if (it.qty <= 0) { cart = cart.filter(c => c.id !== id); document.getElementById('orderBtn').disabled = cart.length === 0; renderShop(); } updateCartBadge(); renderCart(); } }
function updateCartBadge() { document.getElementById('cartCount').textContent = cart.reduce((s, c) => s + (c.qty || 1), 0); }

function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    updateCartBadge();
    document.getElementById('orderBtn').disabled = cart.length === 0;
    renderShop(); renderCart();
}

function openCart() {
    renderCart();
    document.getElementById('cartOverlay').classList.add('open');
    document.getElementById('cartDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeCart() {
    document.getElementById('cartOverlay').classList.remove('open');
    document.getElementById('cartDrawer').classList.remove('open');
    document.body.style.overflow = '';
}

function renderCart() {
    const el = document.getElementById('cartItems');
    if (!cart.length) {
        el.innerHTML = '<div class="cart-empty">Your cart is empty. Shop our signature cakes!</div>';
        document.getElementById('cartTotal').textContent = '₹0';
        document.querySelector('.address-box').classList.add('hidden'); // Hide address if empty
        return;
    }
    document.querySelector('.address-box').classList.remove('hidden');
    // Pre-fill address
    const saved = localStorage.getItem('sk_addr');
    if (saved && !document.getElementById('cartAddress').value) {
        document.getElementById('cartAddress').value = saved;
    }

    const total = cart.reduce((s, c) => s + c.price * (c.qty || 1), 0);
    el.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="ci-ico">${c.emoji || '🎂'}</div>
      <div class="ci-info">
        <span class="ci-name">${c.name}</span>
        <div class="ci-meta">Fresh baked · 48hr</div>
      </div>
      <div class="ci-right">
        <div class="ci-price">₹${(c.price * (c.qty || 1)).toLocaleString('en-IN')}</div>
        <div class="ci-qty-row">
          <button class="ci-qty-btn" onclick="decreaseQty(${c.id})">−</button>
          <span class="ci-qty">${c.qty || 1}</span>
          <button class="ci-qty-btn" onclick="increaseQty(${c.id})">+</button>
          <button class="ci-rem" onclick="removeFromCart(${c.id})">✕</button>
        </div>
      </div>
    </div>`).join('');
    document.getElementById('cartTotal').textContent = '₹' + total.toLocaleString('en-IN');
}

/* ── QUICK VIEW ── */
function openQV(id) {
    const c = CAKES.find(x => x.id === id);
    const qvImg = document.getElementById('qvImg');
    const qvBody = document.getElementById('qvBody');
    qvImg.style.background = c.bg;
    qvImg.innerHTML = `<button class="x-abs" onclick="closeQV()">✕</button><span style="font-size:7rem">${c.emoji}</span>`;
    qvBody.innerHTML = `
    <div class="qv-name">${c.name}</div>
    <div class="qv-desc">${c.desc}</div>
    <div class="qv-tags">${c.tags.map(t => `<span class="qv-tag">${t}</span>`).join('')}</div>
    <div class="qv-rating">${'★'.repeat(Math.round(c.rating))}<small>(${c.reviews} reviews)</small></div>
    <div class="qv-bottom">
      <div class="qv-price">₹${c.price.toLocaleString('en-IN')}</div>
      <button class="qv-add" onclick="addToCart(${c.id});closeQV()">Add to Cart</button>
    </div>`;
    openOverlay('qvOverlay');
}
function closeQV() { closeOverlay('qvOverlay'); }

/* ── ORDER ── */
const SERVER = 'http://localhost:3001/api';

async function placeOrder() {
    if (!loggedIn) { closeCart(); openAuth(); return; }
    if (!cart.length) return;

    const addr = document.getElementById('cartAddress').value.trim();
    if (addr.length < 5) {
        document.getElementById('addrError').classList.remove('hidden');
        document.getElementById('cartAddress').focus();
        document.getElementById('cartAddress').style.borderColor = 'var(--rose)';
        return;
    }
    document.getElementById('addrError').classList.add('hidden');
    document.getElementById('cartAddress').style.borderColor = 'var(--border)';

    const total = cart.reduce((s, c) => s + c.price * (c.qty || 1), 0);
    const btn = document.getElementById('orderBtn');
    btn.textContent = 'Processing…';
    btn.disabled = true;

    try {
        const orderRes = await fetch(SERVER + '/payment/create-order', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: total }),
        });
        const orderData = await orderRes.json();
        if (!orderData.success) throw new Error(orderData.message);

        // Show demo payment modal
        closeCart();
        openPayModal(orderData.orderId, total, addr);
        btn.textContent = 'Place Order'; btn.disabled = cart.length === 0;

    } catch (e) {
        console.warn('Server unreachable, running in offline demo mode.');
        closeCart();
        openPayModal('order_offline_' + Date.now(), total, addr);
        btn.textContent = 'Place Order'; btn.disabled = cart.length === 0;
    }
}

/* ── DEMO PAYMENT MODAL ── */
function openPayModal(orderId, total, addr) {
    const user = JSON.parse(localStorage.getItem('sk_user') || '{}');
    document.getElementById('pm-amount').textContent = '₹' + total.toLocaleString('en-IN');
    document.getElementById('pm-name').value = user.name || '';
    document.getElementById('pm-email').value = user.email || '';
    document.getElementById('pm-orderId').value = orderId;
    document.getElementById('pm-addr').value = addr;
    document.getElementById('pm-card').value = '';
    document.getElementById('pm-expiry').value = '';
    document.getElementById('pm-cvv').value = '';
    document.getElementById('pm-err').textContent = '';
    document.getElementById('pm-success').classList.add('hidden');
    document.getElementById('pm-form').classList.remove('hidden');
    document.getElementById('pm-hint').classList.remove('hidden');
    openOverlay('payOverlay');
}
function closePayModal() { closeOverlay('payOverlay'); }

function fmtCard(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
}
function fmtExpiry(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    e.target.value = v;
}

async function submitPayment() {
    const card = document.getElementById('pm-card').value.replace(/\s/g, '');
    const expiry = document.getElementById('pm-expiry').value;
    const cvv = document.getElementById('pm-cvv').value;
    const name = document.getElementById('pm-name').value.trim();
    const err = document.getElementById('pm-err');
    const oId = document.getElementById('pm-orderId').value;
    const addr = document.getElementById('pm-addr').value;

    if (!name) { err.textContent = 'Please enter cardholder name.'; return; }
    if (card.length < 12) { err.textContent = 'Enter a valid card number.'; return; }
    if (!expiry.includes('/')) { err.textContent = 'Enter expiry as MM/YY.'; return; }
    if (cvv.length < 3) { err.textContent = 'Enter a valid CVV.'; return; }
    err.textContent = '';

    const payBtn = document.getElementById('pm-pay-btn');
    payBtn.textContent = 'Processing…'; payBtn.disabled = true;

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 1600));

    try {
        const res = await fetch(SERVER + '/payment/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: oId, cartItems: cart, address: addr, demoCard: card.slice(-4) }),
        });
        const data = await res.json();
        completeOrder(data.orderId || oId);
    } catch (e) {
        // Offline fallback
        completeOrder('SLK-' + Math.random().toString(36).substr(2, 6).toUpperCase());
    } finally {
        payBtn.textContent = 'Pay Now'; payBtn.disabled = false;
    }
}

function completeOrder(orderId) {
    document.getElementById('pm-form').classList.add('hidden');
    document.getElementById('pm-hint').classList.add('hidden');
    document.getElementById('pm-success').classList.remove('hidden');
    document.getElementById('pm-conf-id').textContent = orderId;

    addPoints(150, 'Placed an order!');
    unlockAchievement('order');
    cart = [];
    document.getElementById('cartCount').textContent = 0;
    document.getElementById('orderBtn').disabled = true;
    renderShop(); renderCart();

    document.getElementById('orderId').textContent = orderId;
    setTimeout(() => {
        closePayModal();
        const t = document.getElementById('orderToast');
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 5000);
    }, 2200);
    fireConfetti();
}



/* ── CONTACT FORM ── */
function sendContactMsg() {
    const n = document.getElementById('cfName').value.trim();
    const m = document.getElementById('cfMsg').value.trim();
    if (!n || !m) return;
    document.getElementById('cfSent').classList.remove('hidden');
    document.getElementById('cfName').value = '';
    document.getElementById('cfMsg').value = '';
    setTimeout(() => document.getElementById('cfSent').classList.add('hidden'), 4000);
}

/* ── AUTH ── */
let loggedIn = false, currentPhone = '', otpTimer;
function saveAddress() {
    const val = document.getElementById('cartAddress').value;
    localStorage.setItem('sk_addr', val);
    if (val.length >= 5) {
        document.getElementById('addrError').classList.add('hidden');
        document.getElementById('cartAddress').style.borderColor = 'var(--border)';
    }
}

function openAuth() { openOverlay('authOverlay'); }
function closeAuth() { closeOverlay('authOverlay'); }

function sendOTP() {
    const p = document.getElementById('phoneInput').value;
    const cc = document.getElementById('countryCode').value;
    if (p.length < 8) { document.getElementById('phoneError').textContent = 'Please enter a valid phone number.'; return; }
    document.getElementById('phoneError').textContent = '';
    currentPhone = cc + p;
    document.getElementById('otpSentTo').textContent = 'Code sent to ' + currentPhone + ' — demo: 123456';
    document.getElementById('authStep1').classList.add('hidden');
    document.getElementById('authStep2').classList.remove('hidden');
    startOTPTimer();
    document.querySelectorAll('.otp-box').forEach(b => b.value = '');
    document.querySelectorAll('.otp-box')[0].focus();
}

function startOTPTimer() {
    let t = 30;
    document.getElementById('timerCount').textContent = t;
    document.getElementById('otpTimer').classList.remove('hidden');
    document.getElementById('resendBtn').classList.add('hidden');
    clearInterval(otpTimer);
    otpTimer = setInterval(() => {
        t--;
        document.getElementById('timerCount').textContent = t;
        if (t <= 0) {
            clearInterval(otpTimer);
            document.getElementById('otpTimer').classList.add('hidden');
            document.getElementById('resendBtn').classList.remove('hidden');
        }
    }, 1000);
}

function resendOTP() { startOTPTimer(); document.getElementById('otpError').textContent = 'New OTP sent!'; }

function fillDemoOTP() {
    const boxes = document.querySelectorAll('.otp-box');
    '123456'.split('').forEach((d, i) => { if (boxes[i]) boxes[i].value = d; });
    if (boxes[5]) boxes[5].focus();
}
function otpInput(el, i) {
    el.value = el.value.replace(/\D/g, '').slice(-1);
    if (el.value) { const boxes = document.querySelectorAll('.otp-box'); if (i < 5) boxes[i + 1].focus(); }
}
function otpBack(el, i) { if (event.key === 'Backspace' && !el.value && i > 0) { document.querySelectorAll('.otp-box')[i - 1].focus(); } }

function verifyOTP() {
    const code = Array.from(document.querySelectorAll('.otp-box')).map(b => b.value).join('');
    if (code.length < 6) { document.getElementById('otpError').textContent = 'Please enter the 6-digit code.'; return; }
    document.getElementById('otpError').textContent = '';
    clearInterval(otpTimer);
    loggedIn = true;
    document.getElementById('authStep2').classList.add('hidden');
    document.getElementById('authStep3').classList.remove('hidden');
    document.getElementById('authWelcome').textContent = 'Welcome back! Signed in as ' + currentPhone;
    document.getElementById('authUserCard').textContent = currentPhone;
    addPoints(100, 'Signed in with WhatsApp');
    // Show tracker if open
    document.getElementById('trackerAuthGate').classList.add('hidden');
    document.getElementById('trackerContent').classList.remove('hidden');
}

function backToPhone() {
    clearInterval(otpTimer);
    document.getElementById('authStep2').classList.add('hidden');
    document.getElementById('authStep1').classList.remove('hidden');
}

function logOut() {
    loggedIn = false; currentPhone = '';
    document.getElementById('authStep3').classList.add('hidden');
    document.getElementById('authStep1').classList.remove('hidden');
    document.getElementById('phoneInput').value = '';
    document.getElementById('trackerAuthGate').classList.remove('hidden');
    document.getElementById('trackerContent').classList.add('hidden');
    closeAuth();
}

/* Logout from navbar pill */
function doLogout() {
    localStorage.removeItem('sk_token');
    localStorage.removeItem('sk_user');
    localStorage.removeItem('sk_loggedIn');
    loggedIn = false;
    document.getElementById('navLoginBtn').classList.remove('hidden');
    document.getElementById('navUserPill').classList.add('hidden');
    showPtsToast('Signed out.');
}

/* ── TRACKER ── */
const ORDER_STATUSES = {
    'SLK-TEST': { status: 'Baking', step: 2, eta: 'Ready by 4:30 PM today' },
    'SLK-DEMO': { status: 'Out for Delivery', step: 4, eta: 'Arriving in ~30 mins' },
};

const STEPS = ['Confirmed', 'Prepping', 'Baking', 'Quality Check', 'Out for Delivery', 'Delivered'];

function openTracker() {
    if (loggedIn) {
        document.getElementById('trackerAuthGate').classList.add('hidden');
        document.getElementById('trackerContent').classList.remove('hidden');
    }
    openOverlay('trackerOverlay');
}
function closeTracker() { closeOverlay('trackerOverlay'); }

function trackOrder() {
    const id = document.getElementById('trackInput').value.trim();
    if (!id) { showPtsToast('Please enter an Order ID'); return; }
    const order = ORDER_STATUSES[id] || { status: 'Confirmed', step: 1, eta: 'Estimated ready in 24-48 hours' };
    document.getElementById('trackerResult').classList.add('hidden');
    // Show order found popup for 2.5s
    const old = document.getElementById('orderFoundPopup'); if (old) old.remove();
    const p = document.createElement('div');
    p.id = 'orderFoundPopup'; p.className = 'order-found-popup';
    p.innerHTML = `<div class="ofp-icon">🔍</div><div style="flex:1"><div class="ofp-label">Order Found!</div><div class="ofp-id">${id}</div><div class="ofp-status">${order.status}</div></div><div class="ofp-spinner"></div>`;
    document.querySelector('.tracker-body').appendChild(p);
    requestAnimationFrame(() => {
        p.style.opacity = '0';
        p.style.transform = 'translate(-50%, -50%) scale(0.92)';
        requestAnimationFrame(() => {
            p.style.transition = 'opacity .3s, transform .3s';
            p.style.opacity = '1';
            p.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
    setTimeout(() => {
        p.style.opacity = '0';
        p.style.transform = 'translate(-50%, -50%) scale(0.92)';
        setTimeout(() => p.remove(), 300);
        const result = document.getElementById('trackerResult');
        result.classList.remove('hidden');
        result.style.opacity = '0'; result.style.transform = 'translateY(10px)';
        document.getElementById('tr-id-label').textContent = id;
        document.getElementById('tr-badge').textContent = order.status;
        document.getElementById('tr-eta').textContent = order.eta;
        fireConfetti();
        const STEP_ICONS = ['📋', '🥚', '🔥', '✅', '🚗', '🎉'];
        document.getElementById('trackSteps').innerHTML = STEPS.map((s, i) => {
            const done = i < order.step, active = i === order.step - 1;
            return `<div class="step-item"><div class="step-circle ${done ? 'done' : active ? 'active' : ''}">${done ? '✓' : STEP_ICONS[i]}</div><div class="step-label ${done ? 'done' : active ? 'active' : ''}">${s}</div></div>`;
        }).join('');
        requestAnimationFrame(() => { result.style.transition = 'opacity .45s,transform .45s'; result.style.opacity = '1'; result.style.transform = 'translateY(0)'; });
        document.getElementById('trackFill').style.width = '0%';
        setTimeout(() => { document.getElementById('trackFill').style.width = ((order.step - 1) / Math.max(STEPS.length - 1, 1) * 100) + '%'; }, 120);
    }, 2500);
}
function toggleWaNotify() {
    const sw = document.getElementById('waNotifySw');
    sw.classList.toggle('on');
    if (sw.classList.contains('on')) {
        document.getElementById('waSentNote').classList.remove('hidden');
        setTimeout(() => document.getElementById('waSentNote').classList.add('hidden'), 3000);
    }
}

/* ── 3D BUILDER ── */
const CAKE_FONTS = [
    { name: 'Script', family: "'Cormorant Garamond', Georgia, serif" },
    { name: 'Classic', family: "'Playfair Display', Georgia, serif" },
    { name: 'Modern', family: "'Jost', sans-serif" },
    { name: 'Elegant', family: "'Crimson Pro', Georgia, serif" },
    { name: 'Serif', family: "Georgia, serif" },
    { name: 'Bold', family: "'Jost', sans-serif" },
];

let scene, camera, renderer, cakeGroup, animFrame;
let isDrag = false, lastX = 0, lastY = 0, rotY = 0.3, rotX = 0.1;
let builderInitted = false;
const builder = { tiers: 1, layerColors: ['#f48fb1', '#ce93d8', '#80deea'], fontIdx: 0, inscription: '', topping: false };

// AI CHEF BOT REMOVED
// Original Builder Logic restored

function openBuilder() {
    document.getElementById('builderOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    unlockAchievement('builder');
    addPoints(25, 'Opened 3D Builder');
    if (!builderInitted) {
        setTimeout(() => { init3D(); builderInitted = true; }, 150);
    } else {
        const wrap = document.querySelector('.canvas-wrap');
        if (renderer && wrap) {
            const W = wrap.clientWidth;
            const H = wrap.clientHeight;
            camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H, false);
        }
    }
}

function closeBuilder() {
    document.getElementById('builderOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function init3D() {
    const canvas = document.getElementById('cake3d-canvas');
    const wrap = document.querySelector('.canvas-wrap');
    const W = Math.max(wrap.clientWidth || 640, 200);
    const H = Math.max(wrap.clientHeight || 520, 300);

    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
    camera.position.set(0, 0.3, 8.5);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    scene.add(new THREE.AmbientLight(0xfff8f0, 1.1));
    const key = new THREE.DirectionalLight(0xfffdf5, 1.6);
    key.position.set(5, 8, 5); key.castShadow = true; scene.add(key);
    const fill = new THREE.DirectionalLight(0xf0e8ff, 0.65);
    fill.position.set(-5, 3, -3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8cc, 0.4);
    rim.position.set(0, -4, -6); scene.add(rim);
    const back = new THREE.DirectionalLight(0xfff0e0, 0.28);
    back.position.set(0, 2, -8); scene.add(back);

    // Ground plane
    const ground = new THREE.Mesh(new THREE.CircleGeometry(3.5, 48), new THREE.ShadowMaterial({ opacity: .18 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -2.8; ground.receiveShadow = true; scene.add(ground);

    buildCakeMesh();
    setupDrag(canvas);
    animate3D();
}

function mkMat(hex, rough = 0.4, metal = 0.1) {
    const c = new THREE.Color(hex);
    return new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });
}

function buildCakeMesh() {
    if (!scene) return;
    if (cakeGroup) { scene.remove(cakeGroup); }
    cakeGroup = new THREE.Group();
    scene.add(cakeGroup);

    const n = builder.tiers;
    const GAP = 0.06;
    const tierSpec = [
        { r: 1.55, h: 1.15 }, { r: 1.15, h: 1.0 }, { r: 0.80, h: 0.85 }
    ].slice(0, n);
    const totalH = tierSpec.reduce((s, t) => s + t.h, 0) + (n - 1) * GAP;
    let curY = -totalH / 2;
    const tierTopYs = [];

    for (let i = 0; i < n; i++) {
        if (i > 0) curY += GAP;
        const { r, h } = tierSpec[i];
        const col = builder.layerColors[i] || '#f48fb1';
        const midY = curY + h / 2;

        // Main cylinder
        const cake = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 56), mkMat(col));
        cake.position.y = midY; cake.castShadow = true; cake.receiveShadow = true; cakeGroup.add(cake);

        // Frosting ring — tinted cream, not white
        const frostC = new THREE.Color(col);
        frostC.lerp(new THREE.Color('#f5e8d8'), 0.55);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 14, 56), new THREE.MeshStandardMaterial({ color: frostC, roughness: 0.32, transparent: true, opacity: 0.86 }));
        ring.position.y = midY + h / 2; ring.rotation.x = Math.PI / 2; cakeGroup.add(ring);
        // Drip — tinted cream
        const dripC = new THREE.Color(col);
        dripC.lerp(new THREE.Color('#ede0d0'), 0.45);
        const drip = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.048, 10, 48), new THREE.MeshStandardMaterial({ color: dripC, roughness: 0.28, transparent: true, opacity: 0.5 }));
        drip.position.y = midY + h / 2 - 0.18; drip.rotation.x = Math.PI / 2; cakeGroup.add(drip);

        tierTopYs[i] = midY + h / 2;
        curY += h;
    }

    const topY = tierTopYs[n - 1];

    // Cherry topper
    if (builder.topping) {
        const cy = topY + 0.28;
        const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 32),
            new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.06, metalness: 0.18 }));
        cherry.position.y = cy; cakeGroup.add(cherry);
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, cy, 0), new THREE.Vector3(0.1, cy + 0.22, 0), new THREE.Vector3(0.18, cy + 0.42, 0)]);
        cakeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.024, 8, false), mkMat('#3a6a1a', 0.8)));
    }

    // Plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 2.12, 0.09, 56), mkMat('#f0e0cc', 0.45, 0.1));
    plate.position.y = -totalH / 2 - 0.046; cakeGroup.add(plate);
    const plateShadow = new THREE.Mesh(new THREE.CylinderGeometry(2.12, 2.12, 0.01, 56),
        new THREE.MeshStandardMaterial({ color: 0xe0c8b0, roughness: 0.6 }));
    plateShadow.position.y = -totalH / 2 - 0.092; cakeGroup.add(plateShadow);

    // Inscription on front of bottom tier
    if (builder.inscription && builder.inscription.trim()) {
        const txt = builder.inscription.trim();
        const font = CAKE_FONTS[builder.fontIdx] || CAKE_FONTS[0];
        const tc = document.createElement('canvas');
        tc.width = 1024; tc.height = 256;
        const ctx = tc.getContext('2d');
        ctx.clearRect(0, 0, 1024, 256);
        const fsize = Math.min(108, Math.floor(760 / Math.max(txt.length, 1)) + 32);
        ctx.font = `italic ${fsize}px ${font.family.replace(/'/g, '').split(',')[0].trim()}, Georgia, serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(80,20,20,0.5)'; ctx.shadowBlur = 15;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillText(txt, 512, 128);
        const tex = new THREE.CanvasTexture(tc);
        const bot = tierSpec[0];
        const botMidY = -totalH / 2 + bot.h / 2;
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(bot.r * 1.65, 0.52),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
        );
        plane.position.set(0, botMidY, bot.r + 0.012);
        cakeGroup.add(plane);
    }

    updateBuilderPrice();
}

function animate3D() {
    animFrame = requestAnimationFrame(animate3D);
    if (!isDrag) rotY += 0.004;
    if (cakeGroup) { cakeGroup.rotation.y = rotY; cakeGroup.rotation.x = rotX; }
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function setupDrag(canvas) {
    canvas.addEventListener('mousedown', e => { isDrag = true; lastX = e.clientX; lastY = e.clientY; });
    canvas.addEventListener('mousemove', e => { if (!isDrag) return; rotY += (e.clientX - lastX) * 0.012; rotX += (e.clientY - lastY) * 0.008; rotX = Math.max(-0.5, Math.min(0.6, rotX)); lastX = e.clientX; lastY = e.clientY; });
    canvas.addEventListener('mouseup', () => isDrag = false);
    canvas.addEventListener('mouseleave', () => isDrag = false);
    canvas.addEventListener('touchstart', e => { isDrag = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchmove', e => { if (!isDrag) return; rotY += (e.touches[0].clientX - lastX) * 0.012; rotX += (e.touches[0].clientY - lastY) * 0.008; rotX = Math.max(-0.5, Math.min(0.6, rotX)); lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }, { passive: true });
    canvas.addEventListener('touchend', () => isDrag = false);
}

function renderCtrlPanel() {
    // Layer colour controls
    const list = document.getElementById('layerColourList');
    const labels = ['Bottom Layer', 'Middle Layer', 'Top Layer'];
    list.innerHTML = builder.layerColors.slice(0, builder.tiers).map((col, i) => `
    <label class="layer-colour-btn">
      <div class="layer-swatch" style="background:${col}"></div>
      <span>${labels[i]}</span>
      <input type="color" class="layer-colour-input" value="${col}"
        oninput="setLayerColor(${i},this.value)"/>
    </label>`).join('');

    // Tier buttons
    document.getElementById('tierRow').innerHTML = [1, 2, 3].map(n =>
        `<button class="tier-btn ${builder.tiers === n ? 'active' : ''}" onclick="setTiers(${n})">${n} Tier${n > 1 ? 's' : ''}</button>`).join('');

    // Font selector
    document.getElementById('fontSelector').innerHTML = CAKE_FONTS.map((f, i) =>
        `<button class="font-btn ${builder.fontIdx === i ? 'active' : ''}" style="font-family:${f.family}" onclick="setFont(${i})">${f.name}</button>`).join('');

    // Inscription input font
    const fi = document.getElementById('fontTextInput');
    fi.value = builder.inscription;
    fi.style.fontFamily = CAKE_FONTS[builder.fontIdx].family;

    // Topping
    const sw = document.getElementById('toppingSw');
    if (sw) sw.className = 'tog-sw' + (builder.topping ? ' on' : '');

    updateBuilderPrice();
}

function setLayerColor(i, col) {
    builder.layerColors[i] = col;
    addPoints(5, 'Customised a layer');
    buildCakeMesh();
    renderCtrlPanel();
}

function setTiers(n) {
    builder.tiers = n;
    buildCakeMesh();
    renderCtrlPanel();
    // Initial build
    buildCakeMesh();
    animate3D();

    // Populate controls (Color Palette)
    const palRow = document.getElementById('layerColourList');
    if (palRow && palRow.innerHTML === '') {
        const pals = [
            ['#f48fb1', '#ce93d8', '#80deea'],
            ['#b39ddb', '#9575cd', '#7e57c2'],
            ['#ffcc80', '#ffb74d', '#ffa726'],
            ['#80cbc4', '#4db6ac', '#26a69a'],
            ['#90caf9', '#64b5f6', '#42a5f5']
        ];
        pals.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.className = 'c-pal-btn';
            btn.style.background = `linear-gradient(45deg, ${p[0]}, ${p[1]})`;
            btn.onclick = () => {
                builder.layerColors = p;
                buildCakeMesh();
            };
            palRow.appendChild(btn);
        });
    }

    // Tier buttons
    const tr = document.getElementById('tierRow');
    if (tr && tr.innerHTML === '') {
        [1, 2, 3].forEach(n => {
            const b = document.createElement('button');
            b.className = 'tier-btn' + (builder.tiers === n ? ' active' : '');
            b.innerText = n;
            b.onclick = () => {
                builder.tiers = n;
                buildCakeMesh();
                renderCtrlPanel();
            };
            tr.appendChild(b);
        });
    }

    // Fonts
    const fs = document.getElementById('fontSelector');
    if (fs && fs.innerHTML === '') {
        CAKE_FONTS.forEach((f, i) => {
            const b = document.createElement('button');
            b.className = 'font-btn' + (builder.fontIdx === i ? ' active' : '');
            b.innerText = 'Aa';
            b.style.fontFamily = f.family;
            b.onclick = () => setFont(i);
            fs.appendChild(b);
        });
    }
    renderCtrlPanel();
}

function setFont(i) {
    builder.fontIdx = i;
    renderCtrlPanel();
    buildCakeMesh();
}

function updateInscription() {
    builder.inscription = document.getElementById('fontTextInput').value;
    buildCakeMesh();
}

function toggleTopping() {
    builder.topping = !builder.topping;
    buildCakeMesh();
    renderCtrlPanel();
}

function updateBuilderPrice() {
    const base = 1299, tierAdd = 400, cherryAdd = 199;
    const total = base + (builder.tiers - 1) * tierAdd + (builder.topping ? cherryAdd : 0);
    document.getElementById('builderPrice').textContent = '₹' + total.toLocaleString('en-IN');
    const lines = [`Base: ₹${base.toLocaleString('en-IN')}`];
    if (builder.tiers > 1) lines.push(`+${builder.tiers - 1} extra tier${builder.tiers > 2 ? 's' : ''}: ₹${((builder.tiers - 1) * tierAdd).toLocaleString('en-IN')}`);
    if (builder.topping) lines.push(`Cherry topper: ₹${cherryAdd}`);
    document.getElementById('priceBreakdown').innerHTML = lines.join('<br/>');
}

function addBuilderToCart() {
    const base = 1299, tierAdd = 400, cherryAdd = 199;
    const total = base + (builder.tiers - 1) * tierAdd + (builder.topping ? cherryAdd : 0);
    const custom = { id: Date.now(), name: 'Custom Cake', desc: builder.tiers + '-tier custom design' + (builder.inscription ? ' · "' + builder.inscription + '"' : ''), emoji: '🎂', price: total, tags: ['custom'], rating: 5, reviews: 0, badge: 'CUSTOM' };
    cart.push(custom);
    addPoints(30, 'Created a custom cake');
    document.getElementById('cartCount').textContent = cart.length;
    document.getElementById('orderBtn').disabled = false;
    closeBuilder();
    openCart();
}

function takeSnapshot() {
    if (!renderer) { alert('Please open the 3D Builder first.'); return; }
    const flash = document.getElementById('snapFlash');
    flash.style.opacity = '0.8';
    setTimeout(() => flash.style.opacity = '0', 180);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'silkoven-cake.png'; a.click();
    addPoints(50, 'Downloaded cake design');
    unlockAchievement('download');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
    updateGamHUD();
    renderShop();

    /* ── Show logged-in user in navbar ── */
    const skUser = localStorage.getItem('sk_user');
    const skLoggedIn = localStorage.getItem('sk_loggedIn');
    if (skLoggedIn === '1' && skUser) {
        try {
            const u = JSON.parse(skUser);
            const displayName = u.name || u.phone || 'Member';
            document.getElementById('navUserName').textContent = '👤 ' + displayName;
            document.getElementById('navLoginBtn').classList.add('hidden');
            document.getElementById('navUserPill').classList.remove('hidden');
            loggedIn = true;
        } catch (e) { }
    }

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        document.getElementById('navbar').style.boxShadow =
            window.scrollY > 10 ? '0 4px 24px rgba(107,61,46,.12)' : 'none';
    });

    // Scroll Animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('section, .hero-content, .cake-card, .testi-card').forEach(el => {
        el.classList.add('reveal-on-scroll');
        observer.observe(el);
    });
});

/* ── CONFETTI ── */
function fireConfetti() {
    const colors = ['#c0392b', '#e06070', '#b5883a', '#ffffff', '#2e7d32'];
    for (let i = 0; i < 50; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 3) + 's';
        conf.style.opacity = Math.random();
        document.body.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}