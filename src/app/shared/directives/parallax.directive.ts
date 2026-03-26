import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appParallax]'
})
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  @Input() appParallax = 0.08;

  private animationFrameId = 0;
  private isDestroyed = false;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    private readonly ngZone: NgZone
  ) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    this.renderer.setStyle(this.elementRef.nativeElement, 'will-change', 'transform');

    this.ngZone.runOutsideAngular(() => {
      const scheduleUpdate = () => {
        if (this.animationFrameId !== 0 || this.isDestroyed) {
          return;
        }

        this.animationFrameId = window.requestAnimationFrame(() => {
          this.animationFrameId = 0;
          this.updateTransform();
        });
      };

      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate, { passive: true });

      this.cleanup = () => {
        window.removeEventListener('scroll', scheduleUpdate);
        window.removeEventListener('resize', scheduleUpdate);
      };

      scheduleUpdate();
    });
  }

  private cleanup: (() => void) | null = null;

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.cleanup?.();

    if (this.animationFrameId !== 0 && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.animationFrameId);
    }
  }

  private updateTransform(): void {
    const element = this.elementRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const midpoint = rect.top + rect.height / 2;
    const distanceFromCenter = midpoint - viewportHeight / 2;
    const offset = Math.max(-42, Math.min(42, -distanceFromCenter * this.appParallax));

    this.renderer.setStyle(element, 'transform', `translate3d(0, ${offset}px, 0)`);
  }
}
