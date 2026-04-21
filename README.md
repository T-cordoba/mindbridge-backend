# MindBridge — Backend

**Plataforma Web de Bienestar Emocional Asistida por Inteligencia Artificial**

> Un puente entre la introspección diaria y la ayuda profesional.

---

## Descripción del proyecto

MindBridge es una aplicación web diseñada para cubrir el vacío entre el autoconocimiento personal y la terapia clínica. Funciona como un **diario reflexivo inteligente** que utiliza IA conversacional para facilitar la introspección y el desahogo del usuario en un entorno seguro y privado.

A diferencia de un chat genérico, MindBridge actúa como un espejo: devuelve al usuario sus propias emociones para ayudarlo a entenderlas mejor. Su característica más importante es el **módulo de seguridad activa**: el sistema monitorea el nivel de riesgo en tiempo real y, si detecta una crisis aguda o ideación suicida, bloquea el chat y activa un protocolo que conecta al usuario con recursos de ayuda profesional inmediatamente.

---

## Objetivos

- **Higiene mental diaria** — Una herramienta de escritura reflexiva con feedback inteligente para ordenar el ruido de los pensamientos cotidianos.
- **Red de seguridad** — La IA actúa como primer filtro de contención, detectando cuándo la introspección no es suficiente y se requiere intervención clínica.
- **Desestigmatización** — Normalizar el paso del desahogo a la terapia mediante un puente suave hacia un directorio de profesionales.

---

## Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Diario con IA** | Chat reflexivo entrenado para hacer preguntas que profundizan la introspección, sin dar consejos clínicos. Genera un título automático para cada sesión. |
| **Retrato emocional** | Cada respuesta de la IA actualiza un estado emocional acumulativo (no por mensaje individual), con inercia para reflejar la evolución real del estado de ánimo. |
| **Dashboard emocional** | Visualización de emociones promedio, frecuencia y tendencia de alertas en los últimos 30 días. |
| **Protocolo de crisis** | Detección automática de riesgo (escala 0–5). En nivel 5, el chat se bloquea y se despliega un aviso de crisis con recursos de ayuda. En niveles 3–4, la IA incluye recordatorios de que es una IA y guía al usuario a la Red de Apoyo. |
| **Red de apoyo** | Directorio de psicólogos para conectar al usuario con profesionales cuando lo necesita. |
| **Autenticación** | Registro, login y eliminación de cuenta con JWT. Requiere aceptación de descargo de responsabilidad en el registro. |

---

## Stack técnico

**Backend (este repositorio)**

- Node.js + Express (CommonJS, sin build step)
- PostgreSQL via `pg`
- JWT (`jsonwebtoken`) — sin sesión, sin refresh token
- Together AI — modelo `openai/gpt-oss-20b` vía API
- Swagger UI en `/api/docs`
- Clean Architecture: `domain` → `application` → `infrastructure` → `interfaces`

**Frontend** — [mindbridge-frontend](https://github.com/T-cordoba/mindbridge-frontend)

- Next.js 15, App Router, TypeScript
- Tailwind CSS con design system por variables CSS
- Recharts para el dashboard

---

## Ejecución con Docker

### Prerequisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Una cuenta en [Together AI](https://www.together.ai/) para obtener el API key

### 1. Clonar los repositorios

Ambos repositorios deben estar **en la misma carpeta padre**:

```bash
# Clonar el backend
git clone https://github.com/T-cordoba/mindbridge-backend

# Clonar el frontend (si no lo tienes)
git clone https://github.com/T-cordoba/mindbridge-frontend
```

La estructura debe quedar así:

```
carpeta-padre/
├── mindbridge-backend/
└── mindbridge-frontend/
```

### 2. Configurar variables de entorno

Dentro de `mindbridge-backend/`, crea el archivo `.env` a partir del ejemplo:

```bash
cp .env.example .env
```

Edita `.env` y completa los valores obligatorios:

```env
# PostgreSQL — elige la contraseña que quieras, Docker creará la instancia con ella
DB_PASSWORD=elige_una_contraseña
DB_USER=postgres
DB_NAME=mindbridge
DB_ADMIN_DATABASE=postgres
DB_PORT=5432

# JWT — genera un string largo y aleatorio
JWT_SECRET=un_string_secreto_largo_y_aleatorio
JWT_EXPIRES_IN=7d

# Together AI — obtén tu key en https://www.together.ai/
TOGETHER_API_KEY=tu_api_key_aqui
TOGETHER_MODEL=openai/gpt-oss-20b

# Configuración del servidor
PORT=4000
NODE_ENV=production

# Parámetros de la IA (valores recomendados)
COMPRESSION_THRESHOLD=20
CONTEXT_WINDOW=10
```

> **Nota sobre `DB_PASSWORD`:** Al correr con Docker, se crea una instancia nueva de PostgreSQL con la contraseña que definas aquí. Puedes poner cualquier valor — no necesitas tener PostgreSQL instalado localmente.

### 3. Levantar los servicios

Desde la carpeta `mindbridge-backend/`:

```bash
docker compose up --build
```

Docker levantará tres servicios en orden:

1. **`db`** — PostgreSQL 16. Espera a que esté listo antes de continuar.
2. **`backend`** — Ejecuta la migración inicial automáticamente y luego inicia la API en el puerto 4000.
3. **`frontend`** — Next.js en el puerto 3000.

### 4. Acceder a la aplicación

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api/docs |

Para detener los servicios:

```bash
docker compose down
```

Para detener y eliminar los datos de la base de datos:

```bash
docker compose down -v
```

---

## Aviso de seguridad

MindBridge aplica detección de crisis y bloqueo de sesión ante riesgo severo. **No sustituye la atención psicológica profesional.** Ante una emergencia de salud mental, contacta a un profesional o llama a una línea de crisis.
