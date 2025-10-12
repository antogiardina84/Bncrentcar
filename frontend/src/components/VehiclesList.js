import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Car, Plus } from 'lucide-react';

const VehiclesList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const response = await vehiclesAPI.getAll({ limit: 1000 });
      setVehicles(response.data.data);
    } catch (error) {
      console.error('Errore caricamento veicoli:', error);
      toast.error('Errore nel caricamento dei veicoli');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { label: 'Disponibile', className: 'badge-success' },
      rented: { label: 'Noleggiato', className: 'badge-warning' },
      maintenance: { label: 'Manutenzione', className: 'badge-danger' },
    };
    const config = statusConfig[status] || statusConfig.available;
    return <span className={`badge ${config.className}`}>{config.label}</span>;
  };

  return (
    <div>
      <div className="top-bar">
        <h1>Gestione Veicoli</h1>
        <Link to="/vehicles/new" className="btn btn-primary">
          <Plus size={18} />
          Nuovo Veicolo
        </Link>
      </div>

      <div className="content-area">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Flotta Veicoli ({vehicles.length})</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="spinner"></div>
            ) : vehicles.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                <Car size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Nessun veicolo in flotta</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Targa</th>
                      <th>Veicolo</th>
                      <th>Categoria</th>
                      <th>Anno</th>
                      <th>Carburante</th>
                      <th>Km Attuali</th>
                      <th>Stato</th>
                      <th>Tariffa/Giorno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td style={{ fontWeight: '600' }}>{vehicle.license_plate}</td>
                        <td>
                          <strong>{vehicle.brand} {vehicle.model}</strong>
                          {vehicle.color && (
                            <>
                              <br />
                              <small style={{ color: '#6c757d' }}>{vehicle.color}</small>
                            </>
                          )}
                        </td>
                        <td>{vehicle.category_name || 'N/A'}</td>
                        <td>{vehicle.year || '-'}</td>
                        <td>{vehicle.fuel_type || '-'}</td>
                        <td>{vehicle.current_km?.toLocaleString() || '0'}</td>
                        <td>{getStatusBadge(vehicle.status)}</td>
                        <td style={{ fontWeight: '600', color: '#1a4d2e' }}>
                          €{parseFloat(vehicle.daily_rate || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehiclesList;

