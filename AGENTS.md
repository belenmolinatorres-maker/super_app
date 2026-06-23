# AGENTS.md — Súper App Multiapp

## Stack

- **Frontend**: Vanilla HTML + JS + Tailwind CSS (CDN) + Font Awesome + Google Fonts (Inter)
- **Backend**: Node.js + Express (servidor propio en `src/`)
- **Database**: MySQL 8.0 remoto

## Critical SQL rules (never violate)

1. **No `DELETE`** — use logical deletion: `UPDATE ... SET fecha_eliminacion = NOW(), usuario_eliminacion = <id>`
2. **Passwords are `VARBINARY(255)`** — always use `encriptar('...')` / `encriptar_pass_miniapp(...)` in queries, never store/compare plaintext
3. **Multi-tenant isolation** — every `app` query must include `WHERE app.usuario = <id_usuario_session>`
4. **Active records** — always filter `WHERE fecha_eliminacion IS NULL`

## API (Express server)

Base: `http://localhost:3000/api/` (production: same domain via reverse proxy)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/login` | POST | Auth, returns JWT |
| `/api/logout` | POST | Session teardown |
| `/api/recuperar-contraseya` | POST | Password recovery (sends email) |
| `/api/resetear` | POST | Reset password |
| `/api/listar-app` | POST | User's mini-apps |
| `/api/crud-app` | POST | Create/Edit/Delete apps (field: `funcion`) |
| `/api/listar-catalogo` | POST | Master catalog |
| `/api/alta-catalogo` | POST | Admin: create catalog entry |
| `/api/editar-catalogo` | POST | Admin: edit catalog entry |
| `/api/baja-catalogo` | POST | Admin: soft-delete catalog entry |
| `/api/admin` | POST | Admin permission check |
| `/api/editar-perfil` | POST | Edit user profile |
| `/api/listar-usuario` | POST | List users (admin) |
| `/api/alta-usuario` | POST | Create user (admin) |
| `/api/editar-usuario` | POST | Edit user (admin) |
| `/api/baja-usuario` | POST | Soft-delete user (admin) |
| `/api/verificar-acceso` | POST | Verifica credenciales antes de abrir una app |

## Access gate (verificar_acceso)

- When clicking an app card, a modal asks for the stored password
- Frontend POSTs to `/api/verificar-acceso` with `{ token, id_app, contraseya }`
- Server compares `contraseya` against `app.contraseya` (hashed via `encriptar_pass_miniapp()`) in MySQL
- Returns `{ codigo: 1 }` on success → frontend opens the app URL in new tab
- Returns `{ codigo: 0, mensaje: "..." }` on failure

## Auth & session

- Login response stores JWT in `localStorage` under **both** `jwt_token` and `token` keys
- Dashboard/Admin JS reads: `localStorage.getItem('token') || localStorage.getItem('jwt_token')`
- User display name stored in `localStorage` key `usuario_nombre`
- Protected pages redirect to `../index.html` if no token found
- Logout flow: POST to `/api/logout`, clear localStorage, redirect

## File tree

```
/
├── index.html                     # Login (public)
├── reset_password.html            # Password reset page (legacy)
├── assets/js/auth.js              # Login + forgot-password modal
├── assets/js/dashboard.js         # User dashboard (mini-apps CRUD)
├── assets/js/admin.js             # Admin panel (catalog management)
├── assets/js/reset.js             # Reset password logic
├── private/dashboard.html         # Authenticated dashboard shell
├── private/admin.html             # Admin panel shell
├── bd/esquema.md                  # DB schema (tables: usuario, catalogo, app)
├── plantillas/recuperacion_password.html  # Email template (uses {{reset_link}} placeholder)
├── src/
│   ├── server.js                  # Express entry point
│   ├── package.json               # Dependencies
│   ├── .env                       # Environment variables
│   ├── config/db.js               # MySQL connection pool
│   ├── middleware/auth.js         # JWT verify + generate
│   ├── helpers/email.js           # Nodemailer (password recovery)
│   └── routes/
│       ├── auth.js                # login, logout, recuperar, resetear
│       ├── apps.js                # listar-app, crud-app, verificar-acceso
│       ├── catalog.js             # listar, alta, editar, baja catálogo
│       └── admin.js               # admin check, editar-perfil, CRUD usuarios
├── Dockerfile                     # Docker build
├── docker-compose.yml             # Orchestration
└── .dockerignore
```

## Email template note

`plantillas/recuperacion_password.html` uses `{{reset_link}}` placeholder replaced at runtime by the email helper. The recovery link points to `{BASE_URL}/?id={userId}`, which shows the reset form on `index.html`.

## Docker

```bash
# Build & run
docker compose build
docker compose up -d

# Runs on port 3000
```

## Admin panel

Only accessible after passing admin check: POST to `/api/admin` with token; response `codigo === "1"` grants access. Non-admins are redirected to `dashboard.html`.
