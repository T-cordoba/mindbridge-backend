# MindBridge Backend

API de MindBridge construida con Node.js, Express y PostgreSQL.

Este repositorio contiene solo el backend.

## Stack

- Node.js + Express (CommonJS)
- PostgreSQL (`pg`)
- JWT (`jsonwebtoken`)
- Together AI
- Swagger (`/api/docs`)

## Requisitos

- Node.js 18+
- npm 9+
- PostgreSQL activo

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea el archivo de entorno:

```bash
cp .env.example .env
```

3. Completa variables en `.env` (minimo):

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mindbridge
DB_ADMIN_DATABASE=postgres
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu_jwt_secret
TOGETHER_API_KEY=tu_api_key
TOGETHER_MODEL=openai/gpt-oss-20b
```

## Scripts

```bash
npm run dev      # desarrollo con nodemon
npm run start    # produccion
npm run migrate  # ejecuta migracion inicial
```

## Endpoints utiles

- Health: `GET /api/health`
- Swagger UI: `GET /api/docs`
- Swagger JSON: `GET /api/docs.json`

## Estructura principal

```text
src/
  app.js
  server.js
  application/
  domain/
  infrastructure/
  interfaces/
```

## Nota de seguridad

MindBridge aplica deteccion de crisis y bloqueo de sesion cuando hay riesgo alto.
No sustituye atencion psicologica profesional.
