#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/root/qwen-arm64-deploy-20260323}"
BACKEND_IMAGE="${BACKEND_IMAGE:-qwen-aihub-backend:arm64}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-qwen-aihub-frontend:arm64}"
BACKEND_TAR="${BACKEND_TAR:-$APP_ROOT/qwen-aihub-backend-arm64.tar}"
FRONTEND_TAR="${FRONTEND_TAR:-$APP_ROOT/qwen-aihub-frontend-arm64.tar}"
FRONTEND_CONF="${FRONTEND_CONF:-$APP_ROOT/nginx.host.conf}"
BACKEND_NAME="${BACKEND_NAME:-qwen-backend}"
FRONTEND_NAME="${FRONTEND_NAME:-qwen-frontend}"

require_docker() {
  command -v docker >/dev/null 2>&1 || {
    echo "docker is not installed or not in PATH" >&2
    exit 1
  }
}

ensure_image() {
  local image="$1"
  local archive="$2"

  if docker image inspect "$image" >/dev/null 2>&1; then
    return 0
  fi

  if [[ ! -f "$archive" ]]; then
    echo "missing image archive: $image / $archive" >&2
    exit 1
  fi

  echo "loading image: $image"
  docker load -i "$archive" >/dev/null
}

stop_containers() {
  docker rm -f "$FRONTEND_NAME" "$BACKEND_NAME" >/dev/null 2>&1 || true
}

wait_backend_health() {
  local i
  for i in $(seq 1 20); do
    if python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=5).status)" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "backend health check timed out" >&2
  docker logs "$BACKEND_NAME" --tail 50 >&2 || true
  exit 1
}

wait_frontend_health() {
  local i
  for i in $(seq 1 20); do
    if python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:3000', timeout=5).status)" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "frontend health check timed out" >&2
  docker logs "$FRONTEND_NAME" --tail 50 >&2 || true
  exit 1
}

start() {
  require_docker
  ensure_image "$BACKEND_IMAGE" "$BACKEND_TAR"
  ensure_image "$FRONTEND_IMAGE" "$FRONTEND_TAR"

  if [[ ! -f "$FRONTEND_CONF" ]]; then
    echo "missing frontend config: $FRONTEND_CONF" >&2
    exit 1
  fi

  stop_containers

  docker run -d \
    --name "$BACKEND_NAME" \
    --restart unless-stopped \
    --network host \
    "$BACKEND_IMAGE" >/dev/null

  docker run -d \
    --name "$FRONTEND_NAME" \
    --restart unless-stopped \
    --network host \
    --add-host backend:127.0.0.1 \
    -v "$FRONTEND_CONF:/etc/nginx/conf.d/default.conf:ro" \
    "$FRONTEND_IMAGE" >/dev/null

  wait_backend_health
  wait_frontend_health
  status
}

status() {
  docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E "NAMES|$BACKEND_NAME|$FRONTEND_NAME" || true
}

health() {
  echo "backend:"
  python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=10).read().decode())"
  echo "frontend:"
  python3 -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:3000/api/health', timeout=10).read().decode())"
}

logs() {
  case "${2:-all}" in
    backend)
      docker logs -f "$BACKEND_NAME"
      ;;
    frontend)
      docker logs -f "$FRONTEND_NAME"
      ;;
    all)
      docker logs "$BACKEND_NAME" --tail 50 || true
      echo
      docker logs "$FRONTEND_NAME" --tail 50 || true
      ;;
    *)
      echo "usage: $0 logs [backend|frontend|all]" >&2
      exit 1
      ;;
  esac
}

case "${1:-status}" in
  start)
    start
    ;;
  stop)
    stop_containers
    status
    ;;
  restart)
    stop_containers
    start
    ;;
  status)
    status
    ;;
  health)
    health
    ;;
  logs)
    logs "$@"
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|health|logs [backend|frontend|all]}" >&2
    exit 1
    ;;
esac
