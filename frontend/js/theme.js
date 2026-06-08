/* ============================================================
   theme.js — light / dark mode toggle, persists to localStorage
   ============================================================ */

(function(){
  const prefs  = loadPrefs();
  const body   = document.body;
  const toggle = document.getElementById('themeToggle');

  if(prefs.theme === 'light'){
    body.classList.add('theme-light');
    if(toggle) toggle.checked = true;
  }

  if(toggle){
    toggle.addEventListener('change', () => {
      const on = toggle.checked;
      const p  = loadPrefs();
      if(on){
        body.classList.add('theme-light');
        savePrefs({ ...p, theme: 'light' });
      } else {
        body.classList.remove('theme-light');
        savePrefs({ ...p, theme: 'dark' });
      }
    });
  }
})();
