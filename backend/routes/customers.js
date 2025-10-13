const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// GET - Lista clienti
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        COUNT(r.id) as total_rentals
      FROM customers c
      LEFT JOIN rentals r ON c.id = r.customer_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Errore recupero clienti:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero dei clienti'
    });
  }
});

// GET - Dettaglio cliente
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const customerResult = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato'
      });
    }

    const rentalsResult = await pool.query(`
      SELECT 
        r.*,
        v.license_plate,
        v.brand,
        v.model
      FROM rentals r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      WHERE r.customer_id = $1
      ORDER BY r.pickup_date DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        customer: customerResult.rows[0],
        rentals: rentalsResult.rows
      }
    });
  } catch (error) {
    console.error('❌ Errore recupero dettaglio cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante il recupero del cliente'
    });
  }
});

// POST - Crea nuovo cliente
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      customer_type,
      full_name,
      company_name,
      fiscal_code,
      vat_number,
      address,
      city,
      province,
      zip_code,
      country,
      phone,
      email,
      license_number,
      license_issued_by,
      license_issue_date,
      license_expiry_date,
      birth_date,
      birth_place,
      id_card_number,
      id_card_issue_date,
      id_card_expiry_date,
      id_card_issued_by,
      notes
    } = req.body;

    // Validazioni
    if (!full_name || !fiscal_code || !address || !city || !province || !zip_code || !phone || !email || !license_number) {
      return res.status(400).json({
        success: false,
        message: 'Campi obbligatori mancanti'
      });
    }

    const result = await pool.query(`
      INSERT INTO customers (
        customer_type, full_name, company_name, fiscal_code, vat_number,
        address, city, province, zip_code, country,
        phone, email, license_number, license_issued_by,
        license_issue_date, license_expiry_date, birth_date, birth_place,
        id_card_number, id_card_issue_date, id_card_expiry_date, id_card_issued_by, notes
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21, $22, $23
      )
      RETURNING *
    `, [
      customer_type || 'individual', full_name, company_name, fiscal_code, vat_number,
      address, city, province, zip_code, country || 'IT',
      phone, email, license_number, license_issued_by,
      license_issue_date, license_expiry_date, birth_date, birth_place,
      id_card_number, id_card_issue_date, id_card_expiry_date, id_card_issued_by, notes
    ]);

    res.status(201).json({
      success: true,
      message: 'Cliente creato con successo',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Errore creazione cliente:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Cliente con questo codice fiscale già esistente'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Errore durante la creazione del cliente'
    });
  }
});

// PUT - Aggiorna cliente
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nessun campo da aggiornare'
      });
    }

    values.push(id);
    const query = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente non trovato'
      });
    }

    res.json({
      success: true,
      message: 'Cliente aggiornato con successo',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Errore aggiornamento cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'aggiornamento del cliente'
    });
  }
});

// DELETE - Elimina cliente
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se ha noleggi attivi
    const activeRentals = await pool.query(
      'SELECT COUNT(*) as count FROM rentals WHERE customer_id = $1 AND status = $2',
      [id, 'active']
    );

    if (parseInt(activeRentals.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Impossibile eliminare: cliente con noleggi attivi'
      });
    }

    const result = await pool.query(
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
    console.error('❌ Errore eliminazione cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Errore durante l\'eliminazione del cliente'
    });
  }
});

module.exports = router;