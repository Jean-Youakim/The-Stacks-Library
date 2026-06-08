/* ============================================================
   catalog.js — book grid, filters, sort, detail panel,
                add/edit/delete book form (all via /api/books)
   ============================================================ */

(function () {
  const grid          = document.getElementById('grid');
  const searchEl      = document.getElementById('search');
  const clearBtn      = document.querySelector('.clear');
  const empty         = document.getElementById('empty');
  const genreSel      = document.getElementById('filterGenre');
  const yearSel       = document.getElementById('filterYear');
  const availSel      = document.getElementById('filterAvailability');
  const favSel        = document.getElementById('filterFavorites');
  const sortSel       = document.getElementById('sortBy');
  const statsList     = document.getElementById('statsList');
  const favoritesList = document.getElementById('favoritesList');
  const favoritesHint = document.getElementById('favoritesHint');

  const detailPanel   = document.getElementById('detailPanel');
  const detailClose   = document.getElementById('detailClose');
  const detailCover   = document.getElementById('detailCover');
  const detailTitle   = document.getElementById('detailTitle');
  const detailAuthor  = document.getElementById('detailAuthor');
  const detailMeta    = document.getElementById('detailMeta');
  const detailDesc    = document.getElementById('detailDesc');
  const detailPrice   = document.getElementById('detailPrice');
  const detailFav     = document.getElementById('detailFav');
  const detailAddCart = document.getElementById('detailAddCart');

  // ── Bootstrap: load books from API ──────────────────────────
  async function bootstrap() {
    try {
      const books = await apiFetch('/books');
      state.books = books.map(normalise);
      updateGenreFilterOptions();
      render();
    } catch (err) {
      console.error('Failed to load books:', err);
      grid.innerHTML = '<p style="color:var(--muted); padding:20px;">Failed to load books. Is the server running?</p>';
    }
  }
  bootstrap();

  // Normalise: make sure every book has a stable .id string
  function normalise(b) {
    return { ...b, id: b.id || b._id?.toString() || b._id };
  }

  // ── Helpers ──────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }
  function isAdmin() { return state.currentUser && state.currentUser.role === 'admin'; }
  function isCoverImage(cover) { return typeof cover === 'string' && /^(data:image\/|https?:\/\/|blob:)/i.test(cover); }

  function stockBadge(b) {
    const stock = typeof b.stock === 'number' ? b.stock : 0;
    if (stock === 0)   return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;background:#3a0a0a;color:#ff8080;">Out of Stock</span>';
    if (stock <= 3)    return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;font-weight:600;background:#3a2a00;color:#ffd080;">Only ' + stock + ' left</span>';
    return '<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;background:rgba(255,255,255,.07);color:var(--muted);">' + stock + ' in stock</span>';
  }

  // ── Role UI ──────────────────────────────────────────────────
  function applyRoleUI() {
    const admin = isAdmin();
    document.querySelectorAll('.btn-edit, .btn-delete').forEach(btn => { btn.style.display = admin ? '' : 'none'; });
    const bookTab   = document.querySelector('.settings-nav button[data-page="books"]');
    if (bookTab)    bookTab.style.display = admin ? '' : 'none';
    const addJump   = document.querySelector('[data-jump="books"]');
    if (addJump)    addJump.style.display = admin ? '' : 'none';
    const ordersTab = document.querySelector('.settings-nav button[data-page="orders"]');
    if (ordersTab)  ordersTab.style.display = admin ? '' : 'none';
    const myOrdersTab = document.getElementById('myOrdersNavBtn');
    if (myOrdersTab) myOrdersTab.style.display = admin ? 'none' : '';
    if (detailAddCart) detailAddCart.style.display = admin ? 'none' : '';
    const cartButton = document.getElementById('cartButton');
    if (cartButton)  cartButton.style.display = admin ? 'none' : '';
    const contactLabel = document.getElementById('contactNavLabel');
    if (contactLabel) contactLabel.textContent = admin ? 'Messages' : 'Support';
    const userView  = document.getElementById('userContactView');
    const adminView = document.getElementById('adminMessagesView');
    if (userView)  userView.style.display  = admin ? 'none' : '';
    if (adminView) adminView.style.display = admin ? ''     : 'none';
  }
  window.applyRoleUI   = applyRoleUI;
  window.renderCatalog = render;
  window.syncQtyDisplays = syncQtyDisplays;

  function updateGenreFilterOptions() {
    const genres = Array.from(new Set(state.books.map(b => b.genre))).sort();
    genreSel.innerHTML = '<option value="">Genre: any</option>' + genres.map(g => `<option value="${g}">${g}</option>`).join('');
  }

  // ── Filter + Sort ────────────────────────────────────────────
  function applyFiltersAndSort() {
    const nowYear = new Date().getFullYear();
    let arr = state.books.slice();
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      arr = arr.filter(b => (b.title + ' ' + b.author + ' ' + b.genre + ' ' + (b.tags || []).join(' ')).toLowerCase().includes(q));
    }
    if (state.filters.genre)        arr = arr.filter(b => (b.genre || '').toLowerCase() === state.filters.genre.toLowerCase());
    if (state.filters.yearBucket === 'new') arr = arr.filter(b => nowYear - (b.year || 0) <= 5);
    else if (state.filters.yearBucket === 'old') arr = arr.filter(b => nowYear - (b.year || 0) > 5);
    if (state.filters.availability) { const want = state.filters.availability === 'available'; arr = arr.filter(b => !!b.available === want); }
    if (state.filters.favoritesOnly) arr = arr.filter(b => !!b.favorite);
    const s = state.filters.sort;
    if (s === 'title')    arr.sort((a, b) => a.title.localeCompare(b.title));
    else if (s === 'author')   arr.sort((a, b) => a.author.localeCompare(b.author));
    else if (s === 'year-new') arr.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (s === 'year-old') arr.sort((a, b) => (a.year || 0) - (b.year || 0));
    else if (s === 'rating')   arr.sort((a, b) => (b._ratingAvg || 0) - (a._ratingAvg || 0));
    return arr;
  }

  // ── Render ───────────────────────────────────────────────────
  function render() {
    const books = applyFiltersAndSort();
    grid.innerHTML = '';
    empty.hidden = books.length > 0;
    const userEmail = state.currentUser ? state.currentUser.email : null;

    books.forEach(b => {
      const stock      = typeof b.stock === 'number' ? b.stock : 0;
      const outOfStock = stock === 0;
      const art        = document.createElement('article');
      art.className    = 'book';
      art.setAttribute('role', 'listitem');
      art.dataset.id   = b.id;

      const coverIsImage = isCoverImage(b.cover);
      const coverStyle   = coverIsImage
        ? `background-image:url('${b.cover}'); background-size:cover; background-position:center;`
        : `--cover:${b.cover || 'linear-gradient(135deg,#5b72f2,#9e6bff)'}`;

      const avgRating   = b._ratingAvg  || 0;
      const userRating  = b._userRating || 0;
      const ratingCount = b._ratingCount || 0;

      art.innerHTML = `
        <div class="book-cover" style="${coverStyle}"></div>
        <h3>${escapeHtml(b.title)}</h3>
        <p>${escapeHtml(b.author)} • ${b.year || '—'} • ${escapeHtml(b.genre || '')}</p>
        <div class="tags" style="margin-bottom:4px;">
          ${(b.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div style="margin-bottom:6px;">${stockBadge(b)}</div>
        <div class="book-actions">
          <div class="rating" aria-label="Rate this book">
            ${[1, 2, 3, 4, 5].map(i => {
              const filledUser = i <= userRating;
              const filledAvg  = i <= Math.round(avgRating);
              const color = filledUser ? '#ffd76b' : (filledAvg ? 'rgba(255,215,107,.4)' : '');
              return `<span ${!isAdmin() ? `data-star="${i}"` : ''} style="${color ? 'color:' + color + ';' : ''}" title="${isAdmin() ? '' : 'Rate ' + i + ' star' + (i > 1 ? 's' : '')}">★</span>`;
            }).join('')}
          </div>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
            <button type="button" class="btn btn-inline btn-secondary btn-edit" data-id="${b.id}">Edit</button>
            <button type="button" class="btn btn-inline btn-secondary btn-delete" data-id="${b.id}">Delete</button>
            <span class="favorite-toggle ${b.favorite ? 'fav' : ''}" title="Toggle favorite" data-id="${b.id}">${b.favorite ? '💖' : '🤍'}</span>
          </div>
        </div>
        ${!isAdmin() ? `
        <div class="cart-quick" style="margin-top:8px; display:flex; align-items:center; gap:8px;">
          <div style="display:flex; align-items:center; gap:4px; border:1px solid rgba(170,190,230,.3); border-radius:999px; overflow:hidden;">
            <button type="button" class="btn-ghost qty-dec" data-id="${b.id}" style="padding:3px 10px; border-radius:0; border:0;">−</button>
            <span class="qty-display" data-id="${b.id}" style="min-width:20px; text-align:center; font-size:.85rem;">0</span>
            <button type="button" class="btn-ghost qty-inc" data-id="${b.id}" style="padding:3px 10px; border-radius:0; border:0;"${outOfStock ? ' disabled' : ''}>+</button>
          </div>
          <button type="button" class="btn btn-inline btn-add-cart" data-id="${b.id}"${outOfStock ? ' disabled style="opacity:.5;cursor:default;"' : ''}>
            ${outOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>` : ''}
        <p class="meta-small" style="margin-top:6px;">
          ★ ${avgRating.toFixed(1)} (${ratingCount} rating${ratingCount !== 1 ? 's' : ''})
          ${!isAdmin() && userRating ? '• Your rating: ' + userRating : ''}
          • Favorite: ${b.favorite ? 'yes' : 'no'}
        </p>
      `;
      grid.appendChild(art);
    });

    syncQtyDisplays();
    updateStats();
    renderFavorites();
    if (typeof updateCartUI === 'function') updateCartUI();
    applyRoleUI();
  }

  function syncQtyDisplays() {
    document.querySelectorAll('.qty-display').forEach(el => {
      const item = state.cart.find(i => i.id === el.dataset.id);
      el.textContent = item ? item.qty : 0;
    });
  }

  // ── Stats ────────────────────────────────────────────────────
  function updateStats() {
    const total = state.books.length;
    const favs  = state.books.filter(b => b.favorite).length;
    const byGenre = {};
    state.books.forEach(b => { const g = b.genre || 'Unknown'; byGenre[g] = (byGenre[g] || 0) + 1; });
    statsList.innerHTML = '';
    const addLi = txt => { const li = document.createElement('li'); li.textContent = txt; statsList.appendChild(li); };
    addLi(`Total books: ${total}`);
    addLi(`Favorites: ${favs}`);
    Object.keys(byGenre).sort().forEach(g => addLi(`${g}: ${byGenre[g]} book(s)`));
  }

  function renderFavorites() {
    const favs = state.books.filter(b => b.favorite);
    favoritesList.innerHTML = '';
    if (favs.length === 0) { favoritesList.innerHTML = '<li>No favorites yet. Tap 🤍 on a book to save it here.</li>'; favoritesHint.textContent = ''; return; }
    favs.forEach(b => { const li = document.createElement('li'); li.textContent = `${b.title} — ${b.author} (${b.year || '—'})`; favoritesList.appendChild(li); });
    favoritesHint.textContent = `You have ${favs.length} favorite book${favs.length > 1 ? 's' : ''}.`;
  }

  // ── Filter listeners ─────────────────────────────────────────
  if (searchEl) {
    searchEl.addEventListener('input', () => { state.filters.search = searchEl.value.trim(); render(); clearBtn.hidden = !searchEl.value; });
  }
  if (clearBtn) { clearBtn.addEventListener('click', () => { searchEl.value = ''; state.filters.search = ''; render(); clearBtn.hidden = true; searchEl.focus(); }); }
  genreSel.addEventListener('change', () => { state.filters.genre        = genreSel.value; render(); });
  yearSel.addEventListener('change',  () => { state.filters.yearBucket   = yearSel.value;  render(); });
  availSel.addEventListener('change', () => { state.filters.availability = availSel.value; render(); });
  favSel.addEventListener('change',   () => { state.filters.favoritesOnly = favSel.value === 'favorites'; render(); });
  sortSel.addEventListener('change',  () => { state.filters.sort         = sortSel.value;  render(); });

  // ── Grid delegated events ────────────────────────────────────
  grid.addEventListener('click', async (e) => {
    const target  = e.target;
    const article = target.closest('.book');
    if (!article) return;
    const id   = article.dataset.id;
    const book = state.books.find(b => b.id === id);
    if (!book) return;

    // Qty −
    if (target.matches('.qty-dec')) {
      const item = state.cart.find(i => i.id === id);
      if (item && item.qty > 0) { item.qty -= 1; if (item.qty === 0) state.cart.splice(state.cart.indexOf(item), 1); saveCart(); syncQtyDisplays(); if (typeof updateCartUI === 'function') updateCartUI(); }
      return;
    }
    // Qty +
    if (target.matches('.qty-inc')) {
      const stock = typeof book.stock === 'number' ? book.stock : 0;
      const inCart = state.cart.find(i => i.id === id);
      const currentQty = inCart ? inCart.qty : 0;
      if (currentQty >= stock) { const d = article.querySelector('.qty-display[data-id="' + id + '"]'); if (d) { d.style.color = '#ff8080'; setTimeout(() => d.style.color = '', 800); } return; }
      if (inCart) inCart.qty += 1; else state.cart.push({ id, qty: 1 });
      saveCart(); syncQtyDisplays(); if (typeof updateCartUI === 'function') updateCartUI();
      return;
    }
    // Add to Cart
    if (target.matches('.btn-add-cart')) {
      const inCart = state.cart.find(i => i.id === id);
      if (!inCart || inCart.qty === 0) { if ((book.stock || 0) === 0) return; state.cart.push({ id, qty: 1 }); saveCart(); syncQtyDisplays(); }
      if (typeof updateCartUI === 'function') updateCartUI();
      openCart(); return;
    }
    // Favorite toggle
    if (target.matches('.favorite-toggle')) {
      try {
        const data = await apiFetch('/books/' + id + '/favorite', { method: 'PATCH' });
        book.favorite = data.favorite;
        render();
      } catch (err) { console.error('Favorite error:', err); }
      return;
    }
    // Edit
    if (target.matches('.btn-edit')) { openSettingsAndJump('books'); fillFormForEdit(book); return; }
    // Delete
    if (target.matches('.btn-delete')) {
      if (confirm(`Remove "${book.title}" from the catalog?`)) {
        try {
          await apiFetch('/books/' + id, { method: 'DELETE' });
          state.books.splice(state.books.indexOf(book), 1);
          updateGenreFilterOptions(); render();
        } catch (err) { alert('Delete failed: ' + err.message); }
      }
      return;
    }
    // Star rating
    if (target.dataset.star && !isAdmin()) {
      const stars = Number(target.dataset.star);
      try {
        const data = await apiFetch('/books/' + id + '/rate', { method: 'POST', body: JSON.stringify({ stars }) });
        book._ratingAvg   = data.average;
        book._ratingCount = data.count;
        book._userRating  = data.userRating;
        render();
      } catch (err) { console.error('Rating error:', err); }
      return;
    }
    // Click card → detail
    if (!target.closest('.book-actions') && !target.closest('.cart-quick') && !target.closest('.tags')) openDetail(book);
  });

  // ── Detail panel ─────────────────────────────────────────────
  function openDetail(book) {
    state.selectedBookId = book.id;
    const isImg = isCoverImage(book.cover);
    if (isImg) { detailCover.style.background = ''; detailCover.style.backgroundImage = `url('${book.cover}')`; detailCover.style.backgroundSize = 'cover'; detailCover.style.backgroundPosition = 'center'; }
    else        { detailCover.style.background = book.cover || 'linear-gradient(135deg,#5b72f2,#9e6bff)'; detailCover.style.backgroundImage = ''; }
    detailTitle.textContent  = book.title || '';
    detailAuthor.textContent = book.author ? `by ${book.author}` : '';
    const stock = typeof book.stock === 'number' ? book.stock : 0;
    detailMeta.textContent   = `${book.genre || 'Unknown genre'} • ${book.year || '—'} • ${stock > 0 ? stock + ' in stock' : 'Out of stock'}`;
    detailDesc.textContent   = book.description || 'No description provided yet.';
    detailPrice.textContent  = `Price: $${typeof book.price === 'number' ? book.price.toFixed(2) : '0.00'}`;
    detailFav.textContent    = book.favorite ? '💖 Favorited' : '♡ Favorite';

    const existing = document.getElementById('detailQtyRow');
    if (existing) existing.remove();
    if (!isAdmin() && stock > 0) {
      const row = document.createElement('div');
      row.id = 'detailQtyRow';
      row.style.cssText = 'display:flex; align-items:center; gap:10px; margin-top:6px;';
      const inCart  = state.cart.find(i => i.id === book.id);
      const current = inCart ? inCart.qty : 1;
      row.innerHTML = '<span style="font-size:.85rem; color:var(--muted);">Qty:</span>' +
        '<div style="display:flex; align-items:center; gap:4px; border:1px solid rgba(170,190,230,.3); border-radius:999px; overflow:hidden;">' +
          '<button type="button" id="detailQtyDec" class="btn-ghost" style="padding:3px 10px; border-radius:0; border:0;">−</button>' +
          '<span id="detailQtyVal" style="min-width:24px; text-align:center; font-size:.9rem;">' + current + '</span>' +
          '<button type="button" id="detailQtyInc" class="btn-ghost" style="padding:3px 10px; border-radius:0; border:0;">+</button>' +
        '</div>' +
        '<span style="font-size:.75rem; color:var(--muted);">(max ' + stock + ')</span>';
      detailPrice.insertAdjacentElement('afterend', row);
      document.getElementById('detailQtyDec').onclick = () => { const v = parseInt(document.getElementById('detailQtyVal').textContent, 10); if (v > 1) document.getElementById('detailQtyVal').textContent = v - 1; };
      document.getElementById('detailQtyInc').onclick = () => { const v = parseInt(document.getElementById('detailQtyVal').textContent, 10); if (v < stock) document.getElementById('detailQtyVal').textContent = v + 1; };
    }
    detailPanel.classList.add('open');
    detailPanel.setAttribute('aria-hidden', 'false');
  }

  function closeDetail() {
    detailPanel.classList.remove('open');
    detailPanel.setAttribute('aria-hidden', 'true');
    state.selectedBookId = null;
    const row = document.getElementById('detailQtyRow'); if (row) row.remove();
  }
  detailClose.addEventListener('click', closeDetail);
  detailPanel.addEventListener('click', (e) => { if (e.target === detailPanel) closeDetail(); });

  detailFav.addEventListener('click', async () => {
    if (!state.selectedBookId) return;
    const book = state.books.find(b => b.id === state.selectedBookId); if (!book) return;
    try { const data = await apiFetch('/books/' + book.id + '/favorite', { method: 'PATCH' }); book.favorite = data.favorite; render(); openDetail(book); } catch {}
  });

  detailAddCart.addEventListener('click', () => {
    if (!state.selectedBookId) return;
    const book  = state.books.find(b => b.id === state.selectedBookId); if (!book) return;
    const stock = typeof book.stock === 'number' ? book.stock : 0; if (stock === 0) return;
    const qtyEl = document.getElementById('detailQtyVal');
    const qty   = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;
    const item  = state.cart.find(i => i.id === book.id);
    const alreadyInCart = item ? item.qty : 0;
    const canAdd = Math.min(qty, stock - alreadyInCart);
    if (canAdd <= 0) { document.getElementById('cartMsg').textContent = `Only ${stock} in stock and you already have ${alreadyInCart} in cart.`; document.getElementById('cartMsg').className = 'notice error'; openCart(); return; }
    if (item) item.qty += canAdd; else state.cart.push({ id: book.id, qty: canAdd });
    saveCart();
    if (typeof updateCartUI === 'function') updateCartUI();
    document.getElementById('cartMsg').textContent = '';
    openCart();
  });

  // ── Cover image upload ───────────────────────────────────────
  const coverImg         = document.getElementById('bookCoverImg');
  const coverPreview     = document.getElementById('coverPreview');
  const coverPreviewWrap = document.getElementById('coverPreviewWrap');
  const coverPrompt      = document.getElementById('coverUploadPrompt');
  const clearCoverBtn    = document.getElementById('clearCoverImg');
  const coverUploadArea  = document.getElementById('coverUploadArea');
  const bookFormMsg      = document.getElementById('bookFormMsg');
  let pendingCoverBase64 = null;

  function showCoverPreview(src) { coverPreview.src = src; coverPreviewWrap.style.display = 'block'; coverPrompt.style.display = 'none'; clearCoverBtn.style.display = ''; coverUploadArea.style.borderColor = 'rgba(var(--brand),.5)'; }
  function clearCoverPreview() { coverPreview.src = ''; coverPreviewWrap.style.display = 'none'; coverPrompt.style.display = ''; clearCoverBtn.style.display = 'none'; coverUploadArea.style.borderColor = ''; if (coverImg) coverImg.value = ''; pendingCoverBase64 = null; }

  if (coverImg) {
    coverImg.addEventListener('change', () => {
      const file = coverImg.files[0]; if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { bookFormMsg.textContent = 'Please upload a JPG, PNG, or WebP image.'; bookFormMsg.className = 'notice error'; coverImg.value = ''; return; }
      if (file.size > 2 * 1024 * 1024) { bookFormMsg.textContent = 'Image must be under 2 MB.'; bookFormMsg.className = 'notice error'; coverImg.value = ''; return; }
      const reader = new FileReader();
      reader.onload = (ev) => { pendingCoverBase64 = ev.target.result; showCoverPreview(pendingCoverBase64); bookFormMsg.textContent = ''; };
      reader.readAsDataURL(file);
    });
  }
  if (clearCoverBtn) { clearCoverBtn.addEventListener('click', (e) => { e.stopPropagation(); clearCoverPreview(); }); }

  // ── Book form ────────────────────────────────────────────────
  const bookForm         = document.getElementById('bookForm');
  const resetBookFormBtn = document.getElementById('resetBookForm');

  function fillFormForEdit(book) {
    document.getElementById('bookId').value        = book.id;
    document.getElementById('bookTitle').value     = book.title  || '';
    document.getElementById('bookAuthor').value    = book.author || '';
    document.getElementById('bookYear').value      = book.year   || '';
    document.getElementById('bookGenre').value     = book.genre  || '';
    document.getElementById('bookPrice').value     = typeof book.price === 'number' ? book.price : '';
    document.getElementById('bookStock').value     = typeof book.stock === 'number' ? book.stock : 10;
    document.getElementById('bookDesc').value      = book.description || '';
    document.getElementById('bookTags').value      = (book.tags || []).join(', ');
    document.getElementById('bookAvailable').checked = !!book.available;
    const cover = book.cover || '';
    if (isCoverImage(cover)) { pendingCoverBase64 = cover; showCoverPreview(cover); document.getElementById('bookColor').value = ''; }
    else { clearCoverPreview(); document.getElementById('bookColor').value = cover; }
    bookFormMsg.textContent = 'Editing existing book. Make your changes then click Save.';
    bookFormMsg.className   = 'notice';
  }

  function clearBookForm() { bookForm.reset(); document.getElementById('bookId').value = ''; bookFormMsg.textContent = ''; clearCoverPreview(); }
  resetBookFormBtn.addEventListener('click', clearBookForm);

  bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin()) { bookFormMsg.textContent = 'Only admins can add or edit books.'; bookFormMsg.className = 'notice error'; return; }
    const id      = document.getElementById('bookId').value;
    const payload = {
      title:     document.getElementById('bookTitle').value.trim(),
      author:    document.getElementById('bookAuthor').value.trim(),
      year:      parseInt(document.getElementById('bookYear').value, 10),
      genre:     document.getElementById('bookGenre').value.trim(),
      price:     parseFloat(document.getElementById('bookPrice').value),
      stock:     parseInt(document.getElementById('bookStock').value, 10),
      description: document.getElementById('bookDesc').value.trim(),
      tags:      document.getElementById('bookTags').value.trim().split(',').map(t => t.trim()).filter(Boolean),
      cover:     pendingCoverBase64 || document.getElementById('bookColor').value.trim(),
      available: document.getElementById('bookAvailable').checked
    };
    if (!payload.title || !payload.author || !payload.genre || isNaN(payload.year) || isNaN(payload.price) || isNaN(payload.stock)) {
      bookFormMsg.textContent = 'Please fill in title, author, year, genre, price, and stock.';
      bookFormMsg.className = 'notice error'; return;
    }
    try {
      let saved;
      if (id) {
        saved = await apiFetch('/books/' + id, { method: 'PUT', body: JSON.stringify(payload) });
        const idx = state.books.findIndex(b => b.id === id);
        if (idx >= 0) state.books[idx] = normalise(saved);
        bookFormMsg.textContent = 'Book updated.';
      } else {
        saved = await apiFetch('/books', { method: 'POST', body: JSON.stringify(payload) });
        state.books.push(normalise(saved));
        bookFormMsg.textContent = 'Book added to the catalog.';
      }
      bookFormMsg.className = 'notice ok';
      updateGenreFilterOptions(); render(); clearCoverPreview();
      setTimeout(() => { bookFormMsg.textContent = ''; }, 1500);
    } catch (err) {
      bookFormMsg.textContent = 'Save failed: ' + err.message;
      bookFormMsg.className = 'notice error';
    }
  });

  // ── Print ────────────────────────────────────────────────────
  document.getElementById('printList').addEventListener('click', () => {
    const lines = state.books.map(b => `${b.title} — ${b.author} (${b.year}) — Stock: ${b.stock}`).join('\n');
    const w = window.open('', '_blank');
    w.document.write(`<pre style="font-family:monospace">${lines}</pre>`);
    w.print();
  });

})();
