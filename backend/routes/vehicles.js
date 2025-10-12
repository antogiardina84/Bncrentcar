const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// GET - Lista veicoli
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, category, available_only, page = 1, limit = 50 } = req.query;

    let queryText = `
      SELECT 
        v.*,
        vc.name as category_name,
        vc.daily_rate
      FROM vehicles v
      LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      queryText += ` AND v.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (category) {
      queryText += ` AND v.category_id = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (available_only === 'true') {
      queryText += ` AND v.status = 'available'`;
    }

    queryText += ` ORDER BY v.brand, v.model LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Errore recupero veicoli:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// GET - Dettaglio veicolo
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        v.*,
        vc.name as category_name,
        vc.daily_rate,
        vc.deposit_amount,
        vc.franchise_theft,
        vc.franchise_damage,
        vc.franchise_rca
      FROM vehicles v
      LEFT JOIN vehicle_categories vc ON v.category_id = vc.id
      WHERE v.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Veicolo non trovato' 
      });
    }

    // Recupera noleggi recenti
    const rentalsResult = await query(`
      SELECT 
        r.id, r.rental_number, r.pickup_date, r.actual_return_date,
        r.pickup_km, r.return_km, r.status,
        c.full_name as customer_name
      FROM rentals r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.vehicle_id = $1
      ORDER BY r.pickup_date DESC
      LIMIT 10
    `, [id]);

    const vehicle = result.rows[0];
    vehicle.rental_history = rentalsResult.rows;

    res.json({
      success: true,
      data: vehicle
    });

  } catch (error) {
    console.error('Errore recupero veicolo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// POST - Crea veicolo
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      license_plate,
      category_id,
      brand,
      model,
      year,
      color,
      fuel_type,
      transmission,
      seats,
      current_km = 0,
      notes
    } = req.body;

    // Validazione
    if (!license_plate || !brand || !model) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dati obbligatori mancanti' 
      });
    }

    // Verifica duplicati
    const duplicateCheck = await query(
      'SELECT id FROM vehicles WHERE license_plate = $1',
      [license_plate]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Veicolo con questa targa già esistente' 
      });
    }

    const result = await query(`
      INSERT INTO vehicles (
        license_plate, category_id, brand, model, year, color,
        fuel_type, transmission, seats, current_km, notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, 'available'
      ) RETURNING id
    `, [
      license_plate, category_id, brand, model, year, color,
      fuel_type, transmission, seats, current_km, notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Veicolo creato con successo',
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    console.error('Errore creazione veicolo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// PUT - Aggiorna veicolo
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'license_plate', 'category_id', 'brand', 'model', 'year', 'color',
      'fuel_type', 'transmission', 'seats', 'current_km', 'status', 'notes'
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nessun campo da aggiornare' 
      });
    }

    values.push(id);

    const queryText = `
      UPDATE vehicles 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id
    `;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Veicolo non trovato' 
      });
    }

    res.json({
      success: true,
      message: 'Veicolo aggiornato con successo'
    });

  } catch (error) {
    console.error('Errore aggiornamento veicolo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

// GET - Categorie veicoli
router.get('/categories/list', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM vehicle_categories ORDER BY daily_rate ASC'
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Errore recupero categorie:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Errore interno del server',
      error: error.message 
    });
  }
});

module.exports = router;

