import {
  AfterViewInit,
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2
} from '@angular/core';

@Directive({
  selector: '[appReveal]'
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  @Input() appRevealDelay = 0;

  private observer: IntersectionObserver | null = null;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngAfterViewInit(): void {
    const element = this.elementRef.nativeElement;

    this.renderer.addClass(element, 'reveal-ready');
    this.renderer.setStyle(element, '--reveal-delay', `${this.appRevealDelay}ms`);

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      this.renderer.addClass(element, 'is-revealed');
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.renderer.addClass(element, 'is-revealed');
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.renderer.addClass(element, 'is-revealed');
            this.observer?.unobserve(element);
          }
        });
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.16
      }
    );

    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
