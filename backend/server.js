/* ===================================================
   SILKOVEN — Backend API Server
   Usage: cd backend && node server.js
   =================================================== */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

/* ── Config ── */
const JWT_SECRET = 'silkoven_jwt_secret_demo_2024';
const DB_PATH = path.join(__dirname, 'db.json');   // backend/db.json

/* ── Middleware ── */
app.use(cors());
app.use(express.json());
// Serve the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Admin dashboard
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'admin.html')));


/* ── DB Helpers ── */
function readDB() {
    try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
    catch { return { users: [], otps: [], orders: [] }; }
}
function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/* ── JWT Helper ── */
function makeToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/* ==============================================
   AUTH ROUTES
   ============================================== */

/* POST /api/auth/register */
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    if (password.length < 8)
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

    const db = readDB();
    const exists = db.users.find(u => u.email === email.toLowerCase());
    if (exists)
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = { id: uuidv4(), name, email: email.toLowerCase(), passwordHash, phone: null, createdAt: new Date().toISOString() };
    db.users.push(user);
    writeDB(db);

    console.log(`[REGISTER] ${name} <${email}>`);
    const token = makeToken({ id: user.id, email: user.email, name: user.name });
    return res.json({ success: true, message: `Welcome, ${name}! Your account has been created.`, token, user: { id: user.id, name: user.name, email: user.email } });
});

/* POST /api/auth/login */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const db = readDB();
    const user = db.users.find(u => u.email === email.toLowerCase());
    if (!user)
        return res.status(401).json({ success: false, message: 'No account found with this email.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
        return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });

    console.log(`[LOGIN] ${user.name} <${user.email}>`);
    const token = makeToken({ id: user.id, email: user.email, name: user.name });
    return res.json({ success: true, message: `Welcome back, ${user.name}!`, token, user: { id: user.id, name: user.name, email: user.email } });
});

/* POST /api/auth/send-otp */
app.post('/api/auth/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 8)
        return res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    const db = readDB();
    db.otps = db.otps.filter(o => o.phone !== phone);
    db.otps.push({ phone, otp, expiresAt });
    writeDB(db);

    /*
     * ── REAL WhatsApp API STUB ──
     * Replace with WATI / Twilio call when going live.
     * For demo: OTP is printed to terminal and returned as demoOtp.
     */
    console.log(`\n[WHATSAPP OTP] ━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Phone : ${phone}`);
    console.log(`   OTP   : ${otp}   (valid 5 min)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return res.json({ success: true, message: `OTP sent to ${phone}. (Demo: see terminal)`, demoOtp: otp });
});

/* POST /api/auth/verify-otp */
app.post('/api/auth/verify-otp', (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp)
        return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });

    const db = readDB();
    const record = db.otps.find(o => o.phone === phone);

    if (!record)
        return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    if (Date.now() > record.expiresAt)
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    if (record.otp !== otp)
        return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    db.otps = db.otps.filter(o => o.phone !== phone);
    let user = db.users.find(u => u.phone === phone);
    if (!user) {
        user = { id: uuidv4(), name: 'Silkoven Member', email: null, passwordHash: null, phone, createdAt: new Date().toISOString() };
        db.users.push(user);
    }
    writeDB(db);

    console.log(`[OTP VERIFIED] ${phone}`);
    const token = makeToken({ id: user.id, phone: user.phone, name: user.name });
    return res.json({ success: true, message: `Welcome to Silkoven! Signed in as ${phone}`, token, user: { id: user.id, name: user.name, phone: user.phone } });
});

/* GET /api/auth/users — admin view */
app.get('/api/auth/users', (req, res) => {
    const db = readDB();
    const safe = db.users.map(({ id, name, email, phone, createdAt }) => ({ id, name, email, phone, createdAt }));
    return res.json({ success: true, count: safe.length, users: safe });
});

/* ==============================================
   PAYMENT ROUTES  (Demo / Mock mode)
   ============================================== */

/*
 * POST /api/payment/create-order
 *
 * DEMO MODE: Returns a mock order instantly without calling Razorpay API.
 * To use real Razorpay:
 *   1. npm install razorpay
 *   2. Replace mock block below with:
 *      const Razorpay = require('razorpay');
 *      const rzp = new Razorpay({ key_id: 'rzp_test_XXX', key_secret: 'YYY' });
 *      const order = await rzp.orders.create({ amount: amount*100, currency, receipt });
 */
app.post('/api/payment/create-order', (req, res) => {
    const { amount, currency = 'INR' } = req.body;
    if (!amount || amount < 1)
        return res.status(400).json({ success: false, message: 'Invalid amount.' });

    // Mock order — works instantly without Razorpay account
    const mockOrderId = 'order_demo_' + Date.now();
    console.log(`[PAYMENT] Demo order created: ${mockOrderId} — ₹${amount}`);

    return res.json({
        success: true,
        orderId: mockOrderId,
        amount: amount,
        currency,
        demoMode: true,   // <-- tells frontend to show demo payment UI
    });
});

/* POST /api/payment/verify */
app.post('/api/payment/verify', (req, res) => {
    const { orderId, cartItems, address, demoCard } = req.body;

    // Save order to DB
    const db = readDB();
    const ordCode = 'SLK-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    db.orders.push({
        orderId: ordCode,
        backendOrderId: orderId,
        items: cartItems || [],
        address: address || '',
        card: demoCard || 'demo',
        paidAt: new Date().toISOString(),
    });
    writeDB(db);

    console.log(`[ORDER PLACED] ${ordCode} | ${cartItems?.length || 0} item(s) | ₹${cartItems?.reduce((s, c) => s + c.price * (c.qty || 1), 0) || 0}`);
    return res.json({ success: true, message: 'Payment confirmed! Your order is being baked.', orderId: ordCode });
});

/* GET /api/orders — view all orders */
app.get('/api/orders', (req, res) => {
    const db = readDB();
    return res.json({ success: true, count: db.orders.length, orders: db.orders });
});

/* Health check */
app.get('/api/health', (req, res) => res.json({ status: 'ok', server: 'Silkoven API v2', time: new Date().toISOString() }));

/* ── Start ── */
app.listen(PORT, () => {
    console.log(`\n🎂  Silkoven Backend running!`);
    console.log(`    ─────────────────────────────────────────────`);
    console.log(`    🌐  Main Website   →  http://localhost:${PORT}/`);
    console.log(`    🔐  Login Page     →  http://localhost:${PORT}/login.html`);
    console.log(`    👥  View Users     →  http://localhost:${PORT}/api/auth/users`);
    console.log(`    📦  View Orders    →  http://localhost:${PORT}/api/orders`);
    console.log(`    💓  Health Check   →  http://localhost:${PORT}/api/health`);
    console.log(`    ─────────────────────────────────────────────`);
    console.log(`    Mode: DEMO (mock payments, no Razorpay keys needed)\n`);
});
