CREATE DATABASE IF NOT EXISTS farm;
USE farm;

CREATE TABLE IF NOT EXISTS cows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(50) NOT NULL UNIQUE,
  arrival_date DATE,
  insemination_date DATE,
  birth_date DATE,
  purchase_price DECIMAL(10,2) DEFAULT 0,
  sale_price DECIMAL(10,2) DEFAULT NULL,
  is_sold TINYINT(1) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(50),
  origin ENUM('purchased', 'born') NOT NULL DEFAULT 'born',
  arrival_date DATE,
  birth_date DATE,
  mother_cow_id INT DEFAULT NULL,
  purchase_price DECIMAL(10,2) DEFAULT 0,
  sale_price DECIMAL(10,2) DEFAULT NULL,
  is_sold TINYINT(1) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mother_cow_id) REFERENCES cows(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS revenues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('milk', 'cow', 'calf') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('electricity','fuel','water','cow_feed','farm_rent','calf_feed','calf_straw','treatments','cow_death','calf_death','other') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS capital (
  id INT AUTO_INCREMENT PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dismissed_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cow_id INT NOT NULL,
  type VARCHAR(30) NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_dismiss (cow_id, type, event_date)
);

-- Default admin user (password: admin123)
INSERT IGNORE INTO users (name, password, email)
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'admin@farm.com');
