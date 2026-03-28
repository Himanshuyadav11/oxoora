import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { ATELIER_CLIPS, BRAND_FILMS, BrandFilm } from '../../data/brand-media';

type StyleNote = {
  title: string;
  copy: string;
};

@Component({
  selector: 'app-vlog',
  templateUrl: './vlog.component.html',
  styleUrls: ['./vlog.component.css']
})
export class VlogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('heroPlayer') heroPlayer?: ElementRef<HTMLVideoElement>;
  @ViewChildren('previewPlayer') previewPlayers?: QueryList<ElementRef<HTMLVideoElement>>;

  activeFilmIndex = 0;
  loadedFilmIds = new Set<string>([BRAND_FILMS[0].id]);

  readonly films = BRAND_FILMS;
  readonly clips = ATELIER_CLIPS;
  readonly notes: StyleNote[] = [
    {
      title: 'Load only what matters first',
      copy: 'The active film gets playback priority. Hover previews remain optional so the page feels faster on slower connections.'
    },
    {
      title: 'Use motion as proof of quality',
      copy: 'The reel supports the product story by showing material texture, buckle finish, and styling detail up close.'
    },
    {
      title: 'Keep the sequence obvious',
      copy: 'Videos are labeled and navigable in order, so the second film and every film after it has a predictable place to load and play.'
    }
  ];

  get activeFilm(): BrandFilm {
    return this.films[this.activeFilmIndex];
  }

  ngAfterViewInit(): void {
    this.syncActiveVideo(true);
  }

  ngOnDestroy(): void {
    this.pauseAllPreviewPlayers();
  }

  selectFilm(index: number): void {
    if (index < 0 || index >= this.films.length) {
      return;
    }

    this.activeFilmIndex = index;
    this.loadedFilmIds.add(this.activeFilm.id);
    this.pauseAllPreviewPlayers();
    this.syncActiveVideo(true);
  }

  playPreview(index: number): void {
    if (!this.canHoverPreview()) {
      return;
    }

    const film = this.films[index];

    if (!film) {
      return;
    }

    this.loadedFilmIds.add(film.id);

    setTimeout(() => {
      const previewPlayer = this.getPreviewPlayer(index);

      if (!previewPlayer) {
        return;
      }

      previewPlayer.currentTime = 0;
      const playAttempt = previewPlayer.play();
      playAttempt?.catch(() => undefined);
    });
  }

  stopPreview(index: number): void {
    const previewPlayer = this.getPreviewPlayer(index);

    if (!previewPlayer) {
      return;
    }

    previewPlayer.pause();
    previewPlayer.currentTime = 0;
  }

  private syncActiveVideo(autoplay: boolean): void {
    setTimeout(() => {
      const player = this.heroPlayer?.nativeElement;

      if (!player) {
        return;
      }

      player.pause();
      player.currentTime = 0;
      player.load();

      if (!autoplay) {
        return;
      }

      const playAttempt = player.play();
      playAttempt?.catch(() => undefined);
    });
  }

  private pauseAllPreviewPlayers(): void {
    this.previewPlayers?.forEach((playerRef) => {
      const player = playerRef.nativeElement;
      player.pause();
      player.currentTime = 0;
    });
  }

  private getPreviewPlayer(index: number): HTMLVideoElement | undefined {
    return this.previewPlayers?.get(index)?.nativeElement;
  }

  private canHoverPreview(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  }
}
