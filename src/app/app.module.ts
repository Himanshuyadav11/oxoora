import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AboutComponent } from './pages/about/about.component';
import { HomeComponent } from './pages/home/home.component';
import { ProductPreviewComponent } from './pages/product-preview/product-preview.component';
import { ProductsComponent } from './pages/products/products.component';
import { VlogComponent } from './pages/vlog/vlog.component';
import { ParallaxDirective } from './shared/directives/parallax.directive';
import { RevealOnScrollDirective } from './shared/directives/reveal-on-scroll.directive';
import { LoaderComponent } from './shared/loader/loader.component';
import { MediaLightboxComponent } from './shared/media-lightbox/media-lightbox.component';
import { NavbarComponent } from './shared/navbar/navbar.component';

@NgModule({
  declarations: [
    AppComponent,
    AboutComponent,
    HomeComponent,
    ProductsComponent,
    ProductPreviewComponent,
    VlogComponent,
    RevealOnScrollDirective,
    ParallaxDirective,
    LoaderComponent,
    MediaLightboxComponent,
    NavbarComponent
  ],
  imports: [BrowserModule, HttpClientModule, ReactiveFormsModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
