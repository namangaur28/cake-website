/* ===================================================
   SILKOVEN — Backend API Server (MongoDB Atlas)
   Usage: node server.js
   Env:   MONGO_URI, PORT
   =================================================== */

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Config ── */
const JWT_SECRET = process.env.JWT_SECRET || 'silkoven_jwt_secret_demo_2024';
const MONGO_URI = process.env.MONGO_URI;

/* ── MongoDB Connection ── */
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅  MongoDB Connected'))
        .catch(err => console.error('❌  MongoDB error:', err.message));
} else {
    console.warn('⚠️   MONGO_URI not set — running without database (no data will be saved)');
}

/* ── Mongoose Schemas ── */
const userSchema = new mongoose.Schema({
    id: { type: String, default: () => uuidv4() },
    name: String,
    email: { type: String, lowercase: true, sparse: true },
    passwordHash: String,
    phone: { type: String, sparse: true },
    createdAt: { type: Date, default: Date.now },
});
const otpSchema = new mongoose.Schema({
    phone: String,
    otp: String,
    expiresAt: Number,
});
const orderSchema = new mongoose.Schema({
    orderId: String,
    backendOrderId: String,
    items: Array,
    address: String,
    instructions: String,        // special add-on instructions from builder
    customizationData: mongoose.Schema.Types.Mixed,  // full 3D builder config per order
    card: String,
    status: { type: String, default: 'Pending' }, // 'Pending', 'Prepping', 'Baking', 'Ready', 'Completed'
    paidAt: { type: Date, default: Date.now },
});
const messageSchema = new mongoose.Schema({
    name: String,
    message: String,
    sentAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

/* ── Middleware ── */
app.use(cors());
app.use(express.json());

// Serve the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Admin dashboard
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html')));

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

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    console.log(`[REGISTER] ${name} <${email}>`);
    const token = makeToken({ id: user.id, email: user.email, name: user.name });
    return res.json({ success: true, message: `Welcome, ${name}! Your account has been created.`, token, user: { id: user.id, name: user.name, email: user.email } });
});

/* POST /api/auth/login */
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
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
app.post('/api/auth/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 8)
        return res.status(400).json({ success: false, message: 'Please provide a valid phone number.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    await OTP.deleteMany({ phone });
    await OTP.create({ phone, otp, expiresAt });

    console.log(`\n[WHATSAPP OTP] ━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Phone : ${phone}`);
    console.log(`   OTP   : ${otp}   (valid 5 min)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return res.json({ success: true, message: `OTP sent to ${phone}. (Demo: see terminal)`, demoOtp: otp });
});

/* POST /api/auth/verify-otp */
app.post('/api/auth/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp)
        return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });

    const record = await OTP.findOne({ phone });
    if (!record)
        return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    if (Date.now() > record.expiresAt)
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    if (record.otp !== otp)
        return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    await OTP.deleteMany({ phone });

    let user = await User.findOne({ phone });
    if (!user) {
        user = await User.create({ name: 'Silkoven Member', phone });
    }

    console.log(`[OTP VERIFIED] ${phone}`);
    const token = makeToken({ id: user.id, phone: user.phone, name: user.name });
    return res.json({ success: true, message: `Welcome to Silkoven! Signed in as ${phone}`, token, user: { id: user.id, name: user.name, phone: user.phone } });
});

/* GET /api/auth/users — admin view */
app.get('/api/auth/users', async (req, res) => {
    const users = await User.find({}, 'id name email phone createdAt');
    return res.json({ success: true, count: users.length, users });
});

/* ==============================================
   PAYMENT ROUTES  (Demo / Mock mode)
   ============================================== */

/* POST /api/payment/create-order */
app.post('/api/payment/create-order', (req, res) => {
    const { amount, currency = 'INR' } = req.body;
    if (!amount || amount < 1)
        return res.status(400).json({ success: false, message: 'Invalid amount.' });

    const mockOrderId = 'order_demo_' + Date.now();
    console.log(`[PAYMENT] Demo order created: ${mockOrderId} — ₹${amount}`);

    return res.json({
        success: true,
        orderId: mockOrderId,
        amount,
        currency,
        demoMode: true,
    });
});

/* POST /api/payment/verify */
app.post('/api/payment/verify', async (req, res) => {
    const { orderId, cartItems, address, demoCard, instructions } = req.body;

    // Also pull instructions from custom cake items if not sent top-level
    const instr = instructions ||
        (cartItems || []).map(i => i.instructions).filter(Boolean).join('; ') || '';

    // Extract customization data from cart items (for 3D builder cakes)
    const customizationData = (cartItems || [])
        .filter(i => i.customization)
        .map(i => ({ itemId: i.id, itemName: i.name, customization: i.customization }));

    const ordCode = 'SLK-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    await Order.create({
        orderId: ordCode,
        backendOrderId: orderId,
        items: cartItems || [],
        address: address || '',
        instructions: instr,
        customizationData: customizationData.length ? customizationData : null,
        card: demoCard || 'demo',
    });

    console.log(`[ORDER PLACED] ${ordCode} | ${cartItems?.length || 0} item(s) | notes: "${instr || 'none'}"`);
    return res.json({ success: true, message: 'Payment confirmed! Your order is being baked.', orderId: ordCode });
});

/* GET /api/orders — view all orders */
app.get('/api/orders', async (req, res) => {
    const orders = await Order.find().sort({ paidAt: -1 });
    return res.json({ success: true, count: orders.length, orders });
});

/* PATCH /api/orders/:id/status — update order status (chef) */
app.patch('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });

    // Find and update
    const order = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { status },
        { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    console.log(`[CHEF] Order ${order.orderId} status set to: ${status}`);
    return res.json({ success: true, message: `Status updated to ${status}`, order });
});

/* ==============================================
   CONTACT ROUTES
   ============================================== */

/* POST /api/contact — save quick message */
app.post('/api/contact', async (req, res) => {
    const { name, message } = req.body;
    if (!name || !message)
        return res.status(400).json({ success: false, message: 'Name and message are required.' });
    await Message.create({ name, message });
    console.log(`[MESSAGE] ${name}: ${message.slice(0, 60)}`);
    return res.json({ success: true, message: 'Message received!' });
});

/* GET /api/contact — view all messages (admin) */
app.get('/api/contact', async (req, res) => {
    const messages = await Message.find().sort({ sentAt: -1 });
    return res.json({ success: true, count: messages.length, messages });
});

/* Health check */
app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    server: 'Silkoven API v3 (MongoDB)',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
}));

/* ── Start ── */
app.listen(PORT, () => {
    console.log(`\n🎂  Silkoven Backend running!`);
    console.log(`    ─────────────────────────────────────────────`);
    console.log(`    🌐  Main Website   →  http://localhost:${PORT}/`);
    console.log(`    👥  View Users     →  http://localhost:${PORT}/api/auth/users`);
    console.log(`    📦  View Orders    →  http://localhost:${PORT}/api/orders`);
    console.log(`    💓  Health Check   →  http://localhost:${PORT}/api/health`);
    console.log(`    ─────────────────────────────────────────────`);
    console.log(`    Mode: DEMO (mock payments, MongoDB storage)\n`);
});
