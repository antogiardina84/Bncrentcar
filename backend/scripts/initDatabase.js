const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function initDatabase() {
  try {
    console.log('🔄 Inizializzazione database...');
    
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schemaSql);
    
    console.log('✅ Database inizializzato con successo!');
    console.log('📊 Tabelle create:');
    console.log('   - users');
    console.log('   - vehicle_categories');
    console.log('   - vehicles');
    console.log('   - customers');
    console.log('   - rentals');
    console.log('   - rental_extras');
    console.log('   - rental_payments');
    console.log('   - rental_photos');
    console.log('\n👤 Utente admin creato:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@bncenergy.it');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore inizializzazione database:', error);
    process.exit(1);
  }
}

initDatabase();

