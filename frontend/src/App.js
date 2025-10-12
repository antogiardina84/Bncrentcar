import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RentalsList from './components/RentalsList';
import NewRental from './components/NewRental';
import RentalDetail from './components/RentalDetail';
import CustomersList from './components/CustomersList';
import VehiclesList from './components/VehiclesList';
import NewCustomer from './components/NewCustomer';
import NewVehicle from './components/NewVehicle';
import UsersList from './components/UsersList';
import NewUser from './components/NewUser';
import CustomerDetail from './components/CustomerDetail';
import VehicleDetail from './components/VehicleDetail';
import './App.css';

// Componente Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a4d2e 0%, #143d24 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ borderTopColor: 'white' }}></div>
          <p style={{ color: 'white', marginTop: '16px' }}>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Blocco l'accesso se adminOnly è true e l'utente non è un admin
  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />; // Reindirizza a dashboard
  }

  return children;
};

// Componente contenitore delle rotte
function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Rotta Principale */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Rotte Noleggi */}
        <Route
          path="/rentals"
          element={
            <ProtectedRoute>
              <Layout>
                <RentalsList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rentals/new"
          element={
            <ProtectedRoute>
              <Layout>
                <NewRental />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rentals/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <RentalDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Rotte Clienti */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomersList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute>
              <Layout>
                <NewCustomer />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <CustomerDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Rotte Veicoli */}
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <Layout>
                <VehiclesList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/new"
          element={
            <ProtectedRoute>
              <Layout>
                <NewVehicle />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <VehicleDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Rotte Utenti (Admin-Only) */}
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <Layout>
                <UsersList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute adminOnly>
              <Layout>
                <NewUser />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster position="top-right" reverseOrder={false} />
    </AuthProvider>
  );
}

export default App;