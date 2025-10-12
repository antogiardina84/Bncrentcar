import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rentalsAPI, photosAPI } from '../services/api';
import toast from 'react-hot-toast';
import PhotoUpload from './PhotoUpload';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle,
  User,
  Car,
  Calendar,
  Camera,
  X
} from 'lucide-react';

const RentalDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showReturnPhotosModal, setShowReturnPhotosModal] = useState(false);
  const [closeData, setCloseData] = useState({
    return_date: new Date().toISOString().slice(0, 16),
    return_location: '',
    return_fuel_level: '100',
    return_km: '',
    return_damages: '',
    final_total: 0,
    amount_paid: 0,
    amount_due: 0,
  });

  useEffect(() => {
    loadRentalDetail();
  }, [id]);

  const loadRentalDetail = async () => {
    try {
      setLoading(true);
      const response = await rentalsAPI.getById(id);
      const rentalData = response.data.data;
      
      setRental(rentalData);
      
      // Imposta i dati di chiusura con valori predefiniti
      setCloseData(prev => ({
        ...prev,
        return_location: rentalData.pickup_location || '',
        final_total: rentalData.total_amount || 0,
        amount_paid: rentalData.amount_paid || 0,
        amount_due: rentalData.amount_due || 0,
      }));
    } catch (error) {
      console.error('Errore caricamento dettaglio:', error);
      toast.error('Errore nel caricamento del noleggio');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadContract = async () => {
    try {
      // Prima genera il contratto
      await rentalsAPI.generateContract(id);
      
      // Poi scaricalo
      const response = await rentalsAPI.downloadContract(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contratto_${rental.rental_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Contratto scaricato con successo');
    } catch (error) {
      console.error('Errore download contratto:', error);
      toast.error(error.response?.data?.message || 'Errore nel download del contratto');
    }
  };

  const handleCloseRental = async () => {
    try {
      // Validazione
      if (!closeData.return_km) {
        toast.error('Inserisci i km al rientro');
        return;
      }

      const returnKm = parseInt(closeData.return_km);
      const pickupKm = parseInt(rental.pickup_km);

      if (returnKm < pickupKm) {
        toast.error('I km al rientro non possono essere inferiori ai km in uscita');
        return;
      }

      // Chiudi il noleggio
      await rentalsAPI.close(id, closeData);
      
      toast.success('Noleggio chiuso con successo!');
      setShowCloseModal(false);
      
      // Ricarica i dati del noleggio
      await loadRentalDetail();
      
      // Mostra il modal per caricare foto di rientro
      setTimeout(() => {
        setShowReturnPhotosModal(true);
      }, 500);
      
    } catch (error) {
      console.error('Errore chiusura noleggio:', error);
      toast.error(error.response?.data?.message || 'Errore nella chiusura del noleggio');
    }
  };

  const handleReturnPhotosComplete = () => {
    setShowReturnPhotosModal(false);
    toast.success('Foto di rientro salvate!');
    loadRentalDetail(); // Ricarica per mostrare le nuove foto
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('it-IT');
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '€ 0,00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'Attivo', className: 'badge-success' },
      closed: { label: 'Chiuso', className: 'badge-secondary' },
      cancelled: { label: 'Annullato', className: 'badge-danger' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div>
        <div className="top-bar">
          <h1>Caricamento...</h1>
        </div>
        <div className="content-area">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!rental) {
    return (
      <div>
        <div className="top-bar">
          <h1>Noleggio non trovato</h1>
        </div>
        <div className="content-area">
          <div className="card">
            <div className="card-body">
              <p>Il noleggio richiesto non è stato trovato.</p>
              <button onClick={() => navigate('/rentals')} className="btn btn-primary mt-2">
                Torna alla lista
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/rentals')}
            className="btn btn-outline-secondary"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>Noleggio {rental.rental_number}</h1>
            <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '4px' }}>
              Codice: {rental.booking_code}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleDownloadContract}
            className="btn btn-outline-primary"
          >
            <Download size={18} />
            Scarica Contratto
          </button>
          {rental.status === 'active' && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="btn btn-success"
            >
              <CheckCircle size={18} />
              Chiudi Noleggio
            </button>
          )}
          {rental.status === 'closed' && (
            <button
              onClick={() => setShowReturnPhotosModal(true)}
              className="btn btn-outline-primary"
            >
              <Camera size={18} />
              Gestisci Foto Rientro
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        {/* Cards informazioni cliente, veicolo, date - INVARIATE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          {/* Informazioni Cliente */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="#1a4d2e" />
                <h3 className="card-title">Cliente</h3>
              </div>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '12px' }}>
                <strong>{rental.customer_name}</strong>
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <div>📞 {rental.customer_phone || 'N/A'}</div>
                <div>📧 {rental.customer_email || 'N/A'}</div>
                <div>🆔 CF: {rental.fiscal_code || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Informazioni Veicolo */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Car size={20} color="#17a2b8" />
                <h3 className="card-title">Veicolo</h3>
              </div>
            </div>
            <div className="card-body">
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ fontSize: '16px' }}>
                  {rental.brand} {rental.model}
                </strong>
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                <div>🏷️ <strong>Targa:</strong> {rental.license_plate}</div>
                {rental.category_name && <div>📊 <strong>Categoria:</strong> {rental.category_name}</div>}
              </div>
            </div>
          </div>

          {/* Date e Orari */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#f4a261" />
                <h3 className="card-title">Date</h3>
              </div>
            </div>
            <div className="card-body">
              <div style={{ fontSize: '14px', lineHeight: '2' }}>
                <div>
                  <strong>Ritiro:</strong><br />
                  {formatDate(rental.pickup_date)}
                </div>
                <div style={{ marginTop: '12px' }}>
                  <strong>Rientro Previsto:</strong><br />
                  {formatDate(rental.expected_return_date)}
                </div>
                {rental.return_date && (
                  <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #dee2e6',
                    color: '#28a745',
                    fontWeight: '600',
                  }}>
                    ✓ Rientrato:<br />
                    {formatDate(rental.return_date)}
                  </div>
                )}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
                  <strong>Durata:</strong> {rental.total_days} giorn{rental.total_days === 1 ? 'o' : 'i'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dettagli Noleggio */}
        <div className="card mt-3">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title">Dettagli Noleggio</h3>
            {getStatusBadge(rental.status)}
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
              {/* Info Uscita */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#1a4d2e' }}>
                  Informazioni Uscita
                </h4>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div>📍 <strong>Luogo:</strong> {rental.pickup_location}</div>
                  <div>⛽ <strong>Carburante:</strong> {rental.pickup_fuel_level}%</div>
                  <div>📊 <strong>Km:</strong> {rental.pickup_km}</div>
                  {rental.pickup_damages && (
                    <div style={{ marginTop: '8px' }}>
                      <strong>Danni:</strong><br />
                      <span style={{ color: '#6c757d' }}>{rental.pickup_damages}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Info Rientro (se presente) */}
              {rental.return_date && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#28a745' }}>
                    Informazioni Rientro
                  </h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <div>📍 <strong>Luogo:</strong> {rental.return_location}</div>
                    <div>⛽ <strong>Carburante:</strong> {rental.return_fuel_level}%</div>
                    <div>📊 <strong>Km:</strong> {rental.return_km}</div>
                    <div>🛣️ <strong>Km percorsi:</strong> {rental.return_km - rental.pickup_km}</div>
                    {rental.return_damages && (
                      <div style={{ marginTop: '8px' }}>
                        <strong>Danni:</strong><br />
                        <span style={{ color: '#6c757d' }}>{rental.return_damages}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Importi */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#e76f51' }}>
                  Importi
                </h4>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div>💰 <strong>Tariffa/giorno:</strong> {formatCurrency(rental.daily_rate)}</div>
                  <div>📅 <strong>Giorni:</strong> {rental.total_days}</div>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
                    <strong>TOTALE:</strong> <span style={{ fontSize: '18px', fontWeight: '700', color: '#1a4d2e' }}>
                      {formatCurrency(rental.total_amount)}
                    </span>
                  </div>
                  <div><strong>Versato:</strong> {formatCurrency(rental.amount_paid || 0)}</div>
                  {parseFloat(rental.amount_due || 0) > 0 && (
                    <div style={{ color: '#dc3545', fontWeight: '600' }}>
                      <strong>Da versare:</strong> {formatCurrency(rental.amount_due)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sezione Foto */}
        <div className="card mt-3">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={20} />
              <h3 className="card-title">Foto Veicolo</h3>
            </div>
          </div>
          <div className="card-body">
            {/* Foto Uscita */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1a4d2e' }}>
                Foto in Uscita
              </h4>
              <PhotoUpload
                rentalId={id}
                photoType="pickup"
                onPhotosChange={(photos) => console.log('Pickup photos:', photos)}
              />
            </div>

            {/* Foto Rientro - Solo se noleggio chiuso */}
            {rental.status === 'closed' && (
              <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '2px solid #dee2e6' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#28a745' }}>
                  Foto al Rientro
                </h4>
                <PhotoUpload
                  rentalId={id}
                  photoType="return"
                  onPhotosChange={(photos) => console.log('Return photos:', photos)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Chiusura Noleggio */}
      {showCloseModal && (
        <div 
          className="modal-backdrop" 
          onClick={() => setShowCloseModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div 
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div 
              className="modal-header"
              style={{
                padding: '20px',
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Chiudi Noleggio</h3>
              <button
                onClick={() => setShowCloseModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '28px', 
                  cursor: 'pointer',
                  color: '#6c757d',
                  lineHeight: 1,
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="form-group">
                <label className="form-label">Data e Ora Rientro *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={closeData.return_date}
                  onChange={(e) => setCloseData({ ...closeData, return_date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Luogo Rientro</label>
                <input
                  type="text"
                  className="form-control"
                  value={closeData.return_location}
                  onChange={(e) => setCloseData({ ...closeData, return_location: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Carburante (%) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={closeData.return_fuel_level}
                    onChange={(e) => setCloseData({ ...closeData, return_fuel_level: e.target.value })}
                    min="0"
                    max="100"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Km al Rientro *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={closeData.return_km}
                    onChange={(e) => setCloseData({ ...closeData, return_km: e.target.value })}
                    min={rental.pickup_km}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nuovi Danni</label>
                <textarea
                  className="form-control"
                  value={closeData.return_damages}
                  onChange={(e) => setCloseData({ ...closeData, return_damages: e.target.value })}
                  rows="3"
                  placeholder="Descrivi eventuali nuovi danni..."
                />
              </div>

              <div style={{ 
                padding: '16px', 
                background: '#fff3cd', 
                borderRadius: '4px',
                fontSize: '14px',
                marginTop: '16px',
              }}>
                ⚠️ <strong>Nota:</strong> Dopo aver chiuso il noleggio, potrai immediatamente caricare le foto del rientro.
              </div>
            </div>
            
            <div 
              className="modal-footer"
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => setShowCloseModal(false)}
                className="btn btn-secondary"
              >
                Annulla
              </button>
              <button
                onClick={handleCloseRental}
                className="btn btn-success"
              >
                <CheckCircle size={18} />
                Chiudi Noleggio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Foto Rientro */}
      {showReturnPhotosModal && (
        <div 
          className="modal-backdrop" 
          onClick={() => setShowReturnPhotosModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div 
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div 
              className="modal-header"
              style={{
                padding: '20px',
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                <Camera size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Foto Veicolo al Rientro
              </h3>
              <button
                onClick={() => setShowReturnPhotosModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '28px', 
                  cursor: 'pointer',
                  color: '#6c757d',
                  lineHeight: 1,
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ 
                padding: '16px', 
                background: '#e8f5e9', 
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '20px',
                color: '#1a4d2e',
              }}>
                📸 <strong>Importante:</strong> Scatta foto di tutti i lati del veicolo per documentare lo stato al momento del rientro.
              </div>
              
              <PhotoUpload
                rentalId={id}
                photoType="return"
                onPhotosChange={(photos) => console.log('Return photos updated:', photos)}
              />
            </div>
            
            <div 
              className="modal-footer"
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={handleReturnPhotosComplete}
                className="btn btn-success"
              >
                <CheckCircle size={18} />
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalDetail;