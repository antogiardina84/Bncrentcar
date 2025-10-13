import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { UserPlus, ArrowLeft, Save } from 'lucide-react';

const NewCustomer = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Campi allineati con la tabella 'customers' del DB (schema.sql)
  const [formData, setFormData] = useState({
    // Dati Base e Anagrafici (NOT NULL nel DB)
    customer_type: 'individuale', // Default
    full_name: '',
    fiscal_code: '',
    email: '',
    phone: '',
    birth_date: '', 
    birth_place: '', 

    // Indirizzo (NOT NULL nel DB)
    address: '',
    city: '',
    province: '', 
    zip_code: '',
    country: 'IT', // Allineato al default del DB 'IT'

    // Dati Aziendali (Opzionali)
    company_name: '',
    vat_number: '',

    // Patente (TUTTI i campi sono NOT NULL nel DB - schema.sql)
    license_number: '', // CORRETTO: Mappa a license_number
    license_issued_by: '', 
    license_issue_date: '', 
    license_expiry_date: '', 

    // Documento Identità (Opzionale, aggiunto con ALTER TABLE/Migration)
    id_card_number: '', 
    id_card_issue_date: '', // Aggiunto per allineamento completo
    id_card_expiry_date: '', // Aggiunto per allineamento completo
    id_card_issued_by: '', // Aggiunto per allineamento completo

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
    
    // Validazione completa lato client: Deve includere TUTTI i campi NON NULL del DB/Validazione server (customers.js)
    if (
      !formData.full_name || 
      !formData.fiscal_code || 
      !formData.email || 
      !formData.phone ||
      !formData.address || 
      !formData.city || 
      !formData.province || 
      !formData.zip_code || 
      !formData.license_number ||          // license_number è NOT NULL
      !formData.license_issued_by ||       // license_issued_by è NOT NULL
      !formData.license_issue_date ||      // license_issue_date è NOT NULL
      !formData.license_expiry_date        // license_expiry_date è NOT NULL
    ) {
      toast.error('Per favore, compila tutti i campi obbligatori: Dati Anagrafici, Residenza e Dati Completi della Patente.');
      return;
    }

    setLoading(true);
    try {
      // Non è necessario il destructuring o il rename perché lo stato è stato aggiornato
      // per usare direttamente 'license_number'
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
                    <label className="form-label">Indirizzo <span className="text-danger">*</span></label>
                    <input type="text" name="address" className="form-control" value={formData.address} onChange={handleChange} required />
                  </div>
                  
                  {/* Città */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">Città <span className="text-danger">*</span></label>
                    <input type="text" name="city" className="form-control" value={formData.city} onChange={handleChange} required />
                  </div>

                  {/* Provincia */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">Provincia <span className="text-danger">*</span></label>
                    <input type="text" name="province" className="form-control" value={formData.province} onChange={handleChange} required />
                  </div>

                  {/* CAP */}
                  <div className="col-md-3 form-group">
                    <label className="form-label">CAP <span className="text-danger">*</span></label>
                    <input type="text" name="zip_code" className="form-control" value={formData.zip_code} onChange={handleChange} required />
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
                    <label className="form-label">Patente di Guida N. <span className="text-danger">*</span></label>
                    <input 
                      type="text" 
                      name="license_number" // CORRETTO: allineato allo stato e al DB
                      className="form-control" 
                      value={formData.license_number} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  
                  {/* Rilasciata da */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Patente Rilasciata da (Ufficio/Stato) <span className="text-danger">*</span></label>
                    <input type="text" name="license_issued_by" className="form-control" value={formData.license_issued_by} onChange={handleChange} required />
                  </div>
                  
                  {/* Data Emissione Patente */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Data Emissione Patente <span className="text-danger">*</span></label>
                    <input type="date" name="license_issue_date" className="form-control" value={formData.license_issue_date} onChange={handleChange} required />
                  </div>
                  
                  {/* Data Scadenza Patente */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Data Scadenza Patente <span className="text-danger">*</span></label>
                    <input type="date" name="license_expiry_date" className="form-control" value={formData.license_expiry_date} onChange={handleChange} required />
                  </div>
                  
                  <div className='col-12'><hr /></div>

                  {/* Carta d'Identità N. */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Carta d'Identità N.</label>
                    <input type="text" name="id_card_number" className="form-control" value={formData.id_card_number} onChange={handleChange} />
                  </div>
                  
                  {/* Carta d'Identità Rilasciata da */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Carta d'Identità Rilasciata da</label>
                    <input type="text" name="id_card_issued_by" className="form-control" value={formData.id_card_issued_by} onChange={handleChange} />
                  </div>
                  
                  {/* Carta d'Identità Data Emissione */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Data Emissione Carta d'Identità</label>
                    <input type="date" name="id_card_issue_date" className="form-control" value={formData.id_card_issue_date} onChange={handleChange} />
                  </div>
                  
                  {/* Carta d'Identità Data Scadenza */}
                  <div className="col-md-6 form-group">
                    <label className="form-label">Data Scadenza Carta d'Identità</label>
                    <input type="date" name="id_card_expiry_date" className="form-control" value={formData.id_card_expiry_date} onChange={handleChange} />
                  </div>


                  {/* ==================================== */}
                  {/* SEZIONE 4: NOTE E SUBMIT */}
                  {/* ==================================== */}
                  <div className="col-12 form-group mt-3">
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