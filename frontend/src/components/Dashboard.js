import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { rentalsAPI, vehiclesAPI, customersAPI } from '../services/api';
import { Car, Users, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeRentals: 0,
    availableVehicles: 0,
    totalCustomers: 0,
    todayReturns: 0,
  });
  const [recentRentals, setRecentRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Carica statistiche
      const [rentalsRes, vehiclesRes, customersRes] = await Promise.all([
        rentalsAPI.getAll({ status: 'active', limit: 5 }),
        vehiclesAPI.getAll({ available_only: 'true' }),
        customersAPI.getAll({ limit: 1 }),
      ]);

      setStats({
        activeRentals: rentalsRes.data.data.rentals.length,
        availableVehicles: vehiclesRes.data.data.length,
        totalCustomers: customersRes.data.data.length,
        todayReturns: rentalsRes.data.data.rentals.filter(r => {
          const today = new Date().toISOString().split('T')[0];
          const returnDate = new Date(r.expected_return_date).toISOString().split('T')[0];
          return returnDate === today;
        }).length,
      });

      setRecentRentals(rentalsRes.data.data.rentals);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Noleggi Attivi',
      value: stats.activeRentals,
      icon: FileText,
      color: '#1a4d2e',
      bgColor: '#e8f5e9',
    },
    {
      title: 'Veicoli Disponibili',
      value: stats.availableVehicles,
      icon: Car,
      color: '#17a2b8',
      bgColor: '#e0f7fa',
    },
    {
      title: 'Clienti Totali',
      value: stats.totalCustomers,
      icon: Users,
      color: '#f4a261',
      bgColor: '#fff3e0',
    },
    {
      title: 'Rientri Oggi',
      value: stats.todayReturns,
      icon: Clock,
      color: '#e76f51',
      bgColor: '#fce4ec',
    },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
          <h1>Dashboard</h1>
        </div>
        <div className="content-area">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h1>Dashboard</h1>
        <Link to="/rentals/new" className="btn btn-primary">
          <FileText size={18} />
          Nuovo Noleggio
        </Link>
      </div>

      <div className="content-area">
        {/* Statistics Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}>
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="card"
                style={{
                  background: stat.bgColor,
                  border: 'none',
                }}
              >
                <div className="card-body" style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      background: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px',
                    }}
                  >
                    <Icon size={28} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color }}>
                      {stat.value}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6c757d', fontWeight: '500' }}>
                      {stat.title}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Rentals */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Noleggi Recenti</h2>
            <Link to="/rentals" className="btn btn-sm btn-outline-primary">
              Vedi Tutti
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentRentals.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                <FileText size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>Nessun noleggio attivo</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>N° Noleggio</th>
                      <th>Cliente</th>
                      <th>Veicolo</th>
                      <th>Data Ritiro</th>
                      <th>Rientro Previsto</th>
                      <th>Stato</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRentals.map((rental) => (
                      <tr key={rental.id}>
                        <td style={{ fontWeight: '600' }}>{rental.rental_number}</td>
                        <td>{rental.customer_name}</td>
                        <td>
                          {rental.brand} {rental.model}
                          <br />
                          <small style={{ color: '#6c757d' }}>{rental.license_plate}</small>
                        </td>
                        <td>{formatDate(rental.pickup_date)}</td>
                        <td>{formatDate(rental.expected_return_date)}</td>
                        <td>{getStatusBadge(rental.status)}</td>
                        <td>
                          <Link
                            to={`/rentals/${rental.id}`}
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
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginTop: '24px',
        }}>
          <Link to="/rentals/new" className="card" style={{ textDecoration: 'none' }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
              <FileText size={32} color="#1a4d2e" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Nuovo Noleggio
              </h3>
              <p style={{ fontSize: '14px', color: '#6c757d' }}>
                Crea un nuovo contratto di noleggio
              </p>
            </div>
          </Link>

          <Link to="/customers/new" className="card" style={{ textDecoration: 'none' }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
              <Users size={32} color="#17a2b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Nuovo Cliente
              </h3>
              <p style={{ fontSize: '14px', color: '#6c757d' }}>
                Registra un nuovo cliente
              </p>
            </div>
          </Link>

          <Link to="/vehicles/new" className="card" style={{ textDecoration: 'none' }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
              <Car size={32} color="#f4a261" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                Nuovo Veicolo
              </h3>
              <p style={{ fontSize: '14px', color: '#6c757d' }}>
                Aggiungi un veicolo alla flotta
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

