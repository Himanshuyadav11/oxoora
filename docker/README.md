# Docker Setup

All main Docker files are now grouped in this folder.

## Files

- `Dockerfile`: production image build for Oxoora
- `compose.yaml`: local Docker Compose setup with persistent bind mounts
- `compose.hostinger.yaml`: Hostinger-friendly compose file using named volumes
- `.env.example`: sample environment values
- `.env.hostinger.example`: sample production environment values
- `publish.ps1`: PowerShell image build and push helper
- `publish.sh`: shell image build and push helper

## Local run

From the project root:

```powershell
docker compose -f docker/compose.yaml up --build
```

Or from inside this folder:

```powershell
docker compose up --build
```

The app will be available at `http://localhost:3000` and the admin page at
`http://localhost:3000/admin`.

## Persistent data

The local compose file reuses these existing folders from the project root:

- `../data`
- `../product-uploads`

That means product records and uploaded files stay available after restart.

## Note

The active `.dockerignore` still stays at the project root because Docker reads
ignore rules from the build context root, not from this folder.
