import { Component, OnInit } from '@angular/core';
import { ProductCategory, ProductItem } from '../../data/product-catalog';
import { ProductCatalogService } from '../../services/product-catalog.service';

type ProductCategorySection = ProductCategory & {
  products: ProductItem[];
};

type ProductCategoryOverview = ProductCategory & {
  productCount: number;
  leadImage: string;
};

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  categorySections: ProductCategorySection[] = [];
  categoryOverview: ProductCategoryOverview[] = [];
  firstCategoryId = 'top-sellers';
  totalProducts = 0;
  highlightedProduct: ProductItem | null = null;

  constructor(private readonly productCatalogService: ProductCatalogService) {}

  ngOnInit(): void {
    this.productCatalogService.loadCatalog().subscribe((catalog) => {
      this.totalProducts = catalog.products.length;

      this.categorySections = catalog.categories
        .filter((category) => category.showOnProductPage !== false)
        .map((category) => ({
          ...category,
          products: catalog.products.filter((product) =>
            product.categories.includes(category.id)
          )
        }))
        .filter((category) => category.products.length > 0);

      this.categoryOverview = this.categorySections.map((section) => ({
        id: section.id,
        title: section.title,
        note: section.note,
        productCount: section.products.length,
        leadImage: section.products[0]?.image ?? 'assets/product%20image/p1.jpg'
      }));

      this.firstCategoryId = this.categorySections[0]?.id ?? 'top-sellers';
      this.highlightedProduct = this.categorySections[0]?.products[0] ?? catalog.products[0] ?? null;
    });
  }
}
