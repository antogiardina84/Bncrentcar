const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

// ✅ CORREZIONE: Crea la directory uploads se non esiste
const uploadDir = path.join(__dirname, '../uploads/rental-photos');

// Funzione per creare la directory
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log('✅ Directory upload creata:', uploadDir);
  } catch (error) {
    console.error('❌ Errore creazione directory:', error);
  }
};

// Esegui all'avvio del server
ensureUploadDir();

// Configurazione Multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Assicurati che la directory esista
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      console.error('Errore creazione directory:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'photo-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo immagini sono permesse (JPEG, JPG, PNG, GIF, WEBP)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // Max 10 file per volta
  },
  fileFilter: fileFilter
});

// ✅ CORREZIONE: Gestione errori Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        message: 'File troppo grande. Dimensione massima: 5MB' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false,
        message: 'Troppi file. Massimo 10 foto per volta' 
      });
    }
    return res.status(400).json({ 
      success: false,
      message: `Errore upload: ${err.message}` 
    });
  }
  
  if (err) {
    return res.status(500).json({ 
      success: false,
      message: err.message || 'Errore durante l\'upload' 
    });
  }
  
  next();
};

// ====================================================================
// ROTTE
// ====================================================================

// Upload singola foto
router.post('/upload', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Nessun file caricato' });
    }

    const { rental_id, photo_type } = req.body;

    if (!rental_id || !photo_type) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: 'rental_id e photo_type obbligatori' });
    }

    // ✅ CORREZIONE: Usa solo i campi che esistono nello schema
    const result = await pool.query(
      `INSERT INTO rental_photos (rental_id, photo_type, file_path, file_name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [rental_id, photo_type, req.file.path, req.file.filename]
    );

    res.status(201).json({
      success: true,
      message: 'Foto caricata',
      data: {
        photo_id: result.rows[0].id,
        filename: result.rows[0].file_name
      }
    });
  } catch (error) {
    console.error('Errore upload:', error);
    res.status(500).json({ message: 'Errore upload foto' });
  }
});

// Upload multiple
router.post('/upload-multiple', authMiddleware, (req, res, next) => {
  upload.array('photos', 10)(req, res, (err) => {
    handleMulterError(err, req, res, async () => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ 
            success: false,
            message: 'Nessun file caricato' 
          });
        }

        const { rental_id, photo_type } = req.body;

        if (!rental_id || !photo_type) {
          // Elimina tutti i file caricati
          for (const file of req.files) {
            await fs.unlink(file.path).catch(console.error);
          }
          return res.status(400).json({ 
            success: false,
            message: 'rental_id e photo_type sono obbligatori' 
          });
        }

        const uploadedPhotos = [];

        // Inserisci ogni foto nel database
        for (const file of req.files) {
          try {
            const result = await pool.query(
              `INSERT INTO rental_photos 
               (rental_id, photo_type, file_path, file_name, file_size, mime_type, upload_date)
               VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
               RETURNING *`,
              [rental_id, photo_type, file.path, file.filename, file.size, file.mimetype]
            );
            
            uploadedPhotos.push({
              photo_id: result.rows[0].id,
              filename: result.rows[0].file_name,
              url: `/api/photos/${result.rows[0].id}`
            });
          } catch (dbError) {
            console.error('Errore inserimento foto:', dbError);
            // Continua con le altre foto
          }
        }

        res.status(201).json({ 
          success: true,
          message: `${uploadedPhotos.length} foto caricate con successo`,
          data: uploadedPhotos 
        });

      } catch (error) {
        console.error('Errore upload multiple:', error);
        
        // Elimina tutti i file in caso di errore
        if (req.files) {
          for (const file of req.files) {
            await fs.unlink(file.path).catch(console.error);
          }
        }
        
        res.status(500).json({ 
          success: false,
          message: 'Errore durante l\'upload multiplo',
          error: error.message 
        });
      }
    });
  });
});

// Get foto per ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM rental_photos WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Foto non trovata' 
      });
    }

    const photo = result.rows[0];
    
    // Verifica che il file esista
    try {
      await fs.access(photo.file_path);
      res.sendFile(path.resolve(photo.file_path));
    } catch (fileError) {
      console.error('File non trovato:', photo.file_path);
      res.status(404).json({ 
        success: false,
        message: 'File fisico non trovato' 
      });
    }
    
  } catch (error) {
    console.error('Errore recupero foto:', error);
    res.status(500).json({ 
      success: false,
      message: 'Errore durante il recupero della foto',
      error: error.message 
    });
  }
});

// Get foto per noleggio
router.get('/rental/:rentalId', authMiddleware, async (req, res) => {
  try {
    const { photo_type } = req.query;
    
    // ✅ CORREZIONE: Usa 'pool.query' invece di 'pool.query' 
    // perché abbiamo importato solo {pool} e non {query}
    const { query } = require('../config/database'); 
    
    let queryText = 'SELECT * FROM rental_photos WHERE rental_id = $1';
    const params = [req.params.rentalId];

    if (photo_type) {
      queryText += ' AND photo_type = $2';
      params.push(photo_type);
    }

    const result = await query(queryText + ' ORDER BY upload_date DESC', params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Errore recupero foto:', error);
    res.status(500).json({ success: false, message: 'Errore recupero foto', error: error.message });
  }
});

// Delete foto
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Recupera info foto
    const photoResult = await pool.query(
      'SELECT * FROM rental_photos WHERE id = $1',
      [req.params.id]
    );
    
    if (photoResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'Foto non trovata' 
      });
    }

    const photo = photoResult.rows[0];

    // Elimina file fisico
    try {
      await fs.unlink(photo.file_path);
      console.log('✅ File fisico eliminato:', photo.file_path);
    } catch (fileError) {
      console.warn('⚠️ File fisico non trovato (già eliminato?):', photo.file_path);
    }

    // Elimina record dal database
    await pool.query('DELETE FROM rental_photos WHERE id = $1', [req.params.id]);

    res.json({ 
      success: true,
      message: 'Foto eliminata con successo' 
    });
    
  } catch (error) {
    console.error('Errore eliminazione foto:', error);
    res.status(500).json({ 
      success: false,
      message: 'Errore durante l\'eliminazione della foto',
      error: error.message 
    });
  }
});

module.exports = router;