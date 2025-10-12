const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

async function createAdmin() {
  try {
    console.log('🔄 Creazione utente admin...');

    // Elimina admin esistente
    await pool.query('DELETE FROM users WHERE username = $1 OR email = $2', 
      ['admin', 'admin@bncenergy.it']
    );
    console.log('✓ Vecchi utenti eliminati');

    // Hash password
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('✓ Password hashata:', passwordHash.substring(0, 20) + '...');

    // Inserisci nuovo admin
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, full_name, role`,
      ['admin', 'admin@bncenergy.it', passwordHash, 'Administrator', 'admin', true]
    );

    console.log('\n✅ Utente admin creato con successo!\n');
    console.log('════════════════════════════════════');
    console.log('📋 CREDENZIALI DI ACCESSO:');
    console.log('════════════════════════════════════');
    console.log('👤 Username: admin');
    console.log('📧 Email:    admin@bncenergy.it');
    console.log('🔑 Password: admin123');
    console.log('👔 Ruolo:    ' + result.rows[0].role);
    console.log('════════════════════════════════════\n');
    console.log('💡 Puoi usare ENTRAMBI username o email per il login\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }
}

createAdmin();