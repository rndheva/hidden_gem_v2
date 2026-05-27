-- ============================================================
-- Hidden Gem Explorer - Database Schema
-- MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS hidden_gem_explorer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hidden_gem_explorer;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  fullname     VARCHAR(150)  NOT NULL,
  email        VARCHAR(150)  NOT NULL UNIQUE,
  password     VARCHAR(255)  NOT NULL,
  role         ENUM('superadmin','provider','tourist') NOT NULL DEFAULT 'tourist',
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  avatar_url   VARCHAR(255)  DEFAULT NULL,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email  (email),
  INDEX idx_role   (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DESTINATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS destinations (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(255)   NOT NULL,
  location            VARCHAR(255)   NOT NULL,
  province            VARCHAR(100)   NOT NULL,
  image_url           VARCHAR(500)   NOT NULL,
  description         TEXT           NOT NULL,
  difficulty          ENUM('Easy','Moderate','Hard','Expert') NOT NULL DEFAULT 'Moderate',
  duration            VARCHAR(100)   NOT NULL,
  culture_info        TEXT           NOT NULL,
  wtf_instagrammable  TINYINT        NOT NULL DEFAULT 3,
  wtf_access          TINYINT        NOT NULL DEFAULT 3,
  wtf_reviews         TINYINT        NOT NULL DEFAULT 3,
  lat                 DECIMAL(10,8)  NOT NULL,
  lng                 DECIMAL(11,8)  NOT NULL,
  is_active           TINYINT(1)     NOT NULL DEFAULT 1,
  created_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRAVEL PACKAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_packages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  provider_id     INT           NOT NULL,
  destination_id  INT           NOT NULL,
  title           VARCHAR(255)  NOT NULL,
  description     TEXT          NOT NULL,
  price           DECIMAL(12,2) NOT NULL,
  difficulty      ENUM('Easy','Moderate','Hard','Expert') NOT NULL DEFAULT 'Moderate',
  duration        VARCHAR(100)  NOT NULL,
  max_participants INT          NOT NULL DEFAULT 10,
  image_url       VARCHAR(500)  DEFAULT NULL,
  itinerary       JSON          NOT NULL,
  includes        JSON          DEFAULT NULL,
  excludes        JSON          DEFAULT NULL,
  status          ENUM('active','inactive','draft') NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pkg_provider    FOREIGN KEY (provider_id)    REFERENCES users(id)         ON DELETE CASCADE,
  CONSTRAINT fk_pkg_destination FOREIGN KEY (destination_id) REFERENCES destinations(id)  ON DELETE CASCADE,
  INDEX idx_provider    (provider_id),
  INDEX idx_destination (destination_id),
  INDEX idx_status      (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tourist_id    INT           NOT NULL,
  package_id    INT           NOT NULL,
  booking_date  DATE          NOT NULL,
  participants  INT           NOT NULL DEFAULT 1,
  total_price   DECIMAL(12,2) NOT NULL,
  status        ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  notes         TEXT          DEFAULT NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_tourist FOREIGN KEY (tourist_id) REFERENCES users(id)            ON DELETE CASCADE,
  CONSTRAINT fk_booking_package FOREIGN KEY (package_id) REFERENCES travel_packages(id)  ON DELETE CASCADE,
  INDEX idx_tourist (tourist_id),
  INDEX idx_package (package_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  tourist_id     INT      NOT NULL,
  destination_id INT      NOT NULL,
  rating         TINYINT  NOT NULL,
  comment        TEXT     NOT NULL,
  is_approved    TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review (tourist_id, destination_id),
  CONSTRAINT fk_review_tourist      FOREIGN KEY (tourist_id)     REFERENCES users(id)        ON DELETE CASCADE,
  CONSTRAINT fk_review_destination  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
  INDEX idx_destination (destination_id),
  INDEX idx_tourist     (tourist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED: SUPERADMIN
-- Password: SuperAdmin@2024!
-- ============================================================
INSERT INTO users (fullname, email, password, role, status) VALUES
('Super Administrator', 'superadmin@hiddengemexplorer.id',
 '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NdQ4H5q/.',
 'superadmin', 'approved');

-- ============================================================
-- SEED: DESTINATIONS (pakai URL gambar langsung)
-- ============================================================
INSERT INTO destinations
  (name, location, province, image_url, description, difficulty, duration,
   culture_info, wtf_instagrammable, wtf_access, wtf_reviews, lat, lng)
VALUES
(
  'Curug Leuwi Hejo',
  'Sentul, Bogor',
  'West Java',
  'https://panduanwisata.b-cdn.net/wp-content/uploads/2021/05/Curug-Leuwi-Hejo-by-@sunday.sofun_.jpg',
  'Known for its crystal-clear turquoise water and multiple tiers of pools. The trail offers a mix of paved paths and rocky terrains, perfect for a refreshing trail run.',
  'Moderate',
  '30-45 mins',
  'Local villagers maintain the area and often share stories of the Curug''s healing properties.',
  5, 4, 5,
  -6.58780000, 106.90140000
),
(
  'Sekumpul Waterfall',
  'Singaraja, Buleleng',
  'Bali',
  'https://images.unsplash.com/photo-1552603305-181079bc7973?q=80&w=1000&auto=format&fit=crop',
  'Often cited as the most beautiful waterfall in Bali. It consists of seven waterfalls in one area. The trek is challenging with steep stairs and slippery paths.',
  'Hard',
  '60-90 mins',
  'The waterfall is located within a traditional Balinese village area where Subak irrigation systems are still prominent.',
  5, 3, 5,
  -8.17320000, 115.18150000
),
(
  'Sipiso-piso',
  'Tongging, Karo',
  'North Sumatra',
  'https://images.unsplash.com/photo-1626081464303-36c5890989f6?q=80&w=1000&auto=format&fit=crop',
  'One of Indonesia''s tallest waterfalls, dropping into the Karo highlands. The view from the top is breathtaking, but the trail to the bottom is a steep, leg-burning staircase.',
  'Hard',
  '45-60 mins',
  'The Batak Karo people reside here, and their traditional "Siwaluh Jabu" houses can be seen nearby.',
  5, 4, 4,
  2.91670000, 98.52500000
),
(
  'Tumpak Sewu',
  'Lumajang – Malang Border',
  'East Java',
  'https://images.unsplash.com/photo-1605280766158-947ca6233486?q=80&w=1000&auto=format&fit=crop',
  'Literally translated as "Thousand Waterfalls". It looks like a giant curtain of water. Reaching the base requires descending through bamboo ladders and riverbeds.',
  'Expert',
  '90-120 mins',
  'Considered a sacred site by many locals in the Tenggerese highlands.',
  5, 2, 5,
  -8.23110000, 112.91610000
),
(
  'Curug Cikaso',
  'Surade, Sukabumi',
  'West Java',
  'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?q=80&w=1000&auto=format&fit=crop',
  'Featuring three distinct falls side by side. It''s relatively hidden and usually reached by a short boat ride or a pleasant trail run through rice fields.',
  'Easy',
  '20-30 mins',
  'The area is rich in Sundanese culture and traditional farming practices.',
  4, 4, 4,
  -7.35970000, 106.61860000
);