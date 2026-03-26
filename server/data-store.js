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

    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

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
      sort_order,
      created_at,
      updated_at
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
      p.sort_order AS sortOrder,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      COALESCE(GROUP_CONCAT(pc.category_id, '|'), '') AS categoryIds
    FROM products p
    LEFT JOIN product_categories pc ON pc.product_id = p.id
    GROUP BY p.id
    ORDER BY p.sort_order, p.created_at
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
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      updated_at = ?
    WHERE id = ?
  `);
  const deleteProduct = db.prepare('DELETE FROM products WHERE id = ?');
  const deleteProductCategories = db.prepare('DELETE FROM product_categories WHERE product_id = ?');
  const insertProductCategory = db.prepare(`
    INSERT INTO product_categories (product_id, category_id)
    VALUES (?, ?)
  `);
  const getNextSortOrder = db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder
    FROM products
  `);

  function getCatalog() {
    return {
      categories: getCategories.all().map((category) => ({
        id: category.id,
        title: category.title,
        note: category.note,
        showOnProductPage: Boolean(category.showOnProductPage)
      })),
      products: getProducts.all().map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
        link: product.link,
        categories: product.categoryIds ? product.categoryIds.split('|').filter(Boolean) : []
      }))
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

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      description: product.description,
      link: product.link,
      categories: getCategoriesForProduct.all(productId).map((row) => row.category_id)
    };
  }

  function saveCatalogProduct(product, currentId = null) {
    withTransaction(db, () => {
      const timestamp = new Date().toISOString();
      const existing = currentId ? getProductById.get(currentId) : null;
      const nextSortOrder = existing?.sort_order ?? getNextSortOrder.get().nextSortOrder;

      if (currentId) {
        updateProduct.run(
          product.id,
          product.name,
          product.price,
          product.image,
          product.description,
          product.link,
          timestamp,
          currentId
        );
        deleteProductCategories.run(currentId);
      } else {
        insertProduct.run(
          product.id,
          product.name,
          product.price,
          product.image,
          product.description,
          product.link,
          nextSortOrder,
          timestamp,
          timestamp
        );
      }

      for (const categoryId of product.categories) {
        insertProductCategory.run(product.id, categoryId);
      }
    });

    return getProduct(product.id);
  }

  function removeCatalogProduct(productId) {
    withTransaction(db, () => {
      deleteProductCategories.run(productId);
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
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertProductCategories = db.prepare(`
    INSERT INTO product_categories (product_id, category_id)
    VALUES (?, ?)
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
      insertProducts.run(
        product.id,
        product.name,
        product.price,
        product.image,
        product.description,
        product.link,
        index,
        timestamp,
        timestamp
      );

      (product.categories || []).forEach((categoryId) => {
        insertProductCategories.run(product.id, categoryId);
      });
    });
  });
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
