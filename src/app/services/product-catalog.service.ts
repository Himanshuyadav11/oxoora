import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PRODUCT_CATALOG_ASSET_PATH,
  ProductCatalogData
} from '../data/product-catalog';

export type JoinUsPayload = {
  name: string;
  phone: string;
  email: string;
};

@Injectable({
  providedIn: 'root'
})
export class ProductCatalogService {
  private readonly apiBase = resolveApiBase();

  constructor(private readonly http: HttpClient) {}

  loadCatalog(): Observable<ProductCatalogData> {
    return this.http
      .get<ProductCatalogData>(`${this.apiBase}/api/storefront/catalog`)
      .pipe(
        catchError(() =>
          this.http.get<ProductCatalogData>(
            `${PRODUCT_CATALOG_ASSET_PATH}?v=${Date.now()}`
          )
        )
      );
  }

  submitJoinUs(payload: JoinUsPayload): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiBase}/api/leads`, payload);
  }
}

function resolveApiBase(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  const { hostname, origin, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal && port === '4200') {
    return origin.replace(/:4200$/, ':4300');
  }

  return '';
}
