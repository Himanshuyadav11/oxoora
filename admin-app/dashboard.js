const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const state = {
  catalog: null,
  leads: [],
  editingId: null,
  inactivityTimer: null,
  galleryItems: [createEmptyGalleryItem()]
};

const elements = {
  openStoreLink: document.getElementById('openStoreLink'),
  exportLeadsLink: document.getElementById('exportLeadsLink'),
  logoutButton: document.getElementById('logoutButton'),
  productForm: document.getElementById('productForm'),
  formTitle: document.getElementById('formTitle'),
  formStatus: document.getElementById('formStatus'),
  resetButton: document.getElementById('resetButton'),
  productList: document.getElementById('productList'),
  categoryOptions: document.getElementById('categoryOptions'),
  saveButton: document.getElementById('saveButton'),
  editingId: document.getElementById('editingId'),
  productId: document.getElementById('productId'),
  productName: document.getElementById('productName'),
  productPrice: document.getElementById('productPrice'),
  productComparePrice: document.getElementById('productComparePrice'),
  productColorName: document.getElementById('productColorName'),
  productDeliveryText: document.getElementById('productDeliveryText'),
  productDescription: document.getElementById('productDescription'),
  productDetails: document.getElementById('productDetails'),
  productWarranty: document.getElementById('productWarranty'),
  productMoreInformation: document.getElementById('productMoreInformation'),
  productLink: document.getElementById('productLink'),
  productImage: document.getElementById('productImage'),
  productFile: document.getElementById('productFile'),
  imagePreview: document.getElementById('imagePreview'),
  addGalleryButton: document.getElementById('addGalleryButton'),
  galleryList: document.getElementById('galleryList'),
  showOnHomePage: document.getElementById('showOnHomePage'),
  homeHeadline: document.getElementById('homeHeadline'),
  homeCopy: document.getElementById('homeCopy'),
  homeMediaType: document.getElementById('homeMediaType'),
  homeMediaPath: document.getElementById('homeMediaPath'),
  homeMediaPoster: document.getElementById('homeMediaPoster'),
  homeMediaFile: document.getElementById('homeMediaFile'),
  homePosterFile: document.getElementById('homePosterFile'),
  homeMediaPreview: document.getElementById('homeMediaPreview'),
  sessionStatus: document.getElementById('sessionStatus'),
  leadList: document.getElementById('leadList'),
  statProducts: document.getElementById('statProducts'),
  statCategories: document.getElementById('statCategories'),
  statGalleryImages: document.getElementById('statGalleryImages'),
  statLeads: document.getElementById('statLeads'),
  statHomeStrip: document.getElementById('statHomeStrip')
};

function createEmptyGalleryItem() {
  return {
    src: '',
    label: '',
    alt: '',
    colorName: ''
  };
}

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#b33a3a' : '#8f6734';
}

function clearStatus(element) {
  setStatus(element, '');
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveMediaUrl(path) {
  const value = String(path || '').trim();

  if (!value) {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value;
  }

  if (value.startsWith('assets/')) {
    return `/${value}`;
  }

  return `/${value.replace(/^\/+/, '')}`;
}

function appendCacheBust(url) {
  if (!url) {
    return '';
  }

  return `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

function formatCount(value) {
  return String(Number(value || 0)).padStart(2, '0');
}

function updateMainPreview(path) {
  if (!path) {
    elements.imagePreview.removeAttribute('src');
    renderHomeMediaPreview();
    return;
  }

  elements.imagePreview.src = appendCacheBust(resolveMediaUrl(path));
  renderHomeMediaPreview();
}

function renderHomeMediaPreview() {
  const path = elements.homeMediaPath.value.trim() || elements.productImage.value.trim();
  const type = elements.homeMediaType.value === 'video' ? 'video' : 'image';
  const poster = elements.homeMediaPoster.value.trim() || elements.productImage.value.trim();
  const headline = elements.homeHeadline.value.trim() || elements.productName.value.trim() || 'Card headline';
  const label = elements.homeCopy.value.trim() || 'Media strip';

  if (!path) {
    elements.homeMediaPreview.innerHTML = `
      <div class="home-card-preview__empty">Add an image or video to preview the media strip card.</div>
    `;
    return;
  }

  const mediaUrl = appendCacheBust(resolveMediaUrl(path));
  const posterUrl = appendCacheBust(resolveMediaUrl(poster));

  elements.homeMediaPreview.innerHTML = `
    <div class="home-strip-preview">
      <div class="home-strip-preview__visual">
        ${
          type === 'video'
            ? `<video src="${escapeHtml(mediaUrl)}" poster="${escapeHtml(posterUrl)}" autoplay muted loop playsinline></video>`
            : `<img src="${escapeHtml(mediaUrl)}" alt="${escapeHtml(headline)}">`
        }
      </div>
      <div class="home-strip-preview__overlay">
        <p>${escapeHtml(label)}</p>
        <h4>${escapeHtml(headline)}</h4>
      </div>
    </div>
  `;
}

function renderSummaryStats() {
  const products = state.catalog?.products || [];
  const categories = state.catalog?.categories || [];
  const galleryImages = products.reduce((total, product) => total + (product.gallery || []).length, 0);
  const homeStripCards = products.filter((product) => product.showOnHomePage).length;

  elements.statProducts.textContent = formatCount(products.length);
  elements.statCategories.textContent = formatCount(categories.length);
  elements.statGalleryImages.textContent = formatCount(galleryImages);
  elements.statLeads.textContent = formatCount(state.leads.length);
  elements.statHomeStrip.textContent = formatCount(homeStripCards);
}

function resetForm() {
  state.editingId = null;
  state.galleryItems = [createEmptyGalleryItem()];
  elements.productForm.reset();
  elements.editingId.value = '';
  elements.formTitle.textContent = 'Add product';
  elements.saveButton.textContent = 'Save Product';
  renderCategoryOptions();
  renderGalleryList();
  updateMainPreview('');
  renderHomeMediaPreview();
  clearStatus(elements.formStatus);
}

function renderCategoryOptions(selectedCategories = []) {
  if (!state.catalog) {
    return;
  }

  elements.categoryOptions.innerHTML = state.catalog.categories
    .map(
      (category) => `
        <label class="category-option">
          <input
            type="checkbox"
            value="${escapeHtml(category.id)}"
            ${selectedCategories.includes(category.id) ? 'checked' : ''}
          >
          <span>${escapeHtml(category.title)}</span>
        </label>
      `
    )
    .join('');
}

function renderGalleryList() {
  if (state.galleryItems.length === 0) {
    state.galleryItems = [createEmptyGalleryItem()];
  }

  elements.galleryList.innerHTML = state.galleryItems
    .map((item, index) => {
      const previewUrl = item.src ? appendCacheBust(resolveMediaUrl(item.src)) : '';

      return `
        <article class="gallery-item" data-index="${index}">
          <div class="gallery-item__head">
            <strong>Gallery image ${index + 1}</strong>
            <button
              type="button"
              class="secondary-button inline-button"
              data-action="remove-gallery"
              data-index="${index}"
            >
              Remove
            </button>
          </div>

          <div class="gallery-item__grid">
            <label>
              <span>Label</span>
              <input type="text" data-field="label" data-index="${index}" value="${escapeHtml(item.label)}">
            </label>

            <label>
              <span>Color name</span>
              <input type="text" data-field="colorName" data-index="${index}" value="${escapeHtml(item.colorName)}">
            </label>

            <label>
              <span>Alt text</span>
              <input type="text" data-field="alt" data-index="${index}" value="${escapeHtml(item.alt)}">
            </label>

            <label>
              <span>Image path</span>
              <input type="text" data-field="src" data-index="${index}" value="${escapeHtml(item.src)}">
            </label>

            <label>
              <span>Upload image</span>
              <input type="file" data-action="upload-gallery" data-index="${index}" accept="image/*">
            </label>
          </div>

          <div class="gallery-thumb">
            ${
              previewUrl
                ? `<img src="${escapeHtml(previewUrl)}" alt="${escapeHtml(item.alt || item.label || 'Gallery preview')}">`
                : '<div class="gallery-thumb__empty">No image uploaded yet.</div>'
            }
          </div>
        </article>
      `;
    })
    .join('');
}

function renderProductList() {
  if (!state.catalog) {
    elements.productList.innerHTML = '';
    return;
  }

  if (state.catalog.products.length === 0) {
    elements.productList.innerHTML = `
      <article class="product-item product-item--empty">
        <div class="product-item__meta">
          <h3>No products added yet.</h3>
          <p>Create your first product from the editor on the left.</p>
        </div>
      </article>
    `;
    return;
  }

  elements.productList.innerHTML = state.catalog.products
    .map((product) => {
      const categoryTitles = product.categories
        .map((categoryId) =>
          state.catalog.categories.find((category) => category.id === categoryId)?.title || categoryId
        )
        .map((title) => `<span>${escapeHtml(title)}</span>`)
        .join('');
      const comparePrice = product.comparePrice
        ? `<span>${escapeHtml(product.comparePrice)}</span>`
        : '';

      return `
        <article class="product-item">
          <img src="${escapeHtml(appendCacheBust(resolveMediaUrl(product.image)))}" alt="${escapeHtml(product.name)}">

          <div class="product-item__meta">
            <div class="product-item__head">
              <div>
                <h3>${escapeHtml(product.name)}</h3>
                <small>${escapeHtml(product.id)}</small>
              </div>
              <p class="product-item__price">
                <strong>${escapeHtml(product.price)}</strong>
                ${comparePrice}
              </p>
            </div>

            <p>${escapeHtml(product.description)}</p>

            <div class="product-item__categories">${categoryTitles}</div>

            <div class="product-item__flags">
              <span>${(product.gallery || []).length} gallery image(s)</span>
              ${
                product.showOnHomePage
                  ? '<span class="product-item__flags--gold">Media strip</span>'
                  : ''
              }
            </div>
          </div>

          <div class="product-item__actions">
            <button type="button" class="secondary-button" data-action="edit" data-id="${escapeHtml(product.id)}">Edit</button>
            <button type="button" class="secondary-button" data-action="remove" data-id="${escapeHtml(product.id)}">Remove</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function fillForm(productId) {
  if (!state.catalog) {
    return;
  }

  const product = state.catalog.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  state.editingId = product.id;
  state.galleryItems =
    Array.isArray(product.gallery) && product.gallery.length > 0
      ? product.gallery.map((item) => ({
          src: item.src || '',
          label: item.label || '',
          alt: item.alt || '',
          colorName: item.colorName || ''
        }))
      : [createEmptyGalleryItem()];

  elements.editingId.value = product.id;
  elements.productId.value = product.id;
  elements.productName.value = product.name;
  elements.productPrice.value = product.price;
  elements.productComparePrice.value = product.comparePrice || '';
  elements.productColorName.value = product.colorName || '';
  elements.productDeliveryText.value = product.deliveryText || '';
  elements.productDescription.value = product.description;
  elements.productDetails.value = product.details || '';
  elements.productWarranty.value = product.warranty || '';
  elements.productMoreInformation.value = product.moreInformation || '';
  elements.productLink.value = product.link;
  elements.productImage.value = product.image;
  elements.showOnHomePage.checked = Boolean(product.showOnHomePage);
  elements.homeHeadline.value = product.homeHeadline || '';
  elements.homeCopy.value = product.homeCopy || '';
  elements.homeMediaType.value = product.homeMediaType === 'video' ? 'video' : 'image';
  elements.homeMediaPath.value = product.homeMediaPath || '';
  elements.homeMediaPoster.value = product.homeMediaPoster || '';
  elements.formTitle.textContent = `Edit ${product.name}`;
  elements.saveButton.textContent = 'Update Product';
  renderCategoryOptions(product.categories);
  renderGalleryList();
  updateMainPreview(product.image);
  renderHomeMediaPreview();
  clearStatus(elements.formStatus);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadCatalog() {
  state.catalog = await apiRequest('/api/catalog');
  renderCategoryOptions();
  renderProductList();
  renderSummaryStats();

  if (!state.editingId) {
    resetForm();
  }
}

function renderLeadList() {
  if (!state.leads.length) {
    elements.leadList.innerHTML = `
      <article class="lead-item lead-item--empty">
        <div>
          <h3>No submissions yet.</h3>
          <p>When visitors use the Join Us form, their details will appear here.</p>
        </div>
      </article>
    `;
    return;
  }

  elements.leadList.innerHTML = state.leads
    .map((lead) => {
      const submittedAt = new Date(lead.createdAt).toLocaleString();

      return `
        <article class="lead-item">
          <div class="lead-item__meta">
            <div>
              <h3>${escapeHtml(lead.name)}</h3>
              <p>${escapeHtml(lead.email)}</p>
              <p>${escapeHtml(lead.phone)}</p>
            </div>
            <time datetime="${escapeHtml(lead.createdAt)}">${escapeHtml(submittedAt)}</time>
          </div>
        </article>
      `;
    })
    .join('');
}

async function loadLeads() {
  const result = await apiRequest('/api/leads');
  state.leads = result.leads || [];
  renderLeadList();
  renderSummaryStats();
}

function getSelectedCategories() {
  return Array.from(
    elements.categoryOptions.querySelectorAll('input[type="checkbox"]:checked')
  ).map((checkbox) => checkbox.value);
}

async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('media', file);

  const result = await apiRequest('/api/upload-media', {
    method: 'POST',
    body: formData
  });

  return result.storedPath || result.mediaPath || result.imagePath;
}

async function uploadMainImage() {
  const file = elements.productFile.files?.[0];
  if (!file) {
    return;
  }

  setStatus(elements.formStatus, 'Uploading main image...');
  const storedPath = await uploadMedia(file);
  elements.productImage.value = storedPath;
  updateMainPreview(storedPath);
  setStatus(elements.formStatus, 'Main image uploaded.');
}

async function uploadGalleryImage(index, file) {
  if (!file) {
    return;
  }

  setStatus(elements.formStatus, `Uploading gallery image ${index + 1}...`);
  const storedPath = await uploadMedia(file);
  state.galleryItems[index].src = storedPath;

  if (!state.galleryItems[index].alt) {
    state.galleryItems[index].alt = elements.productName.value.trim() || `Gallery image ${index + 1}`;
  }

  renderGalleryList();
  renderSummaryStats();
  setStatus(elements.formStatus, `Gallery image ${index + 1} uploaded.`);
}

async function uploadHomeMedia() {
  const file = elements.homeMediaFile.files?.[0];
  if (!file) {
    return;
  }

  setStatus(elements.formStatus, 'Uploading strip media...');
  const storedPath = await uploadMedia(file);
  elements.homeMediaPath.value = storedPath;
  elements.homeMediaType.value = file.type.startsWith('video/') ? 'video' : 'image';
  renderHomeMediaPreview();
  setStatus(elements.formStatus, 'Strip media uploaded.');
}

async function uploadHomePoster() {
  const file = elements.homePosterFile.files?.[0];
  if (!file) {
    return;
  }

  setStatus(elements.formStatus, 'Uploading strip poster...');
  const storedPath = await uploadMedia(file);
  elements.homeMediaPoster.value = storedPath;
  renderHomeMediaPreview();
  setStatus(elements.formStatus, 'Strip poster uploaded.');
}

function logout(reason = '') {
  apiRequest('/api/logout', { method: 'POST' }).catch(() => {
    // Ignore logout failure during redirect.
  }).finally(() => {
    const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    window.location.replace(`/admin${suffix}`);
  });
}

function startInactivityTimer() {
  if (state.inactivityTimer) {
    clearTimeout(state.inactivityTimer);
  }

  setStatus(elements.sessionStatus, 'Auto logout after 10 minutes of no activity.');
  state.inactivityTimer = window.setTimeout(() => {
    logout('Logged out after 10 minutes of inactivity.');
  }, IDLE_TIMEOUT_MS);
}

function registerActivityEvents() {
  const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
  for (const eventName of events) {
    window.addEventListener(eventName, startInactivityTimer, { passive: true });
  }
}

async function handleProductSave(event) {
  event.preventDefault();
  clearStatus(elements.formStatus);

  const payload = {
    id: elements.productId.value.trim(),
    name: elements.productName.value.trim(),
    price: elements.productPrice.value.trim(),
    comparePrice: elements.productComparePrice.value.trim(),
    colorName: elements.productColorName.value.trim(),
    deliveryText: elements.productDeliveryText.value.trim(),
    description: elements.productDescription.value.trim(),
    details: elements.productDetails.value.trim(),
    warranty: elements.productWarranty.value.trim(),
    moreInformation: elements.productMoreInformation.value.trim(),
    link: elements.productLink.value.trim(),
    image: elements.productImage.value.trim(),
    showOnHomePage: elements.showOnHomePage.checked,
    homeHeadline: elements.homeHeadline.value.trim(),
    homeCopy: elements.homeCopy.value.trim(),
    homeMediaType: elements.homeMediaType.value,
    homeMediaPath: elements.homeMediaPath.value.trim(),
    homeMediaPoster: elements.homeMediaPoster.value.trim(),
    categories: getSelectedCategories(),
    gallery: state.galleryItems
      .map((item) => ({
        src: item.src.trim(),
        label: item.label.trim(),
        alt: item.alt.trim(),
        colorName: item.colorName.trim()
      }))
      .filter((item) => item.src)
  };

  try {
    const isEditing = Boolean(state.editingId);
    const endpoint = isEditing
      ? `/api/products/${encodeURIComponent(state.editingId)}`
      : '/api/products';
    const method = isEditing ? 'PUT' : 'POST';

    await apiRequest(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    setStatus(elements.formStatus, isEditing ? 'Product updated.' : 'Product added.');
    state.editingId = null;
    await loadCatalog();
    resetForm();
  } catch (error) {
    setStatus(elements.formStatus, error.message, true);
  }
}

async function handleProductListClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const target = event.target.closest('button[data-action]');
  if (!target) {
    return;
  }

  const action = target.dataset.action;
  const productId = target.dataset.id;

  if (action === 'edit') {
    fillForm(productId);
    return;
  }

  if (action === 'remove') {
    const confirmed = window.confirm('Remove this product?');
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/api/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE'
      });
      setStatus(elements.formStatus, 'Product removed.');
      await loadCatalog();
      resetForm();
    } catch (error) {
      setStatus(elements.formStatus, error.message, true);
    }
  }
}

function handleGalleryListInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const field = target.dataset.field;
  const index = Number(target.dataset.index);

  if (!field || !Number.isInteger(index) || !state.galleryItems[index]) {
    return;
  }

  state.galleryItems[index][field] = target.value;
}

async function handleGalleryListChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.dataset.action !== 'upload-gallery') {
    return;
  }

  const index = Number(target.dataset.index);
  const file = target.files?.[0];

  if (!Number.isInteger(index) || !state.galleryItems[index] || !file) {
    return;
  }

  try {
    await uploadGalleryImage(index, file);
  } catch (error) {
    setStatus(elements.formStatus, error.message, true);
  }
}

function handleGalleryListClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const target = event.target.closest('button[data-action="remove-gallery"]');
  if (!target) {
    return;
  }

  const index = Number(target.dataset.index);
  if (!Number.isInteger(index)) {
    return;
  }

  state.galleryItems.splice(index, 1);
  renderGalleryList();
}

async function bootstrap() {
  const auth = await apiRequest('/api/me').catch(() => ({ authenticated: false }));

  if (!auth.authenticated) {
    window.location.replace('/admin?reason=Please log in to open the dashboard.');
    return;
  }

  const isLocalAdmin = window.location.hostname === 'localhost' && window.location.port === '4300';
  elements.openStoreLink.href = isLocalAdmin ? 'http://localhost:4200/' : '/';
  elements.exportLeadsLink.href = '/api/leads/export';

  await Promise.all([loadCatalog(), loadLeads()]);
  registerActivityEvents();
  startInactivityTimer();
}

elements.logoutButton.addEventListener('click', () => logout('Logged out.'));
elements.productForm.addEventListener('submit', handleProductSave);
elements.productList.addEventListener('click', handleProductListClick);
elements.resetButton.addEventListener('click', resetForm);
elements.addGalleryButton.addEventListener('click', () => {
  state.galleryItems.push(createEmptyGalleryItem());
  renderGalleryList();
});
elements.galleryList.addEventListener('input', handleGalleryListInput);
elements.galleryList.addEventListener('change', (event) => {
  handleGalleryListChange(event).catch((error) => {
    setStatus(elements.formStatus, error.message, true);
  });
});
elements.galleryList.addEventListener('click', handleGalleryListClick);
elements.productFile.addEventListener('change', () => {
  uploadMainImage().catch((error) => {
    setStatus(elements.formStatus, error.message, true);
  });
});
elements.homeMediaFile.addEventListener('change', () => {
  uploadHomeMedia().catch((error) => {
    setStatus(elements.formStatus, error.message, true);
  });
});
elements.homePosterFile.addEventListener('change', () => {
  uploadHomePoster().catch((error) => {
    setStatus(elements.formStatus, error.message, true);
  });
});
elements.productImage.addEventListener('input', (event) => {
  updateMainPreview(event.target.value.trim());
});
elements.homeHeadline.addEventListener('input', renderHomeMediaPreview);
elements.homeCopy.addEventListener('input', renderHomeMediaPreview);
elements.homeMediaPath.addEventListener('input', renderHomeMediaPreview);
elements.homeMediaPoster.addEventListener('input', renderHomeMediaPreview);
elements.homeMediaType.addEventListener('change', renderHomeMediaPreview);
elements.showOnHomePage.addEventListener('change', renderHomeMediaPreview);

bootstrap().catch((error) => {
  setStatus(elements.formStatus, error.message, true);
});
