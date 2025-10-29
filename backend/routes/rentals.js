const express = require('express');
const router = express.Router();
const { query, pool } = require('../config/database'); 
const { authMiddleware } = require('../middleware/auth');
const ContractGenerator = require('../utils/contractGenerator'); // Assumendo che questo esista
const path = require('path');
const fs = require('fs');

// Helper function per generare codice noleggio
function generateRentalNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}-${random}`;
}

// Helper function per generare codice prenotazione
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =========================================================================
// GET /api/rentals - Recupero noleggi con filtri e paginazione
// =========================================================================
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, customer_name, license_plate, page = 1, limit = 50 } = req.query;

    let queryText = `
      SELECT 
        r.*,
        c.full_name as customer_name,
        v.license_plate,
        v.brand,
        v.model
      FROM rentals r
      JOIN customers c ON r.customer_id = c.id
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      queryText += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (customer_name) {
      queryText += ` AND c.full_name ILIKE $${paramCount}`;
      params.push(`%${customer_name}%`);
      paramCount++;
    }

    if (license_plate) {
      queryText += ` AND v.license_plate ILIKE $${paramCount}`;
      params.push(`%${license_plate}%`);
      paramCount++;
    }
    
    // Paginazione
    queryText += ` ORDER BY r.pickup_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await query(queryText, params);

    // Conteggio totale (senza limit e offset)
    const countQuery = `
      SELECT COUNT(r.id)
      FROM rentals r
      JOIN customers c ON r.customer_id = c.id
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE 1=1
      ${status ? ` AND r.status = $${paramCount}` : ''}
      ${customer_name ? ` AND c.full_name ILIKE $${paramCount}` : ''}
      ${license_plate ? ` AND v.license_plate ILIKE $${paramCount}` : ''}
    `;
    
    // I parametri per il conteggio devono essere solo i filtri
    const countParams = params.slice(0, paramCount - 2); 
    const totalCountResult = await query(countQuery, countParams);
    const totalRentals = parseInt(totalCountResult.rows[0].count);


    res.json({
      success: true,
      data: {
        rentals: result.rows,
        total: totalRentals,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Errore recupero noleggi:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server', 
      error: error.message 
    });
  }
});

// =========================================================================
// POST /api/rentals - Creazione nuovo noleggio (Transazione)
// =========================================================================
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { 
      customer_id, 
      vehicle_id, 
      pickup_date, 
      expected_return_date,
      pickup_location,
      pickup_fuel_level,
      pickup_km,
      pickup_damages,
      pickup_notes,

      // Tariffe e costi
      daily_rate,
      deposit_amount,
      total_days,
      km_included,
      delivery_cost, 
      fuel_charge, 
      after_hours_charge, 
      km_extra_cost, // Nuovo campo unitario
      extras_charge, 

      // Totali
      extra_km_charge, 
      franchise_charge, 
      discount, 
      subtotal,
      total_amount,

      // Coperture
      franchise_theft,
      franchise_damage,
      franchise_rca,

      // Pagamento
      payment_method, 
      deposit_method,
      cc_holder_name,
      cc_type,
      cc_number_masked,
      cc_expiry,
      
      // Conducente aggiuntivo
      additional_driver_name,
      additional_driver_birth_place,
      additional_driver_birth_date,
      additional_driver_license,
      additional_driver_license_issued_by,
      additional_driver_license_issue_date,
      additional_driver_license_expiry,
      
      // Consensi e Firma
      contract_signed = false,
      privacy_consent = false,
      marketing_consent = false,
      customer_signature, // ✅ NUOVO CAMPO: Firma (Base64)
      
      status = 'active',
      is_completed = false,
    } = req.body;
    
    // Validazione base
    if (!customer_id || !vehicle_id || !pickup_date || !expected_return_date) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: 'Campi obbligatori mancanti: cliente, veicolo e date' 
      });
    }

    const rental_number = generateRentalNumber();
    const booking_code = generateBookingCode();
    
    // Preparazione query con 46 campi/valori
    const insertRentalQuery = `
      INSERT INTO rentals (
        rental_number, 
        booking_code, 
        customer_id, 
        vehicle_id,
        pickup_date,
        expected_return_date,
        pickup_location,
        pickup_fuel_level,
        pickup_km,
        pickup_damages,
        pickup_notes,
        daily_rate,
        deposit_amount,
        total_days,
        km_included,
        delivery_cost, 
        fuel_charge, 
        after_hours_charge, 
        km_extra_cost,         -- $19: Nuovo campo unitario
        extras_charge, 
        extra_km_charge, 
        franchise_charge, 
        discount, 
        subtotal,
        total_amount,
        payment_method, 
        deposit_method, 
        cc_holder_name,
        cc_type,
        cc_number_masked,
        cc_expiry,
        franchise_theft,
        franchise_damage,
        franchise_rca,
        additional_driver_name,
        additional_driver_birth_place,
        additional_driver_birth_date,
        additional_driver_license,
        additional_driver_license_issued_by,
        additional_driver_license_issue_date,
        additional_driver_license_expiry,
        contract_signed,
        privacy_consent,
        marketing_consent,
        customer_signature,  -- ✅ NUOVO CAMPO $44
        status,
        is_completed
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47
      )
      RETURNING *
    `;
    
    // Array di valori corrispondente alla query
    const rentalValues = [
      rental_number, 
      booking_code,
      customer_id, 
      vehicle_id, 
      pickup_date,
      expected_return_date,
      pickup_location,
      pickup_fuel_level,
      pickup_km,
      pickup_damages,
      pickup_notes,
      daily_rate,
      deposit_amount,
      total_days,
      km_included,
      delivery_cost, 
      fuel_charge, 
      after_hours_charge, 
      km_extra_cost,        // Nuovo valore
      extras_charge, 
      extra_km_charge, 
      franchise_charge, 
      discount, 
      subtotal,
      total_amount,
      payment_method, 
      deposit_method, 
      cc_holder_name,
      cc_type,
      cc_number_masked,
      cc_expiry,
      franchise_theft,
      franchise_damage,
      franchise_rca,
      additional_driver_name,
      additional_driver_birth_place,
      additional_driver_birth_date,
      additional_driver_license,
      additional_driver_license_issued_by,
      additional_driver_license_issue_date,
      additional_driver_license_expiry,
      contract_signed,
      privacy_consent,
      marketing_consent,
      customer_signature,   // ✅ NUOVO VALORE $44
      status,
      is_completed
    ];

    const result = await client.query(insertRentalQuery, rentalValues);
    const newRental = result.rows[0];

    // Aggiornamento dello stato del veicolo
    await client.query(
      'UPDATE vehicles SET status = $1, last_rental_id = $2 WHERE id = $3',
      ['rented', newRental.id, vehicle_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ 
      success: true, 
      message: 'Noleggio creato con successo', 
      data: newRental 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore creazione noleggio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server durante la creazione del noleggio', 
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// =========================================================================
// GET /api/rentals/:id - Dettaglio noleggio
// =========================================================================
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        r.*,
        c.full_name as customer_name,
        c.tax_code as customer_tax_code,
        c.phone as customer_phone,
        v.license_plate,
        v.brand,
        v.model
      FROM rentals r
      JOIN customers c ON r.customer_id = c.id
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Errore recupero dettaglio noleggio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server', 
      error: error.message 
    });
  }
});


// =========================================================================
// PUT /api/rentals/:id/close - Chiusura noleggio (Transazione)
// =========================================================================
router.put('/:id/close', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const {
      return_date,
      return_location,
      return_fuel_level,
      return_km,
      return_damages,
      final_total,
      amount_paid,
      amount_due,
    } = req.body;

    // 1. Aggiorna i dati del noleggio e lo stato
    const updateRentalQuery = `
      UPDATE rentals 
      SET 
        return_date = $1,
        return_location = $2,
        return_fuel_level = $3,
        return_km = $4,
        return_damages = $5,
        final_total = $6,
        amount_paid = $7,
        amount_due = $8,
        status = 'completed',
        is_completed = TRUE,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;
    
    const rentalResult = await client.query(updateRentalQuery, [
      return_date,
      return_location,
      return_fuel_level,
      return_km,
      final_total,
      amount_paid,
      amount_due,
      return_damages,
      id
    ]);

    if (rentalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    const rental = rentalResult.rows[0];

    // 2. Aggiorna lo stato e i Km del veicolo
    await client.query(
      'UPDATE vehicles SET status = $1, current_km = $2 WHERE id = $3',
      ['available', return_km, rental.vehicle_id]
    );

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      message: 'Noleggio chiuso e veicolo reso disponibile',
      data: rental
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore chiusura noleggio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server durante la chiusura', 
      error: error.message 
    });
  } finally {
    client.release();
  }
});


// =========================================================================
// GET /api/rentals/:id/contract - Generazione e Download Contratto
// =========================================================================
router.get('/:id/contract', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Recupera i dati completi del noleggio (join con customer e vehicle)
    const result = await query(`
      SELECT 
        r.*,
        c.full_name as customer_name,
        c.tax_code as customer_tax_code,
        c.address as customer_address,
        c.city as customer_city,
        c.phone as customer_phone,
        v.license_plate,
        v.brand,
        v.model,
        v.category_name,
        v.chassis_number,
        v.daily_rate as category_daily_rate -- solo per riferimento
      FROM rentals r
      JOIN customers c ON r.customer_id = c.id
      JOIN (
        SELECT v.*, vc.name as category_name
        FROM vehicles v
        JOIN vehicle_categories vc ON v.category_id = vc.id
      ) v ON r.vehicle_id = v.id
      WHERE r.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    const rentalData = result.rows[0];
    
    // Inizializza il generatore di contratti
    const generator = new ContractGenerator(rentalData);
    
    // Genera il PDF e ottieni il percorso
    const { filepath, filename } = await generator.generatePdf();
    
    // Verifica se il file esiste prima di inviarlo
    if (!fs.existsSync(filepath)) {
      return res.status(500).json({ 
        success: false, 
        message: 'Contratto non trovato. Generarlo prima.' 
      });
    }

    // Invia il file come download
    res.download(filepath, filename);

  } catch (error) {
    console.error('Errore download contratto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// =========================================================================
// DELETE /api/rentals/:id - Elimina noleggio (solo admin)
// =========================================================================
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accesso non autorizzato' 
      });
    }

    const { id } = req.params;

    const result = await query(
      'DELETE FROM rentals WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    res.json({
      success: true,
      message: 'Noleggio eliminato con successo'
    });

  } catch (error) {
    console.error('Errore eliminazione noleggio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});


module.exports = router;