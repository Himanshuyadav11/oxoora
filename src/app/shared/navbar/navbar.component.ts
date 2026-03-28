import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  open = false;
  isScrolled = false;
  readonly promoItems = [
    'Refined Leather Essentials',
    'Motion-Led Campaign Reels',
    'Hand-Finished Buckle Details',
    'About, Blog, And Showcase'
  ];

  toggleMenu(): void {
    this.open = !this.open;
  }

  close(): void {
    this.open = false;
  }

  @HostListener('window:scroll')
  handleScroll(): void {
    this.isScrolled = window.scrollY > 16;
  }
}
