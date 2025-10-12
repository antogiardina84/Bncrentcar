import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api'; // Dovrai implementare usersAPI
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus, Save } from 'lucide-react';

const NewUser = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'operator', // Default: Operatore
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email || !formData.full_name || !formData.password) {
      toast.error('Per favore, compila tutti i campi obbligatori.');
      return;
    }

    setLoading(true);
    try {
      // Assumiamo che usersAPI esista e chiami POST /api/users (Admin Only)
      await usersAPI.create(formData);
      toast.success('Utente creato con successo!');
      navigate('/users');
    } catch (error) {
      console.error('Errore creazione utente:', error);
      toast.error(error.response?.data?.message || 'Errore durante la creazione dell\'utente.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
        <div className="content-area">
            <p className="alert alert-danger">Accesso negato. Solo gli amministratori possono creare nuovi utenti.</p>
        </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h1>
          <UserPlus size={24} style={{ marginRight: '8px' }} />
          Nuovo Utente
        </h1>
      </div>

      <div className="content-area">
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row">
                {/* Dati Base */}
                <div className="col-md-6 form-group">
                  <label className="form-label">Nome Completo *</label>
                  <input type="text" name="full_name" className="form-control" value={formData.full_name} onChange={handleChange} required />
                </div>
                <div className="col-md-6 form-group">
                  <label className="form-label">Ruolo *</label>
                  <select name="role" className="form-control" value={formData.role} onChange={handleChange} required>
                    <option value="operator">Operatore</option>
                    <option value="admin">Amministratore</option>
                  </select>
                </div>

                {/* Account */}
                <h3 className="section-title">Credenziali di Accesso</h3>
                <div className="col-md-4 form-group">
                  <label className="form-label">Username *</label>
                  <input type="text" name="username" className="form-control" value={formData.username} onChange={handleChange} required />
                </div>
                <div className="col-md-4 form-group">
                  <label className="form-label">Email *</label>
                  <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="col-md-4 form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" name="password" className="form-control" value={formData.password} onChange={handleChange} required />
                </div>

                <div className="col-12 mt-4">
                  <button type="submit" className="btn btn-success btn-lg" disabled={loading}>
                    {loading ? 'Creazione...' : (<><Save size={18} /> Crea Utente</>)}
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

export default NewUser;