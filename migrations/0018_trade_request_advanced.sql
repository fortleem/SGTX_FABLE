-- Migration 0018: Advanced Trade Request Form
-- Adds weight tracking, transport modes, enhanced packaging, ports table, and HS code reference
-- Part 3 Blueprint: Phase 1 — Trade Initiation (Buyer Portal)

-- ═══════════════════════════════════════════════════════════════════
-- 1. PORTS TABLE (Blueprint Part 5: ports with UN/LOCODE)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ports (
  id TEXT PRIMARY KEY,
  unlocode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  port_type TEXT NOT NULL DEFAULT 'SEA',
  latitude REAL,
  longitude REAL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ports_country ON ports(country_code);
CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(port_type);
CREATE INDEX IF NOT EXISTS idx_ports_unlocode ON ports(unlocode);

-- ═══════════════════════════════════════════════════════════════════
-- 2. HS CODES REFERENCE TABLE (WCO-aligned, for bidirectional lookup)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hs_codes (
  id TEXT PRIMARY KEY,
  hs_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  commodity_type TEXT NOT NULL,
  commodity_label TEXT NOT NULL,
  chapter TEXT,
  heading TEXT,
  is_dual_use INTEGER NOT NULL DEFAULT 0,
  is_sanctioned INTEGER NOT NULL DEFAULT 0,
  temperature_sensitive INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hs_codes_code ON hs_codes(hs_code);
CREATE INDEX IF NOT EXISTS idx_hs_codes_type ON hs_codes(commodity_type);
CREATE INDEX IF NOT EXISTS idx_hs_codes_product ON hs_codes(product_name);

-- ═══════════════════════════════════════════════════════════════════
-- 3. PACKAGING TYPES REFERENCE TABLE (Extended per user request)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS packaging_types (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  default_net_weight_kg REAL,
  tare_weight_kg REAL DEFAULT 0,
  weight_options TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. TRANSPORT MODES REFERENCE TABLE
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transport_modes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  avg_transit_days_factor REAL DEFAULT 1.0,
  cost_factor REAL DEFAULT 1.0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════════
-- 5. ALTER trade_containers: add transport_mode, port_of_loading_unlocode
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE trade_containers ADD COLUMN transport_mode TEXT DEFAULT 'SEA_CARGO';
ALTER TABLE trade_containers ADD COLUMN destination_override TEXT;
ALTER TABLE trade_containers ADD COLUMN port_of_loading_unlocode TEXT;
ALTER TABLE trade_containers ADD COLUMN port_of_discharge_unlocode TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 6. ALTER trade_container_commodities: add weight tracking fields
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE trade_container_commodities ADD COLUMN net_weight_per_unit REAL;
ALTER TABLE trade_container_commodities ADD COLUMN gross_weight_per_unit REAL;
ALTER TABLE trade_container_commodities ADD COLUMN tare_weight_per_unit REAL DEFAULT 0;
ALTER TABLE trade_container_commodities ADD COLUMN total_units INTEGER;
ALTER TABLE trade_container_commodities ADD COLUMN total_net_weight REAL;
ALTER TABLE trade_container_commodities ADD COLUMN total_gross_weight REAL;
ALTER TABLE trade_container_commodities ADD COLUMN weight_unit TEXT DEFAULT 'KG';
ALTER TABLE trade_container_commodities ADD COLUMN quantity_type TEXT DEFAULT 'WEIGHT';
ALTER TABLE trade_container_commodities ADD COLUMN packaging_description TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 7. ALTER trade_requests: add transport_mode at request level
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE trade_requests ADD COLUMN transport_mode TEXT DEFAULT 'SEA_CARGO';
ALTER TABLE trade_requests ADD COLUMN seller_gtid TEXT;
ALTER TABLE trade_requests ADD COLUMN seller_company_name TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 8. SEED: Transport Modes
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO transport_modes (id, code, label, description, avg_transit_days_factor, cost_factor) VALUES
  ('tm-sea', 'SEA_CARGO', 'Sea Cargo (Ocean Freight)', 'Standard ocean freight via container ships. Most cost-effective for large volumes.', 1.0, 1.0),
  ('tm-air', 'AIR_CARGO', 'Air Cargo (Air Freight)', 'Express air freight for time-sensitive or high-value goods.', 0.15, 5.0),
  ('tm-truck', 'INTERNATIONAL_TRUCKING', 'International Trucking', 'Cross-border road transport. Ideal for regional/continental trade.', 0.5, 2.0),
  ('tm-rail', 'RAIL_CARGO', 'Rail Cargo', 'International rail freight. China-Europe, trans-continental routes.', 0.6, 1.8),
  ('tm-multi', 'MULTIMODAL', 'Multimodal (Combined)', 'Combined transport modes (e.g., truck + sea, rail + sea).', 0.8, 1.5);

-- ═══════════════════════════════════════════════════════════════════
-- 9. SEED: Extended Packaging Types (user requested: boxes, barrels, mesh bags, carton bags, bales, bins, etc.)
-- ═══════════════════════════════════════════════════════════════════
INSERT OR IGNORE INTO packaging_types (id, code, label, category, default_net_weight_kg, tare_weight_kg, weight_options, description) VALUES
  ('pk-box-5', 'box_5kg', 'Boxes (5 kg Carton)', 'BOXES', 5.0, 0.3, '[5]', 'Standard 5 kg cardboard carton box'),
  ('pk-box-10', 'box_10kg', 'Boxes (10 kg Carton)', 'BOXES', 10.0, 0.5, '[10]', 'Standard 10 kg cardboard carton box'),
  ('pk-box-15', 'box_15kg', 'Boxes (15 kg Carton)', 'BOXES', 15.0, 0.6, '[15]', 'Standard 15 kg cardboard carton box'),
  ('pk-box-20', 'box_20kg', 'Boxes (20 kg Carton)', 'BOXES', 20.0, 0.7, '[20]', 'Standard 20 kg cardboard carton box'),
  ('pk-box-25', 'box_25kg', 'Boxes (25 kg Carton)', 'BOXES', 25.0, 0.8, '[25]', 'Standard 25 kg cardboard carton box'),
  ('pk-box-cust', 'box_custom', 'Boxes (Custom Weight)', 'BOXES', NULL, 0.5, '[]', 'Custom-weight cardboard carton box'),
  ('pk-mesh-5', 'mesh_bag_5kg', 'Mesh Bags (5 kg)', 'MESH_BAGS', 5.0, 0.05, '[5]', '5 kg mesh/net bag for produce'),
  ('pk-mesh-8', 'mesh_bag_8kg', 'Mesh Bags (8 kg)', 'MESH_BAGS', 8.0, 0.07, '[8]', '8 kg mesh/net bag for produce'),
  ('pk-mesh-10', 'mesh_bag_10kg', 'Mesh Bags (10 kg)', 'MESH_BAGS', 10.0, 0.08, '[10]', '10 kg mesh/net bag for produce'),
  ('pk-mesh-15', 'mesh_bag_15kg', 'Mesh Bags (15 kg)', 'MESH_BAGS', 15.0, 0.10, '[15]', '15 kg mesh/net bag for onions/potatoes'),
  ('pk-mesh-20', 'mesh_bag_20kg', 'Mesh Bags (20 kg)', 'MESH_BAGS', 20.0, 0.12, '[20]', '20 kg mesh/net bag'),
  ('pk-mesh-25', 'mesh_bag_25kg', 'Mesh Bags (25 kg)', 'MESH_BAGS', 25.0, 0.15, '[25]', '25 kg mesh/net bag for onions/potatoes'),
  ('pk-mesh-50', 'mesh_bag_50kg', 'Mesh Bags (50 kg)', 'MESH_BAGS', 50.0, 0.20, '[50]', '50 kg mesh/net bag for bulk produce'),
  ('pk-mesh-cust', 'mesh_bag_custom', 'Mesh Bags (Custom Weight)', 'MESH_BAGS', NULL, 0.10, '[]', 'Custom-weight mesh/net bag'),
  ('pk-carton-5', 'carton_bag_5kg', 'Carton Bags (5 kg)', 'CARTON_BAGS', 5.0, 0.15, '[5]', '5 kg lined carton bag'),
  ('pk-carton-10', 'carton_bag_10kg', 'Carton Bags (10 kg)', 'CARTON_BAGS', 10.0, 0.25, '[10]', '10 kg lined carton bag'),
  ('pk-carton-25', 'carton_bag_25kg', 'Carton Bags (25 kg)', 'CARTON_BAGS', 25.0, 0.40, '[25]', '25 kg lined carton bag'),
  ('pk-carton-50', 'carton_bag_50kg', 'Carton Bags (50 kg)', 'CARTON_BAGS', 50.0, 0.60, '[50]', '50 kg lined carton bag'),
  ('pk-carton-cust', 'carton_bag_custom', 'Carton Bags (Custom Weight)', 'CARTON_BAGS', NULL, 0.30, '[]', 'Custom-weight lined carton bag'),
  ('pk-barrel-100', 'barrel_100L', 'Barrels (100 L Steel)', 'BARRELS', 100.0, 15.0, '[100]', '100-litre steel drum/barrel'),
  ('pk-barrel-200', 'barrel_200L', 'Barrels (200 L Steel)', 'BARRELS', 200.0, 20.0, '[200]', '200-litre (55 gal) steel drum/barrel'),
  ('pk-barrel-plas', 'barrel_plastic', 'Barrels (Plastic HDPE)', 'BARRELS', 200.0, 10.0, '[60,120,200,220]', 'HDPE plastic barrel/drum'),
  ('pk-barrel-cust', 'barrel_custom', 'Barrels (Custom)', 'BARRELS', NULL, 15.0, '[]', 'Custom-size barrel/drum'),
  ('pk-bale-sm', 'bale_small', 'Bales (Small, ~100 kg)', 'BALES', 100.0, 2.0, '[100]', 'Small compressed bale (~100 kg)'),
  ('pk-bale-md', 'bale_medium', 'Bales (Medium, ~200 kg)', 'BALES', 200.0, 3.0, '[200]', 'Medium compressed bale (~200 kg)'),
  ('pk-bale-lg', 'bale_large', 'Bales (Large, ~400 kg)', 'BALES', 400.0, 5.0, '[400]', 'Large compressed bale (~400 kg)'),
  ('pk-bale-cust', 'bale_custom', 'Bales (Custom Weight)', 'BALES', NULL, 3.0, '[]', 'Custom-weight compressed bale'),
  ('pk-bin-300', 'bin_300kg', 'Bins (300 kg Wooden)', 'BINS', 300.0, 25.0, '[300]', '300 kg wooden produce bin'),
  ('pk-bin-500', 'bin_500kg', 'Bins (500 kg Wooden)', 'BINS', 500.0, 35.0, '[500]', '500 kg wooden produce bin'),
  ('pk-bin-plas', 'bin_plastic', 'Bins (Plastic Collapsible)', 'BINS', 300.0, 15.0, '[200,300,400]', 'Collapsible plastic bin'),
  ('pk-bin-cust', 'bin_custom', 'Bins (Custom)', 'BINS', NULL, 25.0, '[]', 'Custom bin size'),
  ('pk-sack-25', 'sack_25kg', 'Sacks (25 kg Jute/Poly)', 'SACKS', 25.0, 0.20, '[25]', '25 kg jute or polypropylene sack'),
  ('pk-sack-50', 'sack_50kg', 'Sacks (50 kg Jute/Poly)', 'SACKS', 50.0, 0.30, '[50]', '50 kg jute or polypropylene sack'),
  ('pk-sack-100', 'sack_100kg', 'Sacks (100 kg Jute/Poly)', 'SACKS', 100.0, 0.50, '[100]', '100 kg jute or polypropylene sack'),
  ('pk-sack-cust', 'sack_custom', 'Sacks (Custom Weight)', 'SACKS', NULL, 0.30, '[]', 'Custom-weight sack'),
  ('pk-crate-wd', 'wooden_crate', 'Wooden Crates', 'CRATES', 20.0, 5.0, '[10,15,20,25,30]', 'Wooden shipping crate'),
  ('pk-crate-pl', 'plastic_crate', 'Plastic Crates (Reusable)', 'CRATES', 20.0, 2.0, '[10,15,20,25]', 'Reusable plastic crate'),
  ('pk-fibc-500', 'fibc_500kg', 'Bulk Bags / FIBC (500 kg)', 'BULK_BAGS', 500.0, 3.0, '[500]', '500 kg Flexible Intermediate Bulk Container'),
  ('pk-fibc-1000', 'fibc_1000kg', 'Bulk Bags / FIBC (1000 kg)', 'BULK_BAGS', 1000.0, 4.0, '[1000]', '1000 kg (1 tonne) FIBC / Jumbo Bag'),
  ('pk-fibc-1500', 'fibc_1500kg', 'Bulk Bags / FIBC (1500 kg)', 'BULK_BAGS', 1500.0, 5.0, '[1500]', '1500 kg FIBC / Jumbo Bag'),
  ('pk-fibc-cust', 'fibc_custom', 'Bulk Bags / FIBC (Custom)', 'BULK_BAGS', NULL, 4.0, '[]', 'Custom-weight FIBC'),
  ('pk-drum-st', 'steel_drum', 'Steel Drums (200 L)', 'DRUMS', 200.0, 20.0, '[200]', '200-litre steel drum'),
  ('pk-drum-pl', 'plastic_drum', 'Plastic Drums (200 L)', 'DRUMS', 200.0, 10.0, '[60,120,200]', 'HDPE plastic drum'),
  ('pk-ibc', 'ibc_1000L', 'IBC Containers (1000 L)', 'IBC', 1000.0, 60.0, '[600,800,1000]', 'Intermediate Bulk Container, 1000 L'),
  ('pk-pallet-wrap', 'pallet_wrapped', 'Pallet Wrapped (Shrink Wrap)', 'PALLETS', NULL, 25.0, '[]', 'Full pallet shrink-wrapped'),
  ('pk-loose', 'loose_bulk', 'Loose / Bulk (Unpackaged)', 'BULK', NULL, 0, '[]', 'Loose/unpackaged bulk commodity'),
  ('pk-other', 'other_custom', 'Other (Specify in Notes)', 'OTHER', NULL, 0, '[]', 'Custom packaging — describe in notes');

-- ═══════════════════════════════════════════════════════════════════
-- 10. SEED: Major Global Ports (UN/LOCODE)
-- Comprehensive list covering all countries in the COUNTRIES reference
-- ═══════════════════════════════════════════════════════════════════

-- EGYPT
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-egaly', 'EGALY', 'Alexandria', 'EG', 'SEA'), ('p-egdam', 'EGDAM', 'Damietta', 'EG', 'SEA'),
  ('p-egpsd', 'EGPSD', 'Port Said', 'EG', 'SEA'), ('p-egsuz', 'EGSUZ', 'Suez', 'EG', 'SEA'),
  ('p-egsok', 'EGSOK', 'Ain Sokhna', 'EG', 'SEA'), ('p-egscn', 'EGSCN', 'Suez Canal Container Terminal', 'EG', 'SEA'),
  ('p-egcai', 'EGCAI', 'Cairo Airport', 'EG', 'AIR');

-- UAE
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-aejea', 'AEJEA', 'Jebel Ali (Dubai)', 'AE', 'SEA'), ('p-aeshj', 'AESHJ', 'Sharjah (Khor Fakkan)', 'AE', 'SEA'),
  ('p-aeauh', 'AEAUH', 'Abu Dhabi (Khalifa Port)', 'AE', 'SEA'), ('p-aefuj', 'AEFUJ', 'Fujairah', 'AE', 'SEA'),
  ('p-aedxb', 'AEDXB', 'Dubai Airport (DXB)', 'AE', 'AIR'), ('p-aeajm', 'AEAJM', 'Ajman', 'AE', 'SEA');

-- SAUDI ARABIA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-sajed', 'SAJED', 'Jeddah Islamic Port', 'SA', 'SEA'), ('p-sakac', 'SAKAC', 'King Abdullah Port', 'SA', 'SEA'),
  ('p-sadmm', 'SADMM', 'Dammam (King Abdulaziz Port)', 'SA', 'SEA'), ('p-sajub', 'SAJUB', 'Jubail', 'SA', 'SEA'),
  ('p-saynb', 'SAYNB', 'Yanbu', 'SA', 'SEA'), ('p-saruh', 'SARUH', 'Riyadh Airport', 'SA', 'AIR');

-- CHINA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-cnsha', 'CNSHA', 'Shanghai', 'CN', 'SEA'), ('p-cnshe', 'CNSHE', 'Shenzhen (Yantian)', 'CN', 'SEA'),
  ('p-cnngb', 'CNNGB', 'Ningbo-Zhoushan', 'CN', 'SEA'), ('p-cnqin', 'CNQIN', 'Qingdao', 'CN', 'SEA'),
  ('p-cntxg', 'CNTXG', 'Tianjin', 'CN', 'SEA'), ('p-cnxmn', 'CNXMN', 'Xiamen', 'CN', 'SEA'),
  ('p-cngua', 'CNGUA', 'Guangzhou (Nansha)', 'CN', 'SEA'), ('p-cndal', 'CNDAL', 'Dalian', 'CN', 'SEA'),
  ('p-cnpek', 'CNPEK', 'Beijing Airport', 'CN', 'AIR'), ('p-cncan', 'CNCAN', 'Guangzhou Airport', 'CN', 'AIR');

-- VIETNAM
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-vnsgn', 'VNSGN', 'Ho Chi Minh City (Cat Lai)', 'VN', 'SEA'), ('p-vnhph', 'VNHPH', 'Hai Phong', 'VN', 'SEA'),
  ('p-vnvut', 'VNVUT', 'Vung Tau', 'VN', 'SEA'), ('p-vndan', 'VNDAN', 'Da Nang', 'VN', 'SEA');

-- INDIA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-innsa', 'INNSA', 'Nhava Sheva (JNPT)', 'IN', 'SEA'), ('p-inmun', 'INMUN', 'Mumbai', 'IN', 'SEA'),
  ('p-inmaa', 'INMAA', 'Chennai', 'IN', 'SEA'), ('p-inmrg', 'INMRG', 'Mundra', 'IN', 'SEA'),
  ('p-intut', 'INTUT', 'Tuticorin', 'IN', 'SEA'), ('p-inviz', 'INVIZ', 'Visakhapatnam', 'IN', 'SEA'),
  ('p-incok', 'INCOK', 'Cochin', 'IN', 'SEA'), ('p-indel', 'INDEL', 'Delhi Airport (DEL)', 'IN', 'AIR');

-- USA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-usnyc', 'USNYC', 'New York / New Jersey', 'US', 'SEA'), ('p-uslax', 'USLAX', 'Los Angeles', 'US', 'SEA'),
  ('p-uslgb', 'USLGB', 'Long Beach', 'US', 'SEA'), ('p-ussav', 'USSAV', 'Savannah', 'US', 'SEA'),
  ('p-ushou', 'USHOU', 'Houston', 'US', 'SEA'), ('p-ussea', 'USSEA', 'Seattle-Tacoma', 'US', 'SEA'),
  ('p-usorf', 'USORF', 'Norfolk', 'US', 'SEA'), ('p-uschs', 'USCHS', 'Charleston', 'US', 'SEA'),
  ('p-usmia', 'USMIA', 'Miami', 'US', 'SEA'), ('p-usjfk', 'USJFK', 'JFK Airport (New York)', 'US', 'AIR'),
  ('p-usord', 'USORD', 'O''Hare Airport (Chicago)', 'US', 'AIR');

-- UK
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-gbfxt', 'GBFXT', 'Felixstowe', 'GB', 'SEA'), ('p-gbsou', 'GBSOU', 'Southampton', 'GB', 'SEA'),
  ('p-gblgp', 'GBLGP', 'London Gateway', 'GB', 'SEA'), ('p-gblhr', 'GBLHR', 'Heathrow Airport', 'GB', 'AIR');

-- GERMANY
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-deham', 'DEHAM', 'Hamburg', 'DE', 'SEA'), ('p-debrv', 'DEBRV', 'Bremerhaven', 'DE', 'SEA'),
  ('p-defra', 'DEFRA', 'Frankfurt Airport', 'DE', 'AIR');

-- NETHERLANDS
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-nlrtm', 'NLRTM', 'Rotterdam', 'NL', 'SEA'), ('p-nlams', 'NLAMS', 'Amsterdam', 'NL', 'SEA');

-- BELGIUM
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-beanr', 'BEANR', 'Antwerp', 'BE', 'SEA'), ('p-bezee', 'BEZEE', 'Zeebrugge', 'BE', 'SEA');

-- FRANCE
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-frleh', 'FRLEH', 'Le Havre', 'FR', 'SEA'), ('p-frfos', 'FRFOS', 'Fos-sur-Mer (Marseille)', 'FR', 'SEA'),
  ('p-frcdg', 'FRCDG', 'Paris CDG Airport', 'FR', 'AIR');

-- SPAIN
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-esvlc', 'ESVLC', 'Valencia', 'ES', 'SEA'), ('p-esbcn', 'ESBCN', 'Barcelona', 'ES', 'SEA'),
  ('p-esalg', 'ESALG', 'Algeciras', 'ES', 'SEA');

-- ITALY
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-itgoa', 'ITGOA', 'Genoa', 'IT', 'SEA'), ('p-itgit', 'ITGIT', 'Gioia Tauro', 'IT', 'SEA'),
  ('p-itliv', 'ITLIV', 'Livorno', 'IT', 'SEA');

-- TURKEY
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-trist', 'TRIST', 'Istanbul (Ambarli)', 'TR', 'SEA'), ('p-trmer', 'TRMER', 'Mersin', 'TR', 'SEA'),
  ('p-trizm', 'TRIZM', 'Izmir (Alsancak)', 'TR', 'SEA'), ('p-trisl', 'TRISL', 'Istanbul Airport', 'TR', 'AIR');

-- BRAZIL
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-brssz', 'BRSSZ', 'Santos', 'BR', 'SEA'), ('p-brpng', 'BRPNG', 'Paranagua', 'BR', 'SEA'),
  ('p-brrig', 'BRRIG', 'Rio Grande', 'BR', 'SEA');

-- JAPAN
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-jptyo', 'JPTYO', 'Tokyo', 'JP', 'SEA'), ('p-jpyok', 'JPYOK', 'Yokohama', 'JP', 'SEA'),
  ('p-jpkob', 'JPKOB', 'Kobe', 'JP', 'SEA'), ('p-jpnrt', 'JPNRT', 'Narita Airport', 'JP', 'AIR');

-- SOUTH KOREA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-krpus', 'KRPUS', 'Busan', 'KR', 'SEA'), ('p-krinc', 'KRINC', 'Incheon', 'KR', 'SEA');

-- SINGAPORE, MALAYSIA, THAILAND, INDONESIA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-sgsin', 'SGSIN', 'Singapore', 'SG', 'SEA'), ('p-sgsin-a', 'SGCHA', 'Singapore Changi Airport', 'SG', 'AIR'),
  ('p-mypkg', 'MYPKG', 'Port Klang', 'MY', 'SEA'), ('p-mytpp', 'MYTPP', 'Tanjung Pelepas', 'MY', 'SEA'),
  ('p-thlch', 'THLCH', 'Laem Chabang', 'TH', 'SEA'), ('p-thbkk', 'THBKK', 'Bangkok Airport', 'TH', 'AIR'),
  ('p-idjkt', 'IDJKT', 'Jakarta (Tanjung Priok)', 'ID', 'SEA'), ('p-idsub', 'IDSUB', 'Surabaya', 'ID', 'SEA');

-- AUSTRALIA, NEW ZEALAND
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-aumel', 'AUMEL', 'Melbourne', 'AU', 'SEA'), ('p-ausyd', 'AUSYD', 'Sydney', 'AU', 'SEA'),
  ('p-aubne', 'AUBNE', 'Brisbane', 'AU', 'SEA'), ('p-nzakl', 'NZAKL', 'Auckland', 'NZ', 'SEA');

-- AFRICA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-zadur', 'ZADUR', 'Durban', 'ZA', 'SEA'), ('p-zacpt', 'ZACPT', 'Cape Town', 'ZA', 'SEA'),
  ('p-kemba', 'KEMBA', 'Mombasa', 'KE', 'SEA'), ('p-kenbo', 'KENBO', 'Nairobi Airport', 'KE', 'AIR'),
  ('p-ngapp', 'NGAPP', 'Apapa (Lagos)', 'NG', 'SEA'), ('p-ngtin', 'NGTIN', 'Tin Can Island', 'NG', 'SEA'),
  ('p-ghtem', 'GHTEM', 'Tema', 'GH', 'SEA'), ('p-tzdar', 'TZDAR', 'Dar es Salaam', 'TZ', 'SEA'),
  ('p-maptm', 'MAPTM', 'Tanger Med', 'MA', 'SEA'), ('p-macas', 'MACAS', 'Casablanca', 'MA', 'SEA'),
  ('p-tntun', 'TNTUN', 'Rades (Tunis)', 'TN', 'SEA'), ('p-dzalg', 'DZALG', 'Algiers', 'DZ', 'SEA'),
  ('p-ciabj', 'CIABJ', 'Abidjan', 'CI', 'SEA'), ('p-sndkr', 'SNDKR', 'Dakar', 'SN', 'SEA'),
  ('p-djjib', 'DJJIB', 'Djibouti', 'DJ', 'SEA'), ('p-sdpzu', 'SDPZU', 'Port Sudan', 'SD', 'SEA'),
  ('p-etadd', 'ETADD', 'Addis Ababa (Dry Port)', 'ET', 'DRY'), ('p-etadd-a', 'ETBOA', 'Bole Airport', 'ET', 'AIR');

-- MIDDLE EAST & CENTRAL ASIA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-lbbey', 'LBBEY', 'Beirut', 'LB', 'SEA'), ('p-joaqj', 'JOAQJ', 'Aqaba', 'JO', 'SEA'),
  ('p-iqbsr', 'IQBSR', 'Umm Qasr (Basra)', 'IQ', 'SEA'), ('p-irbnd', 'IRBND', 'Bandar Abbas', 'IR', 'SEA'),
  ('p-pkkhi', 'PKKHI', 'Karachi', 'PK', 'SEA'), ('p-pkqas', 'PKQAS', 'Port Qasim', 'PK', 'SEA'),
  ('p-bdcgp', 'BDCGP', 'Chittagong', 'BD', 'SEA'), ('p-lkcmb', 'LKCMB', 'Colombo', 'LK', 'SEA'),
  ('p-omsll', 'OMSLL', 'Salalah', 'OM', 'SEA'), ('p-bhkbs', 'BHKBS', 'Khalifa Bin Salman Port', 'BH', 'SEA'),
  ('p-kwswk', 'KWSWK', 'Shuwaikh', 'KW', 'SEA'), ('p-qaham', 'QAHAM', 'Hamad Port (Doha)', 'QA', 'SEA');

-- LATIN AMERICA
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-clsai', 'CLSAI', 'San Antonio', 'CL', 'SEA'), ('p-clvap', 'CLVAP', 'Valparaiso', 'CL', 'SEA'),
  ('p-pecll', 'PECLL', 'Callao', 'PE', 'SEA'), ('p-coctg', 'COCTG', 'Cartagena', 'CO', 'SEA'),
  ('p-ecgye', 'ECGYE', 'Guayaquil', 'EC', 'SEA'), ('p-mxman', 'MXMAN', 'Manzanillo', 'MX', 'SEA'),
  ('p-mxver', 'MXVER', 'Veracruz', 'MX', 'SEA'), ('p-cavan', 'CAVAN', 'Vancouver', 'CA', 'SEA'),
  ('p-camtr', 'CAMTR', 'Montreal', 'CA', 'SEA'), ('p-pablb', 'PABLB', 'Balboa', 'PA', 'SEA'),
  ('p-arba', 'ARBUE', 'Buenos Aires', 'AR', 'SEA');

-- EASTERN EUROPE
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-grpir', 'GRPIR', 'Piraeus', 'GR', 'SEA'), ('p-rocnd', 'ROCND', 'Constanta', 'RO', 'SEA'),
  ('p-bgvar', 'BGVAR', 'Varna', 'BG', 'SEA'), ('p-plgdn', 'PLGDN', 'Gdansk', 'PL', 'SEA'),
  ('p-hrrjk', 'HRRJK', 'Rijeka', 'HR', 'SEA'), ('p-sikop', 'SIKOP', 'Koper', 'SI', 'SEA'),
  ('p-uaods', 'UAODS', 'Odessa', 'UA', 'SEA'), ('p-ruled', 'RULED', 'St. Petersburg', 'RU', 'SEA');

-- NORDICS
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-segot', 'SEGOT', 'Gothenburg', 'SE', 'SEA'), ('p-fihel', 'FIHEL', 'Helsinki', 'FI', 'SEA'),
  ('p-dkaar', 'DKAAR', 'Aarhus', 'DK', 'SEA'), ('p-noosl', 'NOOSL', 'Oslo', 'NO', 'SEA');

-- PORTUGAL, ISRAEL
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-ptlis', 'PTLIS', 'Lisbon', 'PT', 'SEA'), ('p-ptsin', 'PTSIN', 'Sines', 'PT', 'SEA'),
  ('p-ilhfa', 'ILHFA', 'Haifa', 'IL', 'SEA'), ('p-ilash', 'ILASH', 'Ashdod', 'IL', 'SEA');

-- TAIWAN, HONG KONG, PHILIPPINES
INSERT OR IGNORE INTO ports (id, unlocode, name, country_code, port_type) VALUES
  ('p-twkhh', 'TWKHH', 'Kaohsiung', 'TW', 'SEA'), ('p-hkhkg', 'HKHKG', 'Hong Kong', 'HK', 'SEA'),
  ('p-phmnl', 'PHMNL', 'Manila', 'PH', 'SEA');

-- ═══════════════════════════════════════════════════════════════════
-- 11. Update blueprint_part_status for Part 3 progress
-- ═══════════════════════════════════════════════════════════════════
INSERT OR REPLACE INTO blueprint_part_status (part_number, part_title, status, endpoints_total, endpoints_implemented, governor_gates_total, governor_gates_implemented, tables_required, tables_created, notes, last_verified)
VALUES (3, 'End-to-End Workflow with Governance Overlay', 'IN_PROGRESS', 40, 13, 6, 1, 10, 4,
  'Migration 0018: ports, hs_codes, packaging_types, transport_modes tables. Weight tracking on commodities. Phase 1 trade form with 13 endpoints.', datetime('now'));
