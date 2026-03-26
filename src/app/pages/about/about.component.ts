import { Component } from '@angular/core';
import { BRAND_IMAGES, PreviewMedia } from '../../data/brand-media';

type AboutPillar = {
  label: string;
  title: string;
  copy: string;
};

type AboutStep = {
  label: string;
  title: string;
  copy: string;
};

type AboutStat = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  previewMedia: PreviewMedia | null = null;

  readonly gallery = BRAND_IMAGES;
  readonly pillars: AboutPillar[] = [
    {
      label: 'Direction',
      title: 'Luxury without clutter',
      copy: 'The brand presentation is intentionally minimal so the leather, buckle finish, and silhouettes carry the experience.'
    },
    {
      label: 'Navigation',
      title: 'Fast to understand',
      copy: 'Home, About, and Vlog now connect naturally instead of sending visitors through scattered, confusing paths.'
    },
    {
      label: 'Performance',
      title: 'Motion used carefully',
      copy: 'Animations reveal sections smoothly, but media still loads in a disciplined way to keep the site responsive.'
    }
  ];

  readonly stats: AboutStat[] = [
    { value: '201', label: 'Premium visual decisions considered' },
    { value: '04', label: 'Campaign films woven into the story' },
    { value: '01', label: 'Consistent luxury design system' }
  ];

  readonly steps: AboutStep[] = [
    {
      label: '01',
      title: 'Start with the silhouette',
      copy: 'The interface uses sharp spacing, controlled typography, and darker contrast to echo a tailored wardrobe.'
    },
    {
      label: '02',
      title: 'Let materials speak',
      copy: 'Editorial imagery and motion are treated as proof of quality, not decoration added for its own sake.'
    },
    {
      label: '03',
      title: 'Keep the path obvious',
      copy: 'Every page offers a clear next move, so the user always knows whether to continue exploring, preview media, or return home.'
    }
  ];

  openPreview(media: PreviewMedia): void {
    this.previewMedia = media;
  }

  closePreview(): void {
    this.previewMedia = null;
  }
}
