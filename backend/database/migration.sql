-- ============================================
-- SCRIPT DI MIGRAZIONE DATABASE
-- Da versione precedente a versione corretta
-- ============================================

-- Questo script aggiorna un database esistente con tutti i campi mancanti
-- Esegui: psql -U postgres -d rental_management -f migration.sql

BEGIN;

-- 1. AGGIORNA TABELLA rental_photos (CRITICO)
ALTER TABLE rental_photos 
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

COMMENT ON COLUMN rental_photos.file_size IS 'Dimensione file in bytes';
COMMENT ON COLUMN rental_photos.mime_type IS 'Tipo MIME del file (image/jpeg, image/png, etc.)';

-- 2. AGGIORNA TABELLA rentals - CAMPI FINANZIARI
ALTER TABLE rentals 
ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fuel_charge NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS after_hours_charge NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extras_charge NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extra_km_charge NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS franchise_charge NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS deposit_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS km_included VARCHAR(50) DEFAULT 'Illimitati';

COMMENT ON COLUMN rentals.delivery_cost IS 'Costo consegna/ritiro';
COMMENT ON COLUMN rentals.fuel_charge IS 'Costo rifornimento carburante';
COMMENT ON COLUMN rentals.after_hours_charge IS 'Costo fuori orario';
COMMENT ON COLUMN rentals.extras_charge IS 'Costo servizi extra';
COMMENT ON COLUMN rentals.extra_km_charge IS 'Costo km extra';
COMMENT ON COLUMN rentals.franchise_charge IS 'Costo riduzione franchigia';
COMMENT ON COLUMN rentals.discount IS 'Sconto applicato';

-- 3. AGGIORNA TABELLA rentals - CONDUCENTE AGGIUNTIVO
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS additional_driver_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS additional_driver_birth_place VARCHAR(255),
ADD COLUMN IF NOT EXISTS additional_driver_birth_date DATE,
ADD COLUMN IF NOT EXISTS additional_driver_license VARCHAR(50),
ADD COLUMN IF NOT EXISTS additional_driver_license_issued_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS additional_driver_license_issue_date DATE,
ADD COLUMN IF NOT EXISTS additional_driver_license_expiry DATE;

COMMENT ON COLUMN rentals.additional_driver_name IS 'Nome completo conducente aggiuntivo';
COMMENT ON COLUMN rentals.additional_driver_birth_place IS 'Luogo di nascita conducente aggiuntivo';
COMMENT ON COLUMN rentals.additional_driver_birth_date IS 'Data di nascita conducente aggiuntivo';

-- 4. AGGIORNA TABELLA rentals - CARTA DI CREDITO GARANZIA
ALTER TABLE rentals
ADD COLUMN IF NOT EXISTS cc_holder_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS cc_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS cc_number_masked VARCHAR(50),
ADD COLUMN IF NOT EXISTS cc_expiry VARCHAR(10);

COMMENT ON COLUMN rentals.cc_holder_name IS 'Intestatario carta di credito';
COMMENT ON COLUMN rentals.cc_type IS 'Tipo carta (Visa, Mastercard, etc.)';
COMMENT ON COLUMN rentals.cc_number_masked IS 'Numero carta mascherato (es. **** **** **** 1234)';
COMMENT ON COLUMN rentals.cc_expiry IS 'Scadenza carta (MM/YY)';

-- 5. AGGIORNA TABELLA customers - DOCUMENTO IDENTITÀ (CORRETTO con id_card_number)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS id_card_issue_date DATE,
ADD COLUMN IF NOT EXISTS id_card_expiry_date DATE,
ADD COLUMN IF NOT EXISTS id_card_issued_by VARCHAR(255);

COMMENT ON COLUMN customers.id_card_number IS 'Numero documento identità';
COMMENT ON COLUMN customers.id_card_issue_date IS 'Data rilascio documento identità';
COMMENT ON COLUMN customers.id_card_expiry_date IS 'Data scadenza documento identità';
COMMENT ON COLUMN customers.id_card_issued_by IS 'Ente rilascio documento identità';

-- 6. VERIFICA INDICI (crea se non esistono)
CREATE INDEX IF NOT EXISTS idx_rentals_customer ON rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_vehicle ON rentals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(pickup_date, expected_return_date);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_customers_fiscal ON customers(fiscal_code);
CREATE INDEX IF NOT EXISTS idx_rental_photos_rental ON rental_photos(rental_id);

-- 7. AGGIORNA VALORI DEFAULT SU RECORD ESISTENTI
UPDATE rentals 
SET 
  delivery_cost = COALESCE(delivery_cost, 0),
  fuel_charge = COALESCE(fuel_charge, 0),
  after_hours_charge = COALESCE(after_hours_charge, 0),
  extras_charge = COALESCE(extras_charge, 0),
  extra_km_charge = COALESCE(extra_km_charge, 0),
  franchise_charge = COALESCE(franchise_charge, 0),
  discount = COALESCE(discount, 0),
  km_included = COALESCE(km_included, 'Illimitati')
WHERE 
  delivery_cost IS NULL OR
  fuel_charge IS NULL OR
  after_hours_charge IS NULL OR
  extras_charge IS NULL OR
  extra_km_charge IS NULL OR
  franchise_charge IS NULL OR
  discount IS NULL OR
  km_included IS NULL;

-- 8. VERIFICA RISULTATI
SELECT 'Migration completed successfully!' AS status;

-- Mostra tutte le colonne della tabella rentals per verifica
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rentals'
ORDER BY ordinal_position;

-- Mostra tutte le colonne della tabella customers per verifica
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

-- Mostra tutte le colonne della tabella rental_photos per verifica
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'rental_photos'
ORDER BY ordinal_position;

COMMIT;