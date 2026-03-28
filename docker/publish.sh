#!/bin/sh
set -eu

IMAGE_NAME="${1:-}"
TAG="${2:-latest}"
PLATFORM="${3:-linux/amd64}"

if [ -z "$IMAGE_NAME" ]; then
  echo "Usage: ./publish.sh yourdockerhubname/oxoora [tag] [platform]"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop first, then run this script again."
  exit 1
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
DOCKERFILE="${SCRIPT_DIR}/Dockerfile"
FULL_TAG="${IMAGE_NAME}:${TAG}"

echo "Building ${FULL_TAG} ..."
docker build --platform "${PLATFORM}" -f "${DOCKERFILE}" -t "${FULL_TAG}" "${REPO_ROOT}"

if [ "$TAG" != "latest" ]; then
  echo "Tagging ${IMAGE_NAME}:latest ..."
  docker tag "${FULL_TAG}" "${IMAGE_NAME}:latest"
fi

echo "Pushing ${FULL_TAG} ..."
docker push "${FULL_TAG}"

if [ "$TAG" != "latest" ]; then
  echo "Pushing ${IMAGE_NAME}:latest ..."
  docker push "${IMAGE_NAME}:latest"
fi

echo "Done."
