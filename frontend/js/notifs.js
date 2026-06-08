/* ============================================================
   notifs.js — notification badge rendering (calls /api/notifications)
   ============================================================ */

function setBadge(el, count) {
  if (!el) return;
  let badge = el.querySelector('.notif-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'notif-badge';
    badge.style.cssText = [
      'position:absolute', 'top:-5px', 'right:-5px',
      'min-width:18px', 'height:18px', 'border-radius:999px',
      'background:linear-gradient(135deg,#ff4d6d,#ff8a5c)',
      'color:#fff', 'font-size:11px', 'font-weight:700',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:0 5px', 'box-shadow:0 2px 8px rgba(255,60,80,.55)',
      'pointer-events:none', 'transition:transform .2s ease, opacity .2s ease', 'line-height:1'
    ].join(';');
    const pos = getComputedStyle(el).position;
    if (pos === 'static') el.style.position = 'relative';
    el.appendChild(badge);
  }
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.opacity = '1'; badge.style.transform = 'scale(1)'; badge.style.display = 'flex';
  } else {
    badge.style.opacity = '0'; badge.style.transform = 'scale(0)';
    setTimeout(() => { if (badge.style.opacity === '0') badge.style.display = 'none'; }, 200);
  }
}

window.refreshNotifBadges = async function () {
  const user = state.currentUser; if (!user) return;
  try {
    const data = await apiFetch('/notifications');
    const settingsBtn = document.getElementById('settingsButton');
    const contactTab  = document.getElementById('contactNavBtn');
    const myOrdersTab = document.getElementById('myOrdersNavBtn');
    const ordersTab   = document.querySelector('.settings-nav button[data-page="orders"]');

    if (user.role === 'admin') {
      setBadge(settingsBtn, data.total);
      setBadge(contactTab,  data.counts['new_message']  || 0);
      setBadge(ordersTab,   data.counts['new_order']    || 0);
    } else {
      setBadge(settingsBtn, data.total);
      setBadge(contactTab,  data.counts['admin_reply']  || 0);
      setBadge(myOrdersTab, data.counts['order_status'] || 0);
    }
  } catch {}
};
