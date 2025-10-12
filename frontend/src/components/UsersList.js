import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI } from '../services/api'; // Dovrai implementare usersAPI
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Users, Plus, Trash2, Shield } from 'lucide-react';

const UsersList = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
        loadUsers();
    }
  }, [user]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Assumiamo che usersAPI esista e chiami GET /api/users (Admin Only)
      const response = await usersAPI.getAll(); 
      setUsers(response.data.data);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      toast.error('Errore nel caricamento degli utenti. Verifica i permessi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'utente ${userName}?`)) {
        return;
    }
    try {
        await usersAPI.remove(userId); // Assumiamo DELETE /api/users/:id
        toast.success(`Utente ${userName} eliminato con successo.`);
        loadUsers();
    } catch (error) {
        console.error('Errore eliminazione utente:', error);
        toast.error(error.response?.data?.message || 'Errore durante l\'eliminazione.');
    }
  };

  if (loading) {
    return <p>Caricamento utenti...</p>;
  }

  if (user?.role !== 'admin') {
    return (
        <div className="content-area">
            <p className="alert alert-danger">Accesso negato. Solo gli amministratori possono visualizzare questa sezione.</p>
        </div>
    );
  }

  return (
    <div>
      <div className="top-bar">
        <h1>Gestione Utenti</h1>
        <Link to="/users/new" className="btn btn-primary">
          <Plus size={18} />
          Nuovo Utente
        </Link>
      </div>

      <div className="content-area">
        <div className="card">
          <div className="card-header">
            <Users size={18} style={{ marginRight: '8px' }} />
            Lista Utenti ({users.length})
          </div>
          <div className="card-body">
            {users.length === 0 ? (
              <p>Nessun utente trovato.</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome Completo</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Ruolo</th>
                      <th>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: '600' }}>{u.full_name}</td>
                        <td>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                            {u.role === 'admin' 
                                ? <span className="badge badge-danger">Amministratore</span> 
                                : <span className="badge badge-info">Operatore</span>
                            }
                        </td>
                        <td>
                          {u.id !== user.id && ( // Non permettere di auto-eliminarsi
                            <button
                                onClick={() => handleDelete(u.id, u.full_name)}
                                className="btn btn-sm btn-outline-danger"
                                title="Elimina Utente"
                            >
                                <Trash2 size={16} />
                            </button>
                          )}
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

export default UsersList;