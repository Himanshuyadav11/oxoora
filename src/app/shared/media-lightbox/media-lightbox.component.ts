import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output
} from '@angular/core';
import { PreviewMedia } from '../../data/brand-media';

@Component({
  selector: 'app-media-lightbox',
  templateUrl: './media-lightbox.component.html',
  styleUrls: ['./media-lightbox.component.css']
})
export class MediaLightboxComponent implements OnChanges, OnDestroy {
  @Input() media: PreviewMedia | null = null;
  @Output() closed = new EventEmitter<void>();

  get imageAlt(): string {
    if (this.media?.type === 'image') {
      return this.media.alt;
    }

    return this.media?.title ?? '';
  }

  ngOnChanges(): void {
    this.syncDocumentState();
  }

  ngOnDestroy(): void {
    this.restoreDocumentState();
  }

  get isOpen(): boolean {
    return this.media !== null;
  }

  close(): void {
    this.restoreDocumentState();
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  private syncDocumentState(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('lightbox-open', this.isOpen);
  }

  private restoreDocumentState(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.remove('lightbox-open');
  }
}
