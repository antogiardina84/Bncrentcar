#!/bin/bash

echo "============================================"
echo "MIGRAZIONE DATABASE - BNC RENTAL MANAGEMENT"
echo "============================================"
echo ""

# Colori
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Richiedi credenziali PostgreSQL
read -p "Username PostgreSQL [postgres]: " PGUSER
PGUSER=${PGUSER:-postgres}

read -p "Nome database [rental_management]: " PGDATABASE
PGDATABASE=${PGDATABASE:-rental_management}

echo ""
echo "Applicazione migrazione al database $PGDATABASE..."
echo ""

# Esegui lo script di migrazione
psql -U "$PGUSER" -d "$PGDATABASE" -f migration.sql

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}============================================"
    echo "MIGRAZIONE COMPLETATA CON SUCCESSO!"
    echo -e "============================================${NC}"
    echo ""
    echo "Nuovi campi aggiunti:"
    echo "- rental_photos: file_size, mime_type"
    echo "- rentals: delivery_cost, fuel_charge, after_hours_charge, etc."
    echo "- rentals: additional_driver_* (conducente aggiuntivo)"
    echo "- rentals: cc_* (carta di credito)"
    echo "- customers: id_card_number, id_card_issue_date, etc."
    echo ""
    echo "Il database è ora aggiornato e compatibile!"
    echo ""
else
    echo ""
    echo -e "${RED}============================================"
    echo "ERRORE DURANTE LA MIGRAZIONE"
    echo -e "============================================${NC}"
    echo ""
    echo "Verifica:"
    echo "1. PostgreSQL è in esecuzione"
    echo "2. Il database esiste"
    echo "3. Le credenziali sono corrette"
    echo "4. Hai i permessi necessari"
    echo ""
    exit 1
fi