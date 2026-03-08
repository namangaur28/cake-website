/* =====================================================
   SILKOVEN — Gamified 3D Cake Builder
   cake-builder.js
   ===================================================== */

/* ══════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════ */

const SERVER = 'https://cake-website-ofys.onrender.com/api';

const FLAVORS = [
    { id: 'vanilla', name: 'Vanilla', color: '#f5e6c8', emoji: '🍦', desc: 'Classic & delicate' },
    { id: 'chocolate', name: 'Chocolate', color: '#5c3317', emoji: '🍫', desc: 'Rich Valrhona' },
    { id: 'strawberry', name: 'Strawberry', color: '#f48fb1', emoji: '🍓', desc: 'Fresh & fruity' },
    { id: 'redvelvet', name: 'Red Velvet', color: '#b71c1c', emoji: '❤️', desc: 'Velvety indulgence' },
    { id: 'matcha', name: 'Matcha', color: '#558b2f', emoji: '🍵', desc: 'Ceremonial grade' },
    { id: 'lemon', name: 'Lemon', color: '#f9a825', emoji: '🍋', desc: 'Citrus zing' },
];

const FROSTING_STYLES = [
    { id: 'smooth', label: 'Smooth' },
    { id: 'drip', label: 'Drip' },
    { id: 'rosette', label: 'Rosette' },
    { id: 'naked', label: 'Naked' },
];

const TEXTURES = [
    { id: 'plain', label: 'Plain' },
    { id: 'sprinkle', label: 'Sprinkle' },
    { id: 'floral', label: 'Floral' },
];

const COLOR_PRESETS = [
    '#f48fb1', '#ce93d8', '#80deea', '#a5d6a7',
    '#ffb74d', '#ef9a9a', '#b39ddb', '#f5e6c8',
    '#80cbc4', '#ff8a65', '#e6ee9c', '#5c3317',
];

const CAKE_FONTS = [
    { name: 'Script', family: "'Cormorant Garamond', Georgia, serif" },
    { name: 'Classic', family: "'Playfair Display', Georgia, serif" },
    { name: 'Modern', family: "'Jost', sans-serif" },
    { name: 'Elegant', family: "'Crimson Pro', Georgia, serif" },
];

const TIER_SPECS_DEFAULT = [
    { r: 1.55, h: 1.15 },
    { r: 1.15, h: 1.00 },
    { r: 0.80, h: 0.85 },
];

/* ══════════════════════════════════════════════════════
   BUILDER STATE
══════════════════════════════════════════════════════ */

const state = {
    tiers: 1,
    currentStep: 1,
    activeTierTab: 0,
    shape: 'round',       // single-tier shape: round/square/heart/hexagon/oval/star
    instructions: '',
    xp: 0,
    xpLevel: 1,
    tierDetails: [
        { flavor: 'vanilla', color: '#f5e6c8', height: 1.15, diameter: 1.55, frosting: 'smooth', texture: 'plain' },
        { flavor: 'chocolate', color: '#5c3317', height: 1.00, diameter: 1.15, frosting: 'smooth', texture: 'plain' },
        { flavor: 'strawberry', color: '#f48fb1', height: 0.85, diameter: 0.80, frosting: 'smooth', texture: 'plain' },
    ],
    decorations: {
        cherries: { active: false, count: 1 },
        candles: { active: false, count: 3 },
        sprinkles: { active: false },
        macarons: { active: false },
        chocolateShards: { active: false },
        berryMix: { active: false },
    },
    stepsCompleted: new Set(),
    animatingIn: false,
};

const STEP_LABELS = ['Tiers', 'Flavors', 'Customize', 'Decorate', 'Review'];

/* ══════════════════════════════════════════════════════
   THREE.JS STATE
══════════════════════════════════════════════════════ */

let scene, camera, renderer, cakeGroup, animFrame;
let isDrag = false, lastX = 0, lastY = 0, rotY = 0.4, rotX = 0.0;
let pinchDist = null, camZ = 8.5;
let builderInitted = false;

/* ══════════════════════════════════════════════════════
   XP / GAMIFICATION
══════════════════════════════════════════════════════ */

function addXP(n, label) {
    state.xp += n;
    const newLevel = Math.floor(state.xp / 300) + 1;
    if (newLevel > state.xpLevel) {
        state.xpLevel = newLevel;
        showAchievement('🏆', `Level ${newLevel} Unlocked!`, "You're mastering the art of cake!");
    }
    updateXPHud();
    showXPToast(`+${n} XP · ${label}`);
}

function updateXPHud() {
    const pct = ((state.xp % 300) / 300) * 100;
    document.getElementById('xpBar').style.width = pct + '%';
    document.getElementById('xpLabel').textContent = state.xp + ' XP';
    document.getElementById('xpLevel').textContent = 'Lv.' + state.xpLevel;
}

function showXPToast(msg) {
    const t = document.getElementById('xpToast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

function showAchievement(icon, title, sub) {
    document.getElementById('achIconCb').textContent = icon;
    document.getElementById('achTitleCb').textContent = title;
    document.getElementById('achSubCb').textContent = sub;
    const t = document.getElementById('achToastCb');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
}

/* ══════════════════════════════════════════════════════
   STEP WIZARD
══════════════════════════════════════════════════════ */

function buildProgressBar() {
    const container = document.getElementById('progressSteps');
    container.innerHTML = STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const isDone = n < state.currentStep;
        const isActive = n === state.currentStep;
        return `
        <div class="cb-prog-step ${isDone ? 'done' : isActive ? 'active' : ''}" onclick="tryGoToStep(${n})" title="${label}">
            <div class="cb-prog-circle">${isDone ? '✓' : n}</div>
            <div class="cb-prog-label">${label}</div>
        </div>`;
    }).join('');

    // Fill bar
    const pct = ((state.currentStep - 1) / (STEP_LABELS.length - 1)) * 100;
    document.getElementById('progressFill').style.width = pct + '%';

    // Step badge on canvas
    document.getElementById('stepBadge').textContent = `Step ${state.currentStep} of ${STEP_LABELS.length}`;
}

function tryGoToStep(n) {
    // Allow going back freely, forward only if completed
    if (n < state.currentStep || state.stepsCompleted.has(n - 1) || n === 1) {
        goToStep(n);
    }
}

function goToStep(n) {
    // Mark current step done
    state.stepsCompleted.add(state.currentStep);

    // Hide current
    document.getElementById(`step-panel-${state.currentStep}`)?.classList.remove('active');

    // Activate new
    state.currentStep = n;
    const nextPanel = document.getElementById(`step-panel-${n}`);
    if (nextPanel) {
        nextPanel.classList.add('active');
        // Scroll sidebar to top
        const container = document.querySelector('.cb-steps-container');
        if (container) container.scrollTop = 0;
    }

    buildProgressBar();

    // Step-specific setup
    if (n === 2) renderFlavorStep();
    if (n === 3) renderCustomizeStep();
    if (n === 5) renderReviewStep();

    // XP rewards
    const xpRewards = { 1: 0, 2: 10, 3: 20, 4: 30, 5: 50 };
    if (!state.stepsCompleted.has(n) && xpRewards[n]) {
        addXP(xpRewards[n], STEP_LABELS[n - 1] + ' step reached');
    }
}

/* ══════════════════════════════════════════════════════
   STEP 1: TIERS
══════════════════════════════════════════════════════ */

function selectTiers(n, el) {
    state.tiers = n;
    document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    // Show shape selector only for 1-tier
    const shapeEl = document.getElementById('shapeSelector');
    if (shapeEl) shapeEl.style.display = n === 1 ? 'block' : 'none';
    // Reset shape to round for multi-tier
    if (n > 1) { state.shape = 'round'; document.querySelectorAll('.shape-card').forEach(c => c.classList.remove('active')); document.querySelector('.shape-card[data-shape="round"]')?.classList.add('active'); }
    buildCakeMesh();
    addXP(5, 'Tier chosen');
}

function selectShape(shape, el) {
    state.shape = shape;
    document.querySelectorAll('.shape-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    buildCakeMesh();
    addXP(3, `${shape} shape selected`);
    showToast(`${shape.charAt(0).toUpperCase() + shape.slice(1)} shape selected!`);
}

/* ── AR Preview ── */
async function launchAR() {
    // Check WebXR support
    if (!navigator.xr) {
        showARFallback();
        return;
    }
    const supported = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
    if (!supported) { showARFallback(); return; }

    try {
        // Request body-tracked AR session
        const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: document.body }
        });
        // Use renderer's existing WebGL context
        renderer.xr.enabled = true;
        renderer.xr.setSession(session);
        session.addEventListener('end', () => {
            renderer.xr.enabled = false;
            buildCakeMesh();
        });
        showToast('📷 Point your camera at a flat surface to place your cake!');
    } catch (e) {
        console.warn('AR error:', e);
        showARFallback();
    }
}

function showARFallback() {
    // Show a modal/toast with instructions for mobile
    const msg = document.createElement('div');
    msg.className = 'ar-fallback-modal';
    msg.innerHTML = `
        <div class="ar-fallback-inner">
            <div class="ar-fallback-icon">🥽</div>
            <h3>AR Preview</h3>
            <p>To view your cake in AR, open this page on a <strong>WebXR-compatible Android phone</strong> (Chrome 92+) or scan the QR below.</p>
            <button class="cb-next-btn" onclick="this.closest('.ar-fallback-modal').remove()">Got it!</button>
        </div>`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 6000);
}


/* ══════════════════════════════════════════════════════
   STEP 2: FLAVORS
══════════════════════════════════════════════════════ */

function renderFlavorStep() {
    const wrap = document.getElementById('flavorTiersWrap');
    const tierLabels = ['Bottom Tier', 'Middle Tier', 'Top Tier'];
    wrap.innerHTML = Array.from({ length: state.tiers }, (_, ti) => `
    <div class="flavor-tier-section">
        <div class="flavor-tier-label">
            <span class="flavor-swatch" style="background:${state.tierDetails[ti].color}"></span>
            ${tierLabels[ti] || `Tier ${ti + 1}`}
        </div>
        <div class="flavor-grid">
            ${FLAVORS.map(f => `
            <button class="flavor-btn ${state.tierDetails[ti].flavor === f.id ? 'active' : ''}"
                onclick="selectFlavor(${ti}, '${f.id}', '${f.color}', this)">
                <span class="flavor-dot" style="background:${f.color}"></span>
                ${f.emoji} ${f.name}
            </button>`).join('')}
        </div>
    </div>`).join('');
}

function selectFlavor(tierIdx, flavorId, color, el) {
    state.tierDetails[tierIdx].flavor = flavorId;
    state.tierDetails[tierIdx].color = color;

    // Update UI
    const section = el.closest('.flavor-tier-section');
    section.querySelectorAll('.flavor-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    section.querySelector('.flavor-swatch').style.background = color;

    buildCakeMesh();
    addXP(5, 'Flavor selected');
}

/* ══════════════════════════════════════════════════════
   STEP 3: CUSTOMIZE
══════════════════════════════════════════════════════ */

function renderCustomizeStep() {
    const tierLabels = ['Bottom', 'Middle', 'Top'];
    // Tier tabs
    const tabsEl = document.getElementById('tierTabs');
    tabsEl.innerHTML = Array.from({ length: state.tiers }, (_, i) => `
        <button class="tier-tab ${i === state.activeTierTab ? 'active' : ''}"
            onclick="selectTierTab(${i})">${tierLabels[i] || 'Tier ' + (i + 1)}</button>`).join('');
    renderTierCustomizePanel(state.activeTierTab);
}

function selectTierTab(idx) {
    state.activeTierTab = idx;
    document.querySelectorAll('.tier-tab').forEach((t, i) => t.classList.toggle('active', i === idx));
    renderTierCustomizePanel(idx);
}

function renderTierCustomizePanel(ti) {
    const td = state.tierDetails[ti];
    const panel = document.getElementById('customizePanel');
    panel.innerHTML = `
    <div class="customize-section">
        <!-- Height -->
        <div class="cust-field">
            <div class="cust-label">Height
                <span id="heightVal-${ti}">${td.height.toFixed(2)}</span>
            </div>
            <input type="range" class="cust-slider" min="0.5" max="2.0" step="0.05"
                value="${td.height}" id="heightSlider-${ti}"
                oninput="setTierHeight(${ti}, this.value)"
                style="background:linear-gradient(90deg,var(--rose) ${((td.height - 0.5) / 1.5) * 100}%,var(--border) ${((td.height - 0.5) / 1.5) * 100}%)" />
        </div>
        <!-- Diameter -->
        <div class="cust-field">
            <div class="cust-label">Diameter
                <span id="diamVal-${ti}">${td.diameter.toFixed(2)}</span>
            </div>
            <input type="range" class="cust-slider" min="0.5" max="2.5" step="0.05"
                value="${td.diameter}" id="diamSlider-${ti}"
                oninput="setTierDiam(${ti}, this.value)"
                style="background:linear-gradient(90deg,var(--rose) ${((td.diameter - 0.5) / 2.0) * 100}%,var(--border) ${((td.diameter - 0.5) / 2.0) * 100}%)" />
        </div>
        <!-- Color -->
        <div class="cust-field">
            <div class="cust-label">Color</div>
            <div class="cust-color-row">
                <div class="cust-color-presets" id="colorPresets-${ti}">
                    ${COLOR_PRESETS.map(c => `
                    <div class="cust-color-preset ${td.color === c ? 'selected' : ''}"
                        style="background:${c}"
                        onclick="setTierColor(${ti}, '${c}', this)"></div>`).join('')}
                </div>
                <input type="color" class="cust-color-picker" value="${td.color}"
                    oninput="setTierColor(${ti}, this.value, null)" />
            </div>
        </div>
        <!-- Frosting -->
        <div class="cust-field">
            <div class="cust-label">Frosting Style</div>
            <div class="frosting-btns">
                ${FROSTING_STYLES.map(f => `
                <button class="frosting-btn ${td.frosting === f.id ? 'active' : ''}"
                    onclick="setFrosting(${ti}, '${f.id}', this)">${f.label}</button>`).join('')}
            </div>
        </div>
        <!-- Texture -->
        <div class="cust-field">
            <div class="cust-label">Texture</div>
            <div class="frosting-btns">
                ${TEXTURES.map(t => `
                <button class="frosting-btn ${td.texture === t.id ? 'active' : ''}"
                    onclick="setTexture(${ti}, '${t.id}', this)">${t.label}</button>`).join('')}
            </div>
        </div>
    </div>`;
}

function setTierHeight(ti, val) {
    state.tierDetails[ti].height = parseFloat(val);
    document.getElementById(`heightVal-${ti}`).textContent = parseFloat(val).toFixed(2);
    updateSliderBg(document.getElementById(`heightSlider-${ti}`), 0.5, 2.0);
    buildCakeMesh(); updatePrice();
    addXP(2, 'Height adjusted');
}

function setTierDiam(ti, val) {
    state.tierDetails[ti].diameter = parseFloat(val);
    document.getElementById(`diamVal-${ti}`).textContent = parseFloat(val).toFixed(2);
    updateSliderBg(document.getElementById(`diamSlider-${ti}`), 0.5, 2.5);
    buildCakeMesh(); updatePrice();
}

function updateSliderBg(el, min, max) {
    const pct = ((parseFloat(el.value) - min) / (max - min)) * 100;
    el.style.background = `linear-gradient(90deg,var(--rose) ${pct}%,var(--border) ${pct}%)`;
}

function setTierColor(ti, col, presetEl) {
    state.tierDetails[ti].color = col;
    if (presetEl) {
        document.querySelectorAll(`#colorPresets-${ti} .cust-color-preset`).forEach(e => e.classList.remove('selected'));
        presetEl.classList.add('selected');
    }
    buildCakeMesh();
    addXP(3, 'Color changed');
}

function setFrosting(ti, style, el) {
    state.tierDetails[ti].frosting = style;
    el.closest('.frosting-btns').querySelectorAll('.frosting-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    buildCakeMesh();
    addXP(3, 'Frosting styled');
}

function setTexture(ti, tex, el) {
    state.tierDetails[ti].texture = tex;
    el.closest('.frosting-btns').querySelectorAll('.frosting-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    buildCakeMesh();
    addXP(3, 'Texture applied');
}

/* ══════════════════════════════════════════════════════
   STEP 4: DECORATIONS
══════════════════════════════════════════════════════ */

function toggleDeco(key, el) {
    const deco = state.decorations[key];
    deco.active = !deco.active;
    el.classList.toggle('active', deco.active);

    // Show qty controls only for cherry & candles
    const qtyEl = document.getElementById(`deco-${key}-qty`);
    if (qtyEl) qtyEl.style.display = deco.active ? 'flex' : 'none';

    buildCakeMesh();
    updatePrice();
    addXP(deco.active ? 8 : 0, `${key} decoration added`);
    if (deco.active) {
        // Achievement check
        const active = Object.values(state.decorations).filter(d => d.active).length;
        if (active >= 3) showAchievement('🎨', 'Decoration Master!', 'You added 3+ decorations!');
    }
}

function changeDeco(key, delta) {
    const deco = state.decorations[key];
    deco.count = Math.max(1, Math.min(8, (deco.count || 1) + delta));
    const countEl = document.getElementById(`${key}-count`);
    if (countEl) countEl.textContent = deco.count;
    buildCakeMesh();
    updatePrice();
}

/* ══════════════════════════════════════════════════════
   STEP 5: REVIEW
══════════════════════════════════════════════════════ */

function renderReviewStep() {
    document.getElementById('instructionsInput').value = state.instructions;
    renderReviewCard();
}

function renderReviewCard() {
    const tierLabels = ['Bottom', 'Middle', 'Top'];
    const activeDecos = Object.entries(state.decorations)
        .filter(([, v]) => v.active)
        .map(([k, v]) => {
            const labels = { cherries: '🍒 Cherries', candles: '🕯️ Candles', sprinkles: '🌈 Sprinkles', chocolateShards: '🍫 Choco Shards', berryMix: '🫐 Berry Mix', macarons: '🍬 Macarons' };
            return labels[k] + (v.count ? ` ×${v.count}` : '');
        });

    const rows = [
        ['Tiers', state.tiers + ' tier' + (state.tiers > 1 ? 's' : '')],
        ...(state.tiers === 1 ? [['Shape', state.shape.charAt(0).toUpperCase() + state.shape.slice(1)]] : []),
        ...Array.from({ length: state.tiers }, (_, i) => {
            const td = state.tierDetails[i];
            const fl = FLAVORS.find(f => f.id === td.flavor);
            return [`${tierLabels[i]} Tier`, `${fl ? fl.emoji + ' ' + fl.name : td.flavor} · ${td.frosting} · ${td.texture}`];
        }),
        ['Decorations', activeDecos.length ? activeDecos.join(', ') : 'None'],
        ['Total', '₹' + computePrice().total.toLocaleString('en-IN')],
    ];

    document.getElementById('reviewCard').innerHTML = rows.map(([l, v]) => `
        <div class="review-row">
            <span class="review-label">${l}</span>
            <span class="review-value">${v}</span>
        </div>`).join('');
}

function updateInstructions() {
    state.instructions = document.getElementById('instructionsInput').value;
}


/* ══════════════════════════════════════════════════════
   PRICE ENGINE
══════════════════════════════════════════════════════ */

let _cakeCapacity = 10; // global serving capacity

function computePrice() {
    const BASE = 1200;
    let total = BASE;
    let calories = 0;
    let capacity = 0;
    const lines = [`Base: ₹${BASE.toLocaleString('en-IN')}`];

    // Tier costs & volume calc
    const numTiers = state.tiers || 1;
    const tierCost = (numTiers - 1) * 350;
    if (tierCost > 0) { total += tierCost; lines.push(`+${numTiers - 1} extra tier: ₹${tierCost.toLocaleString('en-IN')}`); }

    for (let i = 0; i < numTiers; i++) {
        const td = state.tierDetails[i];
        if (!td) continue;
        const vol = (td.diameter || 1) * (td.diameter || 1) * (td.height || 1);
        capacity += vol * 1.5;
        calories += vol * 120; // baseline calories per vol
        if (td.frosting !== 'naked') calories += 400; // frosting penalty
    }

    // Size premiums
    let sizePrem = 0;
    for (let i = 0; i < numTiers; i++) {
        const td = state.tierDetails[i];
        const def = TIER_SPECS_DEFAULT[i] || { h: 1, r: 1 };
        if (!td) continue;
        const hPrem = Math.max(0, Math.round((td.height - def.h) * 100) * 1);
        const dPrem = Math.max(0, Math.round((td.diameter - def.r) * 100) * 1.2);
        sizePrem += hPrem + dPrem;
    }
    sizePrem = Math.round(sizePrem);
    if (sizePrem > 0) { total += sizePrem; lines.push(`Size premium: ₹${sizePrem.toLocaleString('en-IN')}`); }

    // Decorations
    const decoPrice = { cherries: 99, candles: 49, sprinkles: 79, chocolateShards: 179, berryMix: 129, macarons: 249 };
    for (const [key, deco] of Object.entries(state.decorations)) {
        if (deco && deco.active) {
            const cnt = deco.count || 1;
            const itemPrice = decoPrice[key] || 0;
            const cost = itemPrice * cnt;
            total += cost;
            calories += 150 * cnt;
            const labels = { cherries: '🍒 Cherries', candles: '🕯️ Candles', sprinkles: '🌈 Sprinkles', chocolateShards: '🍫 Choco Shards', berryMix: '🫐 Berry Mix', macarons: '🍬 Macarons' };
            lines.push(`${labels[key] || key}${cnt > 1 ? ' ×' + cnt : ''}: ₹${cost.toLocaleString('en-IN')}`);
        }
    }

    _cakeCapacity = Math.max(1, Math.round(capacity));
    return { total, lines, calories: Math.round(calories) };
}

function updatePrice() {
    const { total, lines, calories } = computePrice();
    document.getElementById('cbPrice').textContent = '₹' + total.toLocaleString('en-IN');
    document.getElementById('cbPriceBreak').textContent = lines.slice(1).join(' · ') || '';

    // Update Calorie Bar
    const calNumEl = document.getElementById('calorieNum');
    if (calNumEl) {
        calNumEl.textContent = calories.toLocaleString();
        const barWidth = Math.min(100, Math.max(10, (calories / 10000) * 100));
        document.getElementById('calorieBar').style.width = barWidth + '%';

        let msg = "Guilt-free indulgence 😊";
        if (calories > 8000) msg = "A true calorie bomb! 🔥";
        else if (calories > 5000) msg = "Sweet teeth activated! 🍬";
        document.getElementById('calorieLabel').textContent = msg;
    }

    // Trigger Serving calc update if on step 5
    if (typeof changeGuests === 'function') changeGuests(0);
}

function mkMat(hex, rough = 0.38, metal = 0.08) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: rough, metalness: metal });
}

function mkPhysMat(hex, rough, metal, envMap) {
    return new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex), roughness: rough, metalness: metal,
        envMapIntensity: envMap || 0.4
    });
}

function makeCanvasTexture(fn, w, h) {
    const tc = document.createElement('canvas');
    tc.width = w || 1024; tc.height = h || 1024;
    fn(tc.getContext('2d'), tc.width, tc.height);
    return new THREE.CanvasTexture(tc);
}

// Richer frosting color — shift toward a saturated cream tint of the base color, NOT white
function frostColor(hex, style) {
    const base = new THREE.Color(hex);
    if (style === 'naked') return base;
    // Lighten slightly + shift toward warm cream — keep color identity
    const warm = new THREE.Color('#ffe8c8');
    const mixed = base.clone().lerp(warm, 0.28); // only 28% blend keeps color visible
    return mixed;
}

let tierBodies = [];

/* ── Shape footprint: returns effective plate radius for each shape ── */
function getShapeFootprint(shape, r) {
    switch (shape) {
        case 'square': return r * 1.72 * 0.71; // half diagonal of square
        case 'heart': return r * 1.08;
        case 'hexagon': return r;
        case 'oval': return r * 1.35;
        case 'star': return r * 1.02;
        default: return r;
    }
}

/* ── Shape geometry — all stand UPRIGHT (Y is height) ── */
function makeTierGeometry(shape, r, h) {
    switch (shape) {
        case 'square': {
            const s = r * 1.72;
            return new THREE.BoxGeometry(s, h, s, 2, 2, 2);
        }
        case 'heart': {
            const heartShape = new THREE.Shape();
            heartShape.moveTo(0, r * 0.5);
            heartShape.bezierCurveTo(0, r * 0.9, -r * 1.0, r * 0.9, -r * 1.0, r * 0.4);
            heartShape.bezierCurveTo(-r * 1.0, -r * 0.1, -r * 0.4, -r * 0.5, 0, -r * 0.85);
            heartShape.bezierCurveTo(r * 0.4, -r * 0.5, r * 1.0, -r * 0.1, r * 1.0, r * 0.4);
            heartShape.bezierCurveTo(r * 1.0, r * 0.9, 0, r * 0.9, 0, r * 0.5);
            const geo = new THREE.ExtrudeGeometry(heartShape, {
                depth: h, bevelEnabled: true,
                bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3
            });
            geo.rotateX(-Math.PI / 2);
            geo.center(); // auto-center using bounding box — guarantees -halfH to +halfH
            return geo;
        }
        case 'hexagon':
            return new THREE.CylinderGeometry(r, r * 0.97, h, 6, 2, false);
        case 'oval': {
            const geo = new THREE.CylinderGeometry(r, r * 0.97, h, 64, 2, false);
            geo.scale(1.35, 1.0, 0.76);
            return geo;
        }
        case 'star': {
            const starShape = new THREE.Shape();
            const pts = 5, outerR = r * 0.95, innerRad = r * 0.44;
            for (let p = 0; p < pts * 2; p++) {
                const ang = (p / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
                const rad = p % 2 === 0 ? outerR : innerRad;
                if (p === 0) starShape.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
                else starShape.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
            }
            starShape.closePath();
            const geo = new THREE.ExtrudeGeometry(starShape, {
                depth: h, bevelEnabled: true,
                bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3
            });
            geo.rotateX(-Math.PI / 2);
            geo.center(); // auto-center — same as heart
            return geo;
        }
        default: // round
            return new THREE.CylinderGeometry(r, r * 0.98, h, 64, 2, false);
    }
}


function buildCakeMesh() {
    try {
        if (!scene) return;
        if (cakeGroup) { scene.remove(cakeGroup); disposeGroup(cakeGroup); }
        cakeGroup = new THREE.Group();
        scene.add(cakeGroup);
        tierBodies = [];

        const n = state.tiers;
        const GAP = 0.06;

        const tierSpec = Array.from({ length: n }, (_, i) => ({
            r: state.tierDetails[i].diameter,
            h: state.tierDetails[i].height,
            col: state.tierDetails[i].color,
            frosting: state.tierDetails[i].frosting,
            texture: state.tierDetails[i].texture,
        }));

        const totalH = tierSpec.reduce((s, t) => s + t.h, 0) + (n - 1) * GAP;
        let curY = -totalH / 2;
        const tierTopYs = [];
        const tierRadii = [];
        const tierMidYs = [];

        /* ──────────────────── TIER BODIES ──────────────────── */
        for (let i = 0; i < n; i++) {
            if (i > 0) curY += GAP;
            const { r, h, col, frosting, texture } = tierSpec[i];
            const midY = curY + h / 2;
            tierMidYs[i] = midY;

            /* ── Main body material ── */
            let mat;
            if (texture === 'sprinkle') {
                mat = new THREE.MeshStandardMaterial({
                    map: makeCanvasTexture((ctx, W, H) => {
                        // Base coat
                        ctx.fillStyle = col;
                        ctx.fillRect(0, 0, W, H);
                        // Subtle gradient for realism
                        const grd = ctx.createLinearGradient(0, 0, 0, H);
                        grd.addColorStop(0, 'rgba(255,255,255,0.18)');
                        grd.addColorStop(1, 'rgba(0,0,0,0.12)');
                        ctx.fillStyle = grd;
                        ctx.fillRect(0, 0, W, H);
                        // Dense sprinkles
                        const sp = ['#ff5252', '#ffea00', '#00e676', '#2196f3', '#f48fb1', '#ffffff', '#ff9800', '#e040fb'];
                        for (let s = 0; s < 380; s++) {
                            ctx.save();
                            ctx.translate(Math.random() * W, Math.random() * H);
                            ctx.rotate(Math.random() * Math.PI);
                            ctx.fillStyle = sp[Math.floor(Math.random() * sp.length)];
                            ctx.beginPath();
                            const sw = 5 + Math.random() * 7, sh = 2.5;
                            ctx.ellipse(0, 0, sw, sh, 0, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }), roughness: 0.5, metalness: 0.0,
                });
            } else if (texture === 'floral') {
                mat = new THREE.MeshStandardMaterial({
                    map: makeCanvasTexture((ctx, W, H) => {
                        ctx.fillStyle = col;
                        ctx.fillRect(0, 0, W, H);
                        const grd = ctx.createLinearGradient(0, 0, 0, H);
                        grd.addColorStop(0, 'rgba(255,255,255,0.14)');
                        grd.addColorStop(1, 'rgba(0,0,0,0.10)');
                        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
                        const petalPalette = ['rgba(255,182,193,0.7)', 'rgba(255,240,180,0.6)', 'rgba(210,180,255,0.65)', 'rgba(255,255,255,0.55)'];
                        for (let f = 0; f < 40; f++) {
                            const fx = Math.random() * W, fy = Math.random() * H;
                            const pr = 14 + Math.random() * 12;
                            const petals = 5 + Math.floor(Math.random() * 3);
                            ctx.save();
                            ctx.translate(fx, fy);
                            for (let p = 0; p < petals; p++) {
                                ctx.save();
                                ctx.rotate((p / petals) * Math.PI * 2);
                                ctx.beginPath();
                                ctx.ellipse(pr * 0.65, 0, pr * 0.55, pr * 0.32, 0, 0, Math.PI * 2);
                                ctx.fillStyle = petalPalette[p % petalPalette.length];
                                ctx.fill();
                                ctx.restore();
                            }
                            // Center pip
                            ctx.beginPath();
                            ctx.arc(0, 0, pr * 0.22, 0, Math.PI * 2);
                            ctx.fillStyle = 'rgba(255,224,100,0.85)';
                            ctx.fill();
                            ctx.restore();
                        }
                    }), roughness: 0.48,
                });
            } else {
                // Plain — add subtle gradient for realism
                mat = new THREE.MeshStandardMaterial({
                    map: makeCanvasTexture((ctx, W, H) => {
                        ctx.fillStyle = col;
                        ctx.fillRect(0, 0, W, H);
                        const grd = ctx.createLinearGradient(0, 0, W * 0.3, H);
                        grd.addColorStop(0, 'rgba(255,255,255,0.12)');
                        grd.addColorStop(0.5, 'rgba(0,0,0,0.0)');
                        grd.addColorStop(1, 'rgba(0,0,0,0.10)');
                        ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
                    }),
                    roughness: 0.40, metalness: 0.04,
                });
            }

            // ── Shape-aware body geometry (single-tier only) ──
            let body;
            if (state.tiers === 1 && i === 0) {
                body = new THREE.Mesh(makeTierGeometry(state.shape, r, h), mat);
            } else {
                body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.98, h, 64, 2, false), mat);
            }
            body.position.y = midY; body.castShadow = true; body.receiveShadow = true;
            // ── Layer drop animation: start high, animate to midY ──
            body.userData.targetY = midY;
            body.position.y = midY + 3.5 + i * 0.8; // start above
            body.userData.dropDelay = i * 120; // stagger each tier
            body.userData.dropStart = performance.now() + i * 120;
            cakeGroup.add(body);
            tierBodies.push(body);


            /* ── Top cap (correct radius for each shape) ── */
            const capC = new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.08);
            // For non-round shapes, use the footprint radius so the cap fits the shape
            const effectiveR = (state.tiers === 1 && i === 0) ? getShapeFootprint(state.shape, r) : r;
            const cap = new THREE.Mesh(
                new THREE.CylinderGeometry(effectiveR, effectiveR, 0.012, 64),
                new THREE.MeshStandardMaterial({ color: capC, roughness: 0.35 })
            );
            cap.position.y = midY + h / 2; cakeGroup.add(cap);

            /* ── Frosting – per tier, color-matched, shape-aware ── */
            if (frosting !== 'naked') {
                const fc = frostColor(col, frosting);
                // For non-round single-tier, use footprint radius so frosting hugs the actual shape
                const fR = (state.tiers === 1 && i === 0) ? getShapeFootprint(state.shape, r) : r;

                if (frosting === 'drip') {
                    // Rich drip ring sized to shape
                    const ringMat = new THREE.MeshStandardMaterial({ color: fc, roughness: 0.22, metalness: 0.07, transparent: true, opacity: 0.95 });
                    const ring = new THREE.Mesh(new THREE.TorusGeometry(fR * 0.94, 0.082, 18, 64), ringMat);
                    ring.position.y = midY + h / 2 + 0.005; ring.rotation.x = Math.PI / 2; cakeGroup.add(ring);

                    // Drip streams placed around the footprint circle
                    const dripCount = Math.round(fR * 14);
                    for (let d = 0; d < dripCount; d++) {
                        const da = (d / dripCount) * Math.PI * 2;
                        const dripLen = 0.12 + Math.sin(d * 2.7) * 0.07 + Math.random() * 0.18;
                        const dripW = 0.032 + Math.random() * 0.018;
                        const drip = new THREE.Mesh(
                            new THREE.CylinderGeometry(dripW * 0.6, dripW, dripLen, 8),
                            new THREE.MeshStandardMaterial({ color: fc, roughness: 0.22, transparent: true, opacity: 0.92 })
                        );
                        drip.position.set(
                            Math.cos(da) * (fR - 0.04),
                            midY + h / 2 - dripLen / 2,
                            Math.sin(da) * (fR - 0.04)
                        );
                        cakeGroup.add(drip);
                        const bead = new THREE.Mesh(
                            new THREE.SphereGeometry(dripW * 0.85, 8, 8),
                            new THREE.MeshStandardMaterial({ color: fc, roughness: 0.18, metalness: 0.08 })
                        );
                        bead.position.set(Math.cos(da) * (fR - 0.04), midY + h / 2 - dripLen, Math.sin(da) * (fR - 0.04));
                        cakeGroup.add(bead);
                    }

                } else if (frosting === 'rosette') {
                    const roseCount = Math.round(fR * 9 + 3);
                    for (let p = 0; p < roseCount; p++) {
                        const ang = (p / roseCount) * Math.PI * 2;
                        for (let layer = 0; layer < 3; layer++) {
                            const puff = new THREE.Mesh(
                                new THREE.SphereGeometry(0.10 - layer * 0.02, 12, 10),
                                new THREE.MeshStandardMaterial({ color: fc, roughness: 0.28, transparent: true, opacity: 0.92 - layer * 0.08 })
                            );
                            puff.position.set(
                                Math.cos(ang) * (fR - 0.10 + layer * 0.03),
                                midY + h / 2 + 0.06 + layer * 0.04,
                                Math.sin(ang) * (fR - 0.10 + layer * 0.03)
                            );
                            cakeGroup.add(puff);
                        }
                    }
                } else {
                    // Smooth — ring + flat top disc
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(fR * 0.92, 0.065, 16, 64),
                        new THREE.MeshStandardMaterial({ color: fc, roughness: 0.28, transparent: true, opacity: 0.90 })
                    );
                    ring.position.y = midY + h / 2 + 0.003; ring.rotation.x = Math.PI / 2; cakeGroup.add(ring);
                    const topFrost = new THREE.Mesh(
                        new THREE.CylinderGeometry(fR * 0.89, fR * 0.89, 0.035, 56),
                        new THREE.MeshStandardMaterial({ color: fc, roughness: 0.26, metalness: 0.05, transparent: true, opacity: 0.88 })
                    );
                    topFrost.position.y = midY + h / 2 + 0.02; cakeGroup.add(topFrost);
                }
            }

            tierTopYs.push(midY + h / 2);
            tierRadii.push(r);
            curY += h;
        }

        // For extruded shapes (heart/star), geo.center() may shift the actual mesh top.
        let topY = tierTopYs[n - 1];
        const topBody = tierBodies[n - 1];
        if (topBody && (state.tiers === 1)) {
            const sh = state.shape;
            if (sh === 'heart' || sh === 'star') {
                topBody.geometry.computeBoundingBox();
                const bbox = topBody.geometry.boundingBox;
                topY = topBody.userData.targetY + bbox.max.y;
            }
        }
        const topR = tierRadii[n - 1];

        /* ── Shape-specific topping decoration (single-tier only) ── */
        if (state.tiers === 1 && state.tierDetails[0].frosting !== 'naked') {
            _addShapeTopping(state.shape, topY, topR, state.tierDetails[0].color, cakeGroup);
        }

        /* ──────────────────── INSCRIPTION ──────────────────── */



        /* ──────────────────── DECORATIONS ──────────────────── */

        // 🍒 Cherries — premium red with specular
        if (state.decorations.cherries.active) {
            const count = state.decorations.cherries.count || 1;
            for (let c = 0; c < count; c++) {
                const angle = (c / count) * Math.PI * 2;
                const rad = count === 1 ? 0 : topR * 0.5;
                const cy = topY + 0.3;
                // Cherry sphere with high gloss
                const cherry = new THREE.Mesh(
                    new THREE.SphereGeometry(0.24, 32, 32),
                    new THREE.MeshStandardMaterial({ color: 0xa93226, roughness: 0.04, metalness: 0.25, envMapIntensity: 0.8 })
                );
                cherry.position.set(Math.cos(angle) * rad, cy, Math.sin(angle) * rad);
                cherry.castShadow = true;
                cakeGroup.add(cherry);
                // Specular highlight dot
                const shine = new THREE.Mesh(
                    new THREE.SphereGeometry(0.06, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 })
                );
                shine.position.set(Math.cos(angle) * rad + 0.07, cy + 0.1, Math.sin(angle) * rad + 0.07);
                cakeGroup.add(shine);
                // Elegant curved stem
                const curve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(Math.cos(angle) * rad, cy + 0.01, Math.sin(angle) * rad),
                    new THREE.Vector3(Math.cos(angle) * rad * 0.5, cy + 0.26, Math.sin(angle) * rad * 0.5),
                    new THREE.Vector3(0, cy + 0.5, 0)
                ]);
                cakeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.019, 8, false),
                    mkPhysMat('#2d5a1b', 0.6, 0.1)));
            }
        }

        // 🕯️ Candles — full 3D with wax, wick, teardrop flame, halo glow
        if (state.decorations.candles.active) {
            const count = state.decorations.candles.count || 3;
            const candleColors = ['#ff9eb5', '#ffe066', '#a8d8ff', '#b5f0c3', '#d4aeff', '#ffcba4', '#ff8a65', '#80cbc4'];
            for (let c = 0; c < count; c++) {
                const angle = (c / count) * Math.PI * 2 + 0.3;
                const rad = topR * 0.46;
                const cx = Math.cos(angle) * rad, cz = Math.sin(angle) * rad;
                const candleH = 0.65;
                const topBase = topY + 0.05;
                const candleY = topBase + candleH / 2;

                // Wax body with spiral stripe texture
                const waxCol = candleColors[c % candleColors.length];
                const wax = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.075, 0.075, candleH, 16),
                    new THREE.MeshStandardMaterial({
                        color: new THREE.Color(waxCol), roughness: 0.6, metalness: 0.0,
                        map: makeCanvasTexture((ctx, W, H) => {
                            ctx.fillStyle = waxCol; ctx.fillRect(0, 0, W, H);
                            ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 18;
                            for (let s = 0; s < 6; s++) {
                                ctx.beginPath();
                                ctx.moveTo(0, s * H / 5);
                                ctx.bezierCurveTo(W * 0.3, s * H / 5 - 30, W * 0.7, s * H / 5 + 30, W, s * H / 5);
                                ctx.stroke();
                            }
                        }, 256, 256)
                    })
                );
                wax.position.set(cx, candleY, cz); wax.castShadow = true; cakeGroup.add(wax);

                // Wax drip trails
                for (let d = 0; d < 3; d++) {
                    const da = angle + d * 0.9;
                    const dripH = 0.12 + Math.random() * 0.15;
                    const dripM = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.012, 0.008, dripH, 8),
                        new THREE.MeshStandardMaterial({ color: new THREE.Color(waxCol).lerp(new THREE.Color('#fff'), 0.3), roughness: 0.5 })
                    );
                    dripM.position.set(cx + Math.cos(da) * 0.055, candleY + candleH / 2 - dripH / 2 - 0.02, cz + Math.sin(da) * 0.055);
                    cakeGroup.add(dripM);
                }

                // Wick (dark grey, slightly curved)
                const wick = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.007, 0.007, 0.14, 6),
                    mkMat('#221100', 0.95)
                );
                wick.position.set(cx, candleY + candleH / 2 + 0.07, cz); cakeGroup.add(wick);

                // Flame — teardrop shape (stretched sphere)
                const flameY = candleY + candleH / 2 + 0.19;
                const flame = new THREE.Mesh(
                    new THREE.SphereGeometry(0.07, 12, 12),
                    new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.96 })
                );
                flame.scale.set(1, 1.8, 1);
                flame.position.set(cx, flameY, cz); cakeGroup.add(flame);

                // Inner hot core
                const innerFlame = new THREE.Mesh(
                    new THREE.SphereGeometry(0.038, 10, 10),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })
                );
                innerFlame.position.set(cx, flameY - 0.02, cz); cakeGroup.add(innerFlame);

                // Halo glow sprite (large faint orb)
                const halo = new THREE.Mesh(
                    new THREE.SphereGeometry(0.22, 10, 10),
                    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.12, side: THREE.BackSide })
                );
                halo.position.set(cx, flameY, cz); cakeGroup.add(halo);

                // Point light — warm orange glow
                const flameLight = new THREE.PointLight(0xffaa22, 1.2, 2.2);
                flameLight.position.set(cx, flameY + 0.1, cz);
                cakeGroup.add(flameLight);
            }
        }

        // 🌈 Sprinkles — thick 3D on ALL tiers
        if (state.decorations.sprinkles.active) {
            const sprColors = [0xff5252, 0xffea00, 0x00e676, 0x2979ff, 0xf48fb1, 0xffffff, 0xff9800, 0xe040fb];
            for (let i = 0; i < 120; i++) {
                const angle = Math.random() * Math.PI * 2;
                const tierIdx = Math.floor(Math.random() * n);
                const td = tierSpec[tierIdx];
                const tYoffset = tierSpec.slice(0, tierIdx).reduce((s, t) => s + t.h + GAP, 0);
                const tY = -totalH / 2 + tYoffset + 0.1 + Math.random() * (td.h - 0.2);
                const sprinkle = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.022, 0.022, 0.1 + Math.random() * 0.04, 8),
                    new THREE.MeshStandardMaterial({ color: sprColors[Math.floor(Math.random() * sprColors.length)], roughness: 0.35, metalness: 0.1 })
                );
                sprinkle.position.set(Math.cos(angle) * (td.r + 0.02), tY, Math.sin(angle) * (td.r + 0.02));
                sprinkle.rotation.set(Math.PI / 2, 0, angle + Math.PI / 2);
                sprinkle.castShadow = true;
                cakeGroup.add(sprinkle);
            }
        }

        // ⭐ Star Topper — metallic gold 3D star on rod
        if (state.decorations.starTopper.active) {
            const starY = topY + 0.62;
            const starPoints = [];
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
                const r2 = i % 2 === 0 ? 0.44 : 0.18;
                starPoints.push(new THREE.Vector2(Math.cos(a) * r2, Math.sin(a) * r2));
            }
            const starShape = new THREE.Shape();
            starPoints.forEach((p, j) => j === 0 ? starShape.moveTo(p.x, p.y) : starShape.lineTo(p.x, p.y));
            starShape.closePath();
            const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.02, bevelSegments: 3 });
            const star = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: 0xf9d71c, roughness: 0.08, metalness: 0.88, envMapIntensity: 1.2 }));
            star.position.set(0, starY, 0); star.rotation.x = -Math.PI / 2; star.castShadow = true;
            cakeGroup.add(star);
            // Gold rod
            const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 10), mkPhysMat('#c8a800', 0.18, 0.9));
            rod.position.set(0, topY + 0.26, 0); cakeGroup.add(rod);
            // Glow
            const starGlow = new THREE.PointLight(0xffee88, 0.5, 1.2);
            starGlow.position.set(0, starY, 0.1); cakeGroup.add(starGlow);
        }

        // 🌸 Flowers — layered petals cluster on top
        if (state.decorations.flowers.active) {
            const flowerPalette = [
                { petal: 0xf48fb1, center: 0xfff176 }, { petal: 0xce93d8, center: 0xffcc80 },
                { petal: 0xff8a65, center: 0xfff176 }, { petal: 0x80cbc4, center: 0xfff176 },
            ];
            const positions = [
                [topR * 0.25, 0, 0], [-topR * 0.25, topR * 0.22, 0.05],
                [topR * 0.08, -topR * 0.28, 0.03], [-topR * 0.1, topR * 0.08, 0.06]
            ];
            positions.forEach(([fx, fz, fy], fi) => {
                const { petal: pc, center: cc } = flowerPalette[fi % flowerPalette.length];
                const fY = topY + 0.09 + fy;
                const petals = 6;
                for (let p = 0; p < petals; p++) {
                    const pa = (p / petals) * Math.PI * 2;
                    const petal = new THREE.Mesh(
                        new THREE.SphereGeometry(0.10, 12, 10),
                        new THREE.MeshStandardMaterial({ color: pc, roughness: 0.4, metalness: 0.04 })
                    );
                    petal.position.set(fx + Math.cos(pa) * 0.17, fY, fz + Math.sin(pa) * 0.17);
                    petal.scale.set(1, 0.42, 1); cakeGroup.add(petal);
                }
                const center = new THREE.Mesh(
                    new THREE.SphereGeometry(0.078, 12, 12),
                    new THREE.MeshStandardMaterial({ color: cc, roughness: 0.22, metalness: 0.06 })
                );
                center.position.set(fx, fY + 0.05, fz); cakeGroup.add(center);
            });
        }

        // 🍬 Macarons — prominent stacked on BOTTOM TIER edge
        if (state.decorations.macarons.active) {
            const macPalette = [
                { shell: 0xf48fb1, fill: 0xfff0f5 }, { shell: 0xa5d6a7, fill: 0xf0fff4 },
                { shell: 0x80deea, fill: 0xe0f7fa }, { shell: 0xce93d8, fill: 0xf3e5f5 },
                { shell: 0xffcc80, fill: 0xfff8e1 }, { shell: 0xef9a9a, fill: 0xfce4ec },
            ];
            const botR = tierSpec[0].r;
            const botTopY = tierTopYs[0];
            for (let m = 0; m < 6; m++) {
                const angle = (m / 6) * Math.PI * 2 + Math.PI / 12;
                const mx = Math.cos(angle) * (botR - 0.12);
                const mz = Math.sin(angle) * (botR - 0.12);
                const mY = botTopY + 0.14;
                const { shell: sc, fill: fc } = macPalette[m];

                // Top shell half
                const shellTop = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.18, 0.16, 0.09, 24),
                    new THREE.MeshStandardMaterial({ color: sc, roughness: 0.35, metalness: 0.04 })
                );
                shellTop.position.set(mx, mY + 0.065, mz); cakeGroup.add(shellTop);

                // Bottom shell half
                const shellBot = shellTop.clone();
                shellBot.position.set(mx, mY - 0.015, mz); cakeGroup.add(shellBot);

                // Cream filling (visible middle band)
                const cream = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.155, 0.155, 0.06, 24),
                    new THREE.MeshStandardMaterial({ color: fc, roughness: 0.55 })
                );
                cream.position.set(mx, mY + 0.025, mz); cakeGroup.add(cream);
            }
        }

        // 🍫 Chocolate Shards — angular shards standing on top of the cake
        if (state.decorations.chocolateShards.active) {
            const shardColors = [0x3b1a08, 0x5c3317, 0x7b4a26, 0x2a0f02, 0x8b5e3c];
            const botR = tierSpec[0].r;
            const botTopY = tierTopYs[0];
            for (let s = 0; s < 8; s++) {
                const angle = (s / 8) * Math.PI * 2 + Math.random() * 0.3;
                const rad = botR * (0.3 + Math.random() * 0.5);
                const sx = Math.cos(angle) * rad;
                const sz = Math.sin(angle) * rad;
                const shardH = 0.35 + Math.random() * 0.4;
                const shardW = 0.08 + Math.random() * 0.1;
                const shardD = 0.02 + Math.random() * 0.02;
                const sc = shardColors[s % shardColors.length];

                const shard = new THREE.Mesh(
                    new THREE.BoxGeometry(shardW, shardH, shardD),
                    new THREE.MeshStandardMaterial({ color: sc, roughness: 0.15, metalness: 0.08 })
                );
                shard.position.set(sx, botTopY + shardH / 2 + 0.02, sz);
                shard.rotation.set(
                    (Math.random() - 0.5) * 0.4,
                    angle + Math.PI / 2,
                    (Math.random() - 0.5) * 0.3
                );
                shard.castShadow = true;
                cakeGroup.add(shard);
            }
        }

        // 🫐 Berry Mix — scattered mixed berries on top
        if (state.decorations.berryMix.active) {
            const berryTypes = [
                { color: 0x2c1654, r: 0.06, name: 'blueberry' },   // blueberry
                { color: 0xc0392b, r: 0.10, name: 'strawberry' },  // strawberry
                { color: 0x8b1a4a, r: 0.07, name: 'raspberry' },   // raspberry
                { color: 0x1a0a3e, r: 0.055, name: 'blackberry' }, // blackberry
            ];
            const botR = tierSpec[0].r;
            const botTopY = tierTopYs[0];
            for (let b = 0; b < 14; b++) {
                const berry = berryTypes[b % berryTypes.length];
                const angle = (b / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
                const rad = botR * (0.15 + Math.random() * 0.55);
                const bx = Math.cos(angle) * rad;
                const bz = Math.sin(angle) * rad;

                if (berry.name === 'strawberry') {
                    // Cone-ish strawberry shape
                    const straw = new THREE.Mesh(
                        new THREE.ConeGeometry(berry.r, berry.r * 2, 8),
                        new THREE.MeshStandardMaterial({ color: berry.color, roughness: 0.45, metalness: 0.05 })
                    );
                    straw.position.set(bx, botTopY + berry.r + 0.02, bz);
                    straw.rotation.x = Math.PI;  // point down then flip
                    cakeGroup.add(straw);
                    // Small leaf
                    const leaf = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.04, 0.01, 0.05, 4),
                        new THREE.MeshStandardMaterial({ color: 0x2d7a1b, roughness: 0.6 })
                    );
                    leaf.position.set(bx, botTopY + berry.r * 2 + 0.04, bz);
                    cakeGroup.add(leaf);
                } else {
                    // Round berry
                    const sphere = new THREE.Mesh(
                        new THREE.SphereGeometry(berry.r, 12, 12),
                        new THREE.MeshStandardMaterial({ color: berry.color, roughness: 0.3, metalness: 0.08 })
                    );
                    sphere.position.set(bx, botTopY + berry.r + 0.02, bz);
                    cakeGroup.add(sphere);
                    // Tiny bloom mark on blueberries
                    if (berry.name === 'blueberry') {
                        const bloom = new THREE.Mesh(
                            new THREE.CircleGeometry(berry.r * 0.4, 6),
                            new THREE.MeshStandardMaterial({ color: 0x9e8ec7, roughness: 0.6, transparent: true, opacity: 0.4 })
                        );
                        bloom.position.set(bx, botTopY + berry.r * 2 + 0.02, bz);
                        bloom.rotation.x = -Math.PI / 2;
                        cakeGroup.add(bloom);
                    }
                }
            }
        }

        /* ── Plate: only for round/hexagon/oval multi-tier. NOT for heart/square/star single-tier ── */
        const showPlate = !(state.tiers === 1 && ['heart', 'square', 'star'].includes(state.shape));
        const baseFootprint = (state.tiers === 1)
            ? getShapeFootprint(state.shape, tierSpec[0].r)
            : tierSpec[0].r;
        const plateR = baseFootprint * 1.45;
        const plateY = -totalH / 2 - 0.07;

        if (showPlate) {
            // Rich mahogany-gold plate
            const plateMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0x7b4f2a),
                roughness: 0.18,
                metalness: 0.55,
                envMapIntensity: 0.9,
                map: makeCanvasTexture((ctx, W, H) => {
                    const grd = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
                    grd.addColorStop(0, '#d4a257');
                    grd.addColorStop(0.5, '#a0692f');
                    grd.addColorStop(1, '#6b3d18');
                    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
                    ctx.strokeStyle = 'rgba(80,36,8,0.18)'; ctx.lineWidth = 3;
                    for (let g = 0; g < 18; g++) {
                        ctx.beginPath();
                        const rx = W / 2 + (Math.random() - 0.5) * 20;
                        const ry = H / 2 + (Math.random() - 0.5) * 20;
                        ctx.ellipse(rx, ry, (40 + g * 22), (40 + g * 22) * 0.3, 0.2, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }, 512, 512)
            });
            const plate = new THREE.Mesh(new THREE.CylinderGeometry(plateR, plateR * 1.05, 0.07, 64), plateMat);
            plate.position.y = plateY; plate.castShadow = true; plate.receiveShadow = true;
            cakeGroup.add(plate);

            const rim = new THREE.Mesh(
                new THREE.TorusGeometry(plateR * 1.02, 0.022, 12, 64),
                new THREE.MeshStandardMaterial({ color: 0xd4a84b, roughness: 0.08, metalness: 0.92, envMapIntensity: 1.2 })
            );
            rim.rotation.x = Math.PI / 2; rim.position.y = plateY + 0.020; cakeGroup.add(rim);

            const innerRim = new THREE.Mesh(
                new THREE.TorusGeometry(plateR * 0.88, 0.012, 8, 64),
                new THREE.MeshStandardMaterial({ color: 0xf2c96e, roughness: 0.12, metalness: 0.85 })
            );
            innerRim.rotation.x = Math.PI / 2; innerRim.position.y = plateY + 0.040; cakeGroup.add(innerRim);

            const plateGlow = new THREE.PointLight(0xffd580, 0.35, 4.5);
            plateGlow.position.set(0, plateY + 1, 2); cakeGroup.add(plateGlow);
        }

        // ── Wooden table — added directly into cakeGroup so it rotates with the cake ──
        _addWoodenTableToGroup(cakeGroup, plateY);
        updatePrice();
    } catch (err) {
        console.error("❌ buildCakeMesh failed:", err);
    }
}

/* Shape-specific topping: adds a unique 3D decoration on top based on cake shape */
function _addShapeTopping(shape, topY, topR, col, group) {
    const fc = frostColor(col, 'smooth');
    switch (shape) {
        case 'heart': {
            // Heart gets a cluster of pink fondant roses at the center
            const roseCols = [0xffb3c6, 0xff6f91, 0xce93d8, 0xf8bbd0];
            const rosePositions = [[0, 0], [0.22, 0.12], [-0.22, 0.12], [0, -0.28]];
            rosePositions.forEach(([ox, oz], ri) => {
                const rc = roseCols[ri % roseCols.length];
                for (let layer = 0; layer < 4; layer++) {
                    const a = (layer / 4) * Math.PI * 2;
                    const puff = new THREE.Mesh(
                        new THREE.SphereGeometry(0.10 - layer * 0.015, 10, 8),
                        new THREE.MeshStandardMaterial({ color: rc, roughness: 0.28 })
                    );
                    puff.position.set(ox + Math.cos(a) * 0.08, topY + 0.05 + layer * 0.035, oz + Math.sin(a) * 0.08);
                    group.add(puff);
                }
                // Center bud
                const bud = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
                    new THREE.MeshStandardMaterial({ color: 0xffc8dc, roughness: 0.2 }));
                bud.position.set(ox, topY + 0.12, oz); group.add(bud);
            });
            // Heart outline ribbon
            for (let p = 0; p < 16; p++) {
                const t2 = (p / 16) * Math.PI * 2;
                const hx = topR * 0.7 * 16 * Math.pow(Math.sin(t2), 3) / 16;
                const hz = -topR * 0.7 * (13 * Math.cos(t2) - 5 * Math.cos(2 * t2) - 2 * Math.cos(3 * t2) - Math.cos(4 * t2)) / 16;
                const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0.5 }));
                pearl.position.set(hx, topY + 0.02, hz); group.add(pearl);
            }
            break;
        }
        case 'square': {
            // Square gets fondant-style flat chocolate ganache with crisp corner accents
            const half = topR * 0.85;
            const ganacheMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(col).lerp(new THREE.Color('#fff'), 0.3), roughness: 0.22, metalness: 0.0 });
            const ganache = new THREE.Mesh(new THREE.BoxGeometry(half * 2, 0.04, half * 2), ganacheMat);
            ganache.position.y = topY + 0.022; group.add(ganache);
            // Chocolate drizzle lines
            const drizzleCol = new THREE.Color(col).lerp(new THREE.Color('#3b1a08'), 0.6);
            for (let d = 0; d < 5; d++) {
                const x = -half + (d / 4) * half * 2;
                const drizzle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.018, half * 2.1),
                    new THREE.MeshStandardMaterial({ color: drizzleCol, roughness: 0.15 }));
                drizzle.position.set(x, topY + 0.05, 0); group.add(drizzle);
            }
            // Corner gold accents
            const corners = [[half, half], [-half, half], [half, -half], [-half, -half]];
            corners.forEach(([cx, cz]) => {
                const gem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.12, 6),
                    new THREE.MeshStandardMaterial({ color: 0xf2c96e, roughness: 0.06, metalness: 0.9 }));
                gem.position.set(cx, topY + 0.06, cz); group.add(gem);
            });
            break;
        }
        case 'hexagon': {
            // Hexagon gets honeycomb pattern top with crystalline sugar shards
            const fc2 = frostColor(col, 'smooth');
            for (let p = 0; p < 6; p++) {
                const ang = (p / 6) * Math.PI * 2;
                const shard = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06, 0.02, 0.22 + Math.sin(p) * 0.08, 6),
                    new THREE.MeshStandardMaterial({ color: 0xe8f4f8, roughness: 0.04, metalness: 0.0, transparent: true, opacity: 0.82 })
                );
                shard.position.set(Math.cos(ang) * topR * 0.55, topY + 0.12, Math.sin(ang) * topR * 0.55);
                shard.rotation.z = (Math.random() - 0.5) * 0.4;
                group.add(shard);
            }
            // Central golden honeycomb disc
            const disc = new THREE.Mesh(new THREE.CylinderGeometry(topR * 0.35, topR * 0.35, 0.03, 6),
                new THREE.MeshStandardMaterial({ color: 0xf9d71c, roughness: 0.12, metalness: 0.7 }));
            disc.position.y = topY + 0.018; group.add(disc);
            break;
        }
        case 'oval': {
            // Oval gets a row of macarons across the top + drip frosting
            const macColors = [0xf48fb1, 0xa5d6a7, 0x80deea, 0xce93d8, 0xffcc80];
            for (let m = 0; m < 5; m++) {
                const mx = (m - 2) * topR * 0.45;
                const mc = macColors[m % macColors.length];
                const shellTop = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.07, 20),
                    new THREE.MeshStandardMaterial({ color: mc, roughness: 0.35 }));
                shellTop.position.set(mx, topY + 0.06, 0); group.add(shellTop);
                const shellBot = shellTop.clone();
                shellBot.position.set(mx, topY + 0.006, 0); group.add(shellBot);
                const cream = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 20),
                    new THREE.MeshStandardMaterial({ color: 0xfffde7, roughness: 0.55 }));
                cream.position.set(mx, topY + 0.033, 0); group.add(cream);
            }
            break;
        }
        case 'star': {
            // Star gets gemstone-style crystal toppers at each point
            const gemColors = [0xff6b9d, 0xffd700, 0x7c4dff, 0x00bcd4, 0xff5722];
            const pts = 5;
            for (let p = 0; p < pts; p++) {
                const a = (p / pts) * Math.PI * 2 - Math.PI / 2;
                const gemR = topR * 0.65;
                const gem = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.0, 0.10, 0.28, 6),
                    new THREE.MeshStandardMaterial({ color: gemColors[p], roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.88, envMapIntensity: 1.5 })
                );
                gem.position.set(Math.cos(a) * gemR, topY + 0.14, Math.sin(a) * gemR);
                group.add(gem);
                const glow = new THREE.PointLight(gemColors[p], 0.3, 1.2);
                glow.position.set(Math.cos(a) * gemR, topY + 0.22, Math.sin(a) * gemR);
                group.add(glow);
            }
            // Center star burst
            const burst = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12),
                new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.05, metalness: 0.9 }));
            burst.position.y = topY + 0.12; group.add(burst);
            break;
        }
        default: {
            // Round: classic strawberry cluster at top center
            const berries = [[0, 0], [0.32, -0.18], [-0.32, -0.18], [0.2, 0.32], [-0.2, 0.32]];
            berries.forEach(([bx, bz]) => {
                const berry = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20),
                    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.06, metalness: 0.18 }));
                berry.position.set(bx, topY + 0.16, bz); group.add(berry);
                const shine = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
                shine.position.set(bx + 0.06, topY + 0.26, bz + 0.06); group.add(shine);
                const leaf = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.01, 0.08, 4),
                    new THREE.MeshStandardMaterial({ color: 0x2d7a1b, roughness: 0.6 }));
                leaf.position.set(bx, topY + 0.28, bz); group.add(leaf);
            });
        }
    }
}

/* Adds a warm wooden table slab INTO cakeGroup so it rotates with the cake */
let _tableGroup = null;
function _addWoodenTableToGroup(group, plateY) {
    if (!group) return;
    // Remove stale scene-level table if any
    if (_tableGroup && scene) { scene.remove(_tableGroup); disposeGroup(_tableGroup); _tableGroup = null; }

    const safePlateY = isNaN(plateY) ? -1 : plateY;
    const tableY = safePlateY - 0.24; // sit just under the plate

    // Main wooden top — added to group (cakeGroup) so it rotates with the cake
    const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(5.0, 5.0, 0.18, 48),
        new THREE.MeshStandardMaterial({
            color: 0xa0652a, roughness: 0.72, metalness: 0.04,
            map: makeCanvasTexture((ctx, W, H) => {
                ctx.fillStyle = '#a0652a'; ctx.fillRect(0, 0, W, H);
                for (let g = 0; g < 28; g++) {
                    const gy = (g / 27) * H;
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(${60 + Math.random() * 40},${28 + Math.random() * 20},8,${0.13 + Math.random() * 0.12})`;
                    ctx.lineWidth = 3 + Math.random() * 5;
                    ctx.moveTo(0, gy + (Math.random() - 0.5) * 18);
                    ctx.bezierCurveTo(W * 0.25, gy + (Math.random() - 0.5) * 22,
                        W * 0.65, gy + (Math.random() - 0.5) * 22, W, gy + (Math.random() - 0.5) * 18);
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.ellipse(W * 0.35, H * 0.45, 28, 18, 0.3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(60,28,8,0.22)'; ctx.lineWidth = 4;
                ctx.stroke();
                const hi = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.4);
                hi.addColorStop(0, 'rgba(255,200,120,0.15)');
                hi.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = hi; ctx.fillRect(0, 0, W, H);
            }, 512, 512)
        })
    );
    tableTop.position.y = tableY;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    // Dark walnut edge band
    const edge = new THREE.Mesh(
        new THREE.TorusGeometry(5.0, 0.10, 8, 48),
        new THREE.MeshStandardMaterial({ color: 0x5a3410, roughness: 0.6, metalness: 0.08 })
    );
    edge.rotation.x = Math.PI / 2; edge.position.y = tableY;
    group.add(edge);

    // Four tapered wooden legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x7a4a1a, roughness: 0.75, metalness: 0.04 });
    [[2.8, 0, 2.8], [-2.8, 0, 2.8], [2.8, 0, -2.8], [-2.8, 0, -2.8]].forEach(([lx, , lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 2.5, 12), legMat);
        leg.position.set(lx, tableY - 1.34, lz);
        group.add(leg);
    });

    // Contact shadow disc
    const tableShadow = new THREE.Mesh(
        new THREE.CircleGeometry(5.2, 48),
        new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    tableShadow.rotation.x = -Math.PI / 2;
    tableShadow.position.y = tableY - 0.10;
    tableShadow.receiveShadow = true;
    group.add(tableShadow);
}

// Dispose old meshes to prevent memory leaks
function disposeGroup(group) {
    group.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
}

// Helper: canvas rounded rect
function roundRectCanvas(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

/* ══════════════════════════════════════════════════════
   THREE.JS — INIT & ANIMATION
══════════════════════════════════════════════════════ */

let ambientLight, keyLight;

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.dataset.theme === 'dark';
    html.dataset.theme = isDark ? 'light' : 'dark';
    localStorage.setItem('sk_theme', html.dataset.theme);
    const nowDark = html.dataset.theme === 'dark';
    document.getElementById('themeToggle').textContent = nowDark ? '☀️' : '🌙';
    if (ambientLight) {
        ambientLight.color.set(nowDark ? 0xd0d8ff : 0xfff8f0);
        ambientLight.intensity = nowDark ? 0.7 : 1.0;
    }
    if (keyLight) keyLight.intensity = nowDark ? 2.0 : 1.6;
    // Update 3D scene background
    if (scene) scene.background = new THREE.Color(nowDark ? 0x0a0818 : 0x1a1030);
}

/* ══════════════════════════════════════════════════════
   NEW FEATURES (Serving, Surprise, Mood)
══════════════════════════════════════════════════════ */

function changeGuests(delta) {
    const el = document.getElementById('guestCount');
    const rv = document.getElementById('servingResult');
    if (!el || !rv) return;
    let g = parseInt(el.textContent) + delta;
    if (g < 5) g = 5;
    if (g > 200) g = 200;
    el.textContent = g;

    if (g <= _cakeCapacity) {
        rv.innerHTML = `This cake perfectly feeds <strong>${g}</strong> guests 🎉`;
        rv.style.color = 'var(--text)';
    } else {
        rv.innerHTML = `Might need a bigger cake! Feeds up to <strong>${_cakeCapacity}</strong>.`;
        rv.style.color = '#e91e63';
    }
}

function surpriseMe() {
    // Tiers 1-3
    state.tiers = Math.floor(Math.random() * 3) + 1;
    state.tierDetails = Array.from({ length: 3 }, () => ({
        flavor: FLAVORS[Math.floor(Math.random() * FLAVORS.length)].id,
        frosting: ['smooth', 'drip', 'rosette', 'naked'][Math.floor(Math.random() * 4)],
        texture: ['plain', 'sprinkle', 'floral'][Math.floor(Math.random() * 3)],
        color: ['#f48fb1', '#81d4fa', '#ffcc80', '#b39ddb', '#c5e1a5', '#ffe082'][Math.floor(Math.random() * 6)],
        diameter: 2.2 + Math.random() * 1.0,
        height: 1.2 + Math.random() * 0.8
    }));
    // Shape: always round (shapes removed)
    state.shape = 'round';

    // Decos
    Object.keys(state.decorations).forEach(k => {
        state.decorations[k].active = Math.random() > 0.7;
    });

    // Update tier card UI
    document.querySelectorAll('.tier-card').forEach(c => {
        const t = parseInt(c.dataset.tiers);
        c.classList.toggle('active', t === state.tiers);
    });

    buildCakeMesh();
    updatePrice();
    // Update deco card UI if open
    document.querySelectorAll('.deco-card').forEach(c => {
        const dId = c.id.replace('deco-', '');
        if (state.decorations[dId]) c.classList.toggle('active', state.decorations[dId].active);
    });

    // XP reward
    addXP(15, 'Surprise Me!');
}

function applyMood(mood) {
    const palettes = {
        romance: ['#f48fb1', '#e91e63', '#ce93d8'],
        tropical: ['#ffcc02', '#ff7043', '#66bb6a'],
        midnight: ['#3949ab', '#7c4dff', '#9c27b0'],
        forest: ['#558b2f', '#795548', '#a5d6a7'],
        ocean: ['#0288d1', '#80deea', '#b2ebf2'],
        golden: ['#f9a825', '#ff6f00', '#ffcc80']
    };
    const p = palettes[mood];
    if (!p) return;
    for (let i = 0; i < state.tiers; i++) {
        state.tierDetails[i].color = p[i % p.length];
        state.tierDetails[i].frosting = 'smooth';
    }
    buildCakeMesh();
    updatePrice();
}

function init3D() {
    try {
        const canvas = document.getElementById('builder3d');
        const wrap = document.getElementById('cbCanvasWrap');

        if (!canvas || !wrap) {
            console.warn("⚠️ 3D Canvas context missing, retrying...");
            return;
        }

        const W = Math.max(wrap.clientWidth || 640, 200);
        const H = Math.max(wrap.clientHeight || 520, 300);

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0818); // rich deep purple-black — premium backdrop

        camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
        camera.position.set(0, 0.4, camZ);

        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(W, H, false);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMappingExposure = 1.15;

        // Rich lighting setup
        const isDark = document.documentElement.dataset.theme === 'dark';
        ambientLight = new THREE.AmbientLight(isDark ? 0xd0d8ff : 0xfff8f0, isDark ? 0.7 : 1.0);
        scene.add(ambientLight);

        keyLight = new THREE.DirectionalLight(0xfffdf5, isDark ? 2.0 : 1.6);
        keyLight.position.set(5, 10, 6); keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(2048, 2048);
        keyLight.shadow.bias = -0.0003;
        scene.add(keyLight);

        const fill = new THREE.DirectionalLight(0xc0d0ff, 0.65);
        fill.position.set(-6, 4, -4); scene.add(fill);
        const rimL = new THREE.DirectionalLight(0xffe8cc, 0.5);
        rimL.position.set(0, -5, -7); scene.add(rimL);
        const backL = new THREE.DirectionalLight(0xfff0e0, 0.35);
        backL.position.set(0, 3, -9); scene.add(backL);
        // Subtle pink accent from below
        const accentL = new THREE.DirectionalLight(0xffb0d0, 0.2);
        accentL.position.set(-3, -3, 5); scene.add(accentL);

        // Ground plane for shadow
        const ground = new THREE.Mesh(
            new THREE.CircleGeometry(4, 48),
            new THREE.ShadowMaterial({ opacity: 0.22 })
        );
        ground.rotation.x = -Math.PI / 2; ground.position.y = -3.5; ground.receiveShadow = true;
        scene.add(ground);

        buildCakeMesh();
        setupInputControls(canvas);
        animate3D();

        // Handle resize
        const ro = new ResizeObserver(() => {
            if (!wrap || !renderer) return;
            const W2 = wrap.clientWidth, H2 = wrap.clientHeight;
            if (W2 > 0 && H2 > 0) {
                renderer.setSize(W2, H2, false);
                camera.aspect = W2 / H2;
                camera.updateProjectionMatrix();
            }
        });
        ro.observe(wrap);

        // 3D Bakery Environment: table + backdrop
        buildBakeryEnv();
    } catch (err) {
        console.error("❌ init3D failed:", err);
    }
}

function buildBakeryEnv() {
    if (!scene) return;

    // Rich dark backdrop — deep purple/indigo gradient wall for contrast
    const backdropMat = new THREE.MeshStandardMaterial({
        color: 0x1a1030, roughness: 0.95,
        map: makeCanvasTexture((ctx, W, H) => {
            const grd = ctx.createLinearGradient(0, 0, 0, H);
            grd.addColorStop(0, '#0e0a22');   // near-black top
            grd.addColorStop(0.55, '#1a1035'); // deep purple mid
            grd.addColorStop(1, '#2a1848');    // slightly lighter purple bottom
            ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
            // Very subtle pattern dots
            for (let i = 0; i < 60; i++) {
                const x = Math.random() * W, y = Math.random() * H;
                ctx.beginPath();
                ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(180,140,255,${0.03 + Math.random() * 0.06})`;
                ctx.fill();
            }
        }, 512, 256)
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), backdropMat);
    backdrop.position.set(0, 1.5, -6.5);
    scene.add(backdrop);

    // Warm accent point light from top-left (bakery lamp feel)
    const bakeryLamp = new THREE.PointLight(0xffd48a, 0.65, 14);
    bakeryLamp.position.set(-3.5, 5, 1); scene.add(bakeryLamp);

    // Soft purple-pink rim light from behind for a stage feel
    const rimLight = new THREE.PointLight(0x9b59d1, 0.40, 12);
    rimLight.position.set(0, 2, -5); scene.add(rimLight);

    // Soft floor glow
    const floorGlow = new THREE.PointLight(0x4a2a70, 0.30, 8);
    floorGlow.position.set(0, -4, 0); scene.add(floorGlow);
}




function animate3D() {
    animFrame = requestAnimationFrame(animate3D);
    const now = performance.now();

    // ── Layer drop animation ──
    let allSettled = true;
    if (tierBodies.length > 0) {
        tierBodies.forEach(b => {
            const tY = b.userData.targetY;
            if (tY === undefined) return;
            const elapsed = Math.max(0, now - (b.userData.dropStart || now));
            if (elapsed < 20) { allSettled = false; return; }
            const t = Math.min(elapsed / 380, 1);
            // Spring-damped easing with overshoot
            const spring = 1 - Math.exp(-6 * t) * Math.cos(Math.PI * 2.2 * t);
            const startY = tY + 3.5 + (b.userData.dropDelay || 0) * 0.004;
            const cy = startY + (tY - startY) * spring;
            if (Math.abs(b.position.y - tY) > 0.003) { b.position.y = cy; allSettled = false; }
            else b.position.y = tY;
        });
    }

    // ── Premium floating animation for cake group (starts after drop settles) ──
    if (!isDrag) rotY += 0.005;
    if (cakeGroup) {
        cakeGroup.rotation.y = rotY;
        cakeGroup.rotation.x = rotX;
        // Gentle levitation bob — only after tiers have settled
        if (allSettled && tierBodies.length > 0) {
            const floatAmp = 0.04;
            const floatSpeed = 0.0012;
            cakeGroup.position.y = Math.sin(now * floatSpeed) * floatAmp;
        }
    }
    if (Math.abs(camera.position.z - camZ) > 0.01) {
        camera.position.z += (camZ - camera.position.z) * 0.08;
    }
    renderer?.render(scene, camera);
}

function setupInputControls(canvas) {
    // Mouse drag + scroll zoom
    canvas.addEventListener('mousedown', e => { isDrag = true; lastX = e.clientX; lastY = e.clientY; });
    canvas.addEventListener('mousemove', e => {
        if (!isDrag) return;
        rotY += (e.clientX - lastX) * 0.012;
        rotX += (e.clientY - lastY) * 0.008;
        rotX = Math.max(-0.6, Math.min(0.7, rotX));
        lastX = e.clientX; lastY = e.clientY;
    });
    canvas.addEventListener('mouseup', () => isDrag = false);
    canvas.addEventListener('mouseleave', () => isDrag = false);
    canvas.addEventListener('wheel', e => {
        camZ += e.deltaY * 0.01;
        camZ = Math.max(4, Math.min(16, camZ));
        e.preventDefault();
    }, { passive: false });

    // Touch drag
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) { isDrag = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; pinchDist = null; }
        else if (e.touches.length === 2) { isDrag = false; pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
        if (e.touches.length === 1 && isDrag) {
            rotY += (e.touches[0].clientX - lastX) * 0.012;
            rotX += (e.touches[0].clientY - lastY) * 0.008;
            rotX = Math.max(-0.6, Math.min(0.7, rotX));
            lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2 && pinchDist !== null) {
            const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            camZ -= (newDist - pinchDist) * 0.04;
            camZ = Math.max(4, Math.min(16, camZ));
            pinchDist = newDist;
        }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { isDrag = false; pinchDist = null; });
}

/* ══════════════════════════════════════════════════════
   SCREEN SHOT
══════════════════════════════════════════════════════ */

function takeSnapshot() {
    if (!renderer) { alert('Please wait for 3D to load.'); return; }
    const flash = document.getElementById('snapFlash');
    flash.style.opacity = '0.8';
    setTimeout(() => flash.style.opacity = '0', 180);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'silkoven-cake.png'; a.click();
    addXP(30, 'Downloaded cake design');
}

/* ══════════════════════════════════════════════════════
   CART INTEGRATION
══════════════════════════════════════════════════════ */

function addToCartAndRedirect() {
    const { total } = computePrice();
    const activeDecos = Object.entries(state.decorations)
        .filter(([, v]) => v.active)
        .map(([k, v]) => ({ key: k, count: v.count || 1 }));

    const customItem = {
        id: Date.now(),
        name: 'Custom ' + state.tiers + '-Tier Cake',
        emoji: '🎂',
        price: total,
        qty: 1,
        tags: ['custom'],
        badge: 'CUSTOM',
        bg: state.tierDetails[0].color,
        desc: buildCartDescription(),
        customization: {
            tiers: state.tiers,
            tierDetails: state.tierDetails.slice(0, state.tiers).map(td => ({
                flavor: td.flavor,
                color: td.color,
                height: +td.height.toFixed(2),
                diameter: +td.diameter.toFixed(2),
                frosting: td.frosting,
                texture: td.texture,
            })),
            decorations: activeDecos,
            shape: state.tiers === 1 ? state.shape : 'round',
            instructions: state.instructions,

        },
        instructions: state.instructions,
    };

    // Merge into existing cart in localStorage
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('sk_builder_cart') || '[]'); } catch (e) { }
    cart.push(customItem);
    localStorage.setItem('sk_builder_cart', JSON.stringify(cart));
    localStorage.setItem('sk_custom_pending', JSON.stringify(customItem));

    addXP(50, 'Custom cake created!');
    fireBuilderConfetti();

    // Achievement
    showAchievement('🎂', 'Master Baker!', 'Your creation is heading to the cart!');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1600);
}

function buildCartDescription() {
    const tierLabels = ['Bottom', 'Middle', 'Top'];
    const tiers = Array.from({ length: state.tiers }, (_, i) => {
        const td = state.tierDetails[i];
        const fl = FLAVORS.find(f => f.id === td.flavor);
        return `${tierLabels[i]}: ${fl ? fl.name : td.flavor}`;
    }).join(' · ');
    const decos = Object.entries(state.decorations)
        .filter(([, v]) => v.active).map(([k]) => k).join(', ');
    const inscr = state.inscription ? ` · "${state.inscription}"` : '';
    return tiers + (decos ? ` · ${decos}` : '') + inscr;
}

/* ══════════════════════════════════════════════════════
   CONFETTI
══════════════════════════════════════════════════════ */

function fireBuilderConfetti() {
    const colors = ['#d45080', '#9c59d1', '#26a69a', '#f9d71c', '#ff8a65', '#80deea'];
    for (let i = 0; i < 80; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti-piece';
        conf.style.cssText = `
            left: ${Math.random() * 100}vw;
            background-color: ${colors[Math.floor(Math.random() * colors.length)]};
            animation-duration: ${Math.random() * 2 + 2.5}s;
            animation-delay: ${Math.random() * 0.6}s;
            width: ${6 + Math.random() * 8}px;
            height: ${8 + Math.random() * 10}px;
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        `;
        document.getElementById('confettiContainer').appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // Load cart count from main site localStorage
    try {
        const cart = JSON.parse(localStorage.getItem('sk_cart') || '[]');
        const builderCart = JSON.parse(localStorage.getItem('sk_builder_cart') || '[]');
        const total = cart.reduce((s, c) => s + (c.qty || 1), 0) + builderCart.length;
        document.getElementById('cbCartCount').textContent = total;
    } catch (e) { }

    // Load dark mode preference — default to dark for the builder
    const theme = localStorage.getItem('sk_theme') || 'dark';
    document.documentElement.dataset.theme = theme;
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';

    // Build progress bar
    buildProgressBar();

    // Render font picker in step 5 (lazy — also called when navigating to step 5)
    // Pre-populate step 2 color swatch
    renderFlavorStep();

    // Initialize 3D
    setTimeout(() => {
        init3D();
        builderInitted = true;
    }, 100);

    updateXPHud();
    updatePrice();

    // Navbar scroll shadow
    window.addEventListener('scroll', () => {
        document.getElementById('cbNav').style.boxShadow =
            window.scrollY > 2 ? '0 4px 24px rgba(107,61,46,.12)' : '0 2px 8px rgba(107,61,46,.06)';
    });
});
