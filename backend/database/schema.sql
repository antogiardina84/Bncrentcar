-- Database: rental_management

-- Drop tables if exist (per sviluppo)
DROP TABLE IF EXISTS rental_photos CASCADE;
DROP TABLE IF EXISTS rental_payments CASCADE;
DROP TABLE IF EXISTS rental_extras CASCADE;
DROP TABLE IF EXISTS rentals CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS vehicle_categories CASCADE;

-- Tabella Utenti (operatori sistema)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Categorie Veicoli
CREATE TABLE vehicle_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL,
    franchise_theft DECIMAL(10,2) DEFAULT 0,
    franchise_damage DECIMAL(10,2) DEFAULT 0,
    franchise_rca DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Veicoli
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    category_id INTEGER REFERENCES vehicle_categories(id),
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER,
    color VARCHAR(30),
    fuel_type VARCHAR(20),
    transmission VARCHAR(20),
    seats INTEGER,
    current_km INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Clienti
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_type VARCHAR(20) DEFAULT 'individual',
    full_name VARCHAR(100) NOT NULL,
    company_name VARCHAR(100),
    fiscal_code VARCHAR(16) NOT NULL,
    vat_number VARCHAR(11),
    address VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(2) DEFAULT 'IT',
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    license_number VARCHAR(20) NOT NULL,
    license_issued_by VARCHAR(50) NOT NULL,
    license_issue_date DATE NOT NULL,
    license_expiry_date DATE NOT NULL,
    birth_date DATE,
    birth_place VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Noleggi (principale)
CREATE TABLE rentals (
    id SERIAL PRIMARY KEY,
    rental_number VARCHAR(20) UNIQUE NOT NULL,
    booking_code VARCHAR(20) UNIQUE,
    
    -- Riferimenti
    customer_id INTEGER REFERENCES customers(id) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id) NOT NULL,
    created_by INTEGER REFERENCES users(id),
    
    -- Date e orari
    rental_date TIMESTAMP NOT NULL,
    pickup_date TIMESTAMP NOT NULL,
    expected_return_date TIMESTAMP NOT NULL,
    actual_return_date TIMESTAMP,
    
    -- Informazioni pickup
    pickup_location VARCHAR(200) NOT NULL,
    pickup_fuel_level DECIMAL(5,2) NOT NULL,
    pickup_km INTEGER NOT NULL,
    pickup_damages TEXT,
    pickup_notes TEXT,
    
    -- Informazioni return
    return_location VARCHAR(200),
    return_fuel_level DECIMAL(5,2),
    return_km INTEGER,
    return_damages TEXT,
    return_notes TEXT,
    
    -- Conducente aggiuntivo
    additional_driver_name VARCHAR(100),
    additional_driver_birth_date DATE,
    additional_driver_birth_place VARCHAR(100),
    additional_driver_license VARCHAR(20),
    additional_driver_license_issued_by VARCHAR(50),
    additional_driver_license_issue_date DATE,
    additional_driver_license_expiry DATE,
    
    -- Tariffe e costi
    daily_rate DECIMAL(10,2) NOT NULL,
    total_days INTEGER NOT NULL,
    km_included VARCHAR(20) DEFAULT 'unlimited',
    km_extra_cost DECIMAL(10,2) DEFAULT 0,
    delivery_cost DECIMAL(10,2) DEFAULT 0,
    fuel_charge DECIMAL(10,2) DEFAULT 0,
    after_hours_charge DECIMAL(10,2) DEFAULT 0,
    extras_charge DECIMAL(10,2) DEFAULT 0,
    extra_km_charge DECIMAL(10,2) DEFAULT 0,
    franchise_charge DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    
    -- Totali
    subtotal DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    amount_due DECIMAL(10,2) DEFAULT 0,
    
    -- Pagamento e garanzie
    payment_method VARCHAR(50),
    deposit_amount DECIMAL(10,2) DEFAULT 0,
    deposit_method VARCHAR(50),
    
    -- Carta di credito garanzia
    cc_holder_name VARCHAR(100),
    cc_type VARCHAR(30),
    cc_number_masked VARCHAR(20),
    cc_expiry VARCHAR(7),
    
    -- Franchigie
    franchise_theft DECIMAL(10,2) DEFAULT 0,
    franchise_damage DECIMAL(10,2) DEFAULT 0,
    franchise_rca DECIMAL(10,2) DEFAULT 0,
    
    -- Stato e flags
    status VARCHAR(20) DEFAULT 'active',
    is_completed BOOLEAN DEFAULT false,
    contract_signed BOOLEAN DEFAULT false,
    privacy_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Tabella Extra/Servizi
CREATE TABLE rental_extras (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
    extra_type VARCHAR(50) NOT NULL,
    description VARCHAR(200) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella Pagamenti
CREATE TABLE rental_payments (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_type VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id)
);

-- Tabella Foto
CREATE TABLE rental_photos (
    id SERIAL PRIMARY KEY,
    rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
    photo_type VARCHAR(20) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Indici per performance
CREATE INDEX idx_rentals_customer ON rentals(customer_id);
CREATE INDEX idx_rentals_vehicle ON rentals(vehicle_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_dates ON rentals(pickup_date, expected_return_date);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_customers_fiscal ON customers(fiscal_code);
CREATE INDEX idx_rental_photos_rental ON rental_photos(rental_id);

-- Inserimento dati di esempio

-- Categorie veicoli
INSERT INTO vehicle_categories (name, description, daily_rate, deposit_amount, franchise_theft, franchise_damage, franchise_rca) VALUES
('Utilitaria', 'Auto compatte per città', 35.00, 500.00, 2500.00, 1500.00, 1500.00),
('Berlina', 'Auto medie comfort', 50.00, 700.00, 3000.00, 2000.00, 2000.00),
('SUV', 'Veicoli spaziosi', 75.00, 1000.00, 4000.00, 2500.00, 2500.00),
('Premium', 'Auto di lusso', 120.00, 1500.00, 5000.00, 3000.00, 3000.00);

-- Veicoli di esempio
INSERT INTO vehicles (license_plate, category_id, brand, model, year, color, fuel_type, transmission, seats, current_km, status) VALUES
('GJ761HX', 1, 'CITROEN', 'C3', 2022, 'Bianco', 'Benzina', 'Manuale', 5, 98524, 'available'),
('AB123CD', 2, 'VOLKSWAGEN', 'Golf', 2023, 'Grigio', 'Diesel', 'Automatico', 5, 45000, 'available'),
('EF456GH', 3, 'NISSAN', 'Qashqai', 2023, 'Nero', 'Benzina', 'Automatico', 5, 32000, 'available');

-- Utente admin di default (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@bncenergy.it', '$2b$10$rKvFWJvZuMi/JXFJwmYnJuVxJZ7U0qgZ5pBcPnKP5RBYxKJN8QYHK', 'Amministratore', 'admin');

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger per tabelle con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

