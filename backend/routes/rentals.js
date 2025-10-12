const express = require('express');
const router = express.Router();
const { query, pool } = require('../config/database'); 
const { authMiddleware } = require('../middleware/auth');
const ContractGenerator = require('../utils/contractGenerator');
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
    const { 
      status, 
      customer_name, 
      license_plate, 
      date_from, 
      date_to,
      page = 1,
      limit = 50 
    } = req.query;

    let queryText = `
      SELECT 
        r.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        v.license_plate,
        v.brand,
        v.model,
        vc.name AS category_name
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
      WHERE 1=1
    `;
    
    let countQueryText = `
      SELECT COUNT(r.id) AS total_count
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      const filterClause = ` AND r.status = $${paramCount}`;
      queryText += filterClause;
      countQueryText += filterClause;
      params.push(status);
      paramCount++;
    }

    if (customer_name) {
      const filterClause = ` AND c.full_name ILIKE $${paramCount}`;
      queryText += filterClause;
      countQueryText += filterClause;
      params.push(`%${customer_name}%`);
      paramCount++;
    }

    if (license_plate) {
      const filterClause = ` AND v.license_plate ILIKE $${paramCount}`;
      queryText += filterClause;
      countQueryText += filterClause;
      params.push(`%${license_plate}%`);
      paramCount++;
    }
    
    if (date_from) {
      const filterClause = ` AND r.pickup_date >= $${paramCount}`;
      queryText += filterClause;
      countQueryText += filterClause;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      const filterClause = ` AND r.expected_return_date <= $${paramCount}`;
      queryText += filterClause;
      countQueryText += filterClause;
      params.push(date_to);
      paramCount++;
    }

    const countResult = await query(countQueryText, params); 
    const totalCount = parseInt(countResult.rows[0].total_count);

    const limitNum = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNum;
    
    queryText += ` ORDER BY r.pickup_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limitNum, offset);
    
    const result = await query(queryText, params); 

    res.json({
      success: true,
      data: {
        rentals: result.rows,
        total_count: totalCount,
        page: parseInt(page),
        limit: limitNum,
      }
    });

  } catch (error) {
    console.error('Errore recupero noleggi:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server durante il recupero dei noleggi', 
      error: error.message 
    });
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
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address,
        c.city,
        c.fiscal_code,
        c.vat_number,
        c.license_number,
        c.license_issued_by,
        c.license_issue_date,
        c.license_expiry_date,
        v.license_plate,
        v.brand,
        v.model,
        vc.name AS category_name,
        vc.daily_rate
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
      WHERE r.id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    const rental = result.rows[0];

    const photosQuery = `
      SELECT id, photo_type, file_name, upload_date
      FROM rental_photos
      WHERE rental_id = $1
      ORDER BY upload_date DESC
    `;
    
    const photosResult = await query(photosQuery, [id]);
    rental.photos = photosResult.rows;

    res.json({
      success: true,
      data: rental
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
// POST /api/rentals - Creazione nuovo noleggio (Transazione)
// =========================================================================
router.post('/', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      customer_id, vehicle_id,
      pickup_date, expected_return_date,
      pickup_location, pickup_fuel_level, pickup_km, pickup_damages, pickup_notes,
      daily_rate, deposit_amount = 0, total_days = 1,
      subtotal, total_amount,
      
      // 🆕 NUOVI CAMPI FINANZIARI
      delivery_cost = 0,
      fuel_charge = 0,
      after_hours_charge = 0,
      extras_charge = 0,
      extra_km_charge = 0,
      franchise_charge = 0,
      discount = 0,
      payment_method = 'Contanti',
      deposit_method = 'Contanti',
      km_included = 'Illimitati',
      
      // 🆕 CONDUCENTE AGGIUNTIVO
      additional_driver_name,
      additional_driver_birth_place,
      additional_driver_birth_date,
      additional_driver_license,
      additional_driver_license_issued_by,
      additional_driver_license_issue_date,
      additional_driver_license_expiry,
      
      // 🆕 CARTA DI CREDITO
      cc_holder_name,
      cc_type,
      cc_number_masked,
      cc_expiry,
      
      status = 'active',
      is_completed = false,
    } = req.body;
    
    // Validazione date
    if (!pickup_date || !expected_return_date || new Date(pickup_date) >= new Date(expected_return_date)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Date non valide' });
    }
    
    // Validazione campi NOT NULL
    if (!subtotal || !total_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Campi finanziari obbligatori mancanti' });
    }

    const rental_number = generateRentalNumber();
    const booking_code = generateBookingCode();
    
    const insertRentalQuery = `
      INSERT INTO rentals (
        rental_number, booking_code, customer_id, vehicle_id, created_by,
        rental_date, pickup_date, expected_return_date, pickup_location, 
        pickup_fuel_level, pickup_km, pickup_damages, pickup_notes, 
        daily_rate, deposit_amount, total_days, subtotal, total_amount,
        delivery_cost, fuel_charge, after_hours_charge, extras_charge,
        extra_km_charge, franchise_charge, discount,
        payment_method, deposit_method, km_included,
        additional_driver_name, additional_driver_birth_place, additional_driver_birth_date,
        additional_driver_license, additional_driver_license_issued_by,
        additional_driver_license_issue_date, additional_driver_license_expiry,
        cc_holder_name, cc_type, cc_number_masked, cc_expiry,
        status, is_completed
      ) VALUES (
        $1, $2, $3, $4, $5, 
        NOW(), $6, $7, $8, 
        $9, $10, $11, $12, 
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21,
        $22, $23, $24,
        $25, $26, $27,
        $28, $29, $30,
        $31, $32,
        $33, $34,
        $35, $36, $37, $38,
        $39, $40
      )
      RETURNING id, rental_number
    `;

    const rentalResult = await client.query(insertRentalQuery, [
      rental_number, booking_code, customer_id, vehicle_id, req.user.id,
      pickup_date, expected_return_date, pickup_location,
      pickup_fuel_level, pickup_km, pickup_damages, pickup_notes,
      daily_rate, deposit_amount, total_days, subtotal, total_amount,
      delivery_cost, fuel_charge, after_hours_charge, extras_charge,
      extra_km_charge, franchise_charge, discount,
      payment_method, deposit_method, km_included,
      additional_driver_name, additional_driver_birth_place, additional_driver_birth_date,
      additional_driver_license, additional_driver_license_issued_by,
      additional_driver_license_issue_date, additional_driver_license_expiry,
      cc_holder_name, cc_type, cc_number_masked, cc_expiry,
      status, is_completed
    ]);

    const { id: newRentalId, rental_number: newRentalNumber } = rentalResult.rows[0];
    
    // Aggiorna stato veicolo
    await client.query(
      "UPDATE vehicles SET status = 'rented', updated_at = NOW() WHERE id = $1",
      [vehicle_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Noleggio creato con successo',
      data: { id: newRentalId, rental_number: newRentalNumber }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore creazione noleggio:', error);
    res.status(500).json({ success: false, message: 'Errore interno', error: error.message });
  } finally {
    client.release();
  }
});

// =========================================================================
// POST /api/rentals/:id/close - Chiusura noleggio (Transazione)
// =========================================================================
router.post('/:id/close', authMiddleware, async (req, res) => {
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

  const rentalId = parseInt(id);
  const returnKm = parseInt(return_km);
  const returnFuelLevel = parseFloat(return_fuel_level);
  const finalTotal = parseFloat(final_total || 0);
  const amountPaid = parseFloat(amount_paid || 0);
  const amountDue = parseFloat(amount_due || 0);
  const closedBy = req.user.id; 

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateRentalQuery = `
      UPDATE rentals 
      SET 
        status = 'closed',
        return_date = $1,
        return_location = $2,
        return_fuel_level = $3,
        return_km = $4,
        return_damages = $5,
        final_total = $6,
        amount_paid = $7,
        amount_due = $8,
        closed_by = $9,
        updated_at = NOW()
      WHERE id = $10 AND status != 'closed'
      RETURNING vehicle_id;
    `;
    
    const rentalResult = await client.query(updateRentalQuery, [
      return_date,
      return_location,
      returnFuelLevel,
      returnKm,
      return_damages,
      finalTotal,
      amountPaid,
      amountDue,
      closedBy,
      rentalId
    ]);

    if (rentalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Noleggio non trovato o già chiuso.' });
    }

    const { vehicle_id } = rentalResult.rows[0];

    const updateVehicleQuery = `
      UPDATE vehicles 
      SET 
        status = 'available', 
        current_km = $1, 
        updated_at = NOW()
      WHERE id = $2;
    `;
    await client.query(updateVehicleQuery, [returnKm, vehicle_id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Noleggio chiuso con successo!', data: { id: rentalId } });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Errore durante la chiusura del noleggio:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server durante la chiusura.',
      error: error.message 
    });
  } finally {
    client.release();
  }
});

// =========================================================================
// POST /api/rentals/:id/generate-contract - Genera Contratto PDF
// =========================================================================
router.post('/:id/generate-contract', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const queryText = `
      SELECT 
        r.*,
        c.full_name, c.fiscal_code, c.address, c.city, c.zip_code, c.phone, c.email, c.vat_number,
        c.license_number, c.license_issued_by, c.license_issue_date, c.license_expiry_date,
        c.province, c.country, c.birth_date, c.birth_place,
        v.license_plate, v.brand, v.model, v.year, v.color, v.fuel_type, v.transmission, v.seats,
        vc.name AS category_name,
        u.full_name AS operator_name
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = $1
    `;
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    const rawRentalData = result.rows[0];
    
    const photosQuery = `
      SELECT id, photo_type, file_path, file_name, upload_date
      FROM rental_photos
      WHERE rental_id = $1
      ORDER BY upload_date ASC
    `;
    const photosResult = await query(photosQuery, [id]);
    
    const pickup_photos = photosResult.rows.filter(p => p.photo_type === 'pickup');
    const return_photos = photosResult.rows.filter(p => p.photo_type === 'return');
    
    const rentalData = {
      ...rawRentalData,
      customer: {
        full_name: rawRentalData.full_name,
        address: rawRentalData.address,
        city: rawRentalData.city,
        zip_code: rawRentalData.zip_code,
        province: rawRentalData.province || '',
        country: rawRentalData.country || 'ITALIA', 
        fiscal_code: rawRentalData.fiscal_code,
        vat_number: rawRentalData.vat_number,
        phone: rawRentalData.phone,
        email: rawRentalData.email,
        license_number: rawRentalData.license_number,
        license_issued_by: rawRentalData.license_issued_by,
        license_issue_date: rawRentalData.license_issue_date,
        license_expiry_date: rawRentalData.license_expiry_date,
        birth_date: rawRentalData.birth_date,
        birth_place: rawRentalData.birth_place,
      },
      vehicle: {
        license_plate: rawRentalData.license_plate,
        brand: rawRentalData.brand,
        model: rawRentalData.model,
        year: rawRentalData.year,
        color: rawRentalData.color,
        fuel_type: rawRentalData.fuel_type,
        transmission: rawRentalData.transmission,
        seats: rawRentalData.seats,
      },
      pickup_photos: pickup_photos,
      return_photos: return_photos,
    };
    
    const generator = new ContractGenerator(); 
    const filename = `CONTRATTO-${rentalData.rental_number}.pdf`;
    
    const contractsDir = path.join(__dirname, '../contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }
    const filepath = path.join(contractsDir, filename);
    
    await generator.generateContract(rentalData, filepath); 

    res.json({
      success: true,
      message: 'Contratto generato con successo',
      filename: filename
    });

  } catch (error) {
    console.error('Errore generazione contratto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server', 
      error: error.message 
    });
  }
});

// =========================================================================
// GET /api/rentals/:id/download-contract - Download Contratto PDF
// =========================================================================
router.get('/:id/download-contract', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT rental_number FROM rentals WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Noleggio non trovato' 
      });
    }

    const filename = `CONTRATTO-${result.rows[0].rental_number}.pdf`;
    const filepath = path.join(__dirname, '../contracts', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contratto non trovato. Generarlo prima.' 
      });
    }

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