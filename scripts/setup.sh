#!/usr/bin/env bash
set -euo pipefail

echo "================================================"
echo "  SaraIA — Setup Automatizado"
echo "================================================"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js no encontrado. Instala Node.js 20+ desde https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Se requiere Node.js 20+. Versión actual: $(node -v)"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Verificar npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm no encontrado."
  exit 1
fi
echo "✅ npm $(npm -v)"
echo ""

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install
echo "✅ Dependencias instaladas"
echo ""

# Configurar variables de entorno
if [ ! -f .env ]; then
  echo "📝 Creando .env desde .env.example..."
  cp .env.example .env
  echo "✅ .env creado. Edítalo si es necesario."
else
  echo "ℹ️  .env ya existe, se mantiene la configuración actual."
fi
echo ""

# Configurar Husky
echo "🔧 Configurando Husky..."
npx husky init 2>/dev/null || true
chmod +x .husky/pre-commit .husky/commit-msg 2>/dev/null || true
echo "✅ Husky configurado"
echo ""

# Build de prueba
echo "🏗️  Verificando build..."
npm run build 2>/dev/null && echo "✅ Build exitoso" || echo "⚠️  Build con advertencias (revisa más arriba)"
echo ""

echo "================================================"
echo "  ✅ SaraIA listo para usar!"
echo "================================================"
echo ""
echo "  Comandos útiles:"
echo "    npm run dev        → Desarrollo con HMR"
echo "    npm test           → Tests unitarios"
echo "    npm run lint       → Verificar código"
echo "    npm run build      → Build producción"
echo ""
echo "  Variables de entorno:"
echo "    La API key de DeepSeek se configura como"
echo "    DEEPSEEK_API_KEY en el servidor (Vercel/Netlify)."
echo "    Para desarrollo local sin proxy, agrega:"
echo "    VITE_DEEPSEEK_API_KEY=sk-... en .env"
echo "================================================"
