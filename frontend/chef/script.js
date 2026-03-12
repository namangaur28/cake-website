const API = 'https://cake-website-ofys.onrender.com/api';

// Config
const STATUSES = ['Pending', 'Prepping', 'Baking', 'Ready', 'Completed'];

// DOM Elements
const connDot = document.getElementById('connectionDot');
const connText = document.getElementById('connectionText');

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchOrders();
    // Auto refresh every 30 seconds
    setInterval(fetchOrders, 30000);
});

async function fetchOrders() {
    try {
        const res = await fetch(`${API}/orders`);
        const data = await res.json();

        if (data.success) {
            connDot.className = 'pulse-dot online';
            connText.textContent = `Online (${new Date().toLocaleTimeString()})`;
            renderBoard(data.orders);
        } else {
            throw new Error('Failed to fetch orders');
        }
    } catch (err) {
        connDot.className = 'pulse-dot';
        connText.textContent = 'Offline (Retrying...)';
        console.error(err);
    }
}

function renderBoard(orders) {
    // Clear all columns
    STATUSES.forEach(status => {
        const colBody = document.querySelector(`#col-${status} .col-body`);
        if (colBody) colBody.innerHTML = '';
        const countSpan = document.querySelector(`#col-${status} .col-count`);
        if (countSpan) countSpan.textContent = '0';
    });

    const statusCounts = { Pending: 0, Prepping: 0, Baking: 0, Ready: 0, Completed: 0 };

    // Avoid displaying hundreds of completed orders, just show recent ones
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    orders.forEach(order => {
        const status = order.status || 'Pending';

        // Skip ancient completed orders (older than 24h)
        if (status === 'Completed' && (now - new Date(order.paidAt).getTime() > oneDay)) {
            return;
        }

        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
            const colBody = document.querySelector(`#col-${status} .col-body`);
            if (colBody) {
                const card = createOrderCard(order);
                colBody.appendChild(card);
            }
        }
    });

    // Update counts
    STATUSES.forEach(status => {
        const countSpan = document.querySelector(`#col-${status} .col-count`);
        if (countSpan) countSpan.textContent = statusCounts[status].toString();
    });
}

function createOrderCard(order) {
    const el = document.createElement('div');
    el.className = 'order-card';

    const timeString = new Date(order.paidAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusIdx = STATUSES.indexOf(order.status || 'Pending');

    // Generate Items list
    let itemsHTML = '<ul>';
    let isCustom3D = false;

    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const qty = item.qty ? `x${item.qty}` : '';
            const badge = item.customization ? '<span class="ord-badge">3D Design</span>' : '';
            if (item.customization) isCustom3D = true;
            itemsHTML += `<li>${item.name} ${qty} ${badge}</li>`;
        });
    } else {
        itemsHTML += `<li>Shop items (see database)</li>`;
    }
    itemsHTML += '</ul>';

    // Instructions
    let instrHTML = '';
    const allInstr = [];
    if (order.instructions) allInstr.push(`<strong>Note:</strong> ${order.instructions}`);

    // Also grab builder instructions if any
    if (order.customizationData && Array.isArray(order.customizationData)) {
        order.customizationData.forEach(c => {
            if (c.customization && c.customization.instructions) {
                allInstr.push(`<strong>3D Builder:</strong> ${c.customization.instructions}`);
            }
        });
    }

    if (allInstr.length > 0) {
        instrHTML = `<div class="ord-instr">${allInstr.join('<br>')}</div>`;
    }

    // Action buttons
    let actionHTML = '';
    if (statusIdx < STATUSES.length - 1) {
        const nextStatus = STATUSES[statusIdx + 1];
        actionHTML = `
            <div class="card-actions">
                ${statusIdx > 0 ? `<button class="action-btn" onclick="updateStatus('${order.orderId}', '${STATUSES[statusIdx - 1]}')">Back</button>` : ''}
                <button class="action-btn primary" onclick="updateStatus('${order.orderId}', '${nextStatus}')">${nextStatus} →</button>
            </div>
        `;
    } else {
        actionHTML = `
            <div class="card-actions">
                <button class="action-btn" onclick="updateStatus('${order.orderId}', '${STATUSES[statusIdx - 1]}')">Back</button>
                <button class="action-btn" disabled>Done</button>
            </div>
        `;
    }

    el.innerHTML = `
        <div class="card-head">
            <span class="ord-id">${order.orderId}</span>
            <span class="ord-time">${timeString}</span>
        </div>
        <div class="ord-items">
            <strong>Order Items:</strong>
            ${itemsHTML}
        </div>
        ${instrHTML}
        ${actionHTML}
    `;

    return el;
}

async function updateStatus(orderId, newStatus) {
    // Optimistically update the UI to feel very snappy
    // but in a real setting, you might want to wait or show a loader
    try {
        const res = await fetch(`${API}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await res.json();
        if (data.success) {
            // Re-fetch everything to ensure board is perfectly in sync
            fetchOrders();
        } else {
            alert('Failed to update: ' + data.message);
        }
    } catch (err) {
        alert('Network error while updating status.');
        console.error(err);
    }
}
