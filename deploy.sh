#!/bin/bash
# ============================================
# SIGMA — Script de Deploy al VPS
# Uso: bash deploy.sh [backend|frontend|all]
# ============================================

set -e

TARGET=${1:-all}
COMPOSE="docker compose --env-file .env.production"

echo "======================================"
echo "  SIGMA Deploy — $(date '+%Y-%m-%d %H:%M')"
echo "  Target: $TARGET"
echo "======================================"

if [ "$TARGET" = "backend" ] || [ "$TARGET" = "all" ]; then
  echo ""
  echo "→ Rebuilding backend..."
  $COMPOSE build --no-cache backend
  $COMPOSE up -d backend
  echo "✓ Backend desplegado en :3000"
fi

if [ "$TARGET" = "frontend" ] || [ "$TARGET" = "all" ]; then
  echo ""
  echo "→ Rebuilding frontend..."
  $COMPOSE build --no-cache frontend
  $COMPOSE up -d frontend
  echo "✓ Frontend desplegado en :3001"
  echo ""
  echo "  IMPORTANTE: Los usuarios deben hacer Ctrl+Shift+R"
  echo "  para limpiar el cache del browser después de este deploy."
fi

echo ""
echo "→ Estado de los contenedores:"
$COMPOSE ps

echo ""
echo "======================================"
echo "  Deploy completado"
echo "======================================"
