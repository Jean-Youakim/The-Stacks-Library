/* ============================================================
   contact.js — messaging system (calls /api/messages)
   ============================================================ */

(function () {
  function isAdmin() { return state.currentUser && state.currentUser.role === 'admin'; }
  function escapeHtml(str) { return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])); }

  function renderThread(container, messages, currentUserEmail) {
    container.innerHTML = '';
    if (!messages || messages.length === 0) {
      container.innerHTML = '<p style="color:var(--muted); font-size:.85rem; text-align:center;">No messages yet. Say hello!</p>';
      return;
    }
    messages.forEach(msg => {
      const isMe = (msg.from === currentUserEmail) || (isAdmin() && msg.from === 'admin');
      const bubble = document.createElement('div');
      bubble.style.cssText = [
        'max-width:80%', 'padding:8px 12px', 'border-radius:14px', 'font-size:.83rem', 'line-height:1.55', 'word-break:break-word',
        isMe
          ? 'align-self:flex-end; background:linear-gradient(135deg,rgba(var(--brand),.35),rgba(120,180,255,.25)); border-bottom-right-radius:4px;'
          : 'align-self:flex-start; background:rgba(255,255,255,.07); border-bottom-left-radius:4px;'
      ].join(';');
      const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';
      bubble.innerHTML =
        '<div style="font-size:.72rem; color:var(--muted); margin-bottom:3px;">' +
          escapeHtml(isMe ? 'You' : (msg.from === 'admin' ? 'Stacks Support' : msg.from)) + ' · ' + escapeHtml(ts) +
        '</div>' + escapeHtml(msg.text);
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  }

  // ── USER VIEW ────────────────────────────────────────────────
  const contactForm   = document.getElementById('contactForm');
  const contactMsg    = document.getElementById('contactMsg');
  const contactStatus = document.getElementById('contactStatus');
  const userThread    = document.getElementById('userThread');

  window.refreshUserThread = async function () {
    if (!userThread) return;
    const email = state.currentUser ? state.currentUser.email : null; if (!email) return;
    try {
      const convo = await apiFetch('/messages/mine');
      renderThread(userThread, convo.messages, email);
    } catch { userThread.innerHTML = '<p style="color:var(--muted); font-size:.85rem;">Failed to load messages.</p>'; }
  };

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text  = contactMsg ? contactMsg.value.trim() : '';
      const email = state.currentUser ? state.currentUser.email : null;
      if (!text) { contactStatus.textContent = 'Please write a message first.'; contactStatus.className = 'notice error'; return; }
      if (!email) { contactStatus.textContent = 'You must be logged in to send a message.'; contactStatus.className = 'notice error'; return; }
      try {
        await apiFetch('/messages', { method: 'POST', body: JSON.stringify({ text }) });
        contactMsg.value = '';
        contactStatus.textContent = 'Message sent.'; contactStatus.className = 'notice ok';
        setTimeout(() => { contactStatus.textContent = ''; }, 2000);
        refreshUserThread();
        if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
      } catch (err) { contactStatus.textContent = err.message; contactStatus.className = 'notice error'; }
    });
  }

  // ── ADMIN VIEW ───────────────────────────────────────────────
  const adminConvoList   = document.getElementById('adminConvoList');
  const adminThreadView  = document.getElementById('adminThreadView');
  const adminThread      = document.getElementById('adminThread');
  const adminThreadUser  = document.getElementById('adminThreadUser');
  const adminBackBtn     = document.getElementById('adminBackBtn');
  const adminReplyForm   = document.getElementById('adminReplyForm');
  const adminReplyMsg    = document.getElementById('adminReplyMsg');
  const adminReplyStatus = document.getElementById('adminReplyStatus');
  let activeConvoEmail   = null;

  window.refreshAdminMessages = async function () {
    if (!adminConvoList) return;
    try {
      const all = await apiFetch('/messages/all');
      adminConvoList.innerHTML = '';
      if (adminThreadView) adminThreadView.style.display = 'none';
      activeConvoEmail = null;
      if (all.length === 0) { adminConvoList.innerHTML = '<p style="color:var(--muted); font-size:.85rem;">No messages from users yet.</p>'; return; }
      all.forEach(convo => {
        const last    = convo.messages[convo.messages.length - 1];
        const preview = last ? escapeHtml(last.text).slice(0, 60) + (last.text.length > 60 ? '…' : '') : 'No messages';
        const row     = document.createElement('div');
        row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 12px; border:1px solid rgba(170,190,230,.25); border-radius:12px; margin-bottom:8px; cursor:pointer; transition: background .15s;';
        row.innerHTML =
          '<div>' +
            '<strong style="font-size:.85rem;">' + escapeHtml(convo.userEmail) + '</strong>' +
            '<div style="font-size:.75rem; color:var(--muted); margin-top:2px;">' + preview + '</div>' +
          '</div>' +
          '<button class="btn btn-inline btn-secondary" style="flex-shrink:0;" data-convo="' + escapeHtml(convo.userEmail) + '">Open</button>';
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,255,255,.05)');
        row.addEventListener('mouseleave', () => row.style.background = '');
        adminConvoList.appendChild(row);
      });
    } catch { adminConvoList.innerHTML = '<p style="color:var(--muted);">Failed to load messages.</p>'; }
  };

  async function openAdminThread(userEmail) {
    activeConvoEmail = userEmail;
    adminThreadUser.textContent = userEmail;
    adminConvoList.style.display  = 'none';
    adminThreadView.style.display = 'block';
    try {
      const all   = await apiFetch('/messages/all');
      const convo = all.find(c => c.userEmail === userEmail) || { messages: [] };
      renderThread(adminThread, convo.messages, 'admin');
    } catch { adminThread.innerHTML = '<p style="color:var(--muted);">Failed to load thread.</p>'; }
  }

  if (adminConvoList) {
    adminConvoList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-convo]'); if (!btn) return;
      openAdminThread(btn.dataset.convo);
    });
  }

  if (adminBackBtn) {
    adminBackBtn.addEventListener('click', () => {
      adminThreadView.style.display = 'none';
      adminConvoList.style.display  = '';
      activeConvoEmail = null;
      refreshAdminMessages();
    });
  }

  if (adminReplyForm) {
    adminReplyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = adminReplyMsg ? adminReplyMsg.value.trim() : '';
      if (!text || !activeConvoEmail) return;
      try {
        await apiFetch('/messages/' + encodeURIComponent(activeConvoEmail) + '/reply', { method: 'POST', body: JSON.stringify({ text }) });
        adminReplyMsg.value = '';
        adminReplyStatus.textContent = '✉️ Reply sent!'; adminReplyStatus.className = 'notice ok';
        setTimeout(() => { adminReplyStatus.textContent = ''; }, 1500);
        openAdminThread(activeConvoEmail);
        if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
      } catch (err) { adminReplyStatus.textContent = err.message; adminReplyStatus.className = 'notice error'; }
    });
  }

  window.refreshContactTab = async function () {
    const email = state.currentUser ? state.currentUser.email : null;
    if (isAdmin()) {
      try { await apiFetch('/notifications/mark-seen', { method: 'PATCH', body: JSON.stringify({ types: ['new_message'] }) }); } catch {}
      refreshAdminMessages();
    } else {
      try { await apiFetch('/notifications/mark-seen', { method: 'PATCH', body: JSON.stringify({ types: ['admin_reply'] }) }); } catch {}
      refreshUserThread();
    }
    if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
  };

})();
