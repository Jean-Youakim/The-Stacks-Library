/* ============================================================
   auth.js — login, signup, logout  (calls /api/auth/*)
   ============================================================ */

(function () {

  const signupSection = document.getElementById('signupSection');
  const loginSection  = document.getElementById('loginSection');
  const signupForm    = document.getElementById('signupForm');
  const signupEmail   = document.getElementById('signupEmail');
  const signupPass    = document.getElementById('signupPass');
  const signupMsg     = document.getElementById('signupMsg');
  const goSignup      = document.getElementById('goSignup');
  const backLogin     = document.getElementById('backLogin');
  const userLabel     = document.getElementById('userLabel');
  const catalogShell  = document.getElementById('catalogShell');
  const catalog       = document.getElementById('catalog');

  // ── Toggle between login / signup screens ─────────────────
  goSignup.onclick = () => {
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
  };
  backLogin.onclick = () => {
    signupSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  };

  // ── Auto-login from saved session ─────────────────────────
  const savedUser = loadSession();
  if (savedUser && savedUser.token) {
    state.currentUser = savedUser;
    loadCartFromStorage();
    showCatalog(savedUser);
  }

  // ── Signup ────────────────────────────────────────────────
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupMsg.textContent = '';
    const email    = signupEmail.value.trim();
    const password = signupPass.value.trim();
    try {
      const data = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      signupMsg.textContent = data.message;
      signupMsg.className   = 'notice ok';
      setTimeout(() => {
        signupSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        signupMsg.textContent = '';
      }, 900);
    } catch (err) {
      signupMsg.textContent = err.message;
      signupMsg.className   = 'notice error';
    }
  });

  // ── Login ─────────────────────────────────────────────────
  const loginForm = document.getElementById('loginForm');
  const formMsg   = document.getElementById('formMsg');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    formMsg.textContent = '';
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const remember = document.getElementById('remember').checked;

    if (!loginForm.checkValidity()) {
      formMsg.textContent = 'Double-check your email and a 6+ character password.';
      formMsg.className   = 'notice error';
      return;
    }

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const user = { ...data.user, token: data.token };
      state.currentUser = user;
      loadCartFromStorage();
      if (remember) saveSession(user);

      formMsg.textContent = user.role === 'admin' ? 'Admin access granted.' : 'Welcome back. Opening Stacks...';
      formMsg.className   = 'notice ok';
      userLabel.textContent = 'Signed in as ' + user.email;
      [...loginForm.elements].forEach(el => el.disabled = true);
      doLoginEffects();
      setTimeout(() => {
        if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
      }, 900);
    } catch (err) {
      formMsg.textContent = err.message;
      formMsg.className   = 'notice error';
    }
  });

  // ── Show catalog after login ───────────────────────────────
  function showCatalog(user) {
    const wrap = document.querySelector('.wrap');
    if (wrap) wrap.remove();
    userLabel.textContent = 'Signed in as ' + user.email;
    catalogShell.classList.remove('hidden');
    catalog.classList.remove('hidden');
    catalog.classList.add('show');
    document.body.style.overflow = 'auto';
    setTimeout(() => {
      if (typeof applyRoleUI    === 'function') applyRoleUI();
      if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
    }, 0);
  }
  window.showCatalog = showCatalog;

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    saveSession(null);
    state.currentUser = null;
    sessionStorage.removeItem('stacks_cart');
    location.reload();
  });

})();
