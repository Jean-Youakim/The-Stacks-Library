/* ============================================================
   effects.js — parallax glow, animated glow, sparkles,
                burst particles, login transition
   ============================================================ */

// ── Welcome Splash Screen ────────────────────────────────────
(function(){
  const splash      = document.getElementById('splashScreen');
  const enterBtn    = document.getElementById('splashEnter');
  const container   = document.getElementById('splashParticles');

  if(!splash) return;

  // Skip splash if user is already logged in (auto-login path)
  const saved = localStorage.getItem('enchanted_user');
  if(saved){
    splash.style.display = 'none';
    return;
  }

  // Generate floating sparkles
  for(let i = 0; i < 40; i++){
    const s = document.createElement('span');
    s.className = 'splash-spark';
    const size = Math.random() * 2.5 + 1;
    s.style.cssText = [
      'width:' + size + 'px',
      'height:' + size + 'px',
      'left:' + (Math.random() * 100) + '%',
      'top:' + (Math.random() * 100) + '%',
      'animation-duration:' + (8 + Math.random() * 12) + 's',
      'animation-delay:' + (Math.random() * 8) + 's',
      'opacity:0'
    ].join(';');
    container.appendChild(s);
  }

  function dismissSplash(){
    splash.classList.add('splash-exit');
    splash.addEventListener('transitionend', () => {
      splash.style.display = 'none';
    }, { once: true });
  }

  enterBtn.addEventListener('click', dismissSplash);

  // Also allow pressing Enter or Space
  document.addEventListener('keydown', (e) => {
    if((e.key === 'Enter' || e.key === ' ') && !splash.classList.contains('splash-exit')){
      dismissSplash();
    }
  }, { once: true });
})();

// Shared DOM refs used by auth.js too
const card        = document.querySelector('.card');
const fx          = document.getElementById('fx');
const wrap        = document.getElementById('loginSection');
const welcome     = document.getElementById('welcome');
const catalogShell = document.getElementById('catalogShell');
const catalog     = document.getElementById('catalog');
const userLabel   = document.getElementById('userLabel');

// Parallax glow follows mouse
(function(){
  const glow   = document.querySelector('.glow');
  const stage  = document.querySelector('.stage');
  const strength = 12;
  function handleMove(e){
    const r  = stage.getBoundingClientRect();
    const x  = (e.clientX - r.left) / r.width;
    const y  = (e.clientY - r.top)  / r.height;
    const dx = (x - .5) * strength;
    const dy = (y - .5) * strength;
    glow.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  if(!media.matches){ stage.addEventListener('mousemove', handleMove); }
})();

// Animated glow pulse
(function(){
  const glow = document.querySelector('.glow');
  function animate(){
    const t      = performance.now() / 1000;
    const a      = .5 + .5 * Math.sin(t * 2.2);
    const b      = .5 + .5 * Math.sin(t * 1.2 + 1.7);
    const base   = .9 + a * .15;
    const accent = .6 + b * .35;
    glow.style.boxShadow = `
      0 0 6px 3px rgba(var(--glow), ${Math.min(1, base)}),
      0 0 22px 8px rgba(var(--glow), ${0.85 * base}),
      0 0 64px 18px rgba(var(--glow-accent), ${0.8 * accent}),
      0 0 140px 40px rgba(var(--glow-accent), ${0.55 * accent}),
      0 0 240px 70px rgba(var(--glow-accent), ${0.32 * accent})
    `;
    requestAnimationFrame(animate);
  }
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  if(!media.matches){ requestAnimationFrame(animate); }
})();

// Floating sparkle particles
(function(){
  const container = document.querySelector('.particles');
  const count = 36;
  for(let i = 0; i < count; i++){
    const s = document.createElement('span');
    s.className = 'spark';
    const size = Math.random() * 2 + 1;
    s.style.width  = s.style.height = size + 'px';
    s.style.left   = Math.random() * 100 + 'vw';
    s.style.top    = (Math.random() * 100) + 'vh';
    s.style.animationDuration = (18 + Math.random() * 16) + 's';
    s.style.animationDelay    = (-Math.random() * 34) + 's';
    s.style.opacity = (0.5 + Math.random() * 0.5).toFixed(2);
    container.appendChild(s);
  }
})();

// Burst particle explosion on login
function burst(x, y, count, rect){
  const particles = [];
  for(let i = 0; i < count; i++){
    const p   = document.createElement('i');
    p.className = 'explode-spark';
    const hue = 250 + Math.random() * 40;
    p.style.background  = `hsl(${hue} 100% ${70 + Math.random() * 20}%)`;
    p.style.boxShadow   = `0 0 10px 2px hsla(${hue} 100% 70% / .7), 0 0 18px 6px hsla(${hue - 80} 90% 70% / .5)`;
    const jitterX  = (Math.random() - .5) * 0.7 * rect.width;
    const jitterY  = (Math.random() - .5) * 0.4 * rect.height;
    const startX   = x + jitterX;
    const startY   = y + jitterY;
    p.style.transform  = `translate(${startX}px, ${startY}px)`;
    fx.appendChild(p);

    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 360;
    const vx    = Math.cos(angle) * speed;
    const vy    = Math.sin(angle) * speed - (60 + Math.random() * 60);
    const life  = 800 + Math.random() * 700;
    const size  = 2 + Math.random() * 3;
    p.style.width = p.style.height = size + 'px';
    particles.push({ el:p, x:startX, y:startY, vx, vy, life, age:0 });
  }

  const start = performance.now();
  const g    = 320;
  const drag = 0.92;

  function frame(now){
    const dt = Math.min(32, now - (frame.last || now)) / 1000;
    frame.last = now;
    let alive = 0;
    for(const p of particles){
      p.age = now - start;
      if(p.age > p.life){ p.el.style.opacity = '0'; continue; }
      alive++;
      p.vx *= drag;
      p.vy  = p.vy * drag + g * dt;
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      const f = 1 - p.age / p.life;
      p.el.style.opacity   = String(Math.max(0, f));
      p.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
    if(alive > 0) requestAnimationFrame(frame);
    else fx.innerHTML = '';
  }
  requestAnimationFrame(frame);
}

// Reveal catalog after login
function revealCatalogInitial(){
  window.scrollTo(0, 0);
  catalogShell.classList.remove('hidden');
  catalog.classList.remove('hidden');
  catalog.classList.add('show');
  document.body.style.overflow = 'auto';
}

// Full login transition: burst + vanish + welcome text
function doLoginEffects(){
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const rect  = card.getBoundingClientRect();
  if(!media.matches){
    card.classList.add('vanish');
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 160, rect);
  }
  revealCatalogInitial();
  // Apply role-based UI now that state.currentUser is set
  if(typeof applyRoleUI === 'function') applyRoleUI();
  setTimeout(()=>{
    if(card)  card.remove();
    if(wrap)  wrap.remove();
    welcome.classList.add('show');
    setTimeout(()=>{ welcome.style.display = 'none'; }, 1400);
  }, media.matches ? 0 : 850);
}
