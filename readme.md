# 🚀 Súper App Multiapp - Ecosistema Multi-Inquilino

Ecosistema de software modular diseñado bajo una arquitectura multi-inquilino (*multi-tenancy*) con un enfoque estricto en la **privacidad absoluta de los datos** y la **trazabilidad total de operaciones** mediante auditoría de borrado lógico.

---

## 🛠️ Componentes del Sistema

1. **Frontend (Cliente):** Aplicación SPA/Modular responsiva construida con HTML5, Vanilla JavaScript y Tailwind CSS. Gestiona el ciclo de vida de la sesión mediante JSON Web Tokens (JWT).
2. **Backend Orquestador (n8n):** Flujos de trabajo automatizados que exponen endpoints HTTP (Webhooks) para la autenticación, firma de tokens JWT y comunicación segura con la base de datos.
3. **Capa de Datos (MySQL):** Servidor relacional remoto con funciones criptográficas nativas (`encriptar_pass_usuario`, `encriptar_pass_miniapp`) que impiden el almacenamiento de contraseñas en texto plano.

---

## 📂 Estructura del Proyecto

 text
├── bd/
│   └── esquema.md                 # Diccionario de datos y esquema detallado de MySQL
├── assets/
│   ├── css/
│   │   └── styles.css             # Hojas de estilo personalizadas
│   └── js/
│       ├── auth.js                # Control de login, tokens y sesión
│       ├── dashboard.js           # Renderizado dinámico de mini-apps por inquilino
│       └── admin.js               # Gestión global (catálogo y usuarios)
├── private/
│   ├── dashboard.html             # Panel privado adaptativo según cliente
│   └── catalogo_maestro.html      # Gestión de módulos globales (Admin)
├── .gemini/
│   └── settings.json              # Configuración del servidor MCP para Gemini-CLI
├── index.html                     # Pantalla pública de acceso (Login)
└── README.md                      # Instrucciones generales del proyecto  

---


## 🔒 Directrices Críticas de Seguridad y Negocio
Privacidad Binaria: Las contraseñas en las tablas usuario y app se guardan como bloques binarios (VARBINARY). Cualquier consulta o inserción debe invocar obligatoriamente las funciones SQL de encriptación.

Aislamiento Multi-Inquilino: Está estrictamente prohibido consultar la tabla app sin filtrar por el ID del usuario autenticado (WHERE app.usuario = ID).

Borrado Lógico: No se utiliza la sentencia DELETE. Las bajas se realizan mediante un UPDATE poblando los campos fecha_eliminacion y usuario_eliminacion. Los registros activos se consultan con WHERE fecha_eliminacion IS NULL.

🚀 Instalación y Entorno de Desarrollo Local
1. Acceso de red al servidor MySQL remoto.

2. Configuración de Gemini-CLI con MCP

Para permitir que la Inteligencia Artificial analice, valide y consulte la base de datos de manera automatizada a través de la terminal, asegúrate de que el archivo .gemini/settings.json apunte a las credenciales correctas.

## 🔌 Endpoints de la API (Ecosistema n8n)

> 💡 **URL Base del Servidor:** `https://n8n.misappsfantasticas.cloud/webhook/` (o `/webhook-test/` para pruebas)

Para consumir cualquier servicio desde los scripts de la carpeta `/assets/js/`, realiza peticiones asíncronas de tipo **POST** combinando la URL Base con las siguientes rutas:

### 🔑 1. Módulo de Autenticación y Acceso
* **POST** `login` -> Envía `usuario` y `contraseya`. Valida credenciales con la función criptográfica de MySQL y genera el token JWT.
**POST** `login/forgot` -> Envía el `correo` del usuario. n8n comprueba su existencia en la base de datos y gestiona el envío automatizado del email de recuperación.
* **POST** `logout` -> Notifica el cierre de sesión y limpia el almacenamiento local del cliente.

### 🚀 2. Módulo de Gestión de Mini-Apps (Multi-Inquilino)
* **POST** `apps/listar` -> Recibe el token de autorización en la cabecera. Retorna el catálogo exclusivo de aplicaciones del cliente autenticado (`WHERE app.usuario = ID`).
* **POST** `apps/crear` -> Registra una nueva mini-app encriptando los datos externos con `encriptar()`.
* **POST** `apps/editar` -> Modifica los parámetros visuales (título o descripción) de una app activa del inquilino.
* **POST** `apps/eliminar` -> Ejecuta el borrado lógico inyectando la estampa de tiempo actual en `fecha_eliminacion`.

### 📦 3. Módulo de Catálogo Maestro (Exclusivo Administradores)
* **POST** `catalogo/listar` -> Obtiene la lista completa de herramientas disponibles globalmente en el mercado que no hayan sido dadas de baja.
* **POST** `catalogo/alta` -> Registra un nuevo tipo de software o servicio en el repositorio maestro.
* **POST** `catalogo/baja` -> Aplica la desactivación y borrado lógico de un módulo para que ningún cliente nuevo pueda contratarlo.