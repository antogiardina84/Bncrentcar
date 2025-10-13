@echo off
echo ============================================
echo MIGRAZIONE DATABASE - BNC RENTAL MANAGEMENT
echo ============================================
echo.

REM Richiedi credenziali PostgreSQL
set /p PGUSER="Username PostgreSQL [postgres]: " || set PGUSER=postgres
set /p PGDATABASE="Nome database [rental_management]: " || set PGDATABASE=rental_management

echo.
echo Applicazione migrazione al database %PGDATABASE%...
echo.

REM Esegui lo script di migrazione
psql -U %PGUSER% -d %PGDATABASE% -f migration.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo MIGRAZIONE COMPLETATA CON SUCCESSO!
    echo ============================================
    echo.
    echo Nuovi campi aggiunti:
    echo - rental_photos: file_size, mime_type
    echo - rentals: delivery_cost, fuel_charge, after_hours_charge, etc.
    echo - rentals: additional_driver_* (conducente aggiuntivo^)
    echo - rentals: cc_* (carta di credito^)
    echo - customers: id_card_number, id_card_issue_date, etc.
    echo.
    echo Il database e ora aggiornato e compatibile!
    echo.
) else (
    echo.
    echo ============================================
    echo ERRORE DURANTE LA MIGRAZIONE
    echo ============================================
    echo.
    echo Verifica:
    echo 1. PostgreSQL e in esecuzione
    echo 2. Il database esiste
    echo 3. Le credenziali sono corrette
    echo 4. Hai i permessi necessari
    echo.
)

pause