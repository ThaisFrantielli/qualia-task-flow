#!/bin/bash

# Script para iniciar WhatsApp Service 24/7 no Linux/Mac
# Este script garante que o serviço rode continuamente

echo "╔════════════════════════════════════════════════╗"
echo "║  WhatsApp Service Auto-Start (24/7)            ║"
echo "║  Reconexão automática habilitada                ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")"

echo "📍 Localização: $(pwd)"
echo "📄 Usando arquivo: index-auto-reconnect.js"
echo ""

# Check dependencies
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Por favor instale Node.js"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo ""

# Create logs directory
mkdir -p logs

echo "🔄 Iniciando serviço com auto-restartng em caso de falha..."
echo ""

# Este loop garante que se o serviço morrer, ele reinicia automaticamente
while true; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando WhatsApp Service..."
    node index-auto-reconnect.js
    
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -ne 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  Serviço parou com código: $EXIT_CODE"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Reiniciando em 10 segundos..."
        sleep 10
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Serviço finalizado normalmente"
        break
    fi
done
