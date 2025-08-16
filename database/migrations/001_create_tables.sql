-- Create database schema for MPD System
-- Execute this script to create all necessary tables

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` BINARY(16) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'EVALUATOR', 'USER') DEFAULT 'USER',
  `status` ENUM('ACTIVE', 'INACTIVE', 'PENDING') DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create contests table
CREATE TABLE IF NOT EXISTS `contests` (
  `id` BINARY(16) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `position` VARCHAR(255) NOT NULL,
  `circunscripcion` ENUM('PRIMERA_CIRCUNSCRIPCION', 'SEGUNDA_CIRCUNSCRIPCION', 'TERCERA_CIRCUNSCRIPCION', 'CUARTA_CIRCUNSCRIPCION') NOT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED') DEFAULT 'DRAFT',
  `start_date` DATE,
  `end_date` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_contests_status` (`status`),
  INDEX `idx_contests_circunscripcion` (`circunscripcion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create postulants table
CREATE TABLE IF NOT EXISTS `postulants` (
  `id` BINARY(16) NOT NULL,
  `dni` VARCHAR(20) NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `circunscripcion` ENUM('PRIMERA_CIRCUNSCRIPCION', 'SEGUNDA_CIRCUNSCRIPCION', 'TERCERA_CIRCUNSCRIPCION', 'CUARTA_CIRCUNSCRIPCION') NOT NULL,
  `contest_id` BINARY(16) NOT NULL,
  `inscription_state` ENUM('COMPLETED_WITH_DOCS', 'ACTIVE', 'COMPLETED_PENDING_DOCS', 'PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  `validation_status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'IN_REVIEW') DEFAULT 'PENDING',
  `inscription_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_validated` TIMESTAMP NULL,
  `validated_by` BINARY(16) NULL,
  `comments` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_postulants_dni_contest` (`dni`, `contest_id`),
  INDEX `idx_postulants_dni` (`dni`),
  INDEX `idx_postulants_email` (`email`),
  INDEX `idx_postulants_validation_status` (`validation_status`),
  INDEX `idx_postulants_circunscripcion` (`circunscripcion`),
  -- Foreign keys will be added separately
  INDEX `idx_postulants_contest_id` (`contest_id`),
  INDEX `idx_postulants_validated_by` (`validated_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create documents table
CREATE TABLE IF NOT EXISTS `documents` (
  `id` BINARY(16) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` BIGINT NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `document_type` VARCHAR(100) NOT NULL,
  `validation_status` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  `user_id` BINARY(16) NOT NULL,
  `postulant_id` BINARY(16) NULL,
  `contest_id` BINARY(16) NULL,
  `upload_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_documents_user_id` (`user_id`),
  INDEX `idx_documents_postulant_id` (`postulant_id`),
  INDEX `idx_documents_contest_id` (`contest_id`),
  INDEX `idx_documents_type` (`document_type`),
  INDEX `idx_documents_validation_status` (`validation_status`),
  -- Foreign keys will be added separately
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create validation_comments table for enhanced comments system
CREATE TABLE IF NOT EXISTS `validation_comments` (
  `id` BINARY(16) NOT NULL,
  `postulant_id` BINARY(16) NOT NULL,
  `user_id` BINARY(16) NOT NULL,
  `comment` TEXT NOT NULL,
  `comment_type` ENUM('GENERAL', 'APPROVAL', 'REJECTION', 'REVISION') DEFAULT 'GENERAL',
  `is_template` BOOLEAN DEFAULT FALSE,
  `template_name` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_validation_comments_postulant` (`postulant_id`),
  INDEX `idx_validation_comments_user` (`user_id`),
  INDEX `idx_validation_comments_type` (`comment_type`),
  INDEX `idx_validation_comments_template` (`is_template`),
  -- Foreign keys will be added separately
  -- Foreign keys will be added separately
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create sessions table for JWT token management
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` BINARY(16) NOT NULL,
  `user_id` BINARY(16) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_used` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `user_agent` TEXT,
  `ip_address` VARCHAR(45),
  PRIMARY KEY (`id`),
  INDEX `idx_sessions_user_id` (`user_id`),
  INDEX `idx_sessions_token_hash` (`token_hash`),
  INDEX `idx_sessions_expires_at` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data for testing

-- Insert admin user (password: admin123)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), 'Administrador MPD', 'admin@mpd.gov.ar', '$2b$10$YourHashedPasswordHere', 'ADMIN', 'ACTIVE'),
(UNHEX(REPLACE(UUID(), '-', '')), 'Evaluador Principal', 'evaluador@mpd.gov.ar', '$2b$10$YourHashedPasswordHere', 'EVALUATOR', 'ACTIVE');

-- Insert sample contest
INSERT IGNORE INTO `contests` (`id`, `title`, `description`, `position`, `circunscripcion`, `status`) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), 'Concurso Multifuero MPD 2024', 'Concurso para cubrir cargos en el Ministerio Público de la Defensa', 'Defensor/a Público/a', 'PRIMERA_CIRCUNSCRIPCION', 'ACTIVE');

-- Get contest ID for sample data
SET @contest_id = (SELECT `id` FROM `contests` LIMIT 1);
SET @admin_id = (SELECT `id` FROM `users` WHERE `role` = 'ADMIN' LIMIT 1);

-- Insert sample postulants
INSERT IGNORE INTO `postulants` (`id`, `dni`, `full_name`, `email`, `circunscripcion`, `contest_id`, `inscription_state`, `validation_status`) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), '12345678', 'Juan Pérez García', 'juan.perez@example.com', 'PRIMERA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'PENDING'),
(UNHEX(REPLACE(UUID(), '-', '')), '23456789', 'María González López', 'maria.gonzalez@example.com', 'PRIMERA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'IN_REVIEW'),
(UNHEX(REPLACE(UUID(), '-', '')), '34567890', 'Carlos Rodríguez Fernández', 'carlos.rodriguez@example.com', 'SEGUNDA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'APPROVED'),
(UNHEX(REPLACE(UUID(), '-', '')), '45678901', 'Ana Martínez Silva', 'ana.martinez@example.com', 'SEGUNDA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'REJECTED');

-- Add more sample postulants to reach 252 total
-- This would be a loop in a real scenario, but we'll add a few more manually
INSERT IGNORE INTO `postulants` (`id`, `dni`, `full_name`, `email`, `circunscripcion`, `contest_id`, `inscription_state`, `validation_status`) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), '56789012', 'Pedro Sánchez Torres', 'pedro.sanchez@example.com', 'TERCERA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'PENDING'),
(UNHEX(REPLACE(UUID(), '-', '')), '67890123', 'Laura Jiménez Ruiz', 'laura.jimenez@example.com', 'TERCERA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'PENDING'),
(UNHEX(REPLACE(UUID(), '-', '')), '78901234', 'Miguel Herrera Castro', 'miguel.herrera@example.com', 'CUARTA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'IN_REVIEW'),
(UNHEX(REPLACE(UUID(), '-', '')), '89012345', 'Carmen Morales Vega', 'carmen.morales@example.com', 'CUARTA_CIRCUNSCRIPCION', @contest_id, 'COMPLETED_WITH_DOCS', 'PENDING');

-- Insert sample documents
INSERT IGNORE INTO `documents` (`id`, `name`, `original_name`, `file_path`, `file_size`, `mime_type`, `document_type`, `user_id`, `contest_id`) VALUES
(UNHEX(REPLACE(UUID(), '-', '')), 'cv_juan_perez.pdf', 'Curriculum Vitae.pdf', '/uploads/documents/cv_juan_perez.pdf', 1024576, 'application/pdf', 'CV', @admin_id, @contest_id),
(UNHEX(REPLACE(UUID(), '-', '')), 'titulo_maria_gonzalez.pdf', 'Título Universitario.pdf', '/uploads/documents/titulo_maria_gonzalez.pdf', 2048000, 'application/pdf', 'TITULO', @admin_id, @contest_id),
(UNHEX(REPLACE(UUID(), '-', '')), 'dni_carlos_rodriguez.pdf', 'DNI Frente y Dorso.pdf', '/uploads/documents/dni_carlos_rodriguez.pdf', 512000, 'application/pdf', 'DNI', @admin_id, @contest_id);
