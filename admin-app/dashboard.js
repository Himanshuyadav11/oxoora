const IDLE_TIMEOUT_MS = 10 * 60 * 1000;

const state = {
  catalog: null,
  leads: [],
  editingId: null,
  inactivityTimer: null
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
  productDescription: document.getElementById('productDescription'),
  productLink: document.getElementById('productLink'),
  productImage: document.getElementById('productImage'),
  productFile: document.getElementById('productFile'),
  imagePreview: document.getElementById('imagePreview'),
  sessionStatus: document.getElementById('sessionStatus'),
  leadList: document.getElementById('leadList')
};

function setStatus(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? '#ff9d9d' : '#c6a45c';
}

function clearStatus(element) {
  setStatus(element, '');
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload.message || 'Request failed.';
    throw new Error(message);
  }

  return payload;
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

function updatePreview(path) {
  if (!path) {
    elements.imagePreview.removeAttribute('src');
    return;
  }

  const previewUrl = resolveMediaUrl(path);
  elements.imagePreview.src = `${previewUrl}${previewUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
}

function resetForm() {
  state.editingId = null;
  elements.productForm.reset();
  elements.editingId.value = '';
  elements.formTitle.textContent = 'Add product';
  elements.saveButton.textContent = 'Save Product';
  updatePreview('');

  const checkboxes = elements.categoryOptions.querySelectorAll('input[type="checkbox"]');
  for (const checkbox of checkboxes) {
    checkbox.checked = false;
  }
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
            value="${category.id}"
            ${selectedCategories.includes(category.id) ? 'checked' : ''}
          >
          <span>${category.title}</span>
        </label>
      `
    )
    .join('');
}

function renderProductList() {
  if (!state.catalog) {
    elements.productList.innerHTML = '';
    return;
  }

  elements.productList.innerHTML = state.catalog.products
    .map((product) => {
      const categoryTitles = product.categories
        .map((categoryId) =>
          state.catalog.categories.find((category) => category.id === categoryId)?.title || categoryId
        )
        .map((title) => `<span>${title}</span>`)
        .join('');

      return `
        <article class="product-item">
          <img src="${resolveMediaUrl(product.image)}" alt="${product.name}">
          <div class="product-item__meta">
            <div>
              <h3>${product.name}</h3>
              <small>${product.id}</small>
            </div>
            <p>${product.price}</p>
            <p>${product.description}</p>
            <div class="product-item__categories">${categoryTitles}</div>
          </div>
          <div class="product-item__actions">
            <button type="button" class="secondary-button" data-action="edit" data-id="${product.id}">Edit</button>
            <button type="button" class="secondary-button" data-action="remove" data-id="${product.id}">Remove</button>
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
  elements.editingId.value = product.id;
  elements.productId.value = product.id;
  elements.productName.value = product.name;
  elements.productPrice.value = product.price;
  elements.productDescription.value = product.description;
  elements.productLink.value = product.link;
  elements.productImage.value = product.image;
  elements.formTitle.textContent = `Edit ${product.name}`;
  elements.saveButton.textContent = 'Update Product';
  renderCategoryOptions(product.categories);
  updatePreview(product.image);
  clearStatus(elements.formStatus);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadCatalog() {
  state.catalog = await apiRequest('/api/catalog');
  renderCategoryOptions();
  renderProductList();

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
              <h3>${lead.name}</h3>
              <p>${lead.email}</p>
              <p>${lead.phone}</p>
            </div>
            <time datetime="${lead.createdAt}">${submittedAt}</time>
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
}

function getSelectedCategories() {
  return Array.from(
    elements.categoryOptions.querySelectorAll('input[type="checkbox"]:checked')
  ).map((checkbox) => checkbox.value);
}

async function uploadFile() {
  const file = elements.productFile.files?.[0];
  if (!file) {
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  setStatus(elements.formStatus, 'Uploading image...');
  const result = await apiRequest('/api/upload-image', {
    method: 'POST',
    body: formData
  });

  elements.productImage.value = result.imagePath;
  updatePreview(result.imagePath);
  setStatus(elements.formStatus, 'Image uploaded to product-uploads.');
}

async function logout(reason = '') {
  try {
    await apiRequest('/api/logout', { method: 'POST' });
  } catch (_error) {
    // Ignore logout failure during redirect.
  }

  const suffix = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  window.location.replace(`/admin${suffix}`);
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
    image: elements.productImage.value.trim(),
    description: elements.productDescription.value.trim(),
    link: elements.productLink.value.trim(),
    categories: getSelectedCategories()
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
    await loadCatalog();
    resetForm();
  } catch (error) {
    setStatus(elements.formStatus, error.message, true);
  }
}

async function handleProductListClick(event) {
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
elements.productFile.addEventListener('change', () => {
  uploadFile().catch((error) => {
    setStatus(elements.formStatus, error.message, true);
  });
});
elements.productImage.addEventListener('input', (event) => {
  updatePreview(event.target.value.trim());
});

bootstrap().catch((error) => {
  setStatus(elements.formStatus, error.message, true);
});
