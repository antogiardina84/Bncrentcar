import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rentalsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FileText, Plus, Search, Download, Eye } from 'lucide-react';

const RentalsList = () => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    customer_name: '',
    license_plate: '',
  });

  useEffect(() => {
    loadRentals();
  }, []);

  const loadRentals = async () => {
    try {
      setLoading(true);
      const response = await rentalsAPI.getAll(filters);
      setRentals(response.data.data.rentals);
    } catch (error) {
      console.error('Errore caricamento noleggi:', error);
      toast.error('Errore nel caricamento dei noleggi');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadRentals();
  };

  const handleDownloadContract = async (rentalId, rentalNumber) => {
    try {
      const response = await rentalsAPI.downloadContract(rentalId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contratto_${rentalNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Contratto scaricato con successo');
    } catch (error) {
      console.error('Errore download contratto:', error);
      toast.error('Errore nel download del contratto');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
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

  return (
    <div>
      <div className="top-bar">
        <h1>Gestione Noleggi</h1>
        <Link to="/rentals/new" className="btn btn-primary">
          <Plus size={18} />
          Nuovo Noleggio
        </Link>
      </div>

      <div className="content-area">
        {/* Filtri */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Filtri di Ricerca</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSearch}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Stato</label>
                  <select
                    name="status"
                    className="form-control"
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value="">Tutti</option>
                    <option value="active">Attivi</option>
                    <option value="closed">Chiusi</option>
                    <option value="cancelled">Annullati</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cliente</label>
                  <input
                    type="text"
                    name="customer_name"
                    className="form-control"
                    value={filters.customer_name}
                    onChange={handleFilterChange}
                    placeholder="Nome cliente"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Targa Veicolo</label>
                  <input
                    type="text"
                    name="license_plate"
                    className="form-control"
                    value={filters.license_plate}
                    onChange={handleFilterChange}
                    placeholder="Es: AB123CD"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                <Search size={18} />
                Cerca
              </button>
            </form>
          </div>
        </div>

        {/* Lista Noleggi */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              Noleggi ({rentals.length})
            </h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="spinner"></div>
            ) : rentals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Nessun noleggio trovato</p>
                <Link to="/rentals/new" className="btn btn-primary mt-2">
                  <Plus size={18} />
                  Crea il primo noleggio
                </Link>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>N° Noleggio</th>
                      <th>Codice Prenotazione</th>
                      <th>Cliente</th>
                      <th>Veicolo</th>
                      <th>Data Ritiro</th>
                      <th>Rientro Previsto</th>
                      <th>Importo</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rentals.map((rental) => (
                      <tr key={rental.id}>
                        <td style={{ fontWeight: '600' }}>{rental.rental_number}</td>
                        <td>
                          <code style={{ fontSize: '12px' }}>{rental.booking_code}</code>
                        </td>
                        <td>
                          {rental.customer_name}
                          <br />
                          <small style={{ color: '#6c757d' }}>{rental.customer_phone}</small>
                        </td>
                        <td>
                          <strong>{rental.brand} {rental.model}</strong>
                          <br />
                          <small style={{ color: '#6c757d' }}>{rental.license_plate}</small>
                        </td>
                        <td>{formatDate(rental.pickup_date)}</td>
                        <td>
                          {formatDate(rental.expected_return_date)}
                          {rental.actual_return_date && (
                            <>
                              <br />
                              <small style={{ color: '#28a745' }}>
                                Rientrato: {formatDate(rental.actual_return_date)}
                              </small>
                            </>
                          )}
                        </td>
                        <td style={{ fontWeight: '600' }}>
                          {formatCurrency(rental.total_amount)}
                          {parseFloat(rental.amount_due) > 0 && (
                            <>
                              <br />
                              <small style={{ color: '#dc3545' }}>
                                Da versare: {formatCurrency(rental.amount_due)}
                              </small>
                            </>
                          )}
                        </td>
                        <td>{getStatusBadge(rental.status)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Link
                              to={`/rentals/${rental.id}`}
                              className="btn btn-sm btn-outline-primary"
                              title="Visualizza dettagli"
                            >
                              <Eye size={16} />
                            </Link>
                            <button
                              onClick={() => handleDownloadContract(rental.id, rental.rental_number)}
                              className="btn btn-sm btn-outline-secondary"
                              title="Scarica contratto"
                            >
                              <Download size={16} />
                            </button>
                          </div>
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

export default RentalsList;

