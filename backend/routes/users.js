const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Validation array per creazione/modifica utente
const userValidation = [
  body('username').notEmpty().withMessage('Username è obbligatorio'),
  body('email').isEmail().withMessage('Email non valida'),
  body('full_name').notEmpty().withMessage('Nome completo è obbligatorio'),
  body('role').isIn(['admin', 'operator']).withMessage('Ruolo non valido'),
];

// Funzione per validare la password solo in caso di creazione o se presente
const validatePassword = [
  body('password')
    .optional() // Rendi opzionale se non è un'operazione di creazione
    .isLength({ min: 6 })
    .withMessage('La password deve essere di almeno 6 caratteri'),
];

// GET - Lista utenti (Solo Admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users ORDER BY id ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Errore recupero utenti:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
});

// GET - Dettaglio utente per ID (Solo Admin)
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Errore recupero utente:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
});

// POST - Crea nuovo utente (Solo Admin)
router.post('/', authMiddleware, adminMiddleware, [...userValidation, ...validatePassword.map(v => v.exists())], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { username, email, password, full_name, role } = req.body;

  try {
    // 1. Controlla unicità username/email
    const existing = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Username o Email già in uso' });
    }

    // 2. Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // 3. Inserisci nel DB
    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [username, email, password_hash, full_name, role]
    );

    res.status(201).json({ 
      success: true, 
      message: 'Utente creato con successo', 
      userId: result.rows[0].id 
    });
  } catch (error) {
    console.error('Errore creazione utente:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server', error: error.message });
  }
});

// PUT - Aggiorna utente (Solo Admin)
router.put('/:id', authMiddleware, adminMiddleware, [...userValidation, ...validatePassword.map(v => v.optional())], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;
  const { username, email, password, full_name, role, is_active } = req.body;
  const fields = [];
  const values = [];
  let paramCount = 1;

  // Costruisci la query in modo dinamico
  if (username !== undefined) {
    fields.push(`username = $${paramCount++}`);
    values.push(username);
  }
  if (email !== undefined) {
    fields.push(`email = $${paramCount++}`);
    values.push(email);
  }
  if (full_name !== undefined) {
    fields.push(`full_name = $${paramCount++}`);
    values.push(full_name);
  }
  if (role !== undefined) {
    fields.push(`role = $${paramCount++}`);
    values.push(role);
  }
  if (is_active !== undefined) {
    fields.push(`is_active = $${paramCount++}`);
    values.push(is_active);
  }
  if (password) {
    // Aggiorna password se fornita
    const password_hash = await bcrypt.hash(password, 10);
    fields.push(`password_hash = $${paramCount++}`);
    values.push(password_hash);
  }

  if (fields.length === 0) {
    return res.status(400).json({ success: false, message: 'Nessun campo da aggiornare' });
  }

  values.push(id);

  try {
    const queryText = `
      UPDATE users 
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} RETURNING id
    `;
    
    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    res.json({ success: true, message: 'Utente aggiornato con successo' });
  } catch (error) {
    console.error('Errore aggiornamento utente:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server', error: error.message });
  }
});


// DELETE - Elimina utente (Solo Admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevenire l'eliminazione dell'account in uso (opzionale ma consigliato)
    if (parseInt(id) === req.user.id) {
        return res.status(403).json({ success: false, message: 'Non puoi eliminare il tuo account mentre sei loggato.' });
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utente non trovato' });
    }

    res.json({ success: true, message: 'Utente eliminato con successo' });
  } catch (error) {
    console.error('Errore eliminazione utente:', error);
    res.status(500).json({ success: false, message: 'Errore interno del server', error: error.message });
  }
});

module.exports = router;