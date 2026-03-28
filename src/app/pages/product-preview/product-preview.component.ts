import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import {
  ProductCatalogData,
  ProductCategory,
  ProductGalleryItem,
  ProductItem
} from '../../data/product-catalog';
import { ProductCatalogService } from '../../services/product-catalog.service';

type RelatedProductCard = ProductItem & {
  categoryTitle: string;
};

type PreviewSection = {
  id: string;
  title: string;
  content: string;
};

type ProductPreviewViewModel = {
  product: ProductItem;
  primaryCategory: ProductCategory | null;
  gallery: ProductGalleryItem[];
  sections: PreviewSection[];
  relatedProducts: RelatedProductCard[];
};

@Component({
  selector: 'app-product-preview',
  templateUrl: './product-preview.component.html',
  styleUrls: ['./product-preview.component.css']
})
export class ProductPreviewComponent implements OnInit {
  pageModel: ProductPreviewViewModel | null = null;
  isLoading = true;
  selectedGalleryIndex = 0;
  accordionState: Record<string, boolean> = {};

  constructor(
    private readonly route: ActivatedRoute,
    private readonly productCatalogService: ProductCatalogService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.isLoading = true;

          return this.productCatalogService.loadCatalog().pipe(
            map((catalog) => ({
              catalog,
              productId: params.get('id') ?? ''
            }))
          );
        })
      )
      .subscribe(({ catalog, productId }) => {
        this.pageModel = this.buildViewModel(catalog, productId);
        this.selectedGalleryIndex = 0;
        this.accordionState = {
          description: true,
          warranty: false,
          more: false
        };
        this.isLoading = false;
      });
  }

  get selectedGallery(): ProductGalleryItem | null {
    return this.pageModel?.gallery[this.selectedGalleryIndex] ?? null;
  }

  selectGalleryItem(index: number): void {
    this.selectedGalleryIndex = index;
  }

  toggleSection(sectionId: string): void {
    this.accordionState[sectionId] = !this.accordionState[sectionId];
  }

  isSectionOpen(sectionId: string): boolean {
    return Boolean(this.accordionState[sectionId]);
  }

  hasExternalLink(link: string): boolean {
    return /^https?:\/\//i.test(link);
  }

  private buildViewModel(
    catalog: ProductCatalogData,
    productId: string
  ): ProductPreviewViewModel | null {
    const product = catalog.products.find((item) => item.id === productId);

    if (!product) {
      return null;
    }

    const categoryMap = new Map(catalog.categories.map((category) => [category.id, category]));
    const allCategories = product.categories
      .map((categoryId) => categoryMap.get(categoryId))
      .filter((category): category is ProductCategory => Boolean(category));
    const visibleCategories = allCategories.filter(
      (category) => category.showOnProductPage !== false
    );

    const primaryCategory =
      visibleCategories[0] ??
      allCategories[0] ??
      null;

    return {
      product,
      primaryCategory,
      gallery: buildGallery(product),
      sections: buildSections(product),
      relatedProducts: buildRelatedProducts(product, catalog.products, categoryMap)
    };
  }
}

function buildRelatedProducts(
  currentProduct: ProductItem,
  products: ProductItem[],
  categoryMap: Map<string, ProductCategory>
): RelatedProductCard[] {
  const scoredProducts = products
    .filter((product) => product.id !== currentProduct.id)
    .map((product) => ({
      product,
      score: getSharedCategoryCount(currentProduct.categories, product.categories)
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.product.name.localeCompare(right.product.name);
    });

  return scoredProducts.slice(0, 4).map(({ product }) => ({
    ...product,
    categoryTitle: getPrimaryCategoryTitle(product, categoryMap)
  }));
}

function getSharedCategoryCount(currentCategories: string[], otherCategories: string[]): number {
  const categorySet = new Set(currentCategories);
  return otherCategories.filter((categoryId) => categorySet.has(categoryId)).length;
}

function getPrimaryCategoryTitle(
  product: ProductItem,
  categoryMap: Map<string, ProductCategory>
): string {
  const category = product.categories
    .map((categoryId) => categoryMap.get(categoryId))
    .find((item) => item?.showOnProductPage !== false);

  return category?.title ?? 'Signature Piece';
}

function buildGallery(product: ProductItem): ProductGalleryItem[] {
  const primaryImage = {
    src: product.image,
    alt: product.name,
    label: product.colorName || 'Main view',
    colorName: product.colorName || ''
  };

  const fallbackGallery: ProductGalleryItem[] = [
    primaryImage,
    {
      src: 'assets/editorial/western-belt-detail.jpg',
      alt: `${product.name} detail view`,
      label: 'Detail view'
    },
    {
      src: 'assets/editorial/workshop-buckles.jpg',
      alt: `${product.name} buckle detail`,
      label: 'Hardware'
    },
    {
      src: 'assets/editorial/flatlay-accessories.jpg',
      alt: `${product.name} styling view`,
      label: 'Lifestyle'
    }
  ];

  const sourceGallery =
    Array.isArray(product.gallery) && product.gallery.length > 0
      ? [primaryImage, ...product.gallery]
      : fallbackGallery;

  const uniqueGallery: ProductGalleryItem[] = [];
  const seen = new Set<string>();

  for (const item of sourceGallery) {
    if (!item?.src || seen.has(item.src)) {
      continue;
    }

    seen.add(item.src);
    uniqueGallery.push({
      src: item.src,
      alt: item.alt || product.name,
      label: item.label || 'Gallery image',
      colorName: item.colorName || ''
    });
  }

  return uniqueGallery;
}

function buildSections(product: ProductItem): PreviewSection[] {
  return [
    {
      id: 'description',
      title: 'Description',
      content: product.details || product.description
    },
    {
      id: 'warranty',
      title: 'Warranty & Returns',
      content:
        product.warranty ||
        'Unused products can be exchanged within 7 days. Keep the original packing and tags intact for faster support.'
    },
    {
      id: 'more',
      title: 'More Information',
      content: product.moreInformation || buildMoreInformation(product)
    }
  ].filter((section) => section.content.trim().length > 0);
}

function buildMoreInformation(product: ProductItem): string {
  const pieces = [];

  if (product.colorName) {
    pieces.push(`Color: ${product.colorName}.`);
  }

  if (product.deliveryText) {
    pieces.push(product.deliveryText);
  }

  if (pieces.length === 0) {
    return 'More product information will be added from the admin panel as you upload extra gallery images and product details.';
  }

  return pieces.join(' ');
}
