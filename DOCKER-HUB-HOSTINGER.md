# Docker Hub to Hostinger flow

This project ships as one production image.

That image contains:

- the Angular storefront
- the Node API
- the admin panel

The database is SQLite and lives in the mounted `/app/data` volume, so it is not a separate database image.

## 1. Build and push to Docker Hub

PowerShell:

```powershell
docker login
.\docker-publish.ps1 -ImageName yourdockerhubname/oxoora -Tag v1
```

Shell:

```bash
docker login
./docker-publish.sh yourdockerhubname/oxoora v1
```

Those scripts push both:

- `yourdockerhubname/oxoora:v1`
- `yourdockerhubname/oxoora:latest`

By default they build a Linux `amd64` image, which is the safest target for a typical Hostinger VPS deployment.

## 2. Prepare the Hostinger VPS files

Upload these files to the VPS:

- `compose.hostinger.yaml`
- `.env`

Example `.env`:

```env
IMAGE_NAME=yourdockerhubname/oxoora:v1
PORT=3000
ADMIN_ID=your-admin-id
ADMIN_PASSWORD=your-strong-password
```

## 3. Deploy on Hostinger

Run this on the VPS:

```bash
docker compose -f compose.hostinger.yaml --env-file .env pull
docker compose -f compose.hostinger.yaml --env-file .env up -d
```

## 4. Future update flow

For code or design changes:

1. update the project
2. build and push a new image tag
3. change `IMAGE_NAME` on the VPS if you want to use the new tag
4. run the same `pull` and `up -d` commands again

For product, image, and lead data changes through `/admin`:

- no image rebuild is normally needed
- data stays in the Docker volumes
