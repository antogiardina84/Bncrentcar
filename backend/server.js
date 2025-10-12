const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // ✅ AGGIUNTO: Import necessario per error handling
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ AGGIUNTO: Funzione per creare directory necessarie all'avvio
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/rental-photos'),
    path.join(__dirname, 'contracts'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Directory creata: ${dir}`);
    }
  });
};

// ✅ Esegui creazione directory prima di tutto
ensureDirectories();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/contracts', express.static(path.join(__dirname, 'contracts')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rentals', require('./routes/rentals'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString() 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // ✅ CORRETTO: Gestione errori Multer ora funzionante
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'File troppo grande. Massimo 5MB' 
      });
    }
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Errore interno del server',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint non trovato' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('🚗 RENTAL MANAGEMENT SYSTEM - Backend');
  console.log('═══════════════════════════════════════════════');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════════════');
});

module.exports = app;