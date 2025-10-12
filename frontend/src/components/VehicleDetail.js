import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehiclesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Car, Save } from 'lucide-react';

const fuelTypes = ['Benzina', 'Diesel', 'Elettrico', 'Ibrido'];
const transmissions = ['Manuale', 'Automatico'];
const statuses = ['available', 'rented', 'maintenance'];

const VehicleDetail = () => {
  const { id } = useParams(); // L'ID sarà presente solo in modalità modifica
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(isEditMode);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    license_plate: '',
    category_id: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    fuel_type: fuelTypes[0],
    transmission: transmissions[0],
    seats: 5,
    current_km: 0,
    status: statuses[0],
  });

  useEffect(() => {
    loadCategories();
    if (isEditMode) {
      loadVehicle();
    }
  }, [id]);

  const loadCategories = async () => {
    try {
      const response = await vehiclesAPI.getCategories();
      setCategories(response.data.data);
      if (!isEditMode && response.data.data.length > 0) {
        // Imposta la prima categoria di default per un nuovo veicolo
        setFormData(prev => ({ ...prev, category_id: response.data.data[0].id }));
      }
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
      toast.error('Errore nel caricamento delle categorie veicoli.');
    }
  };

  const loadVehicle = async () => {
    try {
      const response = await vehiclesAPI.getById(id);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Errore caricamento veicolo:', error);
      toast.error('Veicolo non trovato o errore di caricamento.');
      navigate('/vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validazione base
    if (!formData.license_plate || !formData.brand || !formData.model || !formData.category_id) {
      toast.error('Targa, Marca, Modello e Categoria sono campi obbligatori.');
      setLoading(false);
      return;
    }

    try {
      if (isEditMode) {
        await vehiclesAPI.update(id, formData);
        toast.success('Veicolo aggiornato con successo!');
      } else {
        await vehiclesAPI.create(formData);
        toast.success('Veicolo creato con successo!');
      }
      navigate('/vehicles');
    } catch (error) {
      console.error('Errore salvataggio veicolo:', error);
      toast.error(error.response?.data?.message || 'Errore nel salvataggio del veicolo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="content-area">
        <p>Caricamento veicolo...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h1>
          <Car size={24} style={{ marginRight: '8px' }} />
          {isEditMode ? 'Modifica Veicolo' : 'Nuovo Veicolo'}
        </h1>
        <button onClick={() => navigate('/vehicles')} className="btn btn-secondary">
          <ArrowLeft size={18} />
          Torna alla lista
        </button>
      </div>

      <div className="content-area">
        <div className="card">
          <form onSubmit={handleSubmit} className="card-body">
            <h3 className="card-title">Informazioni Base</h3>
            <div className="row">
              <div className="col-md-4 form-group">
                <label className="form-label">Targa (*)</label>
                <input
                  type="text"
                  name="license_plate"
                  className="form-control"
                  value={formData.license_plate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="form-label">Categoria (*)</label>
                <select
                  name="category_id"
                  className="form-control"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleziona Categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (Tariffa: €{parseFloat(cat.daily_rate).toFixed(2)}/giorno)
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-4 form-group">
                <label className="form-label">Anno</label>
                <input
                  type="number"
                  name="year"
                  className="form-control"
                  value={formData.year}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-4 form-group">
                <label className="form-label">Marca (*)</label>
                <input
                  type="text"
                  name="brand"
                  className="form-control"
                  value={formData.brand}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="form-label">Modello (*)</label>
                <input
                  type="text"
                  name="model"
                  className="form-control"
                  value={formData.model}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-4 form-group">
                <label className="form-label">Colore</label>
                <input
                  type="text"
                  name="color"
                  className="form-control"
                  value={formData.color}
                  onChange={handleChange}
                />
              </div>
            </div>

            <h3 className="card-title" style={{ marginTop: '20px' }}>Specifiche</h3>
            <div className="row">
              <div className="col-md-3 form-group">
                <label className="form-label">Carburante</label>
                <select
                  name="fuel_type"
                  className="form-control"
                  value={formData.fuel_type}
                  onChange={handleChange}
                >
                  {fuelTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label className="form-label">Trasmissione</label>
                <select
                  name="transmission"
                  className="form-control"
                  value={formData.transmission}
                  onChange={handleChange}
                >
                  {transmissions.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label className="form-label">Posti</label>
                <input
                  type="number"
                  name="seats"
                  className="form-control"
                  value={formData.seats}
                  onChange={handleChange}
                  min="1"
                />
              </div>
              <div className="col-md-3 form-group">
                <label className="form-label">Stato</label>
                <select
                  name="status"
                  className="form-control"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {statuses.map(s => (
                    <option key={s} value={s}>
                      {s === 'available' ? 'Disponibile' : s === 'rented' ? 'Noleggiato' : 'Manutenzione'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 form-group">
                <label className="form-label">Kilometraggio Attuale</label>
                <input
                  type="number"
                  name="current_km"
                  className="form-control"
                  value={formData.current_km}
                  onChange={handleChange}
                  min="0"
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Salvataggio...' : (isEditMode ? 'Aggiorna Veicolo' : 'Crea Veicolo')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetail;