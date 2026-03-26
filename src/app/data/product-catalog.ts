export type ProductCategoryId = string;

export type ProductCategory = {
  id: ProductCategoryId;
  title: string;
  note: string;
  showOnProductPage?: boolean;
};

export type ProductItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  description: string;
  link: string;
  categories: ProductCategoryId[];
};

export type ProductCatalogData = {
  categories: ProductCategory[];
  products: ProductItem[];
};

export const PRODUCT_CATALOG_ASSET_PATH = 'assets/data/product-catalog.json';
