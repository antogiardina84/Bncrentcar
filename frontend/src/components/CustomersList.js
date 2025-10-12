import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Users, Plus, Search } from 'lucide-react';

const CustomersList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersAPI.getAll({ search: searchTerm });
      
      // Correzione 1: Assicura che i dati impostati siano un array
      // L'API ritorna { success: true, data: [clienti...] }, quindi usiamo response.data.data
      const customerData = response.data.data;
      setCustomers(Array.isArray(customerData) ? customerData : []);

    } catch (error) {
      console.error('Errore caricamento clienti:', error);
      toast.error('Errore nel caricamento dei clienti');
      setCustomers([]); // Assicurati che lo stato sia un array anche in caso di errore
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadCustomers();
  };

  return (
    <div>
      <div className="top-bar">
        <h1>Gestione Clienti</h1>
        <Link to="/customers/new" className="btn btn-primary">
          <Plus size={18} />
          Nuovo Cliente
        </Link>
      </div>

      <div className="content-area">
        <div className="card">
          <div className="card-header">
            <Users size={20} />
            Lista Clienti
          </div>
          <div className="card-body">
            <form onSubmit={handleSearch} className="search-form">
              <div className="form-group" style={{ flexGrow: 1 }}>
                <div className="input-group">
                  <span className="input-group-text">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Cerca per nome, codice fiscale, telefono o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Cerca
              </button>
            </form>

            {loading ? (
              <p>Caricamento...</p>
            ) : (
              // Correzione 2: Aggiungi un fallback array vuoto per evitare l'errore "not a function"
              (customers && customers.length > 0) ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Codice Fiscale</th>
                        <th>Telefono</th>
                        <th>Email</th>
                        <th>Città</th>
                        <th>Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Correzione diretta per prevenire il crash se customers non è un array */}
                      {(customers || []).map((customer) => (
                        <tr key={customer.id}>
                          <td style={{ fontWeight: '600' }}>{customer.full_name}</td>
                          <td><code>{customer.fiscal_code}</code></td>
                          <td>{customer.phone}</td>
                          <td>{customer.email}</td>
                          <td>{customer.city}</td>
                          <td>
                            <Link
                              to={`/customers/${customer.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              Dettagli
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted text-center" style={{ marginTop: '20px' }}>
                  Nessun cliente trovato.
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersList;