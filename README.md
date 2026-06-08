# 🗡️ The Killer App

Plataforma web integral para la gestión y organización del clásico juego de rol en vivo "El Asesino" (The Killer). 

Esta aplicación automatiza la asignación de objetivos, el reparto de misiones, el registro de eliminaciones y la puntuación de los participantes, eliminando los "bugs" tradicionales del juego mediante un sistema de reasignación dinámica de misiones y un muro social interactivo.

## 🛠️ Stack Tecnológico

El proyecto está dividido en dos servicios principales, orquestados mediante contenedores para facilitar su despliegue en cualquier entorno:

*   **Frontend:** React 19 + TypeScript + Vite
*   **Backend:** Node.js 20 + Express + TypeScript + Knex.js
*   **Base de Datos:** MySQL 8.0
*   **Infraestructura:** Docker & Docker Compose

---

## 📋 Requisitos Previos

Para ejecutar este proyecto en desarrollo o producción, solo necesitas tener instalado en tu máquina:
*   [Docker](https://www.docker.com/)
*   [Docker Compose](https://docs.docker.com/compose/)
*   Git

No es necesario instalar Node.js ni MySQL localmente, ya que todo se ejecuta de forma aislada dentro de los contenedores.

---

## 🚀 Instalación y Arranque (Desarrollo)

1. **Clonar el repositorio**
```bash
   git clone <URL_DE_TU_REPOSITORIO>
   cd killer-app

```

2. **Configurar las variables de entorno**
En la carpeta `backend/`, copia el archivo de ejemplo (si existe) o crea un archivo `.env` con las variables necesarias:

```env
   DB_HOST=database
   DB_USER=killer_user
   DB_PASSWORD=killer_password
   DB_NAME=killer_game
   JWT_SECRET=CambiaEstaClavePorUnaSegura
   PORT=5000

```

3. **Levantar la infraestructura**
Ejecuta el siguiente comando en la raíz del proyecto para descargar las imágenes, compilar los servicios y levantar la base de datos:

```bash
   docker compose up --build

```

*Nota: El backend ejecutará las migraciones de la base de datos de forma automática antes de arrancar. Si es la primera vez, las tablas se crearán solas.*

**Endpoints de acceso local:**

* Frontend (App): `http://localhost:3000`
* Backend (API): `http://localhost:5000`

---

## 👑 Creación del Administrador Maestro

Para poder crear Ediciones del juego y gestionar la plataforma, necesitas un usuario con privilegios de Administrador.

Hemos incluido un script por consola de comandos (CLI) para que puedas generarlo fácilmente sin tocar la base de datos. Con los contenedores en ejecución, abre una nueva terminal en la raíz del proyecto y ejecuta el siguiente comando:

```bash
docker compose exec backend npm run create-admin <email> <contraseña> ["Nombre del Admin"]

```

**Ejemplo de uso:**

```bash
docker compose exec backend npm run create-admin admin@thekiller.com Secreta123 "El Gran Jefe"

```

Si el usuario no existe, se creará desde cero. Si el correo ya está registrado en la base de datos, el script simplemente actualizará sus permisos a Administrador.

---

## 📂 Estructura del Proyecto

```text
killer-app/
├── backend/               # API RESTful en Node.js/Express
│   ├── migrations/        # Historial de tablas de base de datos (Knex)
│   ├── src/
│   │   ├── controllers/   # Lógica de negocio (Autenticación, Misiones, etc.)
│   │   ├── middlewares/   # Protección de rutas (JWT, Roles)
│   │   ├── routes/        # Definición de Endpoints
│   │   ├── scripts/       # Scripts CLI (Generador de Admin)
│   │   └── db.ts          # Conexión a MySQL
│   ├── Dockerfile.dev
│   └── package.json
├── frontend/              # Interfaz de Usuario en React
│   ├── src/
│   ├── Dockerfile.dev
│   └── package.json
├── docker-compose.yml     # Orquestación de contenedores
└── README.md

```

## 📜 Licencia

Pendiente

```</URL_DE_TU_REPOSITORIO>

```