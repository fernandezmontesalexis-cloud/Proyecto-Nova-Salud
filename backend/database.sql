-- FarmaPlus: esquema inicial para MySQL / XAMPP.
CREATE DATABASE IF NOT EXISTS farmaplus CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE farmaplus;

CREATE TABLE Category (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE Supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  document VARCHAR(20) UNIQUE,
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(255),
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE Product (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  description TEXT,
  unit VARCHAR(30) NOT NULL DEFAULT 'unidad',
  purchaseCost DECIMAL(10,2) NOT NULL DEFAULT 0,
  salePrice DECIMAL(10,2) NOT NULL,
  minStock INT NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  categoryId INT NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL,
  INDEX Product_name_idx(name),
  CONSTRAINT Product_categoryId_fkey FOREIGN KEY (categoryId) REFERENCES Category(id)
) ENGINE=InnoDB;

CREATE TABLE InventoryLot (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  supplierId INT,
  lotCode VARCHAR(60) NOT NULL,
  expiresAt DATE,
  quantity INT NOT NULL DEFAULT 0,
  receivedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY InventoryLot_productId_lotCode_key(productId, lotCode),
  INDEX InventoryLot_expiresAt_quantity_idx(expiresAt, quantity),
  CONSTRAINT InventoryLot_productId_fkey FOREIGN KEY (productId) REFERENCES Product(id),
  CONSTRAINT InventoryLot_supplierId_fkey FOREIGN KEY (supplierId) REFERENCES Supplier(id)
) ENGINE=InnoDB;

CREATE TABLE Customer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  document VARCHAR(20) UNIQUE,
  phone VARCHAR(30),
  email VARCHAR(150),
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE User (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','PHARMACIST','CASHIER') NOT NULL DEFAULT 'CASHIER',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

CREATE TABLE Sale (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(30) NOT NULL UNIQUE,
  customerId INT,
  userId INT,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX Sale_createdAt_idx(createdAt),
  CONSTRAINT Sale_customerId_fkey FOREIGN KEY (customerId) REFERENCES Customer(id),
  CONSTRAINT Sale_userId_fkey FOREIGN KEY (userId) REFERENCES User(id)
) ENGINE=InnoDB;

CREATE TABLE SaleItem (
  id INT AUTO_INCREMENT PRIMARY KEY,
  saleId INT NOT NULL,
  productId INT NOT NULL,
  lotId INT NOT NULL,
  quantity INT NOT NULL,
  unitPrice DECIMAL(10,2) NOT NULL,
  lineTotal DECIMAL(10,2) NOT NULL,
  CONSTRAINT SaleItem_saleId_fkey FOREIGN KEY (saleId) REFERENCES Sale(id),
  CONSTRAINT SaleItem_productId_fkey FOREIGN KEY (productId) REFERENCES Product(id),
  CONSTRAINT SaleItem_lotId_fkey FOREIGN KEY (lotId) REFERENCES InventoryLot(id)
) ENGINE=InnoDB;

CREATE TABLE InventoryMovement (
  id INT AUTO_INCREMENT PRIMARY KEY,
  productId INT NOT NULL,
  lotId INT,
  userId INT,
  type ENUM('PURCHASE','SALE','ADJUSTMENT_IN','ADJUSTMENT_OUT','EXPIRED') NOT NULL,
  quantity INT NOT NULL,
  note VARCHAR(255),
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX InventoryMovement_productId_createdAt_idx(productId, createdAt),
  CONSTRAINT InventoryMovement_productId_fkey FOREIGN KEY (productId) REFERENCES Product(id),
  CONSTRAINT InventoryMovement_lotId_fkey FOREIGN KEY (lotId) REFERENCES InventoryLot(id),
  CONSTRAINT InventoryMovement_userId_fkey FOREIGN KEY (userId) REFERENCES User(id)
) ENGINE=InnoDB;
