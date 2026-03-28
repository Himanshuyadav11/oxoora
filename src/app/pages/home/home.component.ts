import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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
};

type HomeFeatureCard = ProductItem & {
  categoryTitle: string;
  mediaType: 'image' | 'video';
  mediaSrc: string;
  mediaPoster: string;
  cardLabel: string;
  cardHeadline: string;
};

type HomeSocialLink = {
  icon: 'instagram' | 'facebook' | 'youtube' | 'whatsapp';
  label: string;
  href: string;
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
  topProducts: ShowcaseProduct[] = [];
  bottomProducts: ShowcaseProduct[] = [];
  homeFeatureCards: HomeFeatureCard[] = [];
  collectionHighlights: CollectionHighlight[] = [];
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
      promoTitle: 'Clean, simple, and easy to browse',
      promoCopy: 'All products now sit on the home page for faster browsing.',
      image: 'assets/editorial/hero-man-belt.jpg',
      alt: 'Luxury editorial portrait with belt styling'
    },
    {
      id: 'slide-02',
      label: 'Campaign / 02',
      titleLines: ['Crafted', 'Form'],
      titleConnector: 'for',
      promoEyebrow: 'Premium styling direction',
      promoTitle: 'Simple browsing with stronger focus',
      promoCopy: 'The home page keeps products easy to scan without extra layout clutter.',
      image: 'assets/editorial/hero-suit-portrait.jpg',
      alt: 'Tailored portrait for Oxoora campaign'
    },
    {
      id: 'slide-03',
      label: 'Campaign / 03',
      titleLines: ['Modern', 'Heritage'],
      titleConnector: 'meets',
      promoEyebrow: 'Simple and user friendly',
      promoTitle: 'Fewer buttons. Better product focus.',
      promoCopy: 'A cleaner path through products, brand story, and films.',
      image: 'assets/editorial/flatlay-accessories.jpg',
      alt: 'Luxury accessories flatlay'
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

      const mappedProducts = catalog.products.map((product) => ({
        ...product,
        categoryTitle: this.getPrimaryCategoryTitle(product, categoryMap)
      }));

      const firstRowCount = Math.min(4, mappedProducts.length);
      this.topProducts = mappedProducts.slice(0, firstRowCount);
      this.bottomProducts = mappedProducts.slice(firstRowCount);

      const selectedFeatureProducts = catalog.products.filter((product) => product.showOnHomePage);
      const stripSource = selectedFeatureProducts.length > 0
        ? selectedFeatureProducts.slice(0, 5)
        : catalog.products.slice(0, 5);

      this.homeFeatureCards = stripSource.map((product, index) =>
        this.createHomeFeatureCard(product, categoryMap, selectedFeatureProducts.length === 0, index)
      );
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

  private createHomeFeatureCard(
    product: ProductItem,
    categoryMap: Map<string, ProductCategory>,
    useFallbackMedia: boolean,
    index: number
  ): HomeFeatureCard {
    const fallback = FALLBACK_MEDIA_STRIP[index % FALLBACK_MEDIA_STRIP.length];
    const categoryTitle = this.getPrimaryCategoryTitle(product, categoryMap);
    const usesVideo =
      product.homeMediaType === 'video' &&
      typeof product.homeMediaPath === 'string' &&
      product.homeMediaPath.trim().length > 0;

    const mediaType = usesVideo ? 'video' : (useFallbackMedia ? fallback.mediaType : 'image');
    const mediaSrc =
      product.homeMediaPath?.trim() ||
      (useFallbackMedia ? fallback.src : product.image);
    const mediaPoster =
      product.homeMediaPoster?.trim() ||
      (useFallbackMedia ? fallback.poster : product.image);

    return {
      ...product,
      categoryTitle,
      mediaType,
      mediaSrc,
      mediaPoster,
      cardLabel: product.homeCopy || categoryTitle,
      cardHeadline: product.homeHeadline || product.name
    };
  }
}

const FALLBACK_MEDIA_STRIP: Array<{
  mediaType: 'image' | 'video';
  src: string;
  poster: string;
}> = [
  {
    mediaType: 'image',
    src: 'assets/images/life.jpg',
    poster: 'assets/images/life.jpg'
  },
  {
    mediaType: 'video',
    src: 'assets/video/hero.mp4',
    poster: 'assets/images/hero.jpg'
  },
  {
    mediaType: 'video',
    src: 'assets/video/v1.mp4',
    poster: 'assets/editorial/hero-suit-portrait.jpg'
  },
  {
    mediaType: 'image',
    src: 'assets/editorial/dark-suit-portrait.jpg',
    poster: 'assets/editorial/dark-suit-portrait.jpg'
  },
  {
    mediaType: 'video',
    src: 'assets/video/style-close-up.mp4',
    poster: 'assets/editorial/workshop-buckles.jpg'
  }
];
