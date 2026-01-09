FROM node:18-alpine

# Instala Poppler para conversao de PDF
RUN apk add --no-cache poppler-utils

# Define diretorio de trabalho
WORKDIR /app

# Copia arquivos de configuracao primeiro (cache melhor)
COPY package*.json ./

# Instala dependencias
RUN npm install --production

# Copia o resto da aplicacao
COPY . .

# Cria pastas necessarias
RUN mkdir -p /app/output /app/logs

# Expose porta (nao usado diretamente, mas bom para debug)
EXPOSE 3000

# Define variaveis de ambiente padrao
ENV WATCH_FOLDER=/app/watch \
    OUTPUT_FOLDER=/app/output \
    LOG_FOLDER=/app/logs \
    LOG_LEVEL=info \
    JPEG_QUALITY=90 \
    DPI=300 \
    NODE_ENV=production

# Cria pasta de watch (se nao existir no volume)
RUN mkdir -p /app/watch

# Inicia a aplicacao
CMD ["npm", "start"]
