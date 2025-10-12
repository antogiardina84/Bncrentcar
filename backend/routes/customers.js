const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database'); 
const { authMiddleware, adminMiddleware } = require('../middleware/auth'); 
const { parse } = require('dotenv');

// ✅ Funzione di utilità robusta per normalizzare stringhe vuote, null o undefined in NULL per PostgreSQL
const normalizeEmptyStringToNull = (value) => {
    // Gestisce null o undefined
    if (value === null || value === undefined) return null;
    
    // Controlla se il valore, convertito in stringa e trimmato, è vuoto.
    const stringValue = String(value);
    if (stringValue.trim() === '') {
        return null;
    }

    // Per tutti gli altri valori validi (numeri, stringhe non vuote), restituisci il valore originale
    return value; 
};

// ----------------------------------------------------
// GET - Lista clienti (Ricerca e Paginazione)
// ----------------------------------------------------
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    if (isNaN(parsedLimit) || parsedLimit < 1) return res.status(400).json({ success: false, message: 'Limite di paginazione non valido.' });
    if (isNaN(parsedPage) || parsedPage < 1) return res.status(400).json({ success: false, message: 'Numero di pagina non valido.' });

    let queryText = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      queryText += ` AND (
        full_name ILIKE $${paramCount} OR 
        fiscal_code ILIKE $${paramCount} OR
        phone ILIKE $${paramCount} OR
        email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const countQueryText = `SELECT COUNT(*) FROM (${queryText}) AS subquery`;
    const countResult = await query(countQueryText, params.slice(0, paramCount - 1));
    const totalCount = parseInt(countResult.rows[0].count, 10);

    queryText += ` ORDER BY full_name ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parsedLimit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        customers: result.rows,
        total: totalCount,
        page: parsedPage,
        limit: parsedLimit,
      }
    });

  } catch (error) {
    console.error('Errore recupero clienti:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// ----------------------------------------------------
// GET - Dettaglio cliente
// ----------------------------------------------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM customers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente non trovato' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Errore dettaglio cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// ----------------------------------------------------
// POST - Crea un nuovo cliente (Con tutti i campi corretti)
// ----------------------------------------------------
const customerValidation = [
  body('full_name').trim().notEmpty().withMessage('Il nome completo è obbligatorio'),
  body('fiscal_code').trim().notEmpty().withMessage('Il codice fiscale è obbligatorio'),
  body('email').isEmail().withMessage('Email non valida'),
  body('phone').trim().notEmpty().withMessage('Il numero di telefono è obbligatorio'),
];

router.post('/', authMiddleware, customerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const {
    full_name,
    fiscal_code,
    email,
    phone,
    address,
    city,
    zip_code,
    driving_license_number, 
    id_card_number,         
    notes,
    
    // Tutti i campi presenti nello schema DB
    customer_type = 'individuale', 
    province,
    license_issued_by,
    license_issue_date,
    license_expiry_date,
    company_name,
    vat_number, 
    country,
    birth_date,
    birth_place,
  } = req.body;

  try {
    // Verifica unicità (es. codice fiscale o email)
    const existingCustomer = await query(
      'SELECT id FROM customers WHERE fiscal_code = $1 OR email = $2', 
      [fiscal_code, email]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Un cliente con questo codice fiscale o email esiste già.' });
    }

    const queryText = `
      INSERT INTO customers (
        full_name, fiscal_code, email, phone, 
        address, city, province, zip_code, 
        license_number, id_card_number, notes, customer_type, 
        license_issued_by, license_issue_date, license_expiry_date, 
        company_name, vat_number, country, birth_date, birth_place
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING id
    `;
    
    // Mappaggio dei valori con la normalizzazione e l'ordine corretto (20 parametri)
    const result = await query(queryText, [
      normalizeEmptyStringToNull(full_name),           // $1
      normalizeEmptyStringToNull(fiscal_code),         // $2
      normalizeEmptyStringToNull(email),               // $3
      normalizeEmptyStringToNull(phone),               // $4
      
      normalizeEmptyStringToNull(address),             // $5
      normalizeEmptyStringToNull(city),                // $6
      normalizeEmptyStringToNull(province),            // $7
      normalizeEmptyStringToNull(zip_code),            // $8
      
      normalizeEmptyStringToNull(driving_license_number), // $9 -> license_number
      normalizeEmptyStringToNull(id_card_number),        // $10 -> id_card_number
      normalizeEmptyStringToNull(notes),               // $11
      
      normalizeEmptyStringToNull(customer_type || 'individuale'), // $12
      normalizeEmptyStringToNull(license_issued_by),   // $13
      normalizeEmptyStringToNull(license_issue_date),  // $14
      normalizeEmptyStringToNull(license_expiry_date), // $15
      
      normalizeEmptyStringToNull(company_name),        // $16
      normalizeEmptyStringToNull(vat_number),          // $17
      normalizeEmptyStringToNull(country),             // $18
      normalizeEmptyStringToNull(birth_date),          // $19
      normalizeEmptyStringToNull(birth_place),         // $20
    ]);

    res.status(201).json({
      success: true,
      message: 'Cliente registrato con successo',
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    // Gestione Errori PostgreSQL (Diagnostica avanzata)
    console.error('Errore DB registrazione cliente (Dettagli):', error);
    
    let userMessage = 'Errore interno del server';
    if (error.code === '23502') { // NOT NULL violation
        const columnNameMatch = error.message.match(/column "(\w+)"/);
        const columnName = columnNameMatch ? columnNameMatch[1] : 'sconosciuto';
        
        userMessage = `Violazione vincolo NOT NULL. Il campo obbligatorio non può essere vuoto: '${columnName}'.`;
        
    } else if (error.code === '42703') { // Colonna non esistente
        userMessage = `Errore di configurazione: La colonna "${error.column || 'sconosciuta'}" non esiste nel database.`;
    }
    
    res.status(500).json({ 
      success: false, 
      message: userMessage,
      db_error_code: error.code,
      original_error_message: error.message
    });
  }
});

// ----------------------------------------------------
// PUT - Aggiorna cliente (Corretto)
// ----------------------------------------------------
router.put('/:id', authMiddleware, customerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { id } = req.params;
    const {
        full_name, fiscal_code, email, phone, 
        address, city, zip_code, driving_license_number, 
        id_card_number, 
        notes, province, customer_type, 
        license_issued_by, license_issue_date, license_expiry_date, 
        company_name, vat_number, country,
        birth_date, birth_place
    } = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    // Mappatura e normalizzazione dei campi
    const updateFields = {
      full_name: normalizeEmptyStringToNull(full_name),
      fiscal_code: normalizeEmptyStringToNull(fiscal_code), 
      email: normalizeEmptyStringToNull(email), 
      phone: normalizeEmptyStringToNull(phone), 
      address: normalizeEmptyStringToNull(address), 
      city: normalizeEmptyStringToNull(city), 
      zip_code: normalizeEmptyStringToNull(zip_code), 
      
      license_number: normalizeEmptyStringToNull(driving_license_number), // FE -> license_number (DB)
      id_card_number: normalizeEmptyStringToNull(id_card_number),        
      notes: normalizeEmptyStringToNull(notes),
      
      province: normalizeEmptyStringToNull(province),
      customer_type: normalizeEmptyStringToNull(customer_type),
      license_issued_by: normalizeEmptyStringToNull(license_issued_by),
      license_issue_date: normalizeEmptyStringToNull(license_issue_date),
      license_expiry_date: normalizeEmptyStringToNull(license_expiry_date),
      company_name: normalizeEmptyStringToNull(company_name),
      vat_number: normalizeEmptyStringToNull(vat_number),
      country: normalizeEmptyStringToNull(country),
      birth_date: normalizeEmptyStringToNull(birth_date),
      birth_place: normalizeEmptyStringToNull(birth_place),
    };
    
    // Costruzione dinamica della query
    for (const [key, value] of Object.entries(updateFields)) {
      // Determina la chiave originale inviata dal frontend per il controllo hasOwnProperty
      let originalKey = key;
      if (key === 'license_number') originalKey = 'driving_license_number'; 
      
      if (req.body.hasOwnProperty(originalKey)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Nessun campo da aggiornare' });
    }
    
    // Verifica unicità (es. codice fiscale o email)
    const existingCustomer = await query(
      'SELECT id FROM customers WHERE (fiscal_code = $1 OR email = $2) AND id != $3', 
      [fiscal_code, email, id]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Un altro cliente con questo codice fiscale o email esiste già.' });
    }

    values.push(id);
    
    const queryText = `
      UPDATE customers 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente non trovato' });
    }

    res.json({
      success: true,
      message: 'Cliente aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore aggiornamento cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// ----------------------------------------------------
// DELETE - Elimina cliente
// ----------------------------------------------------
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Logica di controllo noleggi attivi
    const activeRentals = await query(
      "SELECT COUNT(*) FROM rentals WHERE customer_id = $1 AND status IN ('active', 'pending_return')",
      [id]
    );

    if (parseInt(activeRentals.rows[0].count, 10) > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossibile eliminare cliente. Sono presenti noleggi attivi o in attesa di rientro associati.' 
      });
    }

    const result = await query(
      'DELETE FROM customers WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cliente non trovato' 
      });
    }

    res.json({
      success: true,
      message: 'Cliente eliminato con successo'
    });

  } catch (error) {
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ 
        success: false, 
        message: 'Impossibile eliminare cliente. Sono presenti noleggi (anche storici) associati.' 
      });
    }
    
    console.error('Errore eliminazione cliente:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

module.exports = router;