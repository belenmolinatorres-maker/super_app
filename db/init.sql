CREATE DATABASE IF NOT EXISTS app_multiapp;
USE app_multiapp;

DELIMITER //

CREATE FUNCTION IF NOT EXISTS encriptar(pass VARCHAR(255)) RETURNS VARBINARY(255)
DETERMINISTIC
BEGIN
  RETURN AES_ENCRYPT(pass, UNHEX(SHA2('clave_super_app_2026', 512)));
END//

CREATE FUNCTION IF NOT EXISTS encriptar_pass_miniapp(pass VARCHAR(255)) RETURNS VARBINARY(255)
DETERMINISTIC
BEGIN
  RETURN AES_ENCRYPT(pass, UNHEX(SHA2('clave_mini_app_2026', 512)));
END//

DELIMITER ;

CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(250) NOT NULL,
  apellido VARCHAR(250) NOT NULL,
  correo VARCHAR(250) NOT NULL,
  usuario VARCHAR(250) NOT NULL,
  contraseya VARBINARY(255) NOT NULL,
  es_activo TINYINT NOT NULL DEFAULT 1,
  rol TINYINT NOT NULL DEFAULT 0,
  fecha_creacion DATETIME NOT NULL DEFAULT NOW(),
  fecha_eliminacion DATETIME NULL,
  usuario_eliminacion INT NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uk_usuario_usuario (usuario),
  UNIQUE KEY uk_usuario_correo (correo),
  KEY fk_usuario_eliminacion (usuario_eliminacion),
  CONSTRAINT fk_usuario_eliminacion FOREIGN KEY (usuario_eliminacion) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS catalogo (
  id_catalogo INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(250) NOT NULL,
  imagen LONGTEXT NOT NULL,
  descripcion TEXT NOT NULL,
  direccion_enlace VARCHAR(500) NOT NULL DEFAULT '',
  fecha_creacion DATETIME NOT NULL DEFAULT NOW(),
  fecha_eliminacion DATETIME NULL,
  usuario_eliminacion INT NULL,
  PRIMARY KEY (id_catalogo),
  KEY fk_catalogo_eliminacion (usuario_eliminacion),
  CONSTRAINT fk_catalogo_eliminacion FOREIGN KEY (usuario_eliminacion) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app (
  id_app INT NOT NULL AUTO_INCREMENT,
  catalogo INT NULL,
  usuario INT NOT NULL,
  titulo VARCHAR(250) NOT NULL,
  descripcion VARCHAR(250) NOT NULL,
  direccion_enlace VARCHAR(500) NOT NULL DEFAULT '',
  admin VARCHAR(250) NOT NULL,
  contraseya VARBINARY(255) NOT NULL,
  fecha_creacion DATETIME NOT NULL DEFAULT NOW(),
  fecha_eliminacion DATETIME NULL,
  usuario_eliminacion INT NULL,
  PRIMARY KEY (id_app),
  KEY fk_app_catalogo (catalogo),
  KEY fk_app_usuario (usuario),
  KEY fk_app_eliminacion (usuario_eliminacion),
  CONSTRAINT fk_app_catalogo FOREIGN KEY (catalogo) REFERENCES catalogo(id_catalogo),
  CONSTRAINT fk_app_usuario FOREIGN KEY (usuario) REFERENCES usuario(id_usuario),
  CONSTRAINT fk_app_eliminacion FOREIGN KEY (usuario_eliminacion) REFERENCES usuario(id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO usuario (nombre, apellido, correo, usuario, contraseya, es_activo, fecha_creacion)
VALUES ('Admin', 'Sistema', 'admin@sistema.com', 'admin', encriptar('admin123'), 1, 1, NOW()),
       ('Usuario', 'Demo', 'demo@demo.com', 'demo', encriptar('demo123'), 1, 0, NOW());

INSERT INTO catalogo (nombre, imagen, descripcion, direccion_enlace, fecha_creacion)
VALUES ('App Personalizada', 'fas fa-rocket', 'Crea tu propia herramienta definiendo su dirección web.', '', NOW()),
       ('Punto de Venta', 'fas fa-cash-register', 'Sistema de punto de venta para gestión de tiendas.', 'https://ejemplo.com/pos?usuario={usuario}&pass={contraseya}', NOW()),
       ('Shopify Sync', 'fab fa-shopify', 'Sincronización automatizada con tiendas Shopify.', 'https://ejemplo.com/shopify?user={usuario}&password={contraseya}', NOW());
