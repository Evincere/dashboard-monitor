-- MySQL dump 10.13  Distrib 9.1.0, for Win64 (x86_64)
--
-- Host: localhost    Database: mpd_concursos
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `answers`
--

DROP TABLE IF EXISTS `answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `answers` (
  `id` binary(16) NOT NULL,
  `attempts` int DEFAULT NULL,
  `hash` varchar(255) DEFAULT NULL,
  `question_id` binary(16) DEFAULT NULL,
  `response` text,
  `response_time_ms` bigint DEFAULT NULL,
  `status` enum('DRAFT','INVALIDATED','SUBMITTED','SUSPICIOUS','VALIDATED') DEFAULT NULL,
  `timestamp` datetime(6) DEFAULT NULL,
  `session_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKe61mggtm4o2e9iw1smms433to` (`session_id`),
  CONSTRAINT `FKe61mggtm4o2e9iw1smms433to` FOREIGN KEY (`session_id`) REFERENCES `examination_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `answers`
--

LOCK TABLES `answers` WRITE;
/*!40000 ALTER TABLE `answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(1000) DEFAULT NULL,
  `event_type` enum('ACCOUNT_LOCKED','ACCOUNT_UNLOCKED','CONFIG_CHANGED','LOGIN_FAILURE','LOGIN_SUCCESS','LOGOUT_SUCCESS','PASSWORD_CHANGED','PASSWORD_RESET_REQUEST','PASSWORD_RESET_SUCCESS','PERMISSIONS_DENIED','PROFILE_UPDATED','ROLES_CHANGED','STATUS_CHANGED','SYSTEM_SHUTDOWN','SYSTEM_STARTUP','USER_CREATED','USER_DELETED','USER_UPDATED') NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `outcome` varchar(500) DEFAULT NULL,
  `session_id` varchar(100) DEFAULT NULL,
  `timestamp` datetime(6) NOT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-08 04:38:37.073220',NULL,'user_test'),(2,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 06:32:13.296432',NULL,'user_test'),(3,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 06:34:51.626108',NULL,'user_test'),(4,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 11:18:26.815554',NULL,'user_test'),(5,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 11:23:15.134376',NULL,'user_test'),(6,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 11:31:42.413898',NULL,'user_test'),(7,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 12:54:40.307561',NULL,'user_test'),(8,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 14:05:02.108127',NULL,'user_test'),(9,'Contrase√±a incorrecta','LOGIN_FAILURE',NULL,'FAILURE',NULL,'2025-08-12 15:13:06.766708',NULL,'user_test'),(10,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-12 17:19:10.827728',NULL,'user_test'),(11,'El usuario no existe','LOGIN_FAILURE',NULL,'FAILURE',NULL,'2025-08-13 00:52:19.122971',NULL,'semper'),(12,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 00:52:26.036471',NULL,'user_test'),(13,'Contrase√±a incorrecta','LOGIN_FAILURE',NULL,'FAILURE',NULL,'2025-08-13 01:01:18.463314',NULL,'user_test'),(14,'Contrase√±a incorrecta','LOGIN_FAILURE',NULL,'FAILURE',NULL,'2025-08-13 01:03:20.575163',NULL,'user_test'),(15,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 01:03:56.499075',NULL,'user_test'),(16,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 11:51:10.908435',NULL,'user_test'),(17,'El usuario no existe','LOGIN_FAILURE',NULL,'FAILURE',NULL,'2025-08-13 12:42:59.386947',NULL,'Verovillca'),(18,'El usuario no existe','LOGIN_FAILURE',NULL,'FAILURE',NULL,'2025-08-13 12:43:38.935859',NULL,'Verovillca'),(19,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 13:21:52.508129',NULL,'user_test'),(20,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 13:23:36.413908',NULL,'user_test'),(21,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 13:38:48.498470',NULL,'user_test'),(22,'User logged in successfully.','LOGIN_SUCCESS',NULL,'SUCCESS',NULL,'2025-08-13 15:46:14.501974',NULL,'user_test');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contest_dates`
--

DROP TABLE IF EXISTS `contest_dates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contest_dates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `end_date` date DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `contest_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKf3alahujio1j78fx6jnr8eylx` (`contest_id`),
  CONSTRAINT `FKf3alahujio1j78fx6jnr8eylx` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contest_dates`
--

LOCK TABLES `contest_dates` WRITE;
/*!40000 ALTER TABLE `contest_dates` DISABLE KEYS */;
/*!40000 ALTER TABLE `contest_dates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contest_requirements`
--

DROP TABLE IF EXISTS `contest_requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contest_requirements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `category` varchar(100) NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `description` varchar(500) NOT NULL,
  `document_type` varchar(100) DEFAULT NULL,
  `priority` int NOT NULL,
  `required` bit(1) NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `contest_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKrpyo4qe46c3xxum9jepysh8mb` (`contest_id`),
  CONSTRAINT `FKrpyo4qe46c3xxum9jepysh8mb` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contest_requirements`
--

LOCK TABLES `contest_requirements` WRITE;
/*!40000 ALTER TABLE `contest_requirements` DISABLE KEYS */;
/*!40000 ALTER TABLE `contest_requirements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contests`
--

DROP TABLE IF EXISTS `contests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bases_url` varchar(255) DEFAULT NULL,
  `category` varchar(255) DEFAULT NULL,
  `class_` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `department` varchar(255) DEFAULT NULL,
  `description_url` varchar(255) DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `functions` varchar(255) DEFAULT NULL,
  `inscription_end_date` datetime(6) DEFAULT NULL,
  `inscription_start_date` datetime(6) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `status` enum('ACTIVE','ARCHIVED','CANCELLED','CLOSED','DRAFT','FINISHED','IN_EVALUATION','PAUSED','RESULTS_PUBLISHED','SCHEDULED') DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contests`
--

LOCK TABLES `contests` WRITE;
/*!40000 ALTER TABLE `contests` DISABLE KEYS */;
INSERT INTO `contests` VALUES (1,NULL,'FUNCIONARIOS Y PERSONAL JER√ÅRQUICO','03','2025-08-08 04:37:42.427688','MULTIFUERO',NULL,'2025-08-08','Co-Defensor en lo Penal, Penal Juvenil y en lo Civil y Co-Asesor de Ni√±os, Ni√±as, Adolescentes y Personas con Capacidad Restringida a desempe√±arse en la 1ra o 2da, o 3ra o 4ta Circunscripcion Judicial',NULL,NULL,'Co-Defensor/Co-Asesor Multifuero - Clase 03','2025-07-30','CLOSED','MULTIFUERO','2025-08-08 04:37:42.427688');
/*!40000 ALTER TABLE `contests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `distributed_lock`
--

DROP TABLE IF EXISTS `distributed_lock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distributed_lock` (
  `lockKey` varchar(255) NOT NULL,
  `lockedAt` datetime(6) DEFAULT NULL,
  `owner` varchar(255) DEFAULT NULL,
  `version` bigint DEFAULT NULL,
  PRIMARY KEY (`lockKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `distributed_lock`
--

LOCK TABLES `distributed_lock` WRITE;
/*!40000 ALTER TABLE `distributed_lock` DISABLE KEYS */;
/*!40000 ALTER TABLE `distributed_lock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_audit`
--

DROP TABLE IF EXISTS `document_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_audit` (
  `id` binary(16) NOT NULL,
  `action_by` binary(16) DEFAULT NULL,
  `action_date` datetime(6) NOT NULL,
  `action_type` enum('ARCHIVED','CREATED','DELETED','RESTORED','UPDATED') NOT NULL,
  `document_id` binary(16) NOT NULL,
  `metadata` json DEFAULT NULL,
  `new_file_path` varchar(500) DEFAULT NULL,
  `old_file_path` varchar(500) DEFAULT NULL,
  `reason` text,
  `user_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_document_audit_document_id` (`document_id`),
  KEY `idx_document_audit_user_id` (`user_id`),
  KEY `idx_document_audit_action_date` (`action_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_audit`
--

LOCK TABLES `document_audit` WRITE;
/*!40000 ALTER TABLE `document_audit` DISABLE KEYS */;
INSERT INTO `document_audit` VALUES (_binary '	8H—òhOÜ¥¯ï\ﬁ5º\·',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.239078','CREATED',_binary '^	˘f\≈#M\"©óï«∞`','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"Certificado de Antig√ºedad Profesional.pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.239077700\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@78e8d8df\", \"processingStatus\": null}','87654321/5e09f966-c523-4d22-a997-9516c7b06005_Certificado_de_Antig_edad_Profesional_1754980683973.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v'),(_binary '7\A˘§\ÿN	£ó\–<¨\ÕR\‡',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.239078','CREATED',_binary '\Zëg¡1®@˘ºP#◊ªH˛','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"Certificado de Antecedentes Penales.pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.239077700\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@418a09a7\", \"processingStatus\": null}','87654321/1a9167c1-31a8-40f9-bc50-2306d7bb48fe_Certificado_de_Antecedentes_Penales_1754980683973.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v'),(_binary 'E\«“≤OUDãûâëz•√£:',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.239078','CREATED',_binary '†’ø˘v¢@)üÄ=|\÷\∆\Î\—','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"Constancia de CUIL.pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.239077700\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@a7aac12\", \"processingStatus\": null}','87654321/a0d5bff9-76a2-4029-9f80-3d7cd6c6ebd1_Constancia_de_CUIL_1754980683972.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v'),(_binary 'bû.\…\”!HfÇŸûzé\ÁfH',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.753616','CREATED',_binary 'áp\–;m\⁄JtÉG?%†ë¬¨','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"DNI (Dorso).pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.753616100\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@55f357be\", \"processingStatus\": null}','87654321/8770d03b-6dda-4a74-8347-3f25a091c2ac_DNI__Dorso__1754980684711.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v'),(_binary '™Ïπ†LAêúx\Zìé\‹',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.239078','CREATED',_binary '\ƒC*\Ôˇ\‘Cpï\Ûö˛*Õã\’','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"Certificado Sin Sanciones Disciplinarias.pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.239077700\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@73e4bec6\", \"processingStatus\": null}','87654321/c4432aef-ffd4-4370-95f3-9afe2acd8bd5_Certificado_Sin_Sanciones_Disciplinarias_1754980683972.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v'),(_binary '\”2x\Œ>¨Lﬁ•$V\–J\"',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.239078','CREATED',_binary 'è\·\‰jg]LÅ\Ë\Ú \–\˜π','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"T√≠tulo Universitario y Certificado Anal√≠tico.pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.239077700\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@13d364eb\", \"processingStatus\": null}','87654321/8fe1e46a-675d-4c13-81e8-f220d00ef7b9_T_tulo_Universitario_y_Certificado_Anal_tico_1754980683973.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v'),(_binary '\÷ŒÅ–ù∞E\Ïª\"@.π',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v','2025-08-12 06:38:04.506196','CREATED',_binary '´$¥ÄIbÆ\r`[®i.','{\"status\": \"PENDING\", \"version\": 0, \"fileName\": \"DNI (Frontal).pdf\", \"filePath\": null, \"timestamp\": \"2025-08-12T03:38:04.506196\", \"isArchived\": false, \"documentType\": \"ar.gov.mpd.concursobackend.document.infrastructure.database.entities.DocumentTypeEntity@3cd4a8d0\", \"processingStatus\": null}','87654321/ab24b419-1080-4962-ae0d-60055ba8692e_DNI__Frontal__1754980684484.pdf',NULL,'Documento creado',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v');
/*!40000 ALTER TABLE `document_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_types`
--

DROP TABLE IF EXISTS `document_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_types` (
  `id` binary(16) NOT NULL,
  `code` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` bit(1) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `order` int DEFAULT NULL,
  `required` bit(1) NOT NULL,
  `parent_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKl3aq6xg5xps79e49wn65nlty4` (`code`),
  KEY `FK259yjckcj695leb2cxlhbjfys` (`parent_id`),
  CONSTRAINT `FK259yjckcj695leb2cxlhbjfys` FOREIGN KEY (`parent_id`) REFERENCES `document_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_types`
--

LOCK TABLES `document_types` WRITE;
/*!40000 ALTER TABLE `document_types` DISABLE KEYS */;
INSERT INTO `document_types` VALUES (_binary '\Za\ﬂ\Ì\ÚLíá≤—∫\Í','CONSTANCIA_CUIL','Constancia de C√≥digo √önico de Identificaci√≥n Laboral',_binary '','Constancia de CUIL',3,_binary '',NULL),(_binary '3®±E<úF\ıÆ,óã˚\ÁÇ^','CERTIFICADO_LEY_MICAELA','Certificado de capacitaci√≥n en Ley Micaela (opcional)',_binary '','Certificado Ley Micaela',8,_binary '\0',NULL),(_binary 'C|\Ì\r\˜cH*üú\ƒ\Ê)\Ôûk','DNI_FRONTAL','Documento Nacional de Identidad - Lado frontal',_binary '','DNI (Frontal)',1,_binary '',NULL),(_binary 'Zﬂ≤N\'C¿µ ≠w\‰\”]','ANTECEDENTES_PENALES','Certificado de Antecedentes Penales vigente (antig√ºedad no mayor a 90 d√≠as)',_binary '','Certificado de Antecedentes Penales',4,_binary '',NULL),(_binary 'd∏v˙x\ÃLVä%îC†;\r8','CERTIFICADO_PROFESIONAL_ANTIGUEDAD','Certificado de antig√ºedad en el ejercicio profesional',_binary '','Certificado de Antig√ºedad Profesional',5,_binary '',NULL),(_binary '|bok}\0Lÿ®aO\Ï%\ÚMD','TITULO_UNIVERSITARIO_Y_CERTIFICADO_ANALITICO','T√≠tulo universitario y certificado anal√≠tico unificados en un solo archivo PDF. Ambos documentos deben combinarse en un √∫nico archivo para su carga.',_binary '','T√≠tulo Universitario y Certificado Anal√≠tico',7,_binary '',NULL),(_binary '£˘\”~DBB\"ùWò(	K1w','DOCUMENTO_ADICIONAL','Cualquier documento adicional requerido espec√≠ficamente',_binary '','Documento Adicional',99,_binary '\0',NULL),(_binary 'Ø\≈f˙¯\ÙCOé@\n\Ú z	','DNI_DORSO','Documento Nacional de Identidad - Lado posterior',_binary '','DNI (Dorso)',2,_binary '',NULL),(_binary 'ªñx≤É∂JNâ8\…#¨d3','CERTIFICADO_SIN_SANCIONES','Certificado que acredite no registrar sanciones disciplinarias',_binary '','Certificado Sin Sanciones Disciplinarias',6,_binary '',NULL);
/*!40000 ALTER TABLE `document_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` binary(16) NOT NULL,
  `archived_at` datetime(6) DEFAULT NULL,
  `archived_by` binary(16) DEFAULT NULL,
  `comments` varchar(255) DEFAULT NULL,
  `content_type` varchar(255) NOT NULL,
  `error_message` varchar(255) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `processing_status` enum('PROCESSING','UPLOADING','UPLOAD_COMPLETE','UPLOAD_FAILED') NOT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `status` enum('APPROVED','ERROR','PENDING','PROCESSING','REJECTED') DEFAULT NULL,
  `upload_date` datetime(6) NOT NULL,
  `user_id` binary(16) NOT NULL,
  `validated_at` datetime(6) DEFAULT NULL,
  `validated_by` binary(16) DEFAULT NULL,
  `version` int DEFAULT NULL,
  `document_type_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK1mh9cbmqrrjsc0hy74whcq0ft` (`document_type_id`),
  CONSTRAINT `FK1mh9cbmqrrjsc0hy74whcq0ft` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES (_binary '\Zëg¡1®@˘ºP#◊ªH˛',NULL,NULL,'','application/pdf',NULL,'Certificado de Antecedentes Penales.pdf','87654321/1a9167c1-31a8-40f9-bc50-2306d7bb48fe_Certificado_de_Antecedentes_Penales_1754980683973.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:03.954439',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary 'Zﬂ≤N\'C¿µ ≠w\‰\”]'),(_binary '^	˘f\≈#M\"©óï«∞`',NULL,NULL,'','application/pdf',NULL,'Certificado de Antig√ºedad Profesional.pdf','87654321/5e09f966-c523-4d22-a997-9516c7b06005_Certificado_de_Antig_edad_Profesional_1754980683973.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:03.954439',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary 'd∏v˙x\ÃLVä%îC†;\r8'),(_binary 'áp\–;m\⁄JtÉG?%†ë¬¨',NULL,NULL,'','application/pdf',NULL,'DNI (Dorso).pdf','87654321/8770d03b-6dda-4a74-8347-3f25a091c2ac_DNI__Dorso__1754980684711.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:04.705077',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary 'Ø\≈f˙¯\ÙCOé@\n\Ú z	'),(_binary 'è\·\‰jg]LÅ\Ë\Ú \–\˜π',NULL,NULL,'','application/pdf',NULL,'T√≠tulo Universitario y Certificado Anal√≠tico.pdf','87654321/8fe1e46a-675d-4c13-81e8-f220d00ef7b9_T_tulo_Universitario_y_Certificado_Anal_tico_1754980683973.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:03.954439',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary '|bok}\0Lÿ®aO\Ï%\ÚMD'),(_binary '†’ø˘v¢@)üÄ=|\÷\∆\Î\—',NULL,NULL,'','application/pdf',NULL,'Constancia de CUIL.pdf','87654321/a0d5bff9-76a2-4029-9f80-3d7cd6c6ebd1_Constancia_de_CUIL_1754980683972.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:03.954439',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary '\Za\ﬂ\Ì\ÚLíá≤—∫\Í'),(_binary '´$¥ÄIbÆ\r`[®i.',NULL,NULL,'','application/pdf',NULL,'DNI (Frontal).pdf','87654321/ab24b419-1080-4962-ae0d-60055ba8692e_DNI__Frontal__1754980684484.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:04.476172',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary 'C|\Ì\r\˜cH*üú\ƒ\Ê)\Ôûk'),(_binary '\ƒC*\Ôˇ\‘Cpï\Ûö˛*Õã\’',NULL,NULL,'','application/pdf',NULL,'Certificado Sin Sanciones Disciplinarias.pdf','87654321/c4432aef-ffd4-4370-95f3-9afe2acd8bd5_Certificado_Sin_Sanciones_Disciplinarias_1754980683972.pdf',0,'UPLOAD_COMPLETE',NULL,'PENDING','2025-08-12 06:38:03.954439',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,0,_binary 'ªñx≤É∂JNâ8\…#¨d3');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `education_record`
--

DROP TABLE IF EXISTS `education_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `education_record` (
  `id` binary(16) NOT NULL,
  `academic_honors` varchar(255) DEFAULT NULL,
  `activity_role` varchar(100) DEFAULT NULL,
  `activity_type` varchar(100) DEFAULT NULL,
  `certification_number` varchar(100) DEFAULT NULL,
  `comments` text,
  `created_at` datetime(6) NOT NULL,
  `credit_hours` int DEFAULT NULL,
  `duration_hours` int DEFAULT NULL,
  `duration_years` int DEFAULT NULL,
  `education_status` enum('ABANDONED','COMPLETED','IN_PROGRESS','SUSPENDED') NOT NULL,
  `education_type` enum('CERTIFICATION','DIPLOMA','DOCTORAL_DEGREE','MASTER_DEGREE','POSTGRADUATE_DEGREE','PRIMARY_EDUCATION','SCIENTIFIC_ACTIVITY','SECONDARY_EDUCATION','TECHNICAL_DEGREE','TRAINING_COURSE','UNIVERSITY_DEGREE') NOT NULL,
  `end_date` date DEFAULT NULL,
  `expiration_date` date DEFAULT NULL,
  `field_of_study` varchar(255) DEFAULT NULL,
  `final_grade` decimal(4,2) DEFAULT NULL,
  `grade_scale` varchar(50) DEFAULT NULL,
  `graduation_date` date DEFAULT NULL,
  `institution_name` varchar(255) NOT NULL,
  `is_ongoing` bit(1) NOT NULL,
  `issue_date` date DEFAULT NULL,
  `issuing_authority` varchar(255) DEFAULT NULL,
  `presentation_date` date DEFAULT NULL,
  `presentation_location` varchar(255) DEFAULT NULL,
  `program_title` varchar(255) NOT NULL,
  `start_date` date DEFAULT NULL,
  `supporting_document_url` varchar(500) DEFAULT NULL,
  `thesis_advisor` varchar(255) DEFAULT NULL,
  `thesis_title` varchar(500) DEFAULT NULL,
  `thesis_topic` text,
  `updated_at` datetime(6) NOT NULL,
  `verification_notes` text,
  `verification_status` enum('PENDING','REJECTED','VERIFIED') NOT NULL,
  `version` int DEFAULT NULL,
  `created_by` binary(16) DEFAULT NULL,
  `updated_by` binary(16) DEFAULT NULL,
  `user_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FK9uvv5pi50emf0wj8cc5yt60dw` (`created_by`),
  KEY `FKsshlawlskpxlmk0obgw6age7l` (`updated_by`),
  KEY `FK7glqc99uwr1ixp8at3w9kavmr` (`user_id`),
  CONSTRAINT `FK7glqc99uwr1ixp8at3w9kavmr` FOREIGN KEY (`user_id`) REFERENCES `user_entity` (`id`),
  CONSTRAINT `FK9uvv5pi50emf0wj8cc5yt60dw` FOREIGN KEY (`created_by`) REFERENCES `user_entity` (`id`),
  CONSTRAINT `FKsshlawlskpxlmk0obgw6age7l` FOREIGN KEY (`updated_by`) REFERENCES `user_entity` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `education_record`
--

LOCK TABLES `education_record` WRITE;
/*!40000 ALTER TABLE `education_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `education_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `examination_allowed_materials`
--

DROP TABLE IF EXISTS `examination_allowed_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `examination_allowed_materials` (
  `examination_id` binary(16) NOT NULL,
  `material` varchar(255) DEFAULT NULL,
  KEY `FKme4t9928lep3j9set1utg5wqm` (`examination_id`),
  CONSTRAINT `FKme4t9928lep3j9set1utg5wqm` FOREIGN KEY (`examination_id`) REFERENCES `examinations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `examination_allowed_materials`
--

LOCK TABLES `examination_allowed_materials` WRITE;
/*!40000 ALTER TABLE `examination_allowed_materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `examination_allowed_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `examination_requirements`
--

DROP TABLE IF EXISTS `examination_requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `examination_requirements` (
  `examination_id` binary(16) NOT NULL,
  `requirement` varchar(255) DEFAULT NULL,
  KEY `FK25iiydxhktpi5tfv93dbc8b99` (`examination_id`),
  CONSTRAINT `FK25iiydxhktpi5tfv93dbc8b99` FOREIGN KEY (`examination_id`) REFERENCES `examinations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `examination_requirements`
--

LOCK TABLES `examination_requirements` WRITE;
/*!40000 ALTER TABLE `examination_requirements` DISABLE KEYS */;
/*!40000 ALTER TABLE `examination_requirements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `examination_rules`
--

DROP TABLE IF EXISTS `examination_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `examination_rules` (
  `examination_id` binary(16) NOT NULL,
  `rule` varchar(255) DEFAULT NULL,
  KEY `FK9nubtdxcqb61w4r4gtyyio3k0` (`examination_id`),
  CONSTRAINT `FK9nubtdxcqb61w4r4gtyyio3k0` FOREIGN KEY (`examination_id`) REFERENCES `examinations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `examination_rules`
--

LOCK TABLES `examination_rules` WRITE;
/*!40000 ALTER TABLE `examination_rules` DISABLE KEYS */;
/*!40000 ALTER TABLE `examination_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `examination_security_violations`
--

DROP TABLE IF EXISTS `examination_security_violations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `examination_security_violations` (
  `examination_id` binary(16) NOT NULL,
  `violation` varchar(255) DEFAULT NULL,
  KEY `FKel1exlmedkvtp0u7335ne1u8a` (`examination_id`),
  CONSTRAINT `FKel1exlmedkvtp0u7335ne1u8a` FOREIGN KEY (`examination_id`) REFERENCES `examinations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `examination_security_violations`
--

LOCK TABLES `examination_security_violations` WRITE;
/*!40000 ALTER TABLE `examination_security_violations` DISABLE KEYS */;
/*!40000 ALTER TABLE `examination_security_violations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `examination_sessions`
--

DROP TABLE IF EXISTS `examination_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `examination_sessions` (
  `id` binary(16) NOT NULL,
  `current_question_index` int DEFAULT NULL,
  `deadline` datetime(6) DEFAULT NULL,
  `examination_id` binary(16) DEFAULT NULL,
  `start_time` datetime(6) DEFAULT NULL,
  `status` enum('CREATED','FINISHED','INVALIDATED','IN_PROGRESS','PAUSED') DEFAULT NULL,
  `user_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `examination_sessions`
--

LOCK TABLES `examination_sessions` WRITE;
/*!40000 ALTER TABLE `examination_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `examination_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `examinations`
--

DROP TABLE IF EXISTS `examinations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `examinations` (
  `id` binary(16) NOT NULL,
  `answers` text,
  `cancellation_date` datetime(6) DEFAULT NULL,
  `cancellation_reason` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `duration_minutes` bigint DEFAULT NULL,
  `end_time` datetime(6) DEFAULT NULL,
  `start_time` datetime(6) DEFAULT NULL,
  `status` enum('CANCELLED','COMPLETED','DRAFT','EXPIRED','IN_PROGRESS','PUBLISHED') DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `type` enum('PSYCHOLOGICAL','TECHNICAL_ADMINISTRATIVE','TECHNICAL_LEGAL') DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `examinations`
--

LOCK TABLES `examinations` WRITE;
/*!40000 ALTER TABLE `examinations` DISABLE KEYS */;
/*!40000 ALTER TABLE `examinations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscription_circunscripciones`
--

DROP TABLE IF EXISTS `inscription_circunscripciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscription_circunscripciones` (
  `inscriptionId` binary(16) NOT NULL,
  `circunscripcion` varchar(255) DEFAULT NULL,
  KEY `FKpcat22shu1qghntua4qjc1x7f` (`inscriptionId`),
  CONSTRAINT `FKpcat22shu1qghntua4qjc1x7f` FOREIGN KEY (`inscriptionId`) REFERENCES `inscriptions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscription_circunscripciones`
--

LOCK TABLES `inscription_circunscripciones` WRITE;
/*!40000 ALTER TABLE `inscription_circunscripciones` DISABLE KEYS */;
INSERT INTO `inscription_circunscripciones` VALUES (_binary 'G6#pWGoãÉ\‹3ØsT∏','Segunda:San Rafael');
/*!40000 ALTER TABLE `inscription_circunscripciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscription_notes`
--

DROP TABLE IF EXISTS `inscription_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscription_notes` (
  `id` binary(16) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `created_by` binary(16) DEFAULT NULL,
  `created_by_username` varchar(255) NOT NULL,
  `inscription_id` binary(16) NOT NULL,
  `text` varchar(1000) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscription_notes`
--

LOCK TABLES `inscription_notes` WRITE;
/*!40000 ALTER TABLE `inscription_notes` DISABLE KEYS */;
/*!40000 ALTER TABLE `inscription_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inscriptions`
--

DROP TABLE IF EXISTS `inscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscriptions` (
  `id` binary(16) NOT NULL,
  `accepted_terms` bit(1) DEFAULT NULL,
  `centro_de_vida` varchar(255) DEFAULT NULL,
  `confirmed_personal_data` bit(1) DEFAULT NULL,
  `contest_id` bigint DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `current_step` enum('COMPLETED','DATA_CONFIRMATION','DOCUMENTATION','INITIAL','LOCATION_SELECTION','TERMS_ACCEPTANCE') DEFAULT NULL,
  `data_confirmation_date` datetime(6) DEFAULT NULL,
  `documentation_deadline` datetime(6) DEFAULT NULL,
  `documentos_completos` bit(1) DEFAULT NULL,
  `frozen_date` datetime(6) DEFAULT NULL,
  `inscription_date` datetime(6) DEFAULT NULL,
  `status` enum('ACTIVE','APPROVED','CANCELLED','COMPLETED_PENDING_DOCS','COMPLETED_WITH_DOCS','FROZEN','PENDING','REJECTED') DEFAULT NULL,
  `terms_acceptance_date` datetime(6) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `user_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inscriptions`
--

LOCK TABLES `inscriptions` WRITE;
/*!40000 ALTER TABLE `inscriptions` DISABLE KEYS */;
INSERT INTO `inscriptions` VALUES (_binary 'G6#pWGoãÉ\‹3ØsT∏',_binary '','zapata 309, san rafael, mendoza',_binary '',1,'2025-08-08 04:39:02.785205','COMPLETED','2025-08-13 15:47:02.617810',NULL,_binary '\0',NULL,'2025-08-08 04:39:02.785205','COMPLETED_WITH_DOCS','2025-08-13 15:47:02.617810','2025-08-13 15:47:02.617810',_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v');
/*!40000 ALTER TABLE `inscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` binary(16) NOT NULL,
  `acknowledged_at` datetime(6) DEFAULT NULL,
  `acknowledgement_level` enum('NONE','SIGNATURE_ADVANCED','SIGNATURE_BASIC','SIMPLE') NOT NULL,
  `content` text NOT NULL,
  `read_at` datetime(6) DEFAULT NULL,
  `recipient_id` binary(16) NOT NULL,
  `sent_at` datetime(6) NOT NULL,
  `signature_metadata` varchar(255) DEFAULT NULL,
  `signature_type` enum('BIOMETRIC','DECLARATION','DIGITAL_CERT','PIN') DEFAULT NULL,
  `signature_value` varchar(255) DEFAULT NULL,
  `status` enum('ACKNOWLEDGED','PENDING','READ','SENT') NOT NULL,
  `subject` varchar(255) NOT NULL,
  `type` enum('CONTEST','GENERAL','INSCRIPTION','SYSTEM') NOT NULL,
  `version` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `options`
--

DROP TABLE IF EXISTS `options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `options` (
  `id` binary(16) NOT NULL,
  `order_number` int DEFAULT NULL,
  `text` varchar(255) DEFAULT NULL,
  `question_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FKl6j1mbrnpspcq94nlnti3lvq` (`question_id`),
  CONSTRAINT `FKl6j1mbrnpspcq94nlnti3lvq` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `options`
--

LOCK TABLES `options` WRITE;
/*!40000 ALTER TABLE `options` DISABLE KEYS */;
/*!40000 ALTER TABLE `options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `question_correct_answers`
--

DROP TABLE IF EXISTS `question_correct_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_correct_answers` (
  `question_entity_id` binary(16) NOT NULL,
  `correct_answers` varchar(255) DEFAULT NULL,
  KEY `FKj43xbosnf63ryq7e90a7sy815` (`question_entity_id`),
  CONSTRAINT `FKj43xbosnf63ryq7e90a7sy815` FOREIGN KEY (`question_entity_id`) REFERENCES `questions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `question_correct_answers`
--

LOCK TABLES `question_correct_answers` WRITE;
/*!40000 ALTER TABLE `question_correct_answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `question_correct_answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `questions`
--

DROP TABLE IF EXISTS `questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `questions` (
  `id` binary(16) NOT NULL,
  `correct_answer` varchar(255) DEFAULT NULL,
  `order_number` int DEFAULT NULL,
  `score` int DEFAULT NULL,
  `text` varchar(255) DEFAULT NULL,
  `type` enum('MULTIPLE_CHOICE','SINGLE_CHOICE','TEXT','TRUE_FALSE') DEFAULT NULL,
  `examination_id` binary(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK3jct1bv0nn98yhhn9vfvye9n9` (`examination_id`),
  CONSTRAINT `FK3jct1bv0nn98yhhn9vfvye9n9` FOREIGN KEY (`examination_id`) REFERENCES `examinations` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `questions`
--

LOCK TABLES `questions` WRITE;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` binary(16) NOT NULL,
  `name` enum('ROLE_ADMIN','ROLE_USER') NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (_binary '^æ\€W5L\Z´†•¥<Ñ\Ë\Ë','ROLE_USER'),(_binary 'v˚É¶`LŒòèA∑\ÙAe','ROLE_ADMIN');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_entity`
--

DROP TABLE IF EXISTS `user_entity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_entity` (
  `id` binary(16) NOT NULL,
  `birth_date` date DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL,
  `cuit` varchar(255) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `dni` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `legal_address` varchar(255) DEFAULT NULL,
  `municipality` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `residential_address` varchar(255) DEFAULT NULL,
  `status` enum('ACTIVE','BLOCKED','EXPIRED','INACTIVE','LOCKED') NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `username` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK2amp4yij5tn2090qp9fnfiq2o` (`dni`),
  UNIQUE KEY `UKi1e5xs8bk7twy8ipa7wk5iooo` (`email`),
  UNIQUE KEY `UKfjtuwjeka3c70co1s43j70818` (`username`),
  UNIQUE KEY `UKjrcegkefip1jynnm6o8kg98n2` (`cuit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_entity`
--

LOCK TABLES `user_entity` WRITE;
/*!40000 ALTER TABLE `user_entity` DISABLE KEYS */;
INSERT INTO `user_entity` VALUES (_binary 'ùüc<	L∫à^¸∑ÃÄø',NULL,NULL,'2025-08-08 04:37:41.760880',NULL,NULL,'12345678','admin@mpd.gov.ar','Admin','MPD',NULL,NULL,'$2a$10$lI.Wb/SQ8XD0BGCB.eRiU.Ty46cz6j50pDUSuSBu0yu3Acnh8JTiK',NULL,NULL,NULL,'ACTIVE',NULL,'admin'),(_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',NULL,NULL,'2025-08-08 04:37:42.115459','20876543215','zapata 309, san rafael, mendoza','87654321','user_test@example.com','Usuario','Test',NULL,NULL,'$2a$10$q2l.foeQ1H03K2v6ZknhPu3BQ8Swk6EaPoH6O720OlsqJBHxPtF..',NULL,NULL,NULL,'ACTIVE','','user_test');
/*!40000 ALTER TABLE `user_entity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` binary(16) NOT NULL,
  `role_id` binary(16) NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `FKej3jidxlte0r8flpavhiso3g6` (`role_id`),
  CONSTRAINT `FKej3jidxlte0r8flpavhiso3g6` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `FKsa4natutpiuubi8ibp6sco4lw` FOREIGN KEY (`user_id`) REFERENCES `user_entity` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (_binary 'ùüc<	L∫à^¸∑ÃÄø',_binary '^æ\€W5L\Z´†•¥<Ñ\Ë\Ë'),(_binary '”∂è\‰ü@E.ú?\—”õ\ÿ<v',_binary '^æ\€W5L\Z´†•¥<Ñ\Ë\Ë'),(_binary 'ùüc<	L∫à^¸∑ÃÄø',_binary 'v˚É¶`LŒòèA∑\ÙAe');
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `work_experience`
--

DROP TABLE IF EXISTS `work_experience`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `work_experience` (
  `id` binary(16) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `deleted_at` datetime(6) DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_current_position` bit(1) NOT NULL,
  `is_deleted` bit(1) NOT NULL,
  `job_description` text,
  `key_achievements` text,
  `location` varchar(255) DEFAULT NULL,
  `position_title` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `supporting_document_url` varchar(500) DEFAULT NULL,
  `technologies_used` text,
  `updated_at` datetime(6) NOT NULL,
  `verification_notes` text,
  `verification_status` enum('PENDING','REJECTED','VERIFIED') NOT NULL,
  `created_by` binary(16) DEFAULT NULL,
  `deleted_by` binary(16) DEFAULT NULL,
  `updated_by` binary(16) DEFAULT NULL,
  `user_id` binary(16) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKghtng4retc7pg7e7x2hddq0bw` (`created_by`),
  KEY `FKlr19fjbopqo2eflnccyyaomg0` (`deleted_by`),
  KEY `FK2vyptcm2henv76cugp1olu3i1` (`updated_by`),
  KEY `FK7blm37iir3o1ki80ph5xronto` (`user_id`),
  CONSTRAINT `FK2vyptcm2henv76cugp1olu3i1` FOREIGN KEY (`updated_by`) REFERENCES `user_entity` (`id`),
  CONSTRAINT `FK7blm37iir3o1ki80ph5xronto` FOREIGN KEY (`user_id`) REFERENCES `user_entity` (`id`),
  CONSTRAINT `FKghtng4retc7pg7e7x2hddq0bw` FOREIGN KEY (`created_by`) REFERENCES `user_entity` (`id`),
  CONSTRAINT `FKlr19fjbopqo2eflnccyyaomg0` FOREIGN KEY (`deleted_by`) REFERENCES `user_entity` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `work_experience`
--

LOCK TABLES `work_experience` WRITE;
/*!40000 ALTER TABLE `work_experience` DISABLE KEYS */;
/*!40000 ALTER TABLE `work_experience` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-15  8:29:18
