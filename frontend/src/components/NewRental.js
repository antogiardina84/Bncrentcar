import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { rentalsAPI, customersAPI, vehiclesAPI } from '../services/api';
import toast from 'react-hot-toast';
import PhotoUpload from './PhotoUpload';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  User,
  Car,
  Calendar,
  DollarSign,
  CreditCard,
  Shield,
  Camera,
  CheckCircle,
  UserPlus,
  FileText // ✅ CORREZIONE: Importa FileText
} from 'lucide-react';

// --- INIZIO: Implementazione Mock SignaturePad ---
// NOTA: Per un funzionamento reale su mobile, DEVI installare e utilizzare una libreria 
// come 'react-signature-canvas' e decommentare la riga di importazione.
const SignaturePad = ({ ref, penColor, canvasProps, onEnd }) => {
    // Implementazione minima per non interrompere il codice.
    React.useImperativeHandle(ref, () => ({
        clear: () => console.log('Signature cleared (simulation)'),
        isEmpty: () => false, 
        getTrimmedCanvas: () => ({ toDataURL: () => 'data:image/png;base64,SIMULATED_SIGNATURE' }),
    }));
    
    // Usa un elemento canvas standard come placeholder
    return (
        <canvas {...canvasProps} style={{...canvasProps.style, backgroundColor: '#f5f5f5'}} 
            onMouseUp={onEnd} onTouchEnd={onEnd} 
        >
            Disegna qui (Solo Placeholder: installa `react-signature-canvas`)
        </canvas>
    );
};
// --- FINE: Implementazione Mock SignaturePad ---

const NewRental = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // Riferimento al canvas per la firma
  const sigCanvas = useRef({}); 
  
  // ✅ STATO COMPLETO CON VALORI DI DEFAULT E FIRMA
  const [formData, setFormData] = useState({
    // Step 1: Cliente
    customer_id: '',
    
    // Step 2: Veicolo
    vehicle_id: '',
    
    // Step 3: Date e Dettagli Noleggio
    pickup_date: new Date().toISOString().slice(0, 16), // Data/ora attuali
    expected_return_date: '', // Da calcolare o inserire
    pickup_location: 'BNC Energy Rent Car',
    pickup_fuel_level: '100', // 100%
    pickup_km: '',
    pickup_damages: 'Nessun danno',
    pickup_notes: '',

    // Step 4: Conducente Aggiuntivo
    additional_driver_name: '',
    additional_driver_birth_place: '',
    additional_driver_birth_date: '',
    additional_driver_license: '',
    additional_driver_license_issued_by: '',
    additional_driver_license_issue_date: '',
    additional_driver_license_expiry: '',

    // Step 5: Tariffe e Costi
    daily_rate: '',
    deposit_amount: '0', // Cauzione
    total_days: 1,
    km_included: 'Illimitati',
    
    // ✅ VALORI DI DEFAULT RICHIESTI
    delivery_cost: '0', 
    fuel_charge: '2.50', // Carburante a litro
    after_hours_charge: '20.00', // Addebito fuori orario
    km_extra_cost: '0.56', // Costo unitario KM extra
    extras_charge: '0', // Costo extra (seggiolini, navigatore, ecc.)

    // Step 6: Finanziario
    extra_km_charge: '0', // Totale extra km
    franchise_charge: '0', // Coperture aggiuntive
    discount: '0',
    subtotal: 0,
    total_amount: 0,

    // Step 7: Coperture Assicurative
    franchise_theft: '0',
    franchise_damage: '0',
    franchise_rca: '0',
    
    // Step 8: Pagamento
    payment_method: 'Contanti', 
    deposit_method: 'Contanti',
    cc_holder_name: '',
    cc_type: 'VISA',
    cc_number_masked: '',
    cc_expiry: '',
    
    // Step 9: Riepilogo Dati (Nessun campo in questo step)
    
    // Step 10: Consensi e Firma
    contract_signed: false,
    privacy_consent: false,
    marketing_consent: false,
    customer_signature: '', // ✅ NUOVO CAMPO
    
    // Step 11: Foto
    rental_id: null,
  });

  // Funzioni di calcolo (omesse per brevità, ma essenziali in un'app reale)
  // ...

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Carica clienti e veicoli
      const [customersRes, vehiclesRes] = await Promise.all([
        customersAPI.getAll(),
        // 🚨 MODIFICA PER DIAGNOSI: Rimosso { available_only: true }
        // Se ora i veicoli compaiono, il problema è che NESSUN veicolo ha status='available' nel DB.
        vehiclesAPI.getAll({}) 
      ]);
      
      setCustomers(customersRes.data.data);

      // ✅ CONTROLLO ROBUSTO E LOG DI DIAGNOSI
      const fetchedVehicles = vehiclesRes.data?.data?.vehicles;
      
      if (Array.isArray(fetchedVehicles)) {
        setVehicles(fetchedVehicles);
        console.log(`✅ Caricati ${fetchedVehicles.length} veicoli. Status risposta: 200 OK.`);
      } else {
        // Se non è un array, logga l'intera risposta per debugging
        console.error("❌ Errore nel formato dati veicoli. Risposta API:", vehiclesRes);
        setVehicles([]); // Assicura che sia un array vuoto per evitare il 'map' error
        toast.error('Errore nel formato dati veicoli ricevuti dal server.');
      }
      
      // Imposta la data di riconsegna prevista 24h dopo il ritiro
      const initialPickup = new Date();
      const initialReturn = new Date(initialPickup.getTime() + 24 * 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        pickup_date: initialPickup.toISOString().slice(0, 16),
        expected_return_date: initialReturn.toISOString().slice(0, 16)
      }));
      
    } catch (error) {
      console.error('Errore nel caricamento dati iniziali (API call failed):', error.response || error);
      toast.error('Errore nel caricamento dati iniziali. Controlla la console del browser per i dettagli.');
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ✅ NUOVE FUNZIONI PER GESTIRE LA FIRMA
  const handleSignatureClear = () => {
    sigCanvas.current.clear();
    setFormData(prev => ({ ...prev, customer_signature: '' }));
  };

  const handleSignatureEnd = () => {
    // Simula l'acquisizione della firma Base64
    if (sigCanvas.current.isEmpty()) {
      setFormData(prev => ({ ...prev, customer_signature: '' }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        customer_signature: sigCanvas.current.getTrimmedCanvas().toDataURL('image/png') 
      }));
    }
  };


  // ✅ LOGICA DI VALIDAZIONE AGGIORNATA PER FIRMA OBBLIGATORIA
  const validateStep = (step) => {
    switch (step) {
      case 1: // Cliente
        if (!formData.customer_id) {
          toast.error('Seleziona un cliente.');
          return false;
        }
        break;
      case 2: // Veicolo
        if (!formData.vehicle_id) {
          toast.error('Seleziona un veicolo.');
          return false;
        }
        break;
      case 3: // Date
        if (!formData.pickup_date || !formData.expected_return_date) {
          toast.error('Date di ritiro e riconsegna sono obbligatorie.');
          return false;
        }
        // Aggiungere logica per controllare se data riconsegna è >= data ritiro
        break;
      case 10: // Consensi e Firma
        if (!formData.contract_signed || !formData.privacy_consent) {
          toast.error('Devi accettare il contratto e l\'informativa sulla privacy.');
          return false;
        }
        if (!formData.customer_signature) { // NUOVA VALIDAZIONE
          toast.error('La firma del cliente è obbligatoria.');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(10)) return;

    try {
      setLoading(true);
      
      const rentalData = {
        ...formData,
        // Conversione esplicita dei campi numerici al server
        daily_rate: parseFloat(formData.daily_rate) || 0,
        deposit_amount: parseFloat(formData.deposit_amount) || 0,
        total_days: parseInt(formData.total_days) || 1,
        delivery_cost: parseFloat(formData.delivery_cost) || 0,
        fuel_charge: parseFloat(formData.fuel_charge) || 0,
        after_hours_charge: parseFloat(formData.after_hours_charge) || 0,
        km_extra_cost: parseFloat(formData.km_extra_cost) || 0, // Nuovo campo inviato
        extras_charge: parseFloat(formData.extras_charge) || 0,
        extra_km_charge: parseFloat(formData.extra_km_charge) || 0,
        franchise_charge: parseFloat(formData.franchise_charge) || 0,
        discount: parseFloat(formData.discount) || 0,
        subtotal: formData.subtotal,
        total_amount: formData.total_amount,
        franchise_theft: parseFloat(formData.franchise_theft) || 0,
        franchise_damage: parseFloat(formData.franchise_damage) || 0,
        franchise_rca: parseFloat(formData.franchise_rca) || 0,
        
        // Firma Base64
        customer_signature: formData.customer_signature, 
      };

      const response = await rentalsAPI.create(rentalData);
      const newRentalId = response.data.data.id;
      
      setFormData(prev => ({ ...prev, rental_id: newRentalId }));
      setCurrentStep(11); // Passa allo step Foto
      toast.success('Noleggio creato con successo! Continua con le foto.');
      
    } catch (error) {
      console.error('Errore creazione noleggio:', error);
      toast.error(error.response?.data?.message || 'Errore durante la creazione del noleggio.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    if (formData.rental_id) {
      navigate(`/rentals/${formData.rental_id}`);
    } else {
      navigate('/rentals');
    }
  };

  const steps = [
    { num: 1, name: 'Cliente', icon: <User size={20} /> },
    { num: 2, name: 'Veicolo', icon: <Car size={20} /> },
    { num: 3, name: 'Date/Ritiro', icon: <Calendar size={20} /> },
    { num: 4, name: 'Conducente Add.', icon: <UserPlus size={20} /> },
    { num: 5, name: 'Tariffe/Costi', icon: <DollarSign size={20} /> },
    { num: 6, name: 'Riepilogo Costi', icon: <DollarSign size={20} /> },
    { num: 7, name: 'Coperture', icon: <Shield size={20} /> },
    { num: 8, name: 'Pagamento', icon: <CreditCard size={20} /> },
    { num: 9, name: 'Riepilogo', icon: <FileText size={20} /> }, // L'errore era qui
    { num: 10, name: 'Firma/Consensi', icon: <CheckCircle size={20} /> },
    { num: 11, name: 'Foto Iniziali', icon: <Camera size={20} /> },
  ];

  const renderStep1 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Selezione Cliente</h3>
      <select
        name="customer_id"
        value={formData.customer_id}
        onChange={handleChange}
        className="form-control"
        required
      >
        <option value="">Seleziona un Cliente</option>
        {/* ✅ CORREZIONE: Usa customers?.map per prevenire errori se 'customers' è undefined */}
        {customers?.map(c => (
          <option key={c.id} value={c.id}>{c.full_name} ({c.tax_code})</option>
        ))}
      </select>
      {formData.customer_id && customers?.find(c => c.id === parseInt(formData.customer_id)) && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h4>Dettagli Cliente</h4>
          <p><strong>Nome:</strong> {customers.find(c => c.id === parseInt(formData.customer_id))?.full_name}</p>
          <p><strong>Email:</strong> {customers.find(c => c.id === parseInt(formData.customer_id))?.email}</p>
          <p><strong>Telefono:</strong> {customers.find(c => c.id === parseInt(formData.customer_id))?.phone}</p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Selezione Veicolo</h3>
      <select
        name="vehicle_id"
        value={formData.vehicle_id}
        onChange={handleChange}
        className="form-control"
        required
      >
        <option value="">Seleziona un Veicolo</option>
        {/* ✅ CORREZIONE: Usa vehicles?.map per prevenire errori se 'vehicles' è undefined */}
        {vehicles?.map(v => (
          <option key={v.id} value={v.id}>
            {v.brand} {v.model} ({v.license_plate}) - {v.category_name}
          </option>
        ))}
      </select>
      {formData.vehicle_id && vehicles?.find(v => v.id === parseInt(formData.vehicle_id)) && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h4>Dettagli Veicolo</h4>
          <p><strong>Targa:</strong> {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.license_plate}</p>
          <p><strong>Categoria:</strong> {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.category_name}</p>
          <p><strong>Km Attuali:</strong> {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.current_km} km</p>
          <p><strong>Tariffa Base:</strong> {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.daily_rate} €/giorno</p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Dettagli Ritiro e Riconsegna</h3>
      
      <div className="form-group">
        <label>Data/Ora Ritiro Effettivo</label>
        <input 
          type="datetime-local" 
          name="pickup_date" 
          value={formData.pickup_date} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>

      <div className="form-group">
        <label>Data/Ora Riconsegna Prevista</label>
        <input 
          type="datetime-local" 
          name="expected_return_date" 
          value={formData.expected_return_date} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>

      <div className="form-group">
        <label>Luogo di Ritiro</label>
        <input 
          type="text" 
          name="pickup_location" 
          value={formData.pickup_location} 
          onChange={handleChange} 
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label>Livello Carburante al Ritiro (%)</label>
        <input 
          type="number" 
          name="pickup_fuel_level" 
          value={formData.pickup_fuel_level} 
          onChange={handleChange} 
          className="form-control"
          min="0"
          max="100"
        />
      </div>

      <div className="form-group">
        <label>Km al Ritiro (OBBLIGATORIO)</label>
        <input 
          type="number" 
          name="pickup_km" 
          value={formData.pickup_km} 
          onChange={handleChange} 
          className="form-control"
          required
        />
      </div>

      <div className="form-group">
        <label>Danni Visibili al Ritiro</label>
        <textarea 
          name="pickup_damages" 
          value={formData.pickup_damages} 
          onChange={handleChange} 
          className="form-control"
        />
      </div>
      
      <div className="form-group">
        <label>Note di Ritiro</label>
        <textarea 
          name="pickup_notes" 
          value={formData.pickup_notes} 
          onChange={handleChange} 
          className="form-control"
        />
      </div>
    </div>
  );
  
  const renderStep4 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Conducente Aggiuntivo (Opzionale)</h3>
      <div className="form-group">
        <label>Nome Completo</label>
        <input type="text" name="additional_driver_name" value={formData.additional_driver_name} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Luogo di Nascita</label>
        <input type="text" name="additional_driver_birth_place" value={formData.additional_driver_birth_place} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Data di Nascita</label>
        <input type="date" name="additional_driver_birth_date" value={formData.additional_driver_birth_date} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Numero Patente</label>
        <input type="text" name="additional_driver_license" value={formData.additional_driver_license} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Rilasciata da</label>
        <input type="text" name="additional_driver_license_issued_by" value={formData.additional_driver_license_issued_by} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Data Rilascio Patente</label>
        <input type="date" name="additional_driver_license_issue_date" value={formData.additional_driver_license_issue_date} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Data Scadenza Patente</label>
        <input type="date" name="additional_driver_license_expiry" value={formData.additional_driver_license_expiry} onChange={handleChange} className="form-control" />
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Tariffe e Costi Base</h3>
      
      <div className="form-group">
        <label>Tariffa Giornaliera (€)</label>
        <input type="number" name="daily_rate" value={formData.daily_rate} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Giorni di Noleggio (Totali)</label>
        <input type="number" name="total_days" value={formData.total_days} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Cauzione (€)</label>
        <input type="number" name="deposit_amount" value={formData.deposit_amount} onChange={handleChange} className="form-control" />
      </div>
      <div className="form-group">
        <label>Km Inclusi (es. Illimitati o 100km/giorno)</label>
        <input type="text" name="km_included" value={formData.km_included} onChange={handleChange} className="form-control" />
      </div>

      <h4 style={{ marginTop: '30px' }}>Costi Aggiuntivi Preimpostati</h4>
      
      <div className="form-group">
        <label>Costo Carburante (a litro - default: **2.50** €)</label>
        <input type="number" name="fuel_charge" value={formData.fuel_charge} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Addebito Fuori Orario (default: **20.00** €)</label>
        <input type="number" name="after_hours_charge" value={formData.after_hours_charge} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Costo KM Extra (a km - default: **0.56** €)</label>
        <input type="number" name="km_extra_cost" value={formData.km_extra_cost} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Costo Consegna/Ritiro (€)</label>
        <input type="number" name="delivery_cost" value={formData.delivery_cost} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Costi Extra Generici (es. Seggiolino, Navigatore)</label>
        <input type="number" name="extras_charge" value={formData.extras_charge} onChange={handleChange} className="form-control" />
      </div>

    </div>
  );

  const renderStep6 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Riepilogo Costi e Totali</h3>
      
      {/* Questi campi sono teoricamente calcolati, ma permettiamo la modifica manuale */}
      <div className="form-group">
        <label>Addebito KM Extra Totale (€)</label>
        <input type="number" name="extra_km_charge" value={formData.extra_km_charge} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Addebito Coperture Aggiuntive Totale (€)</label>
        <input type="number" name="franchise_charge" value={formData.franchise_charge} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Sconto Applicato (€)</label>
        <input type="number" name="discount" value={formData.discount} onChange={handleChange} className="form-control" />
      </div>

      <div style={{ marginTop: '30px', padding: '15px', border: '1px solid #007bff', borderRadius: '4px', background: '#e9f5ff' }}>
        <h4>Totali (Calcolati o Inseriti Manualmente)</h4>
        <div className="form-group">
          <label>Subtotale Noleggio (€)</label>
          <input type="number" name="subtotal" value={formData.subtotal} onChange={handleChange} className="form-control" />
        </div>
        <div className="form-group">
          <label>Totale Contratto (€)</label>
          <input type="number" name="total_amount" value={formData.total_amount} onChange={handleChange} className="form-control" />
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Coperture Assicurative (Franchigie)</h3>
      <p style={{ fontSize: '14px', color: '#6c757d' }}>
        Valori franchigie in caso di sinistro/furto/incendio.
      </p>
      
      <div className="form-group">
        <label>Franchigia Furto/Incendio (€)</label>
        <input type="number" name="franchise_theft" value={formData.franchise_theft} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Franchigia Danni (€)</label>
        <input type="number" name="franchise_damage" value={formData.franchise_damage} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Massimale RCA (€)</label>
        <input type="number" name="franchise_rca" value={formData.franchise_rca} onChange={handleChange} className="form-control" />
      </div>
    </div>
  );

  const renderStep8 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Dettagli Pagamento</h3>
      
      <div className="form-group">
        <label>Metodo Pagamento Totale</label>
        <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="form-control">
          <option value="Contanti">Contanti</option>
          <option value="Carta di Credito">Carta di Credito</option>
          <option value="Bonifico">Bonifico</option>
        </select>
      </div>

      <div className="form-group">
        <label>Metodo Pagamento Cauzione</label>
        <select name="deposit_method" value={formData.deposit_method} onChange={handleChange} className="form-control">
          <option value="Contanti">Contanti</option>
          <option value="Carta di Credito">Carta di Credito</option>
          <option value="Assegno">Assegno</option>
        </select>
      </div>
      
      <h4 style={{ marginTop: '30px' }}>Dati Carta di Credito (Se usata)</h4>
      
      <div className="form-group">
        <label>Nome Intestatario CC</label>
        <input type="text" name="cc_holder_name" value={formData.cc_holder_name} onChange={handleChange} className="form-control" />
      </div>
      
      <div className="form-group">
        <label>Tipo Carta</label>
        <select name="cc_type" value={formData.cc_type} onChange={handleChange} className="form-control">
          <option value="VISA">VISA</option>
          <option value="MasterCard">MasterCard</option>
          <option value="AMEX">AMEX</option>
          <option value="Diners">Diners</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>Numero Carta (Masked)</label>
        <input type="text" name="cc_number_masked" value={formData.cc_number_masked} onChange={handleChange} className="form-control" placeholder="**** **** **** 1234" />
      </div>
      
      <div className="form-group">
        <label>Scadenza (MM/AA)</label>
        <input type="text" name="cc_expiry" value={formData.cc_expiry} onChange={handleChange} className="form-control" placeholder="05/26" />
      </div>

    </div>
  );

  const renderStep9 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Riepilogo Finale del Contratto</h3>
      
      <div style={{ padding: '20px', border: '1px solid #007bff', borderRadius: '8px', background: '#f8f9fa' }}>
        <h4>Informazioni Essenziali</h4>
        <p><strong>Cliente:</strong> {customers.find(c => c.id === parseInt(formData.customer_id))?.full_name}</p>
        <p><strong>Veicolo:</strong> {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.brand} {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.model} ({vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.license_plate})</p>
        <p><strong>Ritiro:</strong> {new Date(formData.pickup_date).toLocaleString()}</p>
        <p><strong>Riconsegna Prevista:</strong> {new Date(formData.expected_return_date).toLocaleString()}</p>
        <p><strong>Totale Contratto:</strong> **{parseFloat(formData.total_amount).toFixed(2)} €**</p>
        <p><strong>Cauzione:</strong> {parseFloat(formData.deposit_amount).toFixed(2)} €</p>
        
        <h5 style={{ marginTop: '15px' }}>Dettagli Costi Extra:</h5>
        <ul>
          <li>**Carburante a Litro:** {formData.fuel_charge} €</li>
          <li>**Addebito Fuori Orario:** {formData.after_hours_charge} €</li>
          <li>**Costo KM Extra (unitario):** {formData.km_extra_cost} €/km</li>
          <li>**Totale Extra:** {(parseFloat(formData.delivery_cost) + parseFloat(formData.extras_charge)).toFixed(2)} €</li>
        </ul>
      </div>
      
      <p style={{ marginTop: '20px', color: '#dc3545' }}>
        **AVVISO:** La pressione del tasto "Crea Noleggio" finalizzerà il contratto e lo renderà attivo.
      </p>
    </div>
  );

  // ✅ STEP 10: CONSENSI E FIRMA (AGGIUNTO SIGNATURE PAD)
  const renderStep10 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Consensi e Firma Contratto</h3>
      
      <div style={{ marginBottom: '30px' }}>
        <h4>Firma del Cliente</h4>
        <p style={{ fontSize: '14px', color: '#6c757d' }}>
          Apponi la firma con il tuo dito o stilo sul dispositivo mobile.
        </p>
        
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '4px', 
          maxWidth: '400px', 
          margin: '0 auto',
          background: '#fff'
        }}>
          {/* Componente SignaturePad effettivo */}
          <SignaturePad 
            ref={sigCanvas} 
            penColor='black' 
            canvasProps={{ 
              width: 400, // Larghezza fissa
              height: 200, // Altezza fissa
              className: 'sigCanvas',
              style: { 
                border: '1px solid transparent', 
                borderRadius: '4px',
                touchAction: 'none' // Essenziale per un buon supporto touch
              } 
            }}
            onEnd={handleSignatureEnd}
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '10px' }}>
          <button 
            type="button" 
            onClick={handleSignatureClear} 
            className="btn btn-sm btn-outline-danger"
          >
            Cancella Firma
          </button>
          {formData.customer_signature && (
            <span style={{ color: '#1a4d2e', fontSize: '14px', lineHeight: '30px' }}>
              ✅ Firma acquisita
            </span>
          )}
        </div>
        
        {!formData.customer_signature && (
            <p style={{ color: '#dc3545', textAlign: 'center', marginTop: '10px' }}>
                *Firma obbligatoria per procedere.
            </p>
        )}
      </div>

      <h4>Dichiarazioni e Consensi</h4>
      <div className="form-group form-check">
        <input 
          type="checkbox" 
          id="contract_signed"
          name="contract_signed" 
          checked={formData.contract_signed} 
          onChange={handleChange} 
          className="form-check-input"
        />
        <label className="form-check-label" htmlFor="contract_signed">
          Dichiaro di aver letto e accettato integralmente il contratto di noleggio e le condizioni generali.
        </label>
      </div>

      <div className="form-group form-check">
        <input 
          type="checkbox" 
          id="privacy_consent"
          name="privacy_consent" 
          checked={formData.privacy_consent} 
          onChange={handleChange} 
          className="form-check-input"
        />
        <label className="form-check-label" htmlFor="privacy_consent">
          Acconsento al trattamento dei dati personali (OBBLIGATORIO).
        </label>
      </div>
      
      <div className="form-group form-check">
        <input 
          type="checkbox" 
          id="marketing_consent"
          name="marketing_consent" 
          checked={formData.marketing_consent} 
          onChange={handleChange} 
          className="form-check-input"
        />
        <label className="form-check-label" htmlFor="marketing_consent">
          Acconsento a ricevere comunicazioni promozionali e di marketing.
        </label>
      </div>
    </div>
  );

  const renderStep11 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Foto Iniziali del Veicolo</h3>
      
      {formData.rental_id ? (
        <PhotoUpload
          rentalId={formData.rental_id}
          photoType="pickup"
          // Funzione per aggiornare la lista delle foto, se necessario
          onPhotosChange={(photos) => console.log('Pickup photos updated:', photos)}
        />
      ) : (
        <div className="alert alert-warning">
          Noleggio non ancora creato. Torna indietro e premi "Crea Noleggio".
        </div>
      )}
      
      <p style={{ marginTop: '20px', color: '#6c757d' }}>
        Carica qui le foto che documentano lo stato del veicolo al momento del ritiro.
      </p>
    </div>
  );


  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      case 10: return renderStep10();
      case 11: return renderStep11();
      default: return <div>Step non trovato</div>;
    }
  };

  return (
    <div className="container" style={{ paddingTop: '30px' }}>
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h2 className="mb-0">Nuovo Contratto di Noleggio</h2>
            </div>
            
            <div className="card-body">
              {/* Stepper progress bar */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '30px',
                overflowX: 'auto',
                paddingBottom: '10px'
              }}>
                {steps.map(step => (
                  <div 
                    key={step.num} 
                    style={{ 
                      textAlign: 'center', 
                      minWidth: '100px',
                      cursor: 'pointer',
                      opacity: currentStep === step.num ? 1 : 0.6,
                      borderBottom: currentStep === step.num ? '3px solid #007bff' : '3px solid transparent',
                      paddingBottom: '5px'
                    }}
                    onClick={() => setCurrentStep(step.num)}
                  >
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      width: '30px', 
                      height: '30px', 
                      borderRadius: '50%', 
                      background: currentStep >= step.num ? '#007bff' : '#ccc', 
                      color: 'white',
                      marginBottom: '5px'
                    }}>
                      {step.icon}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: currentStep >= step.num ? '#007bff' : '#6c757d' }}>
                      {step.name}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Contenuto dello step */}
              <div style={{ minHeight: '400px', padding: '20px', border: '1px solid #eee', borderRadius: '4px' }}>
                {renderStepContent()}
              </div>

            </div>
            
            <div 
              className="card-footer" 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '15px 20px', 
                backgroundColor: '#f8f9fa' 
              }}
            >
              {currentStep > 1 && currentStep < 11 && (
                <button
                  onClick={handlePrevious}
                  className="btn btn-secondary"
                >
                  <ArrowLeft size={18} />
                  Indietro
                </button>
              )}
              
              {currentStep < 10 && (
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                  style={{ marginLeft: currentStep > 1 ? '' : 'auto' }}
                >
                  Avanti
                  <ArrowRight size={18} />
                </button>
              )}
              
              {currentStep === 10 && (
                <button
                  onClick={handleSubmit}
                  className="btn btn-success"
                  disabled={loading || !formData.contract_signed || !formData.privacy_consent || !formData.customer_signature} 
                  style={{ marginLeft: currentStep > 1 ? 'auto' : 'auto' }}
                >
                  {loading ? 'Creazione...' : (
                    <>
                      <Save size={18} />
                      Crea Noleggio
                    </>
                  )}
                </button>
              )}
              
              {currentStep === 11 && (
                <button
                  onClick={handleFinish}
                  className="btn btn-success"
                  style={{ marginLeft: 'auto' }}
                >
                  <CheckCircle size={18} />
                  Completa
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewRental;