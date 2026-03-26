import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PreviewMedia } from '../../data/brand-media';
import { ProductCategory, ProductItem } from '../../data/product-catalog';
import { ProductCatalogService } from '../../services/product-catalog.service';

type HomeHeroSlide = {
  id: string;
  label: string;
  titleLines: string[];
  titleConnector?: string;
  promoEyebrow: string;
  promoTitle: string;
  promoCopy: string;
  image: string;
  alt: string;
};

type CollectionHighlight = ProductCategory & {
  image: string;
  leadProductName: string;
  price: string;
  productCount: number;
};

type ShowcaseProduct = ProductItem & {
  categoryTitle: string;
  preview: PreviewMedia;
  downloadName: string;
};

type HomeSocialLink = {
  icon: 'instagram' | 'facebook' | 'youtube' | 'whatsapp';
  label: string;
  href: string;
};

type HomePromoTile = {
  type: 'ad' | 'image' | 'video';
  label: string;
  title: string;
  copy?: string;
  image?: string;
  video?: string;
  poster?: string;
};

type FooterBenefit = {
  icon: string;
  title: string;
  copy: string;
};

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  totalProducts = 0;
  activeSlideIndex = 0;
  featuredProducts: ShowcaseProduct[] = [];
  moreProducts: ShowcaseProduct[] = [];
  collectionHighlights: CollectionHighlight[] = [];
  previewMedia: PreviewMedia | null = null;
  isJoinUsSubmitting = false;
  joinUsStatusMessage = '';
  joinUsStatusType: 'idle' | 'success' | 'error' = 'idle';

  readonly joinUsForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s()]{7,20}$/)]],
    email: ['', [Validators.required, Validators.email]]
  });

  readonly heroSlides: HomeHeroSlide[] = [
    {
      id: 'slide-01',
      label: 'Campaign / 01',
      titleLines: ['Out of', 'Office'],
      titleConnector: 'Leather',
      promoEyebrow: 'Premium leather essentials',
      promoTitle: 'Clean, easy, and ready to shop',
      promoCopy: 'Shop fast. Watch films. Browse easily on mobile.',
      image: 'assets/editorial/hero-man-belt.jpg',
      alt: 'Luxury editorial portrait with belt styling'
    },
    {
      id: 'slide-02',
      label: 'Campaign / 02',
      titleLines: ['Crafted', 'Motion'],
      titleConnector: 'for',
      promoEyebrow: 'Smooth video browsing',
      promoTitle: 'All films in the right order',
      promoCopy: 'Play, pause, preview, and download without broken video flow.',
      image: 'assets/editorial/hero-suit-portrait.jpg',
      alt: 'Tailored portrait for Oxoora campaign'
    },
    {
      id: 'slide-03',
      label: 'Campaign / 03',
      titleLines: ['Modern', 'Heritage'],
      titleConnector: 'meets',
      promoEyebrow: 'Simple and user friendly',
      promoTitle: 'Less text. Better product focus.',
      promoCopy: 'A cleaner path to products, About, and Vlog.',
      image: 'assets/editorial/flatlay-accessories.jpg',
      alt: 'Luxury accessories flatlay'
    }
  ];
  readonly promoTiles: HomePromoTile[] = [
    {
      type: 'ad',
      label: 'Ad',
      title: 'The Style Edit',
      copy: 'Clean leather, rich finishes, and sharper everyday picks.'
    },
    {
      type: 'image',
      label: 'Campaign',
      title: 'Leather in motion',
      image: 'assets/editorial/hero-suit-portrait.jpg'
    },
    {
      type: 'image',
      label: 'Travel',
      title: 'The City Carry',
      image: 'assets/editorial/flatlay-accessories.jpg'
    },
    {
      type: 'image',
      label: 'Craft',
      title: 'Buckle workshop',
      image: 'assets/editorial/workshop-buckles.jpg'
    },
    {
      type: 'image',
      label: 'Finish',
      title: 'Precision stitch',
      image: 'assets/editorial/western-belt-detail.jpg'
    }
  ];
  readonly footerBenefits: FooterBenefit[] = [
    {
      icon: '24',
      title: 'Reach out to us',
      copy: 'Quick help for product questions, styling support, and order guidance.'
    },
    {
      icon: '30',
      title: 'Easy returns',
      copy: 'A simpler shopping experience with confidence before and after purchase.'
    },
    {
      icon: '6Y',
      title: 'Warranty',
      copy: 'Craft-led materials and durable finishing made to last in daily wear.'
    },
    {
      icon: 'COD',
      title: 'Flexible delivery',
      copy: 'Smooth checkout guidance and delivery-friendly support across devices.'
    }
  ];
  readonly socialLinks: HomeSocialLink[] = [
    {
      icon: 'instagram',
      label: 'Instagram',
      href: 'https://instagram.com/oxoora'
    },
    {
      icon: 'facebook',
      label: 'Facebook',
      href: 'https://facebook.com/oxoora'
    },
    {
      icon: 'youtube',
      label: 'YouTube',
      href: 'https://youtube.com/@oxoora'
    },
    {
      icon: 'whatsapp',
      label: 'WhatsApp',
      href: 'https://wa.me/919999999999'
    }
  ];

  private slideIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly productCatalogService: ProductCatalogService,
    private readonly formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    this.startSlideRotation();

    this.productCatalogService.loadCatalog().subscribe((catalog) => {
      this.totalProducts = catalog.products.length;

      const categoryMap = new Map(catalog.categories.map((category) => [category.id, category]));
      const visibleCategories = catalog.categories.filter(
        (category) => category.showOnProductPage !== false
      );

      this.collectionHighlights = visibleCategories
        .map((category) => {
          const products = catalog.products.filter((product) => product.categories.includes(category.id));
          const leadProduct = products[0];

          if (!leadProduct) {
            return null;
          }

          return {
            ...category,
            image: leadProduct.image,
            leadProductName: leadProduct.name,
            price: leadProduct.price,
            productCount: products.length
          };
        })
        .filter((category): category is CollectionHighlight => category !== null);

      this.featuredProducts = catalog.products.slice(0, 6).map((product) => ({
        ...product,
        categoryTitle: this.getPrimaryCategoryTitle(product, categoryMap),
        preview: this.createProductPreview(product),
        downloadName: this.createDownloadName(product.name)
      }));

      this.moreProducts = catalog.products.slice(6, 10).map((product) => ({
        ...product,
        categoryTitle: this.getPrimaryCategoryTitle(product, categoryMap),
        preview: this.createProductPreview(product),
        downloadName: this.createDownloadName(product.name)
      }));
    });
  }

  ngOnDestroy(): void {
    this.stopSlideRotation();
  }

  selectSlide(index: number): void {
    if (index < 0 || index >= this.heroSlides.length) {
      return;
    }

    this.activeSlideIndex = index;
    this.restartSlideRotation();
  }

  nextSlide(): void {
    this.activeSlideIndex = (this.activeSlideIndex + 1) % this.heroSlides.length;
  }

  openPreview(media: PreviewMedia): void {
    this.previewMedia = media;
  }

  closePreview(): void {
    this.previewMedia = null;
  }

  submitJoinUs(): void {
    if (this.joinUsForm.invalid) {
      this.joinUsForm.markAllAsTouched();
      this.joinUsStatusType = 'error';
      this.joinUsStatusMessage = 'Please enter your name, phone number, and a valid email.';
      return;
    }

    this.isJoinUsSubmitting = true;
    this.joinUsStatusType = 'idle';
    this.joinUsStatusMessage = '';

    this.productCatalogService.submitJoinUs(this.joinUsForm.getRawValue()).subscribe({
      next: () => {
        this.joinUsForm.reset({
          name: '',
          phone: '',
          email: ''
        });
        this.joinUsStatusType = 'success';
        this.joinUsStatusMessage = 'Thanks. Your details have been saved.';
        this.isJoinUsSubmitting = false;
      },
      error: (error) => {
        this.joinUsStatusType = 'error';
        this.joinUsStatusMessage =
          error?.error?.message || 'Unable to save your details right now.';
        this.isJoinUsSubmitting = false;
      }
    });
  }

  private startSlideRotation(): void {
    this.stopSlideRotation();
    this.slideIntervalId = setInterval(() => this.nextSlide(), 5600);
  }

  private stopSlideRotation(): void {
    if (this.slideIntervalId !== null) {
      clearInterval(this.slideIntervalId);
      this.slideIntervalId = null;
    }
  }

  private restartSlideRotation(): void {
    this.startSlideRotation();
  }

  private getPrimaryCategoryTitle(
    product: ProductItem,
    categoryMap: Map<string, ProductCategory>
  ): string {
    const category = product.categories
      .map((categoryId) => categoryMap.get(categoryId))
      .find((item) => item?.showOnProductPage !== false);

    return category?.title ?? 'Signature Piece';
  }

  private createProductPreview(product: ProductItem): PreviewMedia {
    return {
      type: 'image',
      id: `${product.id}-preview`,
      label: 'Product Preview',
      title: product.name,
      copy: product.description,
      src: product.image,
      alt: product.name,
      downloadName: this.createDownloadName(product.name)
    };
  }

  private createDownloadName(name: string): string {
    return `oxoora-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.jpg`;
  }
}
