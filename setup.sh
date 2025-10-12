#!/bin/bash

echo "=================================="
echo "🚗 BNC ENERGY RENTAL MANAGEMENT"
echo "=================================="
echo ""

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funzione per stampare con colori
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Verifica Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js non è installato. Installalo da https://nodejs.org"
    exit 1
fi
print_success "Node.js trovato: $(node --version)"

# Verifica npm
if ! command -v npm &> /dev/null; then
    print_error "npm non è installato"
    exit 1
fi
print_success "npm trovato: $(npm --version)"

# Verifica PostgreSQL
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL non è installato"
    exit 1
fi
print_success "PostgreSQL trovato"

echo ""
echo "=================================="
echo "SETUP BACKEND"
echo "=================================="

cd backend

# Controlla se node_modules esiste
if [ ! -d "node_modules" ]; then
    print_info "Installazione dipendenze backend..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dipendenze backend installate"
    else
        print_error "Errore installazione dipendenze backend"
        exit 1
    fi
else
    print_success "Dipendenze backend già installate"
fi

# Controlla se il database esiste
DB_EXISTS=$(psql -lqt | cut -d \| -f 1 | grep -w rental_management)
if [ -z "$DB_EXISTS" ]; then
    print_warning "Database rental_management non trovato"
    read -p "Vuoi crearlo ora? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        createdb rental_management
        if [ $? -eq 0 ]; then
            print_success "Database creato"
            print_info "Inizializzazione tabelle..."
            npm run init-db
            if [ $? -eq 0 ]; then
                print_success "Database inizializzato"
            else
                print_error "Errore inizializzazione database"
                exit 1
            fi
        else
            print_error "Errore creazione database"
            exit 1
        fi
    fi
else
    print_success "Database rental_management trovato"
fi

echo ""
echo "=================================="
echo "SETUP FRONTEND"
echo "=================================="

cd ../frontend

# Controlla se node_modules esiste
if [ ! -d "node_modules" ]; then
    print_info "Installazione dipendenze frontend..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dipendenze frontend installate"
    else
        print_error "Errore installazione dipendenze frontend"
        exit 1
    fi
else
    print_success "Dipendenze frontend già installate"
fi

cd ..

echo ""
echo "=================================="
echo "✅ SETUP COMPLETATO!"
echo "=================================="
echo ""
print_info "Per avviare il sistema:"
echo ""
echo "1. BACKEND (in un terminale):"
echo "   cd backend && npm run dev"
echo ""
echo "2. FRONTEND (in un altro terminale):"
echo "   cd frontend && npm start"
echo ""
echo "=================================="
echo "📝 CREDENZIALI DEFAULT"
echo "=================================="
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "Backend URL:  http://localhost:5000"
echo "Frontend URL: http://localhost:3000"
echo "=================================="

