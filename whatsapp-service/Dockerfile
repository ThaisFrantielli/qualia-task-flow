# Dockerfile para WhatsApp Service
# Baseado em Alpine Linux para imagem leve com Chromium para whatsapp-web.js

FROM node:18-alpine

# Instalar dependências do Chromium e ferramentas necessárias
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Configurar variáveis de ambiente para Puppeteer usar o Chromium do Alpine
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Criar diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretório para sessões WhatsApp
RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache && \
    chown -R node:node /app

# Trocar para usuário não-root
USER node

# Expor porta
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3005/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Usar dumb-init para lidar com sinais corretamente
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Comando para iniciar o serviço
CMD ["node", "simple-whatsapp-service.js"]
