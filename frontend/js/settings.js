/* ============================================================
   settings.js — settings overlay: open/close, nav, quick jumps
   openSettingsAndJump() is exposed globally for catalog.js
   ============================================================ */

(function () {
  const overlay        = document.getElementById('settingsOverlay');
  const settingsButton = document.getElementById('settingsButton');
  const navButtons     = overlay.querySelectorAll('.settings-nav button[data-page]');
  const pages          = overlay.querySelectorAll('.settings-page');

  function openOverlay()  { overlay.classList.add('open'); }
  function closeOverlay() { overlay.classList.remove('open'); }

  overlay.addEventListener('click', (e) => {
    const panel = document.querySelector('.settings-panel');
    if (!panel.contains(e.target)) closeOverlay();
  });
  settingsButton.addEventListener('click', openOverlay);

  navButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const page = btn.dataset.page;
      navButtons.forEach(b => b.classList.toggle('active', b === btn));
      pages.forEach(sec => sec.classList.toggle('active', sec.dataset.page === page));

      if (page === 'orders') {
        try { await apiFetch('/notifications/mark-seen', { method: 'PATCH', body: JSON.stringify({ types: ['new_order'] }) }); } catch {}
        if (typeof refreshAdminOrders  === 'function') refreshAdminOrders();
        if (typeof refreshNotifBadges  === 'function') refreshNotifBadges();
      }
      if (page === 'contact' && typeof refreshContactTab === 'function') refreshContactTab();
      if (page === 'myorders') {
        try { await apiFetch('/notifications/mark-seen', { method: 'PATCH', body: JSON.stringify({ types: ['order_status'] }) }); } catch {}
        if (typeof refreshUserOrders  === 'function') refreshUserOrders();
        if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
      }
    });
  });

  document.querySelectorAll('[data-jump]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-jump');
      navButtons.forEach(b => b.classList.toggle('active', b.dataset.page === target));
      pages.forEach(sec => sec.classList.toggle('active', sec.dataset.page === target));
    });
  });

  window.openSettingsAndJump = function (pageId) {
    openOverlay();
    navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));
    pages.forEach(sec => sec.classList.toggle('active', sec.dataset.page === pageId));
  };
})();
