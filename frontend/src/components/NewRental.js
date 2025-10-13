import React, { useState, useEffect } from 'react';
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
  UserPlus
} from 'lucide-react';

const NewRental = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  // Linea 28: Rimosso: const [categories, setCategories] = useState([]);
  
  // ✅ STATO COMPLETO CON TUTTI I CAMPI DELLA TABELLA RENTALS
  const [formData, setFormData] = useState({
    // Step 1: Cliente
    customer_id: '',
    
    // Step 2: Veicolo
    vehicle_id: '',
    
    // Step 3: Date e Dettagli Noleggio
    pickup_date: '',
    expected_return_date: '',
    pickup_location: 'BNC Energy Rent Car',
    pickup_fuel_level: '100',
    pickup_km: '',
    pickup_damages: '',
    pickup_notes: '',
    
    // Step 4: Conducente Aggiuntivo (Opzionale) - Dettagli Completi
    additional_driver_name: '',
    additional_driver_birth_date: '',
    additional_driver_birth_place: '',
    additional_driver_license: '',
    additional_driver_license_issued_by: '',
    additional_driver_license_issue_date: '',
    additional_driver_license_expiry: '',
    
    // Step 5 (Nuovo - Contiene alcuni costi e metodi pagamento):
    daily_rate: '', // Resta qui per calcolo subtotale
    total_days: 1, // Resta qui per calcolo subtotale
    km_included: 'Illimitati', // Resta qui
    
    delivery_cost: '0', // Spostato qui per step 5
    fuel_charge: '0', // Spostato qui per step 5
    after_hours_charge: '0', // Spostato qui per step 5
    payment_method: 'Contanti', // Spostato qui per step 5
    deposit_method: 'Contanti', // Spostato qui per step 5

    // Step 6 (Scalato - Tariffe e Costi Rimanenti)
    km_extra_cost: '0',
    extras_charge: '0',
    extra_km_charge: '0',
    franchise_charge: '0',
    discount: '0',
    subtotal: 0,
    total_amount: 0,
    
    // Step 7 (Scalato - Pagamento Rimanente)
    amount_paid: '0',
    amount_due: 0,
    deposit_amount: '0',
    
    // Step 8 (Scalato - Carta di Credito)
    cc_holder_name: '',
    cc_type: '',
    cc_number_masked: '',
    cc_expiry: '',
    
    // Step 9 (Scalato - Franchigie Assicurative)
    franchise_theft: '0',
    franchise_damage: '0',
    franchise_rca: '0',
    
    // Step 10 (Scalato - Consensi e Firma)
    contract_signed: false,
    privacy_consent: false,
    marketing_consent: false,
    
    // Step 11 (Scalato - Foto)
    rental_id: null,
  });

  // Linea 101: Rimosso: const [uploadedPhotos, setUploadedPhotos] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // ✅ Calcolo automatico totali (invariato)
  useEffect(() => {
    const dailyRate = parseFloat(formData.daily_rate) || 0;
    const start = new Date(formData.pickup_date);
    const end = new Date(formData.expected_return_date);

    let diffDays = 1;
    if (start.getTime() && end.getTime() && end > start) {
      const diffTime = Math.abs(end - start);
      diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Calcolo subtotale (solo tariffa giornaliera)
    const subtotal = dailyRate * diffDays;
    
    // Calcolo costi aggiuntivi
    const deliveryCost = parseFloat(formData.delivery_cost) || 0;
    const fuelCharge = parseFloat(formData.fuel_charge) || 0;
    const afterHoursCharge = parseFloat(formData.after_hours_charge) || 0;
    const extrasCharge = parseFloat(formData.extras_charge) || 0;
    const extraKmCharge = parseFloat(formData.extra_km_charge) || 0;
    const franchiseCharge = parseFloat(formData.franchise_charge) || 0;
    const discount = parseFloat(formData.discount) || 0;
    
    // Totale comprensivo di tutti i costi
    const totalAmount = subtotal + deliveryCost + fuelCharge + afterHoursCharge + 
                       extrasCharge + extraKmCharge + franchiseCharge - discount;
    
    // Calcolo importo dovuto
    const amountPaid = parseFloat(formData.amount_paid) || 0;
    const amountDue = totalAmount - amountPaid;

    setFormData(prev => ({ 
      ...prev, 
      total_days: diffDays, 
      subtotal: subtotal,
      total_amount: totalAmount,
      amount_due: amountDue
    }));
  }, [
    formData.pickup_date, 
    formData.expected_return_date, 
    formData.daily_rate,
    formData.delivery_cost,
    formData.fuel_charge,
    formData.after_hours_charge,
    formData.extras_charge,
    formData.extra_km_charge,
    formData.franchise_charge,
    formData.discount,
    formData.amount_paid
  ]);

  // ✅ Caricamento dati iniziali (invariato)
  useEffect(() => {
    if (formData.vehicle_id) {
      const selectedVehicle = vehicles.find(v => v.id === parseInt(formData.vehicle_id));
      if (selectedVehicle) {
        setFormData(prev => ({
          ...prev,
          daily_rate: selectedVehicle.daily_rate,
          pickup_km: selectedVehicle.current_km,
          franchise_theft: selectedVehicle.franchise_theft || '0',
          franchise_damage: selectedVehicle.franchise_damage || '0',
          franchise_rca: selectedVehicle.franchise_rca || '0',
        }));
      }
    }
  }, [formData.vehicle_id, vehicles]);

  const loadInitialData = async () => {
    try {
      const [customersRes, vehiclesRes] = await Promise.all([
        customersAPI.getAll({ limit: 1000 }),
        vehiclesAPI.getAll({ limit: 1000 }),
      ]);

      // FIX: Carica l'array di clienti direttamente da .data.data
      setCustomers(customersRes.data.data || []); 
      setVehicles(vehiclesRes.data.data || []); 
      
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
      setCustomers([]);
      setVehicles([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // ✅ LOGICA DI VALIDAZIONE AGGIORNATA PER NUOVA NUMERAZIONE
  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.customer_id) {
          toast.error('Seleziona un cliente');
          return false;
        }
        break;
      case 2:
        if (!formData.vehicle_id) {
          toast.error('Seleziona un veicolo');
          return false;
        }
        break;
      case 3:
        if (!formData.pickup_date || !formData.expected_return_date || !formData.pickup_km) {
          toast.error('Compila tutti i campi obbligatori');
          return false;
        }
        if (formData.total_days <= 0) {
          toast.error('Le date di noleggio non sono valide');
          return false;
        }
        break;
      case 6: // Vecchio Step 5
        if (parseFloat(formData.daily_rate) <= 0) {
          toast.error('La tariffa giornaliera deve essere maggiore di zero');
          return false;
        }
        break;
      case 10: // Vecchio Step 9
        if (!formData.contract_signed || !formData.privacy_consent) {
          toast.error('Devi accettare il contratto e l\'informativa sulla privacy');
          return false;
        }
        break;
      default: // Aggiunto per eliminare l'avviso di ESLint
        break;
    }
    return true;
  };

  // ✅ LOGICA NEXT AGGIORNATA PER NUOVO MAX STEP (11)
  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 10) { // Il nuovo step di submit è il 10 (Consensi)
        handleSubmit();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // ✅ Preparazione dati completi per l'API (invariata)
      const rentalData = {
        customer_id: parseInt(formData.customer_id),
        vehicle_id: parseInt(formData.vehicle_id),
        pickup_date: formData.pickup_date,
        expected_return_date: formData.expected_return_date,
        pickup_location: formData.pickup_location,
        pickup_fuel_level: parseFloat(formData.pickup_fuel_level),
        pickup_km: parseInt(formData.pickup_km),
        pickup_damages: formData.pickup_damages,
        pickup_notes: formData.pickup_notes,
        
        // Conducente aggiuntivo
        additional_driver_name: formData.additional_driver_name || null,
        additional_driver_birth_date: formData.additional_driver_birth_date || null,
        additional_driver_birth_place: formData.additional_driver_birth_place || null,
        additional_driver_license: formData.additional_driver_license || null,
        additional_driver_license_issued_by: formData.additional_driver_license_issued_by || null,
        additional_driver_license_issue_date: formData.additional_driver_license_issue_date || null,
        additional_driver_license_expiry: formData.additional_driver_license_expiry || null,
        
        // Tariffe
        daily_rate: parseFloat(formData.daily_rate),
        total_days: parseInt(formData.total_days),
        km_included: formData.km_included,
        km_extra_cost: parseFloat(formData.km_extra_cost),
        delivery_cost: parseFloat(formData.delivery_cost),
        fuel_charge: parseFloat(formData.fuel_charge),
        after_hours_charge: parseFloat(formData.after_hours_charge),
        extras_charge: parseFloat(formData.extras_charge),
        extra_km_charge: parseFloat(formData.extra_km_charge),
        franchise_charge: parseFloat(formData.franchise_charge),
        discount: parseFloat(formData.discount),
        subtotal: parseFloat(formData.subtotal),
        total_amount: parseFloat(formData.total_amount),
        
        // Pagamento
        amount_paid: parseFloat(formData.amount_paid),
        amount_due: parseFloat(formData.amount_due),
        payment_method: formData.payment_method,
        deposit_amount: parseFloat(formData.deposit_amount),
        deposit_method: formData.deposit_method,
        
        // Carta di credito
        cc_holder_name: formData.cc_holder_name || null,
        cc_type: formData.cc_type || null,
        cc_number_masked: formData.cc_number_masked || null,
        cc_expiry: formData.cc_expiry || null,
        
        // Franchigie
        franchise_theft: parseFloat(formData.franchise_theft),
        franchise_damage: parseFloat(formData.franchise_damage),
        franchise_rca: parseFloat(formData.franchise_rca),
        
        // Consensi
        contract_signed: formData.contract_signed,
        privacy_consent: formData.privacy_consent,
        marketing_consent: formData.marketing_consent,
      };

      const response = await rentalsAPI.create(rentalData);
      
      setFormData(prev => ({ ...prev, rental_id: response.data.data.id }));
      setCurrentStep(11); // Vai al nuovo step foto (11)
      
      toast.success('Noleggio creato con successo!');
    } catch (error) {
      console.error('Errore creazione noleggio:', error);
      toast.error(error.response?.data?.message || 'Errore nella creazione del noleggio');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    toast.success('Noleggio completato con successo!');
    navigate(`/rentals/${formData.rental_id}`);
  };

  // ✅ DEFINIZIONE STEP AGGIORNATA A 11 STEP
  const steps = [
    { number: 1, title: 'Cliente', icon: User },
    { number: 2, title: 'Veicolo', icon: Car },
    { number: 3, title: 'Dettagli', icon: Calendar },
    { number: 4, title: 'Conducente Agg.', icon: UserPlus },
    { number: 5, title: 'Costi/Pagamento', icon: CreditCard }, // NUOVO STEP 5
    { number: 6, title: 'Tariffe', icon: DollarSign }, // Vecchio 5
    { number: 7, title: 'Pagamento', icon: CreditCard }, // Vecchio 6
    { number: 8, title: 'Carta Credito', icon: CreditCard }, // Vecchio 7
    { number: 9, title: 'Franchigie', icon: Shield }, // Vecchio 8
    { number: 10, title: 'Consensi', icon: CheckCircle }, // Vecchio 9
    { number: 11, title: 'Foto', icon: Camera }, // Vecchio 10
  ];

  // ✅ RENDER STEP INDICATOR (invariato)
  const renderStepIndicator = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '32px',
      position: 'relative',
      overflowX: 'auto',
      padding: '10px 0'
    }}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        
        return (
          <div key={step.number} style={{ flex: 1, textAlign: 'center', position: 'relative', minWidth: '80px' }}>
            {index > 0 && (
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '-50%',
                right: '50%',
                height: '2px',
                background: isCompleted ? '#1a4d2e' : '#dee2e6',
              }} />
            )}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: isActive ? '#1a4d2e' : isCompleted ? '#4a7c59' : '#dee2e6',
              color: isActive || isCompleted ? 'white' : '#6c757d',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1,
            }}>
              <Icon size={20} />
            </div>
            <div style={{
              fontSize: '11px',
              fontWeight: isActive ? '600' : '400',
              color: isActive ? '#1a4d2e' : '#6c757d',
            }}>
              {step.title}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ✅ STEP 1: CLIENTE (invariato)
  const renderStep1 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Seleziona Cliente</h3>
      
      <div className="form-group">
        <label className="form-label required">Cliente</label>
        <select
          name="customer_id"
          className="form-control"
          value={formData.customer_id}
          onChange={handleChange}
          required
        >
          <option value="">-- Seleziona Cliente --</option>
          {customers && customers.map(customer => ( 
            <option key={customer.id} value={customer.id}>
              {customer.full_name} - {customer.fiscal_code}
            </option>
          ))}
        </select>
      </div>

      {formData.customer_id && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '4px',
        }}>
          {(() => {
            const customer = customers.find(c => c.id === parseInt(formData.customer_id));
            return customer ? (
              <div>
                <strong>Dettagli Cliente:</strong>
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  <div>📞 {customer.phone}</div>
                  <div>📧 {customer.email}</div>
                  <div>📍 {customer.address}, {customer.city}</div>
                  <div>🪪 Patente: {customer.license_number}</div>
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );

  // ✅ STEP 2: VEICOLO (invariato)
  const renderStep2 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Seleziona Veicolo</h3>
      
      <div className="form-group">
        <label className="form-label required">Veicolo Disponibile</label>
        <select
          name="vehicle_id"
          className="form-control"
          value={formData.vehicle_id}
          onChange={handleChange}
          required
        >
          <option value="">-- Seleziona Veicolo --</option>
          {vehicles && vehicles.map(vehicle => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.brand} {vehicle.model} - {vehicle.license_plate} 
              {vehicle.category_name && ` (${vehicle.category_name})`}
            </option>
          ))}
        </select>
      </div>

      {formData.vehicle_id && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '4px',
        }}>
          {(() => {
            const vehicle = vehicles.find(v => v.id === parseInt(formData.vehicle_id));
            return vehicle ? (
              <div>
                <strong>Dettagli Veicolo:</strong>
                <div style={{ marginTop: '8px', fontSize: '14px' }}>
                  <div>🚗 {vehicle.brand} {vehicle.model} ({vehicle.year})</div>
                  <div>🏷️ Targa: {vehicle.license_plate}</div>
                  <div>🎨 Colore: {vehicle.color}</div>
                  <div>⛽ Carburante: {vehicle.fuel_type}</div>
                  <div>⚙️ Cambio: {vehicle.transmission}</div>
                  <div>📊 Km attuali: {vehicle.current_km}</div>
                  {vehicle.daily_rate && (
                    <div style={{ marginTop: '8px', fontWeight: '600', color: '#1a4d2e' }}>
                      💰 Tariffa giornaliera: €{parseFloat(vehicle.daily_rate).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );

  // ✅ STEP 3: DETTAGLI NOLEGGIO (invariato)
  const renderStep3 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Dettagli Ritiro e Consegna</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">Data e Ora Ritiro</label>
          <input
            type="datetime-local"
            name="pickup_date"
            className="form-control"
            value={formData.pickup_date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label required">Data e Ora Rientro Previsto</label>
          <input
            type="datetime-local"
            name="expected_return_date"
            className="form-control"
            value={formData.expected_return_date}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Luogo di Ritiro</label>
        <input
          type="text"
          name="pickup_location"
          className="form-control"
          value={formData.pickup_location}
          onChange={handleChange}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label required">Livello Carburante (%)</label>
          <input
            type="number"
            name="pickup_fuel_level"
            className="form-control"
            value={formData.pickup_fuel_level}
            onChange={handleChange}
            min="0"
            max="100"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label required">Km in Uscita</label>
          <input
            type="number"
            name="pickup_km"
            className="form-control"
            value={formData.pickup_km}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Danni Esistenti</label>
        <textarea
          name="pickup_damages"
          className="form-control"
          value={formData.pickup_damages}
          onChange={handleChange}
          rows="3"
          placeholder="Descrivi eventuali danni o graffi presenti sul veicolo..."
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Note Aggiuntive Noleggio</label>
        <textarea
          name="pickup_notes"
          className="form-control"
          value={formData.pickup_notes}
          onChange={handleChange}
          rows="3"
          placeholder="Note generiche per il noleggio..."
        />
      </div>

      {formData.total_days > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#e8f5e9',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1a4d2e',
        }}>
          📅 Durata noleggio: {formData.total_days} giorn{formData.total_days === 1 ? 'o' : 'i'}
        </div>
      )}
    </div>
  );

  // ✅ STEP 4: CONDUCENTE AGGIUNTIVO (RIDOTTO)
  const renderStep4 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Conducente Aggiuntivo (Opzionale)</h3>
      
      <div style={{
        padding: '16px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        ℹ️ <strong>Info:</strong> Inserisci qui i dettagli completi del conducente aggiuntivo. Se il nome e la patente sono già stati inseriti nello step precedente (Costi Aggiuntivi), completa qui gli altri campi.
      </div>
      
      <div className="form-group">
        <label className="form-label">Nome e Cognome</label>
        <input
          type="text"
          name="additional_driver_name"
          className="form-control"
          value={formData.additional_driver_name}
          onChange={handleChange}
          placeholder="Es: Mario Rossi"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Numero Patente</label>
        <input
          type="text"
          name="additional_driver_license"
          className="form-control"
          value={formData.additional_driver_license}
          onChange={handleChange}
          placeholder="Es: U1234567X"
        />
      </div>

      <h4 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px' }}>Dettagli Aggiuntivi</h4>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Data di Nascita</label>
          <input
            type="date"
            name="additional_driver_birth_date"
            className="form-control"
            value={formData.additional_driver_birth_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Luogo di Nascita</label>
          <input
            type="text"
            name="additional_driver_birth_place"
            className="form-control"
            value={formData.additional_driver_birth_place}
            onChange={handleChange}
            placeholder="Es: Roma"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Rilasciata da (Ufficio/Stato)</label>
        <input
          type="text"
          name="additional_driver_license_issued_by"
          className="form-control"
          value={formData.additional_driver_license_issued_by}
          onChange={handleChange}
          placeholder="Es: MIT-UCO, MCTC-RM"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Data Emissione</label>
          <input
            type="date"
            name="additional_driver_license_issue_date"
            className="form-control"
            value={formData.additional_driver_license_issue_date}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Data Scadenza</label>
          <input
            type="date"
            name="additional_driver_license_expiry"
            className="form-control"
            value={formData.additional_driver_license_expiry}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
  
  // 🆕 STEP 5: CAMPI EXTRA (INSERITO COME RICHIESTO)
  const renderStep4Extra = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Costi Aggiuntivi e Pagamento Preliminare</h3>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Costo Consegna/Ritiro (€)</label>
          <input
            type="number"
            name="delivery_cost"
            className="form-control"
            value={formData.delivery_cost}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Addebito Carburante (€)</label>
          <input
            type="number"
            name="fuel_charge"
            className="form-control"
            value={formData.fuel_charge}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Addebito Fuori Orario (€)</label>
          <input
            type="number"
            name="after_hours_charge"
            className="form-control"
            value={formData.after_hours_charge}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Metodo Pagamento</label>
          <select
            name="payment_method"
            className="form-control"
            value={formData.payment_method}
            onChange={handleChange}
          >
            <option value="Contanti">Contanti</option>
            <option value="Carta di Credito">Carta di Credito</option>
            <option value="Bonifico">Bonifico</option>
            <option value="Carta di Debito">Carta di Debito</option>
            <option value="Assegno">Assegno</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Metodo Cauzione</label>
          <select
            name="deposit_method"
            className="form-control"
            value={formData.deposit_method}
            onChange={handleChange}
          >
            <option value="Contanti">Contanti</option>
            <option value="Carta di Credito">Carta di Credito</option>
            <option value="Assegno Circolare">Assegno Circolare</option>
          </select>
        </div>
      </div>
      
      <h4 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px' }}>Conducente Aggiuntivo (Opzionale) - Sintesi</h4>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Nome Completo</label>
          <input
            type="text"
            name="additional_driver_name"
            className="form-control"
            value={formData.additional_driver_name}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Numero Patente</label>
          <input
            type="text"
            name="additional_driver_license"
            className="form-control"
            value={formData.additional_driver_license}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  );


  // ✅ STEP 6: TARIFFE E COSTI (RIDOTTO)
  const renderStep5 = () => {
    const subtotalDisplay = formData.subtotal;
    const totalAmountDisplay = formData.total_amount;
    
    return (
      <div>
        <h3 style={{ marginBottom: '24px' }}>Tariffe e Costi</h3>
        
        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Tariffa Giornaliera (€)</label>
            <input
              type="number"
              name="daily_rate"
              className="form-control"
              value={formData.daily_rate}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Km Inclusi</label>
            <input
              type="text"
              name="km_included"
              className="form-control"
              value={formData.km_included}
              onChange={handleChange}
              placeholder="Es: Illimitati, 200"
            />
          </div>
        </div>

        <h4 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px' }}>Costi Aggiuntivi Rimanenti</h4>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Costo Km Extra (€/km)</label>
            <input
              type="number"
              name="km_extra_cost"
              className="form-control"
              value={formData.km_extra_cost}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Servizi ed Extra (€)</label>
            <input
              type="number"
              name="extras_charge"
              className="form-control"
              value={formData.extras_charge}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Addebito Km Extra (€)</label>
            <input
              type="number"
              name="extra_km_charge"
              className="form-control"
              value={formData.extra_km_charge}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Franchigia Addebitata (€)</label>
            <input
              type="number"
              name="franchise_charge"
              className="form-control"
              value={formData.franchise_charge}
              onChange={handleChange}
              step="0.01"
              min="0"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Sconto Applicato (€)</label>
          <input
            type="number"
            name="discount"
            className="form-control"
            value={formData.discount}
            onChange={handleChange}
            step="0.01"
            min="0"
          />
        </div>

        {/* Riepilogo (Invariato nella logica, ma deve mostrare tutti i costi da tutti gli step) */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '4px',
        }}>
          <h4 style={{ marginBottom: '16px', fontSize: '16px' }}>Riepilogo Importi</h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Tariffa giornaliera × {formData.total_days} giorn{formData.total_days === 1 ? 'o' : 'i'}:</span>
            <strong>€{subtotalDisplay.toFixed(2)}</strong>
          </div>
          
          {parseFloat(formData.delivery_cost) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ Costo consegna/ritiro:</span>
              <strong>€{parseFloat(formData.delivery_cost).toFixed(2)}</strong>
            </div>
          )}
          
          {parseFloat(formData.fuel_charge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ Addebito carburante:</span>
              <strong>€{parseFloat(formData.fuel_charge).toFixed(2)}</strong>
            </div>
          )}
          
          {parseFloat(formData.after_hours_charge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ Fuori orario:</span>
              <strong>€{parseFloat(formData.after_hours_charge).toFixed(2)}</strong>
            </div>
          )}
          
          {parseFloat(formData.extras_charge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ Servizi ed extra:</span>
              <strong>€{parseFloat(formData.extras_charge).toFixed(2)}</strong>
            </div>
          )}
          
          {parseFloat(formData.extra_km_charge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ Km extra:</span>
              <strong>€{parseFloat(formData.extra_km_charge).toFixed(2)}</strong>
            </div>
          )}
          
          {parseFloat(formData.franchise_charge) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>+ Franchigia:</span>
              <strong>€{parseFloat(formData.franchise_charge).toFixed(2)}</strong>
            </div>
          )}
          
          {parseFloat(formData.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#28a745' }}>
              <span>- Sconto:</span>
              <strong>-€{parseFloat(formData.discount).toFixed(2)}</strong>
            </div>
          )}
          
          <div style={{ 
            borderTop: '2px solid #dee2e6', 
            marginTop: '12px', 
            paddingTop: '12px',
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '18px',
            fontWeight: '700',
            color: '#1a4d2e',
          }}>
            <span>TOTALE NOLEGGIO:</span>
            <span>€{totalAmountDisplay.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  // ✅ STEP 7: PAGAMENTO (RIDOTTO)
  const renderStep6 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Pagamento e Deposito</h3>
      
      <div style={{
        padding: '16px',
        background: '#e8f5e9',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        <strong>Totale da Pagare:</strong> €{formData.total_amount.toFixed(2)} <br />
        <strong>Metodo Pagamento:</strong> {formData.payment_method}
      </div>

      <div className="form-group">
        <label className="form-label">Importo Versato (€)</label>
        <input
          type="number"
          name="amount_paid"
          className="form-control"
          value={formData.amount_paid}
          onChange={handleChange}
          step="0.01"
          min="0"
        />
      </div>

      <div style={{
        padding: '12px',
        background: formData.amount_due > 0 ? '#fff3cd' : '#d4edda',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: '600',
      }}>
        {formData.amount_due > 0 ? (
          <>⚠️ Importo Dovuto: €{formData.amount_due.toFixed(2)}</>
        ) : (
          <>✅ Pagamento Completo</>
        )}
      </div>

      <h4 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px' }}>Deposito Cauzionale</h4>

      <div className="form-group">
        <label className="form-label">Importo Deposito (€)</label>
        <input
          type="number"
          name="deposit_amount"
          className="form-control"
          value={formData.deposit_amount}
          onChange={handleChange}
          step="0.01"
          min="0"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Metodo Deposito</label>
        <input
          type="text"
          className="form-control"
          value={formData.deposit_method}
          disabled
        />
      </div>

    </div>
  );

  // ✅ STEP 8: CARTA DI CREDITO (SCALATO)
  const renderStep7 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Estremi Carta di Credito a Garanzia</h3>
      
      <div style={{
        padding: '16px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        ℹ️ <strong>Info:</strong> Se il pagamento è in contanti, è possibile richiedere gli estremi di una carta di credito come garanzia.
      </div>
      
      <div className="form-group">
        <label className="form-label">Titolare Carta</label>
        <input
          type="text"
          name="cc_holder_name"
          className="form-control"
          value={formData.cc_holder_name}
          onChange={handleChange}
          placeholder="Es: Mario Rossi"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tipo Carta</label>
          <select
            name="cc_type"
            className="form-control"
            value={formData.cc_type}
            onChange={handleChange}
          >
            <option value="">-- Seleziona --</option>
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
            <option value="American Express">American Express</option>
            <option value="Altra">Altra</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Numero Carta (ultime 4 cifre)</label>
          <input
            type="text"
            name="cc_number_masked"
            className="form-control"
            value={formData.cc_number_masked}
            onChange={handleChange}
            placeholder="Es: **** **** **** 1234"
            maxLength="19"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Scadenza (MM/YY)</label>
        <input
          type="text"
          name="cc_expiry"
          className="form-control"
          value={formData.cc_expiry}
          onChange={handleChange}
          placeholder="Es: 12/28"
          maxLength="5"
        />
      </div>

      <div style={{
        padding: '12px',
        background: '#e7f3ff',
        borderRadius: '4px',
        marginTop: '16px',
        fontSize: '13px',
      }}>
        🔒 I dati della carta di credito sono trattati in conformità al GDPR e vengono utilizzati esclusivamente per finalità contrattuali.
      </div>
    </div>
  );

  // ✅ STEP 9: FRANCHIGIE ASSICURATIVE (SCALATO)
  const renderStep8 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Franchigie Assicurative</h3>
      
      <div style={{
        padding: '16px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        ℹ️ <strong>Info:</strong> Le franchigie rappresentano l'importo a carico del cliente in caso di sinistro, furto o danni.
      </div>
      
      <div className="form-group">
        <label className="form-label">Franchigia Furto/Incendio (€)</label>
        <input
          type="number"
          name="franchise_theft"
          className="form-control"
          value={formData.franchise_theft}
          onChange={handleChange}
          step="0.01"
          min="0"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Franchigia Danni (€)</label>
        <input
          type="number"
          name="franchise_damage"
          className="form-control"
          value={formData.franchise_damage}
          onChange={handleChange}
          step="0.01"
          min="0"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Franchigia RCA (€)</label>
        <input
          type="number"
          name="franchise_rca"
          className="form-control"
          value={formData.franchise_rca}
          onChange={handleChange}
          step="0.01"
          min="0"
        />
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '4px',
      }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Riepilogo Franchigie</h4>
        <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
          <div>• Furto/Incendio: €{parseFloat(formData.franchise_theft).toFixed(2)}</div>
          <div>• Danni: €{parseFloat(formData.franchise_damage).toFixed(2)}</div>
          <div>• RCA: €{parseFloat(formData.franchise_rca).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );

  // ✅ STEP 10: CONSENSI E FIRMA (SCALATO)
  const renderStep9 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Consensi e Firma Digitale</h3>
      
      <div style={{
        padding: '16px',
        background: '#e7f3ff',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        📋 Prima di procedere, il cliente deve leggere e accettare le condizioni di noleggio.
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="contract_signed"
            checked={formData.contract_signed}
            onChange={handleChange}
            required
            style={{ marginRight: '12px', marginTop: '4px' }}
          />
          <span>
            <strong style={{ color: '#dc3545' }}>* </strong>
            Dichiaro di aver letto, compreso ed accettato le 
            <strong> Condizioni Generali di Contratto</strong> 
            {' '}presentate dalla società di noleggio.
          </span>
        </label>
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="privacy_consent"
            checked={formData.privacy_consent}
            onChange={handleChange}
            required
            style={{ marginRight: '12px', marginTop: '4px' }}
          />
          <span>
            <strong style={{ color: '#dc3545' }}>* </strong>
            Acconsento al trattamento dei dati personali ai sensi del <strong>GDPR 2016/679</strong> per le finalità contrattuali indicate nell'informativa sulla privacy.
          </span>
        </label>
      </div>

      <div className="form-group" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="marketing_consent"
            checked={formData.marketing_consent}
            onChange={handleChange}
            style={{ marginRight: '12px', marginTop: '4px' }}
          />
          <span>
            Acconsento (facoltativo) al trattamento dei dati personali per attività di <strong>invio di materiale pubblicitario</strong> e utilizzo nell'ambito di analisi e studi commerciali.
          </span>
        </label>
      </div>

      <div style={{
        marginTop: '32px',
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '4px',
        borderLeft: '4px solid #1a4d2e',
      }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', color: '#1a4d2e' }}>✓ Firma Digitale</h4>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>
          Cliccando su "Crea Noleggio", il contratto verrà considerato firmato digitalmente dal cliente.
        </p>
        <p style={{ fontSize: '13px', margin: 0, color: '#6c757d' }}>
          Data e ora firma: <strong>{new Date().toLocaleString('it-IT')}</strong>
        </p>
      </div>

      {(!formData.contract_signed || !formData.privacy_consent) && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '4px',
          fontSize: '13px',
        }}>
          ⚠️ È necessario accettare il contratto e l'informativa sulla privacy per procedere.
        </div>
      )}
    </div>
  );

  // ✅ STEP 11: FOTO (SCALATO)
  const renderStep10 = () => (
    <div>
      <h3 style={{ marginBottom: '24px' }}>Foto Veicolo in Uscita</h3>
      
      <div style={{
        padding: '16px',
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '4px',
        marginBottom: '24px',
        fontSize: '14px',
      }}>
        ⚠️ <strong>Importante:</strong> Scatta foto di tutti i lati del veicolo 
        per documentare lo stato al momento della consegna.
      </div>

      <PhotoUpload
        rentalId={formData.rental_id}
        photoType="pickup"
        onPhotosChange={() => {}} // Modificata per eliminare l'avviso 'uploadedPhotos'
      />
    </div>
  );

  // ✅ RENDER PRINCIPALE
  return (
    <div>
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/rentals')}
            className="btn btn-outline-secondary"
          >
            <ArrowLeft size={18} />
          </button>
          <h1>Nuovo Noleggio</h1>
        </div>
      </div>

      <div className="content-area">
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="card-body" style={{ padding: '32px' }}>
            {renderStepIndicator()}
            
            <div style={{ minHeight: '400px' }}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep4Extra()} {/* NUOVO STEP 5 */}
              {currentStep === 6 && renderStep5()} {/* Vecchio 5 */}
              {currentStep === 7 && renderStep6()} {/* Vecchio 6 */}
              {currentStep === 8 && renderStep7()} {/* Vecchio 7 */}
              {currentStep === 9 && renderStep8()} {/* Vecchio 8 */}
              {currentStep === 10 && renderStep9()} {/* Vecchio 9 */}
              {currentStep === 11 && renderStep10()} {/* Vecchio 10 */}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid #dee2e6',
            }}>
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
                  style={{ marginLeft: 'auto' }}
                >
                  Avanti
                  <ArrowRight size={18} />
                </button>
              )}
              
              {currentStep === 10 && (
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                  disabled={loading || !formData.contract_signed || !formData.privacy_consent}
                  style={{ marginLeft: 'auto' }}
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