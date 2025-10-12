import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Save, Trash2, Edit } from 'lucide-react';

const CustomerDetail = () => {
  const { id } = useParams(); // L'ID sarà presente solo in modalità modifica
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    fiscal_code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    zip_code: '',
    country: 'Italia',
    driving_license_number: '',
    id_document_number: '',
  });

  useEffect(() => {
    if (isEditMode) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const response = await customersAPI.getById(id);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Errore caricamento cliente:', error);
      toast.error('Cliente non trovato o errore di caricamento.');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validazione base
    if (!formData.full_name || !formData.fiscal_code || !formData.email) {
      toast.error('Nome, Codice Fiscale ed Email sono campi obbligatori.');
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        await customersAPI.update(id, formData);
        toast.success('Cliente aggiornato con successo!');
      } else {
        await customersAPI.create(formData);
        toast.success('Cliente creato con successo!');
      }
      navigate('/customers');
    } catch (error) {
      console.error('Errore salvataggio cliente:', error);
      toast.error(error.response?.data?.message || 'Errore nel salvataggio del cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Sei sicuro di voler eliminare questo cliente? Questa operazione è irreversibile e possibile solo se non ha noleggi attivi.')) {
      return;
    }
    setDeleting(true);
    try {
      await customersAPI.delete(id);
      toast.success('Cliente eliminato con successo!');
      navigate('/customers');
    } catch (error) {
      console.error('Errore eliminazione cliente:', error);
      toast.error(error.response?.data?.message || 'Errore durante l\'eliminazione.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="content-area">
        <p>Caricamento cliente...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h1>
          <User size={24} style={{ marginRight: '8px' }} />
          {isEditMode ? 'Modifica Cliente' : 'Nuovo Cliente'}
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isEditMode && (
            <button
              onClick={handleDelete}
              className="btn btn-danger"
              disabled={deleting}
            >
              <Trash2 size={18} />
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </button>
          )}
          <button onClick={() => navigate('/customers')} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Torna alla lista
          </button>
        </div>
      </div>

      <div className="content-area">
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body">
            <h3 className="card-title">Dati Anagrafici</h3>
            <div className="row">
              <div className="col-md-6 form-group">
                <label className="form-label">Nome e Cognome (*)</label>
                <input
                  type="text"
                  name="full_name"
                  className="form-control"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6 form-group">
                <label className="form-label">Codice Fiscale (*)</label>
                <input
                  type="text"
                  name="fiscal_code"
                  className="form-control"
                  value={formData.fiscal_code}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 form-group">
                <label className="form-label">Email (*)</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6 form-group">
                <label className="form-label">Telefono</label>
                <input
                  type="tel"
                  name="phone"
                  className="form-control"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
            
            <h3 className="card-title" style={{ marginTop: '20px' }}>Indirizzo</h3>
            <div className="form-group">
              <label className="form-label">Indirizzo</label>
              <input
                type="text"
                name="address"
                className="form-control"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
            <div className="row">
              <div className="col-md-4 form-group">
                <label className="form-label">Città</label>
                <input
                  type="text"
                  name="city"
                  className="form-control"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="form-label">CAP</label>
                <input
                  type="text"
                  name="zip_code"
                  className="form-control"
                  value={formData.zip_code}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="form-label">Paese</label>
                <input
                  type="text"
                  name="country"
                  className="form-control"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 className="card-title" style={{ marginTop: '20px' }}>Documenti</h3>
            <div className="row">
              <div className="col-md-6 form-group">
                <label className="form-label">Patente di Guida N.</label>
                <input
                  type="text"
                  name="driving_license_number"
                  className="form-control"
                  value={formData.driving_license_number}
                  onChange={handleChange}
                />
              </div>
              <div className="col-md-6 form-group">
                <label className="form-label">Documento d'Identità N.</label>
                <input
                  type="text"
                  name="id_document_number"
                  className="form-control"
                  value={formData.id_document_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Salvataggio...' : (isEditMode ? 'Aggiorna Cliente' : 'Crea Cliente')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;