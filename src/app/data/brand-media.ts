export type BrandFilm = {
  id: string;
  order: number;
  label: string;
  title: string;
  copy: string;
  src: string;
  poster: string;
  thumbnail: string;
  downloadName: string;
  durationLabel: string;
};

export type BrandImage = {
  id: string;
  label: string;
  title: string;
  copy: string;
  src: string;
  alt: string;
  downloadName: string;
};

export type BrandClip = {
  id: string;
  label: string;
  title: string;
  copy: string;
  src: string;
  poster: string;
};

export type PreviewMedia =
  | ({
      type: 'video';
      poster?: string;
    } & Pick<BrandFilm, 'id' | 'label' | 'title' | 'copy' | 'src' | 'downloadName'>)
  | ({
      type: 'image';
    } & Pick<BrandImage, 'id' | 'label' | 'title' | 'copy' | 'src' | 'alt' | 'downloadName'>);

export const BRAND_FILMS: BrandFilm[] = [
  {
    id: 'film-01',
    order: 1,
    label: 'Campaign 01',
    title: 'Obsidian Entry',
    copy: 'Clean black leather, controlled lighting, and close-range movement built to feel precise and expensive.',
    src: 'assets/product%20videso/product%20v1.mp4',
    poster: 'assets/editorial/hero-man-belt.jpg',
    thumbnail: 'assets/product%20image/p1.jpg',
    downloadName: 'oxoora-obsidian-entry.mp4',
    durationLabel: '01 / Motion'
  },
  {
    id: 'film-02',
    order: 2,
    label: 'Campaign 02',
    title: 'Saddle Drift',
    copy: 'Warm leather tones and slower product passes give the second film a softer, more editorial rhythm.',
    src: 'assets/product%20videso/product%20v2.mp4',
    poster: 'assets/editorial/flatlay-accessories.jpg',
    thumbnail: 'assets/product%20image/p2.jpg',
    downloadName: 'oxoora-saddle-drift.mp4',
    durationLabel: '02 / Motion'
  },
  {
    id: 'film-03',
    order: 3,
    label: 'Campaign 03',
    title: 'Foundry Detail',
    copy: 'Macro detail, buckle emphasis, and darker tonal grading move the page into a more luxury-craft direction.',
    src: 'assets/product%20videso/product%20v3.mp4',
    poster: 'assets/editorial/western-belt-detail.jpg',
    thumbnail: 'assets/product%20image/p4.jpg',
    downloadName: 'oxoora-foundry-detail.mp4',
    durationLabel: '03 / Motion'
  },
  {
    id: 'film-04',
    order: 4,
    label: 'Campaign 04',
    title: 'Heritage Finish',
    copy: 'The final sequence lands on texture, edge paint, and hardware polish to close the reel with material focus.',
    src: 'assets/product%20videso/product%20v4.mp4',
    poster: 'assets/editorial/dark-suit-portrait.jpg',
    thumbnail: 'assets/product%20image/p8.jpg',
    downloadName: 'oxoora-heritage-finish.mp4',
    durationLabel: '04 / Motion'
  }
];

export const BRAND_IMAGES: BrandImage[] = [
  {
    id: 'image-01',
    label: 'Editorial',
    title: 'After-dark tailoring',
    copy: 'Sharper contrast and cleaner silhouettes establish the brand as premium without adding visual clutter.',
    src: 'assets/editorial/dark-suit-portrait.jpg',
    alt: 'Dark tailored portrait with luxury accessories',
    downloadName: 'oxoora-after-dark-tailoring.jpg'
  },
  {
    id: 'image-02',
    label: 'Material',
    title: 'Tabletop accessories',
    copy: 'A high-end flatlay helps the catalog feel collected, styled, and gift-ready.',
    src: 'assets/editorial/flatlay-accessories.jpg',
    alt: 'Luxury accessories flatlay',
    downloadName: 'oxoora-tabletop-accessories.jpg'
  },
  {
    id: 'image-03',
    label: 'Craft',
    title: 'Buckle workshop',
    copy: 'Close hardware shots add credibility and balance the polished campaign mood with process.',
    src: 'assets/editorial/workshop-buckles.jpg',
    alt: 'Workshop table with belt buckles',
    downloadName: 'oxoora-buckle-workshop.jpg'
  },
  {
    id: 'image-04',
    label: 'Detail',
    title: 'Western edge',
    copy: 'A tighter crop makes the leather grain and buckle finish easier to read on small and large screens.',
    src: 'assets/editorial/western-belt-detail.jpg',
    alt: 'Western-style belt detail close-up',
    downloadName: 'oxoora-western-edge.jpg'
  }
];

export const ATELIER_CLIPS: BrandClip[] = [
  {
    id: 'atelier-01',
    label: 'Atelier',
    title: 'Pattern preparation',
    copy: 'Short-form workshop footage keeps the brand story tactile and grounded.',
    src: 'assets/video/tailor-patterns.mp4',
    poster: 'assets/editorial/workshop-buckles.jpg'
  },
  {
    id: 'atelier-02',
    label: 'Finish',
    title: 'Close-up styling',
    copy: 'Luxury movement used sparingly gives the page polish without slowing it down.',
    src: 'assets/video/style-close-up.mp4',
    poster: 'assets/editorial/hero-suit-portrait.jpg'
  },
  {
    id: 'atelier-03',
    label: 'Craft',
    title: 'Stitching rhythm',
    copy: 'Precise macro footage helps the materials feel authentic rather than overly staged.',
    src: 'assets/video/tailor-stitching.mp4',
    poster: 'assets/editorial/western-belt-detail.jpg'
  }
];
