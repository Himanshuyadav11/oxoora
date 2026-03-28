const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const XLSX = require('xlsx');

function createDataStore({
  rootDir,
  dataDir,
  uploadDir,
  legacyCatalogFile
}) {
  const resolvedRootDir = path.resolve(rootDir);
  const resolvedDataDir = path.resolve(dataDir || path.join(resolvedRootDir, 'data'));
  const resolvedUploadDir = path.resolve(uploadDir || path.join(resolvedRootDir, 'product-uploads'));
  const resolvedLegacyCatalogFile = path.resolve(
    legacyCatalogFile || path.join(resolvedRootDir, 'src', 'assets', 'data', 'product-catalog.json')
  );
  const databaseFile = path.join(resolvedDataDir, 'oxoora.sqlite');

  fs.mkdirSync(resolvedDataDir, { recursive: true });
  fs.mkdirSync(resolvedUploadDir, { recursive: true });

  const db = new DatabaseSync(databaseFile);

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      note TEXT NOT NULL,
      show_on_product_page INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price TEXT NOT NULL,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      link TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_categories (
      product_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (product_id, category_id),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS product_gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL,
      image_path TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      color_name TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  migrateSchema(db);
  seedCatalogIfNeeded(db, resolvedLegacyCatalogFile);

  const getCategoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories');
  const getProductCount = db.prepare('SELECT COUNT(*) AS count FROM products');
  const getExistingProductId = db.prepare('SELECT id FROM products WHERE id = ?');
  const getProductById = db.prepare(`
    SELECT
      id,
      name,
      price,
      image,
      description,
      link,
      compare_price AS comparePrice,
      delivery_text AS deliveryText,
      color_name AS colorName,
      details AS details,
      warranty AS warranty,
      more_information AS moreInformation,
      show_on_home_page AS showOnHomePage,
      home_headline AS homeHeadline,
      home_copy AS homeCopy,
      home_media_type AS homeMediaType,
      home_media_path AS homeMediaPath,
      home_media_poster AS homeMediaPoster,
      sort_order,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM products
    WHERE id = ?
  `);
  const getCategories = db.prepare(`
    SELECT
      id,
      title,
      note,
      show_on_product_page AS showOnProductPage,
      sort_order AS sortOrder
    FROM categories
    ORDER BY sort_order, title
  `);
  const getProducts = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.price,
      p.image,
      p.description,
      p.link,
      p.compare_price AS comparePrice,
      p.delivery_text AS deliveryText,
      p.color_name AS colorName,
      p.details AS details,
      p.warranty AS warranty,
      p.more_information AS moreInformation,
      p.show_on_home_page AS showOnHomePage,
      p.home_headline AS homeHeadline,
      p.home_copy AS homeCopy,
      p.home_media_type AS homeMediaType,
      p.home_media_path AS homeMediaPath,
      p.home_media_poster AS homeMediaPoster,
      p.sort_order AS sortOrder,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      COALESCE(GROUP_CONCAT(pc.category_id, '|'), '') AS categoryIds
    FROM products p
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    GROUP BY p.id
    ORDER BY p.sort_order, p.created_at
  `);
  const getAllGalleryRows = db.prepare(`
    SELECT
      id,
      product_id AS productId,
      image_path AS src,
      alt_text AS alt,
      label,
      color_name AS colorName,
      sort_order AS sortOrder
    FROM product_gallery
    ORDER BY product_id, sort_order, id
  `);
  const getGalleryRowsForProduct = db.prepare(`
    SELECT
      id,
      product_id AS productId,
      image_path AS src,
      alt_text AS alt,
      label,
      color_name AS colorName,
      sort_order AS sortOrder
    FROM product_gallery
    WHERE product_id = ?
    ORDER BY sort_order, id
  `);
  const getCategoriesForProduct = db.prepare(`
    SELECT category_id
    FROM product_categories
    WHERE product_id = ?
    ORDER BY category_id
  `);
  const getLeadRows = db.prepare(`
    SELECT
      id,
      name,
      phone,
      email,
      created_at AS createdAt
    FROM leads
    ORDER BY datetime(created_at) DESC, id DESC
  `);
  const insertLead = db.prepare(`
    INSERT INTO leads (name, phone, email, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id,
      name,
      price,
      image,
      description,
      link,
      compare_price,
      delivery_text,
      color_name,
      details,
      warranty,
      more_information,
      show_on_home_page,
      home_headline,
      home_copy,
      home_media_type,
      home_media_path,
      home_media_poster,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateProduct = db.prepare(`
    UPDATE products
    SET
      id = ?,
      name = ?,
      price = ?,
      image = ?,
      description = ?,
      link = ?,
      compare_price = ?,
      delivery_text = ?,
      color_name = ?,
      details = ?,
      warranty = ?,
      more_information = ?,
      show_on_home_page = ?,
      home_headline = ?,
      home_copy = ?,
      home_media_type = ?,
      home_media_path = ?,
      home_media_poster = ?,
      updated_at = ?
    WHERE id = ?
  `);
  const deleteProduct = db.prepare('DELETE FROM products WHERE id = ?');
  const deleteProductCategories = db.prepare('DELETE FROM product_categories WHERE product_id = ?');
  const deleteProductGallery = db.prepare('DELETE FROM product_gallery WHERE product_id = ?');
  const insertProductCategory = db.prepare(`
    INSERT INTO product_categories (product_id, category_id)
    VALUES (?, ?)
  `);
  const insertProductGallery = db.prepare(`
    INSERT INTO product_gallery (
      product_id,
      image_path,
      alt_text,
      label,
      color_name,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const getNextSortOrder = db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder
    FROM products
  `);

  function getCatalog() {
    const galleryByProduct = mapGalleryByProduct(getAllGalleryRows.all());

    return {
      categories: getCategories.all().map((category) => ({
        id: category.id,
        title: category.title,
        note: category.note,
        showOnProductPage: Boolean(category.showOnProductPage)
      })),
      products: getProducts.all().map((product) =>
        mapProductRow(product, {
          categories: product.categoryIds ? product.categoryIds.split('|').filter(Boolean) : [],
          gallery: galleryByProduct.get(product.id) || []
        })
      )
    };
  }

  function hasProduct(productId) {
    return Boolean(getExistingProductId.get(productId));
  }

  function getProduct(productId) {
    const product = getProductById.get(productId);
    if (!product) {
      return null;
    }

    return mapProductRow(product, {
      categories: getCategoriesForProduct.all(productId).map((row) => row.category_id),
      gallery: getGalleryRowsForProduct.all(productId)
    });
  }

  function saveCatalogProduct(product, currentId = null) {
    const normalized = normalizeStoredProduct(product);

    withTransaction(db, () => {
      const timestamp = new Date().toISOString();
      const existing = currentId ? getProductById.get(currentId) : null;
      const nextSortOrder = existing?.sort_order ?? getNextSortOrder.get().nextSortOrder;

      if (currentId) {
        deleteProductCategories.run(currentId);
        deleteProductGallery.run(currentId);
        updateProduct.run(
          normalized.id,
          normalized.name,
          normalized.price,
          normalized.image,
          normalized.description,
          normalized.link,
          normalized.comparePrice,
          normalized.deliveryText,
          normalized.colorName,
          normalized.details,
          normalized.warranty,
          normalized.moreInformation,
          normalized.showOnHomePage ? 1 : 0,
          normalized.homeHeadline,
          normalized.homeCopy,
          normalized.homeMediaType,
          normalized.homeMediaPath,
          normalized.homeMediaPoster,
          timestamp,
          currentId
        );
      } else {
        insertProduct.run(
          normalized.id,
          normalized.name,
          normalized.price,
          normalized.image,
          normalized.description,
          normalized.link,
          normalized.comparePrice,
          normalized.deliveryText,
          normalized.colorName,
          normalized.details,
          normalized.warranty,
          normalized.moreInformation,
          normalized.showOnHomePage ? 1 : 0,
          normalized.homeHeadline,
          normalized.homeCopy,
          normalized.homeMediaType,
          normalized.homeMediaPath,
          normalized.homeMediaPoster,
          nextSortOrder,
          timestamp,
          timestamp
        );
      }

      for (const categoryId of normalized.categories) {
        insertProductCategory.run(normalized.id, categoryId);
      }

      normalized.gallery.forEach((item, index) => {
        insertProductGallery.run(
          normalized.id,
          item.src,
          item.alt,
          item.label,
          item.colorName,
          index
        );
      });
    });

    return getProduct(normalized.id);
  }

  function removeCatalogProduct(productId) {
    withTransaction(db, () => {
      deleteProductCategories.run(productId);
      deleteProductGallery.run(productId);
      deleteProduct.run(productId);
    });
  }

  function listLeads() {
    return getLeadRows.all();
  }

  function addLead(lead) {
    const createdAt = new Date().toISOString();
    const result = insertLead.run(lead.name, lead.phone, lead.email, createdAt);

    return {
      id: Number(result.lastInsertRowid),
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      createdAt
    };
  }

  function buildLeadWorkbookBuffer() {
    const worksheet = XLSX.utils.json_to_sheet(
      listLeads().map((lead) => ({
        ID: lead.id,
        Name: lead.name,
        Phone: lead.phone,
        Email: lead.email,
        SubmittedAt: lead.createdAt
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Join Us Leads');

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    });
  }

  return {
    databaseFile,
    uploadDir: resolvedUploadDir,
    getCategoryCount: () => getCategoryCount.get().count,
    getProductCount: () => getProductCount.get().count,
    hasProduct,
    getProduct,
    getCatalog,
    saveCatalogProduct,
    removeCatalogProduct,
    listLeads,
    addLead,
    buildLeadWorkbookBuffer
  };
}

function migrateSchema(db) {
  ensureColumns(db, 'products', [
    ['compare_price', `compare_price TEXT NOT NULL DEFAULT ''`],
    ['delivery_text', `delivery_text TEXT NOT NULL DEFAULT ''`],
    ['color_name', `color_name TEXT NOT NULL DEFAULT ''`],
    ['details', `details TEXT NOT NULL DEFAULT ''`],
    ['warranty', `warranty TEXT NOT NULL DEFAULT ''`],
    ['more_information', `more_information TEXT NOT NULL DEFAULT ''`],
    ['show_on_home_page', `show_on_home_page INTEGER NOT NULL DEFAULT 0`],
    ['home_headline', `home_headline TEXT NOT NULL DEFAULT ''`],
    ['home_copy', `home_copy TEXT NOT NULL DEFAULT ''`],
    ['home_media_type', `home_media_type TEXT NOT NULL DEFAULT 'image'`],
    ['home_media_path', `home_media_path TEXT NOT NULL DEFAULT ''`],
    ['home_media_poster', `home_media_poster TEXT NOT NULL DEFAULT ''`]
  ]);
}

function ensureColumns(db, tableName, columns) {
  const existingColumns = new Set(
    db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name)
  );

  for (const [columnName, definition] of columns) {
    if (!existingColumns.has(columnName)) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
    }
  }
}

function seedCatalogIfNeeded(db, legacyCatalogFile) {
  const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;

  if (categoryCount > 0 || productCount > 0 || !fs.existsSync(legacyCatalogFile)) {
    return;
  }

  const raw = fs.readFileSync(legacyCatalogFile, 'utf8');
  const catalog = JSON.parse(raw);
  const timestamp = new Date().toISOString();

  const insertCategories = db.prepare(`
    INSERT INTO categories (id, title, note, show_on_product_page, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertProducts = db.prepare(`
    INSERT INTO products (
      id,
      name,
      price,
      image,
      description,
      link,
      compare_price,
      delivery_text,
      color_name,
      details,
      warranty,
      more_information,
      show_on_home_page,
      home_headline,
      home_copy,
      home_media_type,
      home_media_path,
      home_media_poster,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProductCategories = db.prepare(`
    INSERT INTO product_categories (product_id, category_id)
    VALUES (?, ?)
  `);
  const insertProductGallery = db.prepare(`
    INSERT INTO product_gallery (
      product_id,
      image_path,
      alt_text,
      label,
      color_name,
      sort_order
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  withTransaction(db, () => {
    catalog.categories.forEach((category, index) => {
      insertCategories.run(
        category.id,
        category.title,
        category.note,
        category.showOnProductPage === false ? 0 : 1,
        index
      );
    });

    catalog.products.forEach((product, index) => {
      const seededProduct = normalizeSeedProduct(product);

      insertProducts.run(
        seededProduct.id,
        seededProduct.name,
        seededProduct.price,
        seededProduct.image,
        seededProduct.description,
        seededProduct.link,
        seededProduct.comparePrice,
        seededProduct.deliveryText,
        seededProduct.colorName,
        seededProduct.details,
        seededProduct.warranty,
        seededProduct.moreInformation,
        seededProduct.showOnHomePage ? 1 : 0,
        seededProduct.homeHeadline,
        seededProduct.homeCopy,
        seededProduct.homeMediaType,
        seededProduct.homeMediaPath,
        seededProduct.homeMediaPoster,
        index,
        timestamp,
        timestamp
      );

      (seededProduct.categories || []).forEach((categoryId) => {
        insertProductCategories.run(seededProduct.id, categoryId);
      });

      (seededProduct.gallery || []).forEach((item, galleryIndex) => {
        insertProductGallery.run(
          seededProduct.id,
          item.src,
          item.alt,
          item.label,
          item.colorName,
          galleryIndex
        );
      });
    });
  });
}

function mapProductRow(row, related) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    image: row.image,
    description: row.description,
    link: row.link,
    comparePrice: row.comparePrice || '',
    deliveryText: row.deliveryText || '',
    colorName: row.colorName || '',
    details: row.details || '',
    warranty: row.warranty || '',
    moreInformation: row.moreInformation || '',
    showOnHomePage: Boolean(row.showOnHomePage),
    homeHeadline: row.homeHeadline || '',
    homeCopy: row.homeCopy || '',
    homeMediaType: row.homeMediaType || 'image',
    homeMediaPath: row.homeMediaPath || '',
    homeMediaPoster: row.homeMediaPoster || '',
    categories: related.categories,
    gallery: (related.gallery || []).map((item) => ({
      id: item.id,
      src: item.src,
      alt: item.alt || row.name,
      label: item.label || 'Gallery image',
      colorName: item.colorName || '',
      sortOrder: item.sortOrder
    }))
  };
}

function mapGalleryByProduct(rows) {
  const galleryByProduct = new Map();

  for (const row of rows) {
    if (!galleryByProduct.has(row.productId)) {
      galleryByProduct.set(row.productId, []);
    }

    galleryByProduct.get(row.productId).push(row);
  }

  return galleryByProduct;
}

function normalizeStoredProduct(product) {
  const gallery = Array.isArray(product.gallery)
    ? product.gallery
        .map((item) => ({
          src: String(item?.src || '').trim(),
          alt: String(item?.alt || '').trim(),
          label: String(item?.label || '').trim(),
          colorName: String(item?.colorName || '').trim()
        }))
        .filter((item) => item.src)
    : [];

  return {
    id: String(product.id || '').trim(),
    name: String(product.name || '').trim(),
    price: String(product.price || '').trim(),
    image: String(product.image || gallery[0]?.src || '').trim(),
    description: String(product.description || '').trim(),
    link: String(product.link || '').trim(),
    comparePrice: String(product.comparePrice || '').trim(),
    deliveryText: String(product.deliveryText || '').trim(),
    colorName: String(product.colorName || '').trim(),
    details: String(product.details || '').trim(),
    warranty: String(product.warranty || '').trim(),
    moreInformation: String(product.moreInformation || '').trim(),
    showOnHomePage: Boolean(product.showOnHomePage),
    homeHeadline: String(product.homeHeadline || '').trim(),
    homeCopy: String(product.homeCopy || '').trim(),
    homeMediaType: product.homeMediaType === 'video' ? 'video' : 'image',
    homeMediaPath: String(product.homeMediaPath || '').trim(),
    homeMediaPoster: String(product.homeMediaPoster || '').trim(),
    categories: Array.isArray(product.categories)
      ? product.categories.map((categoryId) => String(categoryId).trim()).filter(Boolean)
      : [],
    gallery
  };
}

function normalizeSeedProduct(product) {
  const normalized = normalizeStoredProduct({
    ...product,
    comparePrice: product.comparePrice || '',
    deliveryText: product.deliveryText || 'Dispatch in 24 to 48 hours.',
    colorName: product.colorName || '',
    details: product.details || product.description || '',
    warranty:
      product.warranty || 'Unused products are eligible for exchange support within 7 days.',
    moreInformation: product.moreInformation || '',
    showOnHomePage:
      typeof product.showOnHomePage === 'boolean'
        ? product.showOnHomePage
        : Array.isArray(product.categories) && product.categories.includes('featured-pieces'),
    homeHeadline: product.homeHeadline || product.name || '',
    homeCopy: product.homeCopy || product.description || '',
    homeMediaType: product.homeMediaType === 'video' ? 'video' : 'image',
    homeMediaPath: product.homeMediaPath || '',
    homeMediaPoster: product.homeMediaPoster || ''
  });

  if (normalized.showOnHomePage && !normalized.homeMediaPath) {
    normalized.homeMediaPath = normalized.image;
  }

  return normalized;
}

function withTransaction(db, action) {
  db.exec('BEGIN');
  try {
    action();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  createDataStore
};
