# Oxoora Hostinger VPS Deployment

## What changed

- The storefront now reads product data from the Node API instead of relying only on the static JSON file at runtime.
- Product data and `Join Us` submissions are stored in a SQLite database file under `data/oxoora.sqlite`.
- The admin dashboard can export lead submissions as an Excel file.
- Product uploads are stored under `product-uploads/`.

## Best Hostinger setup for this project

Use a Hostinger VPS with Docker enabled. This project now includes:

- `Dockerfile`
- `compose.yaml`
- `compose.hostinger.yaml`
- `.env.example`

This is the right fit because the app needs:

- a long-running Node server
- a writable database file
- persistent uploaded images
- simple future updates through Docker redeploys

## Files you will update later

- Product images uploaded from the admin dashboard go to `product-uploads/`
- The database file lives in `data/oxoora.sqlite`
- Initial seed data still comes from `src/assets/data/product-catalog.json` if the database is empty the first time the app starts

## Local production test

1. Copy `.env.example` to `.env`
2. Set `ADMIN_ID` and `ADMIN_PASSWORD`
3. Build and run with Docker:

```bash
docker compose up --build
```

4. Open:

- Storefront: `http://localhost:3000/`
- Admin: `http://localhost:3000/admin`

## Hostinger VPS flow

1. Create a VPS plan with Docker support
2. Push the production image to Docker Hub
3. Upload `compose.hostinger.yaml` and a filled `.env` file to the VPS
4. Set `IMAGE_NAME`, `ADMIN_ID`, and `ADMIN_PASSWORD`
5. Deploy with `compose.hostinger.yaml`
6. Mount persistent storage for:

- `/app/data`
- `/app/product-uploads`

## Future update workflow

For simple catalog changes later, you do not need to rebuild the Angular app.

1. Open `/admin`
2. Upload a new product image
3. Update the product details
4. Save

The site will start serving the updated data from the database and uploads directory.
