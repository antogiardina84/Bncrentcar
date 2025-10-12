import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { UserPlus, ArrowLeft, Save } from 'lucide-react';

const NewCustomer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Campi allineati con la tabella 'customers' del DB
  const [formData, setFormData] = useState({
    // Dati Base e Anagrafici (NON NULL nel DB)
    customer_type: 'individuale', // Default
    full_name: '',
    fiscal_code: '',
    email: '',
    phone: '',
    birth_date: '', // NUOVO: NOT NULL
    birth_place: '', // NUOVO: NOT NULL

    // Indirizzo (NON NULL nel DB)
    address: '',
    city: '',
    province: '', // NUOVO: NOT NULL
    zip_code: '',
    country: 'Italia', // NUOVO (opzionale, default Italia)

    // Dati Aziendali (Opzionali)
    company_name: '',
    vat_number: '',

    // Documenti (NOT NULL nel DB - Patente, Opzionale - CI)
    driving_license_number: '', // Mappa a license_number (NOT NULL)
    license_issued_by: '', // NUOVO: NOT NULL
    license_issue_date: '', // NUOVO: NOT NULL (Tipo Date)
    license_expiry_date: '', // NUOVO: NOT NULL (Tipo Date)
    id_card_number: '', // Mappa a id_card_number (Opzionale, aggiunto con ALTER TABLE)

    // Note
    notes: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validazione di base lato client: Controlla solo i campi essenziali
    if (!formData.full_name || !formData.fiscal_code || !formData.email || !formData.phone) {
      toast.error('Per favore, compila tutti i campi obbligatori.');
      return;
    }

    setLoading(true);
    try {
      const response = await customersAPI.create(formData);
      toast.success('Cliente registrato con successo!');
      navigate(`/customers/${response.data.data.id}`);
    } catch (error) {
      console.error("Errore creazione cliente:", error);
      const errorMessage = error.response?.data?.message || 'Si è verificato un errore durante la registrazione.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0 text-gray-800">
          <UserPlus size={24} className="me-2" /> Nuovo Cliente
        </h1>
        <button onClick={() => navigate('/customers')} className="btn btn-secondary">
          <ArrowLeft size={18} />
          <span className="ms-2 d-none d-sm-inline">Lista Clienti</span>
        </button>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow mb-4">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row">

                  {/* ==================================== */}
                  {/* SEZIONE 1: DATI ANAGRAFICI */}
                  {/* ==================================== */}
                  <h3 className="section-title">Dati Anagrafici e Contatto</h3>
                  
                  {/* Tipo Cliente */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Tipo Cliente</label>
                    <select 
                      name="customer_type" 
                      className="form-control" 
                      value={formData.customer_type} 
                      onChange={handleChange}
                    >
                      <option value="individuale">Individuale</option>
                      <option value="azienda">Azienda</option>
                    </select>
                  </div>

                  {/* Nome Completo */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Nome Completo <span className="text-danger">*</span></label>
                    <input type="text" name="full_name" className="form-control" value={formData.full_name} onChange={handleChange} required />
                  </div>
                  
                  {/* Email */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Email <span className="text-danger">*</span></label>
                    <input type="email" name="email" className="form-control" value={formData.email} onChange={handleChange} required />
                  </div>

                  {/* Telefono */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Telefono <span className="text-danger">*</span></label>
                    <input type="tel" name="phone" className="form-control" value={formData.phone} onChange={handleChange} required />
                  </div>

                  {/* Codice Fiscale */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Codice Fiscale <span className="text-danger">*</span></label>
                    <input type="text" name="fiscal_code" className="form-control" value={formData.fiscal_code} onChange={handleChange} required />
                  </div>
                  
                  {/* Data e Luogo di Nascita */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">Data di Nascita</label>
                    <input type="date" name="birth_date" className="form-control" value={formData.birth_date} onChange={handleChange} />
                  </div>
                  <div className="col-md-3 form-group">
                    <label className="form-label">Luogo di Nascita</label>
                    <input type="text" name="birth_place" className="form-control" value={formData.birth_place} onChange={handleChange} />
                  </div>


                  {/* Dati Aziendali (mostra solo se Tipo Cliente è 'azienda') */}
                  {formData.customer_type === 'azienda' && (
                    <div className="row mt-3">
                      <h3 className="section-title">Dati Aziendali</h3>
                      <div className="col-md-6 form-group">
                        <label className="form-label">Nome Azienda</label>
                        <input type="text" name="company_name" className="form-control" value={formData.company_name} onChange={handleChange} />
                      </div>
                      <div className="col-md-6 form-group">
                        <label className="form-label">Partita IVA</label>
                        <input type="text" name="vat_number" className="form-control" value={formData.vat_number} onChange={handleChange} />
                      </div>
                    </div>
                  )}

                  {/* ==================================== */}
                  {/* SEZIONE 2: RESIDENZA */}
                  {/* ==================================== */}
                  <h3 className="section-title">Residenza</h3>
                  
                  {/* Indirizzo */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Indirizzo</label>
                    <input type="text" name="address" className="form-control" value={formData.address} onChange={handleChange} />
                  </div>
                  
                  {/* Città */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">Città</label>
                    <input type="text" name="city" className="form-control" value={formData.city} onChange={handleChange} />
                  </div>

                  {/* Provincia */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">Provincia</label>
                    <input type="text" name="province" className="form-control" value={formData.province} onChange={handleChange} />
                  </div>

                  {/* CAP */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">CAP</label>
                    <input type="text" name="zip_code" className="form-control" value={formData.zip_code} onChange={handleChange} />
                  </div>

                  {/* Paese */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">Paese</label>
                    <input type="text" name="country" className="form-control" value={formData.country} onChange={handleChange} />
                  </div>
                  

                  {/* ==================================== */}
                  {/* SEZIONE 3: DOCUMENTI */}
                  {/* ==================================== */}
                  <h3 className="section-title">Documenti</h3>
                  
                  {/* Patente di Guida N. */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Patente di Guida N.</label>
                    <input type="text" name="driving_license_number" className="form-control" value={formData.driving_license_number} onChange={handleChange} />
                  </div>
                  
                  {/* Rilasciata da */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Patente Rilasciata da (Ufficio/Stato)</label>
                    <input type="text" name="license_issued_by" className="form-control" value={formData.license_issued_by} onChange={handleChange} />
                  </div>
                  
                  {/* Data Emissione Patente */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Data Emissione Patente</label>
                    <input type="date" name="license_issue_date" className="form-control" value={formData.license_issue_date} onChange={handleChange} />
                  </div>
                  
                  {/* Data Scadenza Patente */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Data Scadenza Patente</label>
                    <input type="date" name="license_expiry_date" className="form-control" value={formData.license_expiry_date} onChange={handleChange} />
                  </div>

                  {/* Carta d'Identità N. */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Carta d'Identità N.</label>
                    <input type="text" name="id_card_number" className="form-control" value={formData.id_card_number} onChange={handleChange} />
                  </div>


                  {/* ==================================== */}
                  {/* SEZIONE 4: NOTE E SUBMIT */}
                  {/* ==================================== */}
                  <div className="col-12 form-group">
                    <label className="form-label">Note</label>
                    <textarea name="notes" className="form-control" value={formData.notes} onChange={handleChange} rows="3" />
                  </div>

                  <div className="col-12 mt-4">
                    <button type="submit" className="btn btn-success btn-lg" disabled={loading}>
                      {loading ? 'Salvataggio...' : (<><Save size={18} /> Salva Cliente</>)}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewCustomer;