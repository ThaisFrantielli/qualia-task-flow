#!/bin/bash

echo "========================================"
echo " Iniciando Servico WhatsApp Quality"
echo "========================================"
echo ""

# Navegar para o diretório do script
cd "$(dirname "$0")"

echo "[1/3] Verificando instalacao do Node.js..."
if ! command -v node &> /dev/null; then
    echo "ERRO: Node.js nao encontrado!"
    echo "Por favor, instale o Node.js em https://nodejs.org/"
    exit 1
fi

echo "[2/3] Instalando dependencias..."
npm install

echo ""
echo "[3/3] Iniciando servico WhatsApp..."
echo ""
echo "========================================"
echo " Servico iniciado! Aguarde o QR Code..."
echo "========================================"
echo ""
echo "Acesse: http://localhost:3005/qr-view"
echo ""
echo "Pressione Ctrl+C para encerrar o servico"
echo ""

npm start
