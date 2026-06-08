/* ============================================================
   cart.js — cart drawer, checkout (calls /api/orders),
             admin order management, user order history
   ============================================================ */

(function () {
  const cartButton      = document.getElementById('cartButton');
  const cartDrawer      = document.getElementById('cartDrawer');
  const cartClose       = document.getElementById('cartClose');
  const cartItemsEl     = document.getElementById('cartItems');
  const cartTotalEl     = document.getElementById('cartTotal');
  const cartCheckout    = document.getElementById('cartCheckout');
  const cartMsg         = document.getElementById('cartMsg');
  const checkoutForm    = document.getElementById('checkoutForm');
  const checkoutName    = document.getElementById('checkoutName');
  const checkoutLoc     = document.getElementById('checkoutLocation');
  const checkoutPhone   = document.getElementById('checkoutPhone');
  const adminOrdersList = document.getElementById('adminOrdersList');
  const userOrdersList  = document.getElementById('userOrdersList');

  function escapeHtml(str) { return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])); }
  function isAdmin() { return state.currentUser && state.currentUser.role === 'admin'; }

  const STATUS_STYLES = {
    'Order Placed':   'background:#2a2060; color:#c5b8ff;',
    'Being Prepared': 'background:#1a3a1a; color:#7ef0a0;',
    'Shipped':        'background:#0d2a3a; color:#7dd8f8;'
  };
  function statusBadge(status) {
    const s = status || 'Order Placed';
    const style = STATUS_STYLES[s] || 'background:rgba(255,255,255,.1); color:var(--ink);';
    return '<span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:.75rem; font-weight:500; ' + style + '">' + escapeHtml(s) + '</span>';
  }

  // ── Cart UI ──────────────────────────────────────────────────
  window.updateCartUI = function () {
    const cartCount = state.cart.reduce((sum, i) => sum + i.qty, 0);
    const label = cartButton.querySelector('span:nth-child(2)');
    if (label) label.textContent = 'Cart (' + cartCount + ')';

    cartItemsEl.innerHTML = '';
    let total = 0;

    state.cart.forEach(item => {
      const book  = state.books.find(b => b.id === item.id); if (!book) return;
      const price = typeof book.price === 'number' ? book.price : 0;
      const stock = typeof book.stock === 'number' ? book.stock : 0;
      total += price * item.qty;
      const li = document.createElement('li');
      li.style.cssText = 'flex-direction:column; align-items:flex-start; gap:6px;';
      li.innerHTML =
        '<div style="display:flex; justify-content:space-between; width:100%; align-items:center;">' +
          '<div class="title">' + escapeHtml(book.title) + '</div>' +
          '<button type="button" class="btn-ghost btn-remove" data-id="' + item.id + '" style="font-size:.75rem;">✕ Remove</button>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
          '<div style="display:flex; align-items:center; gap:0; border:1px solid rgba(170,190,230,.3); border-radius:999px; overflow:hidden;">' +
            '<button type="button" class="btn-ghost cart-qty-dec" data-id="' + item.id + '" style="padding:3px 10px; border-radius:0; border:0;">−</button>' +
            '<span style="min-width:24px; text-align:center; font-size:.85rem;">' + item.qty + '</span>' +
            '<button type="button" class="btn-ghost cart-qty-inc" data-id="' + item.id + '" style="padding:3px 10px; border-radius:0; border:0;"' + (item.qty >= stock ? ' disabled' : '') + '>+</button>' +
          '</div>' +
          '<span class="meta">$' + price.toFixed(2) + ' each — subtotal $' + (price * item.qty).toFixed(2) + '</span>' +
          (stock <= 3 ? '<span style="font-size:.72rem; color:#ffd080;">Only ' + stock + ' in stock</span>' : '') +
        '</div>';
      cartItemsEl.appendChild(li);
    });

    cartTotalEl.textContent = '$' + total.toFixed(2);
    if (state.cart.length === 0) cartItemsEl.innerHTML = '<li>Your cart is empty.</li>';

    if (checkoutForm) {
      checkoutForm.style.display = (!isAdmin() && state.cart.length > 0) ? 'grid' : 'none';
      if (!isAdmin() && state.cart.length > 0) prefillProfile();
    }
  };

  async function prefillProfile() {
    try {
      const user = await apiFetch('/users/profile');
      if (user.profile?.name     && checkoutName  && !checkoutName.value)  checkoutName.value  = user.profile.name;
      if (user.profile?.location && checkoutLoc   && !checkoutLoc.value)   checkoutLoc.value   = user.profile.location;
      if (user.profile?.phone    && checkoutPhone && !checkoutPhone.value) checkoutPhone.value = user.profile.phone;
    } catch {}
  }

  // ── Open / close ─────────────────────────────────────────────
  window.openCart = function () {
    cartDrawer.classList.add('open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    if (!isAdmin()) prefillProfile();
  };
  function closeCart() { cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden', 'true'); cartMsg.textContent = ''; }
  cartButton.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  cartDrawer.addEventListener('click', (e) => { if (e.target === cartDrawer) closeCart(); });

  // ── Persist profile as user types ────────────────────────────
  async function persistProfile() {
    try {
      await apiFetch('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name:     checkoutName  ? checkoutName.value.trim()  : '',
          location: checkoutLoc   ? checkoutLoc.value.trim()   : '',
          phone:    checkoutPhone ? checkoutPhone.value.trim() : ''
        })
      });
    } catch {}
  }
  if (checkoutName)  checkoutName.addEventListener('change', persistProfile);
  if (checkoutLoc)   checkoutLoc.addEventListener('change',  persistProfile);
  if (checkoutPhone) {
    checkoutPhone.addEventListener('input', () => {
      const cleaned = checkoutPhone.value.replace(/[^\d+\s\-()]/g, '');
      if (checkoutPhone.value !== cleaned) checkoutPhone.value = cleaned;
    });
    checkoutPhone.addEventListener('change', persistProfile);
  }

  // ── Remove / qty adjust ──────────────────────────────────────
  cartItemsEl.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.btn-remove');
    const decBtn    = e.target.closest('.cart-qty-dec');
    const incBtn    = e.target.closest('.cart-qty-inc');
    if (removeBtn) {
      const idx = state.cart.findIndex(i => i.id === removeBtn.dataset.id);
      if (idx >= 0) { state.cart.splice(idx, 1); saveCart(); updateCartUI(); if (typeof syncQtyDisplays === 'function') syncQtyDisplays(); }
      return;
    }
    if (decBtn) {
      const item = state.cart.find(i => i.id === decBtn.dataset.id);
      if (item) { item.qty -= 1; if (item.qty <= 0) state.cart.splice(state.cart.indexOf(item), 1); saveCart(); updateCartUI(); if (typeof syncQtyDisplays === 'function') syncQtyDisplays(); }
      return;
    }
    if (incBtn) {
      const item  = state.cart.find(i => i.id === incBtn.dataset.id);
      const book  = item ? state.books.find(b => b.id === item.id) : null;
      const stock = book ? (typeof book.stock === 'number' ? book.stock : 0) : 0;
      if (item && item.qty < stock) { item.qty += 1; saveCart(); updateCartUI(); if (typeof syncQtyDisplays === 'function') syncQtyDisplays(); }
      return;
    }
  });

  // ── Checkout — POST to /api/orders ───────────────────────────
  cartCheckout.addEventListener('click', async () => {
    if (isAdmin()) { cartMsg.textContent = 'Admins cannot place orders.'; cartMsg.className = 'notice error'; return; }
    if (state.cart.length === 0) { cartMsg.textContent = 'Your cart is empty.'; cartMsg.className = 'notice error'; return; }

    const name     = checkoutName  ? checkoutName.value.trim()  : '';
    const location = checkoutLoc   ? checkoutLoc.value.trim()   : '';
    const phone    = checkoutPhone ? checkoutPhone.value.trim() : '';
    if (!name || !location || !phone) { cartMsg.textContent = 'Please fill in your name, delivery address, and phone number.'; cartMsg.className = 'notice error'; return; }

    // Confirm dialog
    const itemSummary = state.cart.map(i => { const b = state.books.find(b => b.id === i.id); return (b ? b.title : i.id) + ' x' + i.qty; }).join('\n');
    const total = state.cart.reduce((sum, i) => { const b = state.books.find(b => b.id === i.id); return sum + (b ? b.price : 0) * i.qty; }, 0).toFixed(2);
    if (!confirm('Confirm your order?\n\nItems:\n' + itemSummary + '\n\nTotal: $' + total + '\nShip to: ' + name + ', ' + location + '\nPhone: ' + phone)) return;

    try {
      // Map cart items to { bookId, qty }
      const items = state.cart.map(i => ({ bookId: i.id, qty: i.qty }));
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({ customer: { name, location, phone }, items })
      });

      // Update local book stock
      state.cart.forEach(i => {
        const book = state.books.find(b => b.id === i.id);
        if (book) { book.stock = Math.max(0, (book.stock || 0) - i.qty); if (book.stock === 0) book.available = false; }
      });

      cartMsg.textContent = '🧾 Order placed! Check "My Orders" in Settings to track your status.';
      cartMsg.className   = 'notice ok';
      state.cart = [];
      saveCart();
      updateCartUI();
      if (typeof renderCatalog === 'function') renderCatalog();
      if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
    } catch (err) {
      cartMsg.textContent = err.message;
      cartMsg.className   = 'notice error';
    }
  });

  // ── User: My Orders ──────────────────────────────────────────
  window.refreshUserOrders = async function () {
    if (!userOrdersList) return;
    try {
      const orders = await apiFetch('/orders/mine');
      userOrdersList.innerHTML = '';
      if (orders.length === 0) { userOrdersList.innerHTML = '<p style="color:var(--muted); font-size:.85rem;">You have no orders yet.</p>'; return; }
      orders.forEach(order => {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid rgba(170,190,230,.25); border-radius:14px; padding:12px 14px; margin-bottom:10px; font-size:.82rem; line-height:1.8;';
        const itemLines = order.items.map(i => escapeHtml(i.title) + ' x' + i.qty + ' ($' + (i.price * i.qty).toFixed(2) + ')').join('<br>');
        const orderId   = (order.id || order._id || '').slice(-6).toUpperCase();
        const placedAt  = new Date(order.createdAt).toLocaleString();
        const updatedAt = new Date(order.updatedAt).toLocaleString();
        card.innerHTML =
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap; margin-bottom:6px;">' +
            '<strong style="font-size:.88rem;">Order #' + escapeHtml(orderId) + '</strong>' + statusBadge(order.status) +
          '</div>' +
          '<div style="color:var(--muted);">Placed: ' + escapeHtml(placedAt) + '</div>' +
          (updatedAt !== placedAt ? '<div style="color:var(--muted);">Last update: ' + escapeHtml(updatedAt) + '</div>' : '') +
          '<div style="margin-top:6px;">' + itemLines + '</div>' +
          '<strong style="display:block; margin-top:4px;">Total: $' + escapeHtml(String(order.total)) + '</strong>' +
          '<div style="margin-top:4px; color:var(--muted);">Ship to: ' + escapeHtml(order.customer?.name || '') + ', ' + escapeHtml(order.customer?.location || '') + '</div>';
        userOrdersList.appendChild(card);
      });
    } catch { userOrdersList.innerHTML = '<p style="color:var(--muted);">Failed to load orders.</p>'; }
  };

  // ── Admin: Orders ────────────────────────────────────────────
  window.refreshAdminOrders = async function () {
    if (!adminOrdersList) return;
    try {
      const orders = await apiFetch('/orders');
      adminOrdersList.innerHTML = '';
      if (orders.length === 0) { adminOrdersList.innerHTML = '<p style="color:var(--muted); font-size:.85rem;">No pending orders.</p>'; return; }
      orders.forEach(order => {
        const card = document.createElement('div');
        card.style.cssText = 'border:1px solid rgba(170,190,230,.3); border-radius:14px; padding:12px 14px; margin-bottom:10px; font-size:.82rem; line-height:1.8;';
        const itemLines    = order.items.map(i => escapeHtml(i.title) + ' x' + i.qty + ' ($' + (i.price * i.qty).toFixed(2) + ')').join('<br>');
        const orderId      = (order.id || order._id || '').slice(-6).toUpperCase();
        const isPreparing  = order.status === 'Being Prepared';
        card.innerHTML =
          '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap; margin-bottom:6px;">' +
            '<strong>Order #' + escapeHtml(orderId) + '</strong>' + statusBadge(order.status) +
          '</div>' +
          '<strong>' + escapeHtml(order.customer?.name || '') + '</strong> &mdash; ' + escapeHtml(order.customer?.phone || '') + '<br>' +
          '<span style="color:var(--muted);">' + escapeHtml(order.customer?.location || '') + '</span><br>' +
          '<span style="color:var(--muted);">Email: ' + escapeHtml(order.userEmail) + '</span><br>' +
          '<span style="color:var(--muted);">Placed: ' + escapeHtml(new Date(order.createdAt).toLocaleString()) + '</span><br>' +
          '<div style="margin-top:6px;">' + itemLines + '</div>' +
          '<strong style="display:block; margin-top:4px;">Total: $' + escapeHtml(String(order.total)) + '</strong>' +
          '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">' +
            (!isPreparing
              ? '<button class="btn btn-inline" style="background:linear-gradient(90deg,#3a7aff,#6ab4ff); color:#000d2a;" data-action="prepare" data-order-id="' + (order.id || order._id) + '">Being Prepared</button>'
              : '<button class="btn btn-inline btn-secondary" disabled style="opacity:.5; cursor:default;">Being Prepared ✓</button>') +
            '<button class="btn btn-inline" style="background:linear-gradient(90deg,#3ac26e,#3af0a0); color:#042010;" data-action="ship" data-order-id="' + (order.id || order._id) + '">Mark as Shipped</button>' +
          '</div>';
        adminOrdersList.appendChild(card);
      });
    } catch { adminOrdersList.innerHTML = '<p style="color:var(--muted);">Failed to load orders.</p>'; }
  };

  if (adminOrdersList) {
    adminOrdersList.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-order-id]'); if (!btn) return;
      const oid    = btn.dataset.orderId;
      const action = btn.dataset.action;
      const status = action === 'prepare' ? 'Being Prepared' : 'Shipped';
      const msg    = action === 'prepare' ? 'Mark this order as "Being Prepared"?' : 'Mark this order as "Shipped"?';
      if (!confirm(msg)) return;
      try {
        await apiFetch('/orders/' + oid + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
        refreshAdminOrders();
        if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
      } catch (err) { alert('Failed: ' + err.message); }
    });
  }

  updateCartUI();
})();
