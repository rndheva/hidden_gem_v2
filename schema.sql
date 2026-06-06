-- ============================================================
-- 1. TABEL USERS (Autentikasi, Role & Status Approval)
-- ============================================================
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS travel_packages;
DROP TABLE IF EXISTS destinations;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
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
-- 2. TABEL DESTINATIONS
-- ============================================================
CREATE TABLE destinations (
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
-- 3. TABEL TRAVEL PACKAGES
-- ============================================================
CREATE TABLE travel_packages (
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
  CONSTRAINT fk_pkg_destination FOREIGN KEY (destination_id) REFERENCES destinations(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TABEL BOOKINGS
-- ============================================================
CREATE TABLE bookings (
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
  CONSTRAINT fk_booking_tourist FOREIGN KEY (tourist_id) REFERENCES users(id)             ON DELETE CASCADE,
  CONSTRAINT fk_booking_package FOREIGN KEY (package_id) REFERENCES travel_packages(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TABEL REVIEWS
-- ============================================================
CREATE TABLE reviews (
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
  CONSTRAINT fk_review_destination  FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- DATA INITIAL SEEDING (Pengisian Ulang Data Segar)
-- ============================================================

-- Masukkan Superadmin Baru yang Pasti Berhasil Login
-- Email: superadmin@hiddengemexplorer.id | Password asli: SuperAdmin@2024!
INSERT INTO users (id, fullname, email, password, role, status) VALUES
(1, 'Super Administrator', 'superadmin@hiddengemexplorer.id', 'SuperAdmin@2024!', 'superadmin', 'approved');

-- Masukkan 5 Destinasi Utama
INSERT INTO destinations (id, name, location, province, image_url, description, difficulty, duration, culture_info, wtf_instagrammable, wtf_access, wtf_reviews, lat, lng) VALUES
(1, 'Curug Leuwi Hejo', 'Sentul, Bogor', 'West Java', 'https://mundomaya.travel/wp-content/uploads/2021/08/Curug-Leuwi-Hejo.jpg', 'Known for its crystal-clear turquoise water and multiple tiers of pools.', 'Moderate', '30-45 mins', 'Local villagers maintain the area.', 5, 4, 5, -6.58780000, 106.90140000),
(2, 'Sekumpul Waterfall', 'Singaraja, Buleleng', 'Bali', 'https://i1.wp.com/www.balistarisland.com/wp-content/uploads/2016/03/sekumpulwaterfall01.jpg?fit=1200%2C650&ssl=1#aqua_resizer_image_not_local', 'Often cited as the most beautiful waterfall in Bali.', 'Hard', '60-90 mins', 'The waterfall is located within a traditional Balinese village.', 5, 3, 5, -8.17320000, 115.18150000),
(3, 'Sipiso-piso', 'Tongging, Karo', 'North Sumatra', 'https://img.freepik.com/free-photo/sipiso-piso-waterfall-famous-travel-landmarkin-berastagi-lake-toba-sumatra-indonesia_107467-77.jpg?size=626&ext=jpg', 'One of Indonesia''s tallest waterfalls.', 'Hard', '45-60 mins', 'The Batak Karo people reside here.', 5, 4, 4, 2.91670000, 98.52500000),
(4, 'Tumpak Sewu', 'Lumajang – Malang Border', 'East Java', 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/17/97/b7/6f/tumpak-sewu-waterfalls.jpg?w=1200&h=-1&s=1', 'Literally translated as "Thousand Waterfalls".', 'Expert', '90-120 mins', 'Considered a sacred site by many locals.', 5, 2, 5, -8.23110000, 112.91610000),
(5, 'Curug Cikaso', 'Surade, Sukabumi', 'West Java', 'https://tempatwisataseru.com/wp-content/uploads/2017/10/Keindahan-Curug-Cikaso-Sukabumi.jpg', 'Featuring three distinct falls side by side.', 'Easy', '20-30 mins', 'The area is rich in Sundanese culture.', 4, 4, 4, -7.35970000, 106.61860000);

-- Masukkan 5 Paket Wisata Lengkap
INSERT INTO travel_packages (id, provider_id, destination_id, title, description, price, difficulty, duration, max_participants, image_url, itinerary, includes, excludes, status) VALUES 
(1, 1, 1, 'One Day Trekking & Trail Run Curug Leuwi Hejo', 'Nikmati kesegaran air turunan pegunungan di Sentul Bogor.', 150000.00, 'Moderate', '1 Hari', 10, 'https://mundomaya.travel/wp-content/uploads/2021/08/Curug-Leuwi-Hejo.jpg', '[]', '[]', '[]', 'active'),
(2, 1, 2, 'The Secret Seven: Sekumpul Waterfalls Trekking Tour', 'Eksplorasi megahnya rahasia alam Bali Utara.', 450000.00, 'Hard', '1 Hari', 6, 'https://www.nopostcode.com/wp-content/uploads/2022/10/Sekumpul-Waterfall-38.jpg', '[]', '[]', '[]', 'active'),
(3, 1, 3, 'Karo Highlands Heritage & Sipiso-piso Waterfall', 'Melihat langsung keindahan air terjun tertinggi di Danau Toba.', 300000.00, 'Hard', '1 Hari', 12, 'https://authentic-indonesia.com/wp-content/uploads/2020/08/mingle-with-the-beauty-of-Sipiso-piso-Waterfall.jpg', '[]', '[]', '[]', 'active'),
(4, 1, 4, 'Ekspedisi Air Terjun Seribu Tirai Tumpak Sewu', 'Petualangan ekstrem menuruni tebing bambu.', 350000.00, 'Expert', '1 Hari', 8, 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/17/97/b7/6f/tumpak-sewu-waterfalls.jpg?w=1200&h=-1&s=1', '[]', '[]', '[]', 'active'),
(5, 1, 5, 'Explore Hidden Paradise: Curug Cikaso Sukabumi', 'Wisata santai menikmati indahnya tiga air terjun kembar.', 250000.00, 'Easy', '1 Hari', 15, 'https://tempatwisataseru.com/wp-content/uploads/2017/10/Keindahan-Curug-Cikaso-Sukabumi.jpg', '[]', '[]', '[]', 'active');