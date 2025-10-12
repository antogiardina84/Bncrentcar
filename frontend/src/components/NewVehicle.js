import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiclesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Car, ArrowLeft, Save } from 'lucide-react';

const NewVehicle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Campi basati sulla tabella 'vehicles' di schema.sql
  const [formData, setFormData] = useState({
    license_plate: '',
    category_id: '', // Sarà un select
    brand: '',
    model: '',
    year: new Date().getFullYear().toString(),
    color: '',
    fuel_type: 'Benzina', // Default
    transmission: 'Manuale', // Default
    seats: '5', // Default
    current_km: '0',
    status: 'available', // Default
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await vehiclesAPI.getCategories();
      setCategories(response.data.data);
      if (response.data.data.length > 0) {
        // Imposta la prima categoria come default se non già impostata
        setFormData(prev => ({ 
          ...prev, 
          category_id: prev.category_id || response.data.data[0].id 
        }));
      }
    } catch (error) {
      console.error('Errore caricamento categorie:', error);
      toast.error('Impossibile caricare le categorie veicoli.');
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
    if (!formData.license_plate || !formData.category_id || !formData.brand || !formData.model) {
      toast.error('Per favore, compila i campi obbligatori (Targa, Categoria, Marca, Modello).');
      return;
    }

    setLoading(true);
    try {
      await vehiclesAPI.create(formData);
      toast.success('Veicolo registrato con successo!');
      navigate('/vehicles');
    } catch (error) {
      console.error('Errore registrazione veicolo:', error);
      toast.error(error.response?.data?.message || 'Errore durante la registrazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <h1>
          <Car size={24} style={{ marginRight: '8px' }} />
          Nuovo Veicolo
        </h1>
        <button 
          onClick={() => navigate('/vehicles')} 
          className="btn btn-secondary"
        >
          <ArrowLeft size={18} />
          Torna alla Lista
        </button>
      </div>

      <div className="content-area">
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                
                {/* Dati Base */}
                <h3 className="section-title">Dati Base</h3>
                <div className="col-md-3 form-group">
                  <label className="form-label">Targa *</label>
                  <input type="text" name="license_plate" className="form-control" value={formData.license_plate} onChange={handleChange} required />
                </div>
                <div className="col-md-3 form-group">
                  <label className="form-label">Categoria *</label>
                  <select name="category_id" className="form-control" value={formData.category_id} onChange={handleChange} required>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} (Tariffa: €{parseFloat(cat.daily_rate).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3 form-group">
                  <label className="form-label">Marca *</label>
                  <input type="text" name="brand" className="form-control" value={formData.brand} onChange={handleChange} required />
                </div>
                <div className="col-md-3 form-group">
                  <label className="form-label">Modello *</label>
                  <input type="text" name="model" className="form-control" value={formData.model} onChange={handleChange} required />
                </div>
                
                {/* Dettagli Tecnici */}
                <h3 className="section-title">Dettagli Tecnici</h3>
                <div className="col-md-2 form-group">
                  <label className="form-label">Anno</label>
                  <input type="number" name="year" className="form-control" value={formData.year} onChange={handleChange} />
                </div>
                <div className="col-md-2 form-group">
                  <label className="form-label">Colore</label>
                  <input type="text" name="color" className="form-control" value={formData.color} onChange={handleChange} />
                </div>
                <div className="col-md-2 form-group">
                  <label className="form-label">Carburante</label>
                  <select name="fuel_type" className="form-control" value={formData.fuel_type} onChange={handleChange}>
                    <option value="Benzina">Benzina</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elettrico">Elettrico</option>
                    <option value="Ibrido">Ibrido</option>
                  </select>
                </div>
                <div className="col-md-2 form-group">
                  <label className="form-label">Cambio</label>
                  <select name="transmission" className="form-control" value={formData.transmission} onChange={handleChange}>
                    <option value="Manuale">Manuale</option>
                    <option value="Automatico">Automatico</option>
                  </select>
                </div>
                <div className="col-md-2 form-group">
                  <label className="form-label">Posti</label>
                  <input type="number" name="seats" className="form-control" value={formData.seats} onChange={handleChange} min="1" />
                </div>
                <div className="col-md-2 form-group">
                  <label className="form-label">Km Attuali</label>
                  <input type="number" name="current_km" className="form-control" value={formData.current_km} onChange={handleChange} min="0" />
                </div>

                {/* Stato */}
                <h3 className="section-title">Stato</h3>
                <div className="col-md-3 form-group">
                  <label className="form-label">Stato Veicolo</label>
                  <select name="status" className="form-control" value={formData.status} onChange={handleChange}>
                    <option value="available">Disponibile</option>
                    <option value="rented">Noleggiato</option>
                    <option value="maintenance">Manutenzione</option>
                  </select>
                </div>

                <div className="col-12 mt-4">
                  <button type="submit" className="btn btn-success btn-lg" disabled={loading}>
                    {loading ? 'Salvataggio...' : (<><Save size={18} /> Salva Veicolo</>)}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewVehicle;