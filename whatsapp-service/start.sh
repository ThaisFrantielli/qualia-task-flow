#!/bin/bash

# Script de inicialização rápida do serviço WhatsApp
# Uso: ./start.sh

echo "╔════════════════════════════════════════════════════╗"
echo "║     WhatsApp Service - Inicialização Rápida       ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script de dentro da pasta whatsapp-service"
    echo "   cd whatsapp-service && ./start.sh"
    exit 1
fi

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Erro: Node.js não está instalado"
    echo "   Instale o Node.js: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js encontrado: $(node -v)"
echo ""

# Verificar se dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

echo "🚀 Iniciando serviço WhatsApp na porta 3005..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Iniciar o serviço
npm start
