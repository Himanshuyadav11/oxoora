import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { ATELIER_CLIPS, BRAND_FILMS, BrandFilm, PreviewMedia } from '../../data/brand-media';

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
  previewMedia: PreviewMedia | null = null;
  isMainPlaying = false;
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

  toggleActivePlayback(): void {
    const player = this.heroPlayer?.nativeElement;

    if (!player) {
      return;
    }

    if (player.paused) {
      const playAttempt = player.play();
      playAttempt?.catch(() => {
        this.isMainPlaying = false;
      });
      return;
    }

    player.pause();
    this.isMainPlaying = false;
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

  openFilmPreview(film: BrandFilm): void {
    this.previewMedia = {
      type: 'video',
      id: film.id,
      label: film.label,
      title: film.title,
      copy: film.copy,
      src: film.src,
      poster: film.poster,
      downloadName: film.downloadName
    };
  }

  closePreview(): void {
    this.previewMedia = null;
  }

  trackActiveState(state: boolean): void {
    this.isMainPlaying = state;
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
        this.isMainPlaying = false;
        return;
      }

      const playAttempt = player.play();
      playAttempt
        ?.then(() => {
          this.isMainPlaying = true;
        })
        .catch(() => {
          this.isMainPlaying = false;
        });
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
