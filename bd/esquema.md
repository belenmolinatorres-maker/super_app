# 🗄️ Diccionario de Datos - Súper App Multiapp

Este documento detalla la estructura final de la base de datos `app_multiapp`, incluyendo el diseño multi-inquilino (multi-tenancy), los campos de privacidad criptográfica binaria y las reglas estrictas de trazabilidad por borrado lógico.

## 📋 Resumen de Tablas

1. [usuario](#usuario)
2. [catalogo](#catalogo)
3. [app](#app)

---

<a name="usuario"></a>
## 👤 Tabla: `usuario`
Almacena las cuentas de usuario globales del sistema (Administradores, Soporte y Clientes Inquilinos).

| Columna | Tipo de Datos | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id_usuario` | `int` | No | **Clave Primaria**. Identificador único autoincremental. |
| `nombre` | `varchar(250)` | No | Nombre del usuario. |
| `apellido` | `varchar(250)` | No | Apellido del usuario. |
| `correo` | `varchar(250)` | No | Correo electrónico de contacto. |
| `usuario` | `varchar(250)` | No | Nombre de usuario único para realizar el Login. |
| `contraseya` | `varbinary(255)` | No | **Privacidad Absoluta**: Contraseña encriptada en formato binario mediante la función `encriptar()`. |
| `es_activo` | `tinyint` | No | Estado de la cuenta (1 = Activo, 0 = Suspendido). |
| `fecha_eliminacion` | `datetime` | Sí | **Borrado Lógico**: Estampa de tiempo si el usuario fue dado de baja. |
| `usuario_eliminacion` | `int` | Sí | **Clave Foránea** -> `usuario.id_usuario`. ID del Administrador que dio de baja esta cuenta. |

---

<a name="catalogo"></a>
## 📦 Tabla: `catalogo`
Repositorio maestro y global con los módulos y herramientas que tu empresa ofrece en el mercado.

| Columna | Tipo de Datos | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id_catalogo` | `int` | No | **Clave Primaria**. Identificador único del servicio/módulo. |
| `nombre` | `varchar(250)` | No | Nombre comercial del módulo (Ej: 'Punto de Venta', 'Shopify Sync'). |
| `imagen` | `longtext` | No | URL de la imagen del icono o logotipo corporativo del módulo. |
| `descripcion` | `text` | No | Descripción detallada de las funciones de la herramienta. |
| `fecha_creacion` | `datetime` | No | Fecha y hora en la que el módulo fue añadido al mercado. |
| `fecha_eliminacion` | `datetime` | Sí | **Borrado Lógico**: Estampa de tiempo si el módulo se retira del catálogo general. |
| `usuario_eliminacion` | `int` | Sí | **Clave Foránea** -> `usuario.id_usuario`. ID del miembro de TI/Admin que desactivó el servicio globalmente. |

---

<a name="app"></a>
## 🚀 Tabla: `app`
Tabla puente de arquitectura Multi-Inquilino. Almacena las instancias específicas e independientes de las mini-apps compradas o configuradas por cada cliente.

| Columna | Tipo de Datos | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id_app` | `int` | No | **Clave Primaria**. Identificador único del acceso de la aplicación. |
| `catalogo` | `int` | No | **Clave Foránea** -> `catalogo.id_catalogo`. Tipo de software al que pertenece. |
| `usuario` | `int` | No | **Clave Foránea** -> `usuario.id_usuario`. ID del Cliente Dueño de este acceso específico. |
| `titulo` | `varchar(250)` | No | Nombre personalizado que el cliente le da a su módulo (Ej: 'Caja Pasillo Central'). |
| `descripcion` | `varchar(250)` | No | Notas o descripciones contextuales de la app. |
| `admin` | `varchar(250)` | No | Identificador, login de API o correo del panel externo de esa app de terceros. |
| `contraseya` | `varbinary(255)` | No | **Privacidad Absoluta**: Contraseña de la API externa encriptada mediante la función `encriptar_pass_miniapp()`. |
| `fecha_creacion` | `datetime` | No | Fecha y hora exacta en la que se le concedió el acceso al cliente. |
| `fecha_eliminacion` | `datetime` | Sí | **Borrado Lógico**: Estampa de tiempo cuando el cliente revoca o deja de pagar la app. |
| `usuario_eliminacion` | `int` | Sí | **Clave Foránea** -> `usuario.id_usuario`. ID del Admin o del propio usuario que canceló la app. |

---

## 🔗 Relaciones y Restricciones de Integridad (Foreign Keys)

### Claves Primarias (PK)
- `usuario.id_usuario`
- `catalogo.id_catalogo`
- `app.id_app`

### Claves Foráneas (FK)
- `usuario.usuario_eliminacion` -> `usuario.id_usuario` (Autorreferencial para auditoría de administradores)
- `catalogo.usuario_eliminacion` -> `usuario.id_usuario` (Saber qué admin eliminó un producto del catálogo global)
- `app.catalogo` -> `catalogo.id_catalogo` (Vincular la app a un tipo de software real)
- `app.usuario` -> `usuario.id_usuario` (Garantizar el aislamiento de datos por dueño de cuenta)
- `app.usuario_eliminacion` -> `usuario.id_usuario` (Saber quién revocó la suscripción de la app)

---

## 🛡️ Reglas Criptográficas y de Consulta para la IA
* **Validación de Login**: Las contraseñas de la tabla usuario jamás se consultan en plano. Es obligatorio usar la sintaxis: `WHERE contraseya = encriptar('contraseya')`.
* **Consultas Multi-Inquilino**: Está prohibido listar registros generales de app sin filtrar por cliente. Toda sentencia debe forzar el aislamiento: `WHERE app.usuario = id_usuario_sesion`.
* **Cero Sentencias DELETE**: Las bajas del sistema se procesan actualizando los campos `fecha_eliminacion` y `usuario_eliminacion`. Las filas activas se recuperan exclusivamente con la condición `WHERE fecha_eliminacion IS NULL`.