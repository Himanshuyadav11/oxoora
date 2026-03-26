const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const express = require('express');
const multer = require('multer');

const { createDataStore } = require('./data-store');

const PORT = Number(process.env.PORT || process.env.ADMIN_PORT || 4300);
const ROOT = path.resolve(__dirname, '..');
const ADMIN_DIR = path.join(ROOT, 'admin-app');
const DIST_DIR = path.join(ROOT, 'dist', 'oxoora', 'browser');
const DIST_ASSETS_DIR = path.join(DIST_DIR, 'assets');
const DEV_ASSETS_DIR = path.join(ROOT, 'src', 'assets');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(ROOT, 'product-uploads'));
const LEGACY_CATALOG_FILE = path.join(ROOT, 'src', 'assets', 'data', 'product-catalog.json');
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

const ADMIN_ID = process.env.ADMIN_ID || 'himanshu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '9680706015';
const SESSION_COOKIE = 'oxoora_admin_session';

const sessions = new Map();
const app = express();
const store = createDataStore({
  rootDir: ROOT,
  dataDir: DATA_DIR,
  uploadDir: UPLOAD_DIR,
  legacyCatalogFile: LEGACY_CATALOG_FILE
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, sanitizeFileName(file.originalname))
  })
});

app.disable('x-powered-by');
app.use(applyDevCors);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/product-uploads', express.static(UPLOAD_DIR));
app.use('/assets', express.static(resolveAssetsDirectory()));

function resolveAssetsDirectory() {
  return fs.existsSync(DIST_ASSETS_DIR) ? DIST_ASSETS_DIR : DEV_ASSETS_DIR;
}

function applyDevCors(req, res, next) {
  const origin = req.headers.origin || '';

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  next();
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((all, part) => {
      const eqIndex = part.indexOf('=');
      if (eqIndex === -1) {
        return all;
      }

      const key = part.slice(0, eqIndex);
      const value = decodeURIComponent(part.slice(eqIndex + 1));
      all[key] = value;
      return all;
    }, {});
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies[SESSION_COOKIE];
  const session = sessionId ? sessions.get(sessionId) : null;

  if (!session) {
    return false;
  }

  if (Date.now() - session.lastActiveAt > SESSION_TIMEOUT_MS) {
    sessions.delete(sessionId);
    return false;
  }

  session.lastActiveAt = Date.now();
  return true;
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
}

function requireAuthPage(req, res, next) {
  if (!isAuthenticated(req)) {
    res.redirect('/admin?reason=Please log in to open the dashboard.');
    return;
  }

  next();
}

function sanitizeFileName(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, extension);
  const safeBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';

  return `${Date.now()}-${safeBase}${extension}`;
}

function normalizeStoredImagePath(imagePath) {
  const trimmed = String(imagePath || '').trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/product-uploads/')) {
        return parsed.pathname;
      }
    } catch (_error) {
      return trimmed;
    }
  }

  return trimmed;
}

function resolveImagePathForRequest(req, imagePath) {
  if (!imagePath) {
    return imagePath;
  }

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  if (imagePath.startsWith('assets/')) {
    return `${req.protocol}://${req.get('host')}/${imagePath}`;
  }

  if (imagePath.startsWith('/assets/')) {
    return `${req.protocol}://${req.get('host')}${imagePath}`;
  }

  if (imagePath.startsWith('/product-uploads/')) {
    return `${req.protocol}://${req.get('host')}${imagePath}`;
  }

  return `${req.protocol}://${req.get('host')}/${imagePath.replace(/^\/+/, '')}`;
}

function getCatalogForRequest(req) {
  const catalog = store.getCatalog();

  return {
    categories: catalog.categories,
    products: catalog.products.map((product) => ({
      ...product,
      image: resolveImagePathForRequest(req, product.image)
    }))
  };
}

function validateProduct(product, categories, existingProducts, currentId = null) {
  const errors = [];

  if (!product.id || typeof product.id !== 'string') {
    errors.push('Product id is required.');
  }

  if (!product.name || typeof product.name !== 'string') {
    errors.push('Product name is required.');
  }

  if (!product.price || typeof product.price !== 'string') {
    errors.push('Product price is required.');
  }

  if (!product.image || typeof product.image !== 'string') {
    errors.push('Product image path is required.');
  }

  if (!product.description || typeof product.description !== 'string') {
    errors.push('Product description is required.');
  }

  if (!product.link || typeof product.link !== 'string') {
    errors.push('Product link is required.');
  }

  if (!Array.isArray(product.categories) || product.categories.length === 0) {
    errors.push('Select at least one category.');
  }

  const validCategoryIds = new Set(categories.map((category) => category.id));
  for (const categoryId of product.categories || []) {
    if (!validCategoryIds.has(categoryId)) {
      errors.push(`Invalid category: ${categoryId}`);
    }
  }

  const duplicate = existingProducts.find(
    (existingProduct) =>
      existingProduct.id === product.id && existingProduct.id !== currentId
  );

  if (duplicate) {
    errors.push(`Product id "${product.id}" already exists.`);
  }

  return errors;
}

function validateLead(payload) {
  const errors = [];
  const name = String(payload?.name || '').trim();
  const phone = String(payload?.phone || '').trim();
  const email = String(payload?.email || '').trim().toLowerCase();

  if (name.length < 2) {
    errors.push('Name is required.');
  }

  if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) {
    errors.push('Phone number is required.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('A valid email is required.');
  }

  return {
    errors,
    value: { name, phone, email }
  };
}

function sendStorefront(req, res) {
  const indexFile = path.join(DIST_DIR, 'index.html');

  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
    return;
  }

  if ((req.hostname === 'localhost' || req.hostname === '127.0.0.1') && req.path === '/') {
    res.redirect('http://localhost:4200/');
    return;
  }

  res
    .status(503)
    .type('text/plain')
    .send('Storefront build not found. Run "npm run build" before using the production server.');
}

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    databaseFile: store.databaseFile,
    productCount: store.getProductCount()
  });
});

app.get('/api/storefront/catalog', (req, res) => {
  res.json(getCatalogForRequest(req));
});

app.post('/api/leads', (req, res) => {
  const { errors, value } = validateLead(req.body);

  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(' ') });
    return;
  }

  const lead = store.addLead(value);
  res.json({
    success: true,
    lead
  });
});

app.get('/api/me', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};

  if (username !== ADMIN_ID || password !== ADMIN_PASSWORD) {
    res.status(401).json({ message: 'Invalid credentials' });
    return;
  }

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { lastActiveAt: Date.now() });
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax`
  );
  res.json({ success: true, redirectTo: '/admin/dashboard' });
});

app.post('/api/logout', requireAuth, (req, res) => {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies[SESSION_COOKIE];

  if (sessionId) {
    sessions.delete(sessionId);
  }

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
  res.json({ success: true });
});

app.get('/api/catalog', requireAuth, (req, res) => {
  res.json(getCatalogForRequest(req));
});

app.get('/api/leads', requireAuth, (_req, res) => {
  res.json({ leads: store.listLeads() });
});

app.get('/api/leads/export', requireAuth, (_req, res) => {
  const workbookBuffer = store.buildLeadWorkbookBuffer();
  const fileName = `oxoora-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(workbookBuffer);
});

app.post('/api/upload-image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'No image uploaded.' });
    return;
  }

  const storedPath = `/product-uploads/${encodeURIComponent(req.file.filename)}`;
  res.json({
    imagePath: resolveImagePathForRequest(req, storedPath),
    storedPath
  });
});

app.post('/api/products', requireAuth, (req, res) => {
  const catalog = store.getCatalog();
  const payload = {
    id: String(req.body?.id || '').trim(),
    name: String(req.body?.name || '').trim(),
    price: String(req.body?.price || '').trim(),
    image: normalizeStoredImagePath(req.body?.image),
    description: String(req.body?.description || '').trim(),
    link: String(req.body?.link || '').trim(),
    categories: Array.isArray(req.body?.categories)
      ? req.body.categories.map((categoryId) => String(categoryId).trim()).filter(Boolean)
      : []
  };

  const errors = validateProduct(payload, catalog.categories, catalog.products);
  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(' ') });
    return;
  }

  const product = store.saveCatalogProduct(payload);
  res.json({
    success: true,
    product: {
      ...product,
      image: resolveImagePathForRequest(req, product.image)
    }
  });
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const currentId = req.params.id;

  if (!store.hasProduct(currentId)) {
    res.status(404).json({ message: 'Product not found.' });
    return;
  }

  const catalog = store.getCatalog();
  const payload = {
    id: String(req.body?.id || '').trim(),
    name: String(req.body?.name || '').trim(),
    price: String(req.body?.price || '').trim(),
    image: normalizeStoredImagePath(req.body?.image),
    description: String(req.body?.description || '').trim(),
    link: String(req.body?.link || '').trim(),
    categories: Array.isArray(req.body?.categories)
      ? req.body.categories.map((categoryId) => String(categoryId).trim()).filter(Boolean)
      : []
  };

  const errors = validateProduct(payload, catalog.categories, catalog.products, currentId);
  if (errors.length > 0) {
    res.status(400).json({ message: errors.join(' ') });
    return;
  }

  const product = store.saveCatalogProduct(payload, currentId);
  res.json({
    success: true,
    product: {
      ...product,
      image: resolveImagePathForRequest(req, product.image)
    }
  });
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const productId = req.params.id;

  if (!store.hasProduct(productId)) {
    res.status(404).json({ message: 'Product not found.' });
    return;
  }

  store.removeCatalogProduct(productId);
  res.json({ success: true });
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

app.get('/admin/styles.css', (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'styles.css'));
});

app.get('/admin/login.js', (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'login.js'));
});

app.get('/admin/dashboard.js', requireAuth, (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'dashboard.js'));
});

app.get('/admin/dashboard', requireAuthPage, (_req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'dashboard.html'));
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false }));
}

app.get(/^\/(?!api\/|admin(?:\/|$)|assets\/|product-uploads\/).*/, (req, res) => {
  sendStorefront(req, res);
});

app.listen(PORT, () => {
  console.log(`Oxoora app running at http://localhost:${PORT}`);
});
