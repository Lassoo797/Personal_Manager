# Použijeme oficiálny Node.js obraz verzie 22
FROM node:22-alpine AS base

# Nastavíme pracovný priečok vnútri kontajnera
WORKDIR /app

# Nainštalujeme Git
RUN apk update && apk add git

# Skopírujeme package.json a package-lock.json z koreňového adresára kontextu
# Je dobré kopírovať aj lock súbor pre konzistentné inštalácie
COPY package*.json ./

# Nainštalujeme závislosti
RUN npm install --legacy-peer-deps

# Skopírujeme celý priečinok src do kontajnera, do priečinka /app/src
COPY src/ ./src/

# Skopírujeme ostatné dôležité súbory z koreňového adresára
COPY index.html .
COPY vite.config.ts .
COPY tsconfig.json .

# Sprístupníme port 3000, na ktorom beží aplikácia
EXPOSE 3000

# Príkaz, ktorý sa spustí pri štarte kontajnera
CMD ["npm", "run", "dev"]