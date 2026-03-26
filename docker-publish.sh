#!/bin/sh
set -eu

IMAGE_NAME="${1:-}"
TAG="${2:-latest}"
PLATFORM="${3:-linux/amd64}"

if [ -z "$IMAGE_NAME" ]; then
  echo "Usage: ./docker-publish.sh yourdockerhubname/oxoora [tag] [platform]"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop first, then run this script again."
  exit 1
fi

FULL_TAG="${IMAGE_NAME}:${TAG}"

echo "Building ${FULL_TAG} ..."
docker build --platform "${PLATFORM}" -t "${FULL_TAG}" .

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
