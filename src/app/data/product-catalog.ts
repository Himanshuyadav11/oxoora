export type ProductCategoryId = string;
export type ProductHomeMediaType = 'image' | 'video';

export type ProductCategory = {
  id: ProductCategoryId;
  title: string;
  note: string;
  showOnProductPage?: boolean;
};

export type ProductGalleryItem = {
  id?: number;
  src: string;
  alt: string;
  label: string;
  colorName?: string;
  sortOrder?: number;
};

export type ProductItem = {
  id: string;
  name: string;
  price: string;
  image: string;
  description: string;
  link: string;
  categories: ProductCategoryId[];
  comparePrice?: string;
  deliveryText?: string;
  colorName?: string;
  details?: string;
  warranty?: string;
  moreInformation?: string;
  gallery?: ProductGalleryItem[];
  showOnHomePage?: boolean;
  homeHeadline?: string;
  homeCopy?: string;
  homeMediaType?: ProductHomeMediaType;
  homeMediaPath?: string;
  homeMediaPoster?: string;
};

export type ProductCatalogData = {
  categories: ProductCategory[];
  products: ProductItem[];
};

export const PRODUCT_CATALOG_ASSET_PATH = 'assets/data/product-catalog.json';
