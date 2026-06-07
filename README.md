# Pieza a Pieza

Aplicacion para cursos de oposiciones de Orientacion Educativa en Castilla-La Mancha.

## Estado actual

- Codigo fuente: GitHub/local.
- Base de datos principal: Supabase propio.
- Proyecto Supabase: `pieza-a-pieza`.
- URL Supabase: `https://dzmdudgrnublxfdnqoqt.supabase.co`.
- Lovable no es necesario para levantar ni probar el proyecto en local.

## Requisitos

- Node.js compatible con el proyecto.
- npm.
- Acceso al proyecto Supabase propio.

Instalacion:

```bash
npm ci
```

Desarrollo local:

```bash
npm run dev
```

Validacion:

```bash
npx tsc --noEmit
npm run build
npm run lint
```

Arranque de produccion local:

```bash
npm run build
npm run start
```

Por defecto escucha en `0.0.0.0:3000`. Puedes cambiarlo con `HOST` y `PORT`.

## Variables de entorno

Crea un archivo `.env` local. No debe subirse a Git.

Variables necesarias:

```bash
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
AI_GATEWAY_API_KEY=
AI_GATEWAY_BASE_URL=https://api.openai.com/v1
PIEZIN_AI_MODEL=gpt-4.1-mini
```

Notas:

- `VITE_SUPABASE_URL` y `SUPABASE_URL` deben apuntar al mismo proyecto Supabase.
- `VITE_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_PUBLISHABLE_KEY` son claves publicas de cliente.
- `SUPABASE_SERVICE_ROLE_KEY` es secreta y solo debe existir en servidor/local seguro.
- `AI_GATEWAY_API_KEY` es secreta y alimenta el endpoint de Piezin.
- `AI_GATEWAY_BASE_URL` permite usar cualquier proveedor compatible con OpenAI.
- `PIEZIN_AI_MODEL` define el modelo usado por Piezin.
- Nunca subir `.env`, service role keys ni contrasenas al repositorio.

## Base de datos

Las migraciones estan en:

```text
supabase/migrations/
```

La base incluye, entre otras, estas tablas principales:

- `profiles`
- `user_roles`
- `courses`
- `course_bundles`
- `topics`
- `units`
- `resources`
- `enrollments`
- `unit_progress`
- `activity_events`
- `roulette_items`
- `star_awards`

Para inicializar una base nueva, aplica las migraciones SQL en orden sobre el proyecto Supabase.

## Roles y administracion

El rol admin se guarda en `public.user_roles`.

Para que un usuario sea administrador debe existir una fila:

```text
user_id = id del usuario en auth.users
role = admin
```

Las pantallas admin actuales son:

- `/admin/users`: usuarios, estado, bloqueo.
- `/admin/enrollments`: matriculas manuales por curso.

Las funciones de administracion comprueban primero que el usuario tenga rol `admin` y despues usan la clave de servidor para operaciones que requieren permisos elevados.

## Seguridad y RLS

La base usa Row Level Security.

Comportamiento verificado:

- Un usuario anonimo puede leer catalogo publico de cursos.
- Un usuario anonimo no puede leer perfiles ni matriculas.
- Un alumno autenticado solo ve su propio perfil.
- Un alumno autenticado solo ve sus propias matriculas.
- Un alumno autenticado no ve roles de otros usuarios.
- Un admin autenticado puede acceder a las pantallas de usuarios y matriculas.

Las operaciones administrativas de usuarios y matriculas se hacen mediante server functions, no directamente desde el cliente.

## Flujo local verificado

Flujo probado contra Supabase propio:

1. Login admin.
2. Vista de `/admin/users`.
3. Vista de `/admin/enrollments`.
4. Alumno matriculado en `Normativa`.
5. Login alumno.
6. `Mi panel` muestra el curso matriculado.
7. `/cursos/normativa` muestra el detalle del curso.

## Despliegue en VPS / Node

Requisitos de servidor:

- Node.js compatible con el proyecto.
- npm.
- Variables de entorno configuradas en el proceso.
- Proxy inverso HTTPS delante del proceso Node, por ejemplo Nginx o Caddy.

Flujo recomendado:

```bash
git pull
npm ci
npm run build
PORT=3000 npm run start
```

Para mantener el proceso vivo en VPS usa un process manager como `systemd` o PM2.

El proceso Node sirve:

- Archivos estaticos desde `dist/client`.
- SSR y rutas API desde `dist/server/server.js`.

No necesita Lovable para ejecutarse.

## Lovable

Lovable puede quedar como herramienta historica o de preview, pero no es la fuente principal del proyecto.

El build local ya usa configuracion Vite/TanStack explicita y no depende de paquetes de Lovable.

La fuente de verdad recomendada es:

1. Codigo en GitHub.
2. Desarrollo local.
3. Base de datos Supabase propia.
4. Despliegue en un entorno Node controlado.
