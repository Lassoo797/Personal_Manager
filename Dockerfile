# Použijeme oficiálny Node.js obraz verzie 22
FROM node:22-alpine AS base

# Nastavíme pracovný priečok vnútri kontajnera
WORKDIR /app

# Nainštalujeme Git
RUN apk update && apk add git

# Skopírujeme package.json, aby sme mohli nainštalovať závislosti
COPY package.json ./

# Nainštalujeme závislosti s príznakom pre vyriešenie konfliktov
RUN npm install --legacy-peer-deps

# Skopírujeme zvyšok kódu aplikácie
COPY . .

# Sprístupníme port 3000, na ktorom beží aplikácia
EXPOSE 3000

# Príkaz, ktorý sa spustí pri štarte kontajnera
CMD ["npm", "run", "dev"]