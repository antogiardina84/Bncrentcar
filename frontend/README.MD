🚗 Sistema Gestione Noleggio Auto - BNC Energy
Sistema completo per la gestione di noleggi auto con generazione automatica di contratti PDF, upload foto da mobile e gestione completa di tutte le fasi del noleggio.
📋 Caratteristiche Principali
✅ Funzionalità Complete

Gestione Noleggi: Crea, modifica, chiudi noleggi con wizard guidato
Gestione Clienti: Anagrafica completa clienti con storico noleggi
Gestione Veicoli: Flotta veicoli con stato e disponibilità
Upload Foto: Carica foto da mobile (fotocamera integrata) in fase di consegna e rientro
Generazione Contratti PDF: Crea automaticamente contratti basati sul template fornito
Dashboard: Statistiche e panoramica in tempo reale
Autenticazione: Login sicuro con JWT

🎨 Design e UI

Stile Odoo-like moderno e professionale
Colori brand BNC Energy (#1a4d2e)
Responsive per desktop, tablet e mobile
PWA installabile su mobile

📱 Supporto Mobile

Interfaccia ottimizzata per smartphone
Accesso diretto alla fotocamera del dispositivo
Upload multiplo di foto
Gestione touch-friendly

🏗️ Architettura
Backend (Node.js + Express + PostgreSQL)
backend/
├── config/
│   └── database.js              # Configurazione PostgreSQL
├── database/
│   └── schema.sql               # Schema database completo
├── middleware/
│   └── auth.js                  # Autenticazione JWT
├── routes/
│   ├── auth.js                  # Login e autenticazione
│   ├── rentals.js               # API noleggi
│   ├── customers.js             # API clienti
│   ├── vehicles.js              # API veicoli
│   └── photos.js                # API upload foto
├── utils/
│   └── contractGenerator.js     # Generatore PDF contratti
├── scripts/
│   └── initDatabase.js          # Script inizializzazione DB
└── server.js                    # Server principale
Frontend (React)
frontend/
├── public/
│   ├── index.html               # HTML completo con PWA
│   └── manifest.json            # Manifest PWA
├── src/
│   ├── components/
│   │   ├── Layout.js            # Layout con sidebar
│   │   ├── Login.js             # Pagina login
│   │   ├── Dashboard.js         # Dashboard principale
│   │   ├── RentalsList.js       # Lista noleggi
│   │   ├── NewRental.js         # Form nuovo noleggio (wizard)
│   │   ├── RentalDetail.js      # Dettaglio noleggio
│   │   ├── PhotoUpload.js       # Componente upload foto
│   │   ├── CustomersList.js     # Lista clienti
│   │   └── VehiclesList.js      # Lista veicoli
│   ├── contexts/
│   │   └── AuthContext.js       # Context autenticazione
│   ├── services/
│   │   └── api.js               # Service API Axios
│   ├── App.js                   # App principale con routing
│   ├── App.css                  # Stili completi Odoo-style
│   └── index.js                 # Entry point
└── package.json
🚀 Installazione e Avvio
Prerequisiti

Node.js (v16 o superiore)
PostgreSQL (v12 o superiore)
npm o yarn

1. Installazione Backend
bashcd rental-management/backend

# Installa dipendenze
npm install

# Configura database
# Modifica il file .env con le tue credenziali PostgreSQL

# Crea il database
createdb rental_management

# Inizializza il database (crea tabelle e dati di esempio)
npm run init-db

# Avvia il server (modalità sviluppo con nodemon)
npm run dev

# Oppure in produzione
npm start
Il backend sarà disponibile su: http://localhost:5000
2. Installazione Frontend
bashcd rental-management/frontend

# Installa dipendenze
npm install

# Avvia il server di sviluppo
npm start

# Build per produzione
npm run build
Il frontend sarà disponibile su: http://localhost:3000
🔐 Credenziali Demo
Username: admin
Password: admin123
📊 Database
Tabelle Principali

users: Utenti del sistema (operatori)
vehicle_categories: Categorie veicoli con tariffe
vehicles: Veicoli della flotta
customers: Anagrafica clienti
rentals: Noleggi (tabella principale)
rental_extras: Servizi extra per noleggio
rental_payments: Pagamenti
rental_photos: Foto veicoli (uscita/rientro)

Dati di Esempio
Il database viene inizializzato con:

1 utente admin
4 categorie veicoli
3 veicoli di esempio
Nessun cliente o noleggio (da creare)

📖 Guida all'Uso
Creare un Nuovo Noleggio

Accedi al sistema con le credenziali
Click su "Nuovo Noleggio" dalla dashboard o dalla lista noleggi
Segui il wizard in 5 step:

Step 1: Seleziona il cliente (o creane uno nuovo)
Step 2: Seleziona il veicolo disponibile
Step 3: Imposta date di ritiro e rientro, km, carburante
Step 4: Conferma le tariffe e il totale
Step 5: Carica le foto del veicolo in uscita


Completa il noleggio

Upload Foto da Mobile

Apri l'app da smartphone
Durante la creazione o chiusura noleggio
Click su "Usa Fotocamera"
Il sistema attiverà automaticamente la fotocamera del dispositivo
Scatta foto di tutti i lati del veicolo
Le foto vengono caricate automaticamente

Chiudere un Noleggio

Vai ai dettagli del noleggio
Click su "Chiudi Noleggio"
Inserisci i dati di rientro (km, carburante, danni)
Carica le foto del veicolo al rientro
Conferma la chiusura

Generare e Scaricare Contratti

Dalla lista noleggi, click sull'icona download
Dal dettaglio noleggio, click su "Scarica Contratto"
Il PDF viene generato automaticamente con tutti i dati del noleggio

🔧 Configurazione
Backend (.env)
env# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rental_management
DB_USER=postgres
DB_PASSWORD=your_password

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_key

# Azienda
COMPANY_NAME=BNC Energy Rent Car
COMPANY_ADDRESS=Via Esempio, 123
COMPANY_CITY=Roma
COMPANY_PHONE=+39 06 1234567
COMPANY_EMAIL=info@bncenergy.it
Frontend (.env)
envREACT_APP_API_URL=http://localhost:5000/api
📱 PWA - Installazione su Mobile

Apri il sito da browser mobile (Chrome/Safari)
Click su "Aggiungi alla schermata Home"
L'app sarà installata come applicazione nativa
Accesso rapido dalla home screen

🎨 Personalizzazione
Colori Brand
I colori sono definiti in frontend/src/App.css:
css:root {
  --primary-color: #1a4d2e;      /* Verde BNC Energy */
  --primary-dark: #143d24;
  --primary-light: #4a7c59;
  --secondary-color: #f4a261;
  --accent-color: #e76f51;
}
Logo
Modifica il logo nella sidebar editando:

frontend/src/components/Layout.js (logo sidebar)
frontend/public/index.html (favicon e icon PWA)

📄 API Endpoints
Autenticazione

POST /api/auth/login - Login
GET /api/auth/me - Info utente corrente

Noleggi

GET /api/rentals - Lista noleggi
GET /api/rentals/:id - Dettaglio noleggio
POST /api/rentals - Crea noleggio
PUT /api/rentals/:id - Aggiorna noleggio
POST /api/rentals/:id/close - Chiudi noleggio
POST /api/rentals/:id/generate-contract - Genera contratto PDF
GET /api/rentals/:id/download-contract - Scarica contratto

Clienti

GET /api/customers - Lista clienti
GET /api/customers/:id - Dettaglio cliente
POST /api/customers - Crea cliente
PUT /api/customers/:id - Aggiorna cliente

Veicoli

GET /api/vehicles - Lista veicoli
GET /api/vehicles/:id - Dettaglio veicolo
GET /api/vehicles/categories/list - Lista categorie

Foto

POST /api/photos/upload - Upload singola foto
POST /api/photos/upload-multiple - Upload multiple foto
GET /api/photos/:id - Visualizza foto
GET /api/photos/rental/:rentalId - Foto di un noleggio
DELETE /api/photos/:id - Elimina foto

🛠️ Sviluppo
Struttura Progetto
rental-management/
├── backend/          # API Node.js + Express
├── frontend/         # App React
└── README.md         # Questo file
Script Utili
Backend:
bashnpm run dev       # Avvia con nodemon (auto-reload)
npm start         # Avvia in produzione
npm run init-db   # Inizializza database
Frontend:
bashnpm start         # Dev server
npm run build     # Build produzione
npm test          # Run tests
🐛 Troubleshooting
Database non si connette

Verifica che PostgreSQL sia avviato
Controlla credenziali in .env
Verifica che il database rental_management esista

Foto non si caricano

Verifica permessi della cartella backend/uploads
Controlla che il backend sia in ascolto
Verifica dimensione file (max 5MB)

Frontend non comunica con backend

Verifica che backend sia avviato su porta 5000
Controlla CORS settings in backend/server.js
Verifica URL in frontend/.env

📝 License
Questo progetto è stato creato per BNC Energy.
👥 Supporto
Per supporto o domande, contatta: info@bncenergy.it

Versione: 1.0.0
Ultima modifica: Ottobre 2025
Sviluppato per: BNC Energy Rent Car