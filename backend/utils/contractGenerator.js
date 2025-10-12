const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// **ATTENZIONE:** Sostituisci questo percorso con il path reale 
// della tua immagine del diagramma del veicolo.
// Se non hai un'immagine, la sezione rimarrà vuota o darà errore se non gestito.
const DAMAGE_DIAGRAM_IMAGE_PATH = path.join(__dirname, 'diagramma.png'); 

class ContractGenerator {
  constructor() {
    this.doc = null;
    this.pageMargin = 40;
    this.contentWidth = 515;
    
    // Colori tema BNC Energy
    this.colors = {
      primary: '#1a4d2e',
      primaryLight: '#4a7c59',
      headerBg: '#1a4d2e',
      border: '#dee2e6',
      text: '#2c3e50',
      textLight: '#6c757d',
      tableHeader: '#f4f6f8',
    };
  }

  async generateContract(rentalData, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        this.doc = new PDFDocument({
          size: 'A4',
          margin: this.pageMargin,
          info: {
            Title: `Contratto Noleggio ${rentalData.rental_number}`,
            Author: process.env.COMPANY_NAME || 'BNC Energy Rent Car',
          }
        });

        const stream = fs.createWriteStream(outputPath);
        this.doc.pipe(stream);

        // === PAGINA 1: CONTRATTO ===
        this.addCompanyHeader(rentalData);
        this.addContractInfoBox(rentalData);
        
        this.doc.y = 150; // Posizione dopo l'header
        
        this.addClientSection(rentalData);
        this.addVehicleSection(rentalData);
        this.addPricingSection(rentalData);
        this.addFranchiseSection(rentalData);
        this.addServicesSection(rentalData);
        this.addPickupSection(rentalData);
        this.addReturnSection(rentalData);
        
        // Firma cliente prima pagina: posizionamento sicuro alla fine della pagina
        const signatureY = Math.min(this.doc.y + 10, 750); // Limita la Y per non uscire dalla pagina
        this.addSignatureBox('Firma Cliente', signatureY);

        // === PAGINA 2: CONDIZIONI GENERALI ===
        this.doc.addPage();
        this.addTermsAndConditions();

        // === PAGINA 3+: FOTO (se presenti) ===
        if (rentalData.pickup_photos && rentalData.pickup_photos.length > 0) {
          this.doc.addPage();
          this.addPhotosSection('Foto veicolo in uscita', rentalData.pickup_photos);
        }
        
        if (rentalData.return_photos && rentalData.return_photos.length > 0) {
          this.doc.addPage();
          this.addPhotosSection('Foto veicolo al rientro', rentalData.return_photos);
        }

        this.doc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => reject(err));

      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // HEADER E BOX CONTRATTO
  // ============================================
  
  addCompanyHeader(data) {
    const company = {
      name: process.env.COMPANY_NAME || 'BNC Energy Rent Car',
      address: process.env.COMPANY_ADDRESS || 'Via Decio Furnò 26',
      city: process.env.COMPANY_CITY || 'Siracusa',
      zip: process.env.COMPANY_ZIP || '96100',
      province: process.env.COMPANY_PROVINCE || 'SR',
      cf: process.env.COMPANY_CF || '02024200897',
      vat: process.env.COMPANY_VAT || '02024200897',
      phone: process.env.COMPANY_PHONE || '+39 3881951562',
      email: process.env.COMPANY_EMAIL || 'info@bncenergy.it'
    };

    // Rettangolo header verde
    this.doc
      .rect(this.pageMargin, this.pageMargin, 320, 85)
      .fillAndStroke(this.colors.headerBg, this.colors.headerBg);

    // Testo header
    this.doc
      .fillColor('white')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text(company.name, this.pageMargin + 15, this.pageMargin + 12, { width: 290 });

    this.doc
      .fontSize(8)
      .font('Helvetica')
      .text(company.address, this.pageMargin + 15, this.pageMargin + 32)
      .text(`${company.zip} - ${company.city} - ${company.province}`, { continued: false })
      .text(`Cod. Fisc: ${company.cf} / P.IVA ${company.vat}`)
      .text(`Tel: ${company.phone} - Email: ${company.email}`);
  }

  addContractInfoBox(data) {
    const boxX = 370;
    const boxY = this.pageMargin;
    const boxW = 185;
    const boxH = 85;

    // Box esterno
    this.doc
      .rect(boxX, boxY, boxW, boxH)
      .fillAndStroke('white', this.colors.border);

    // Header del box
    this.doc
      .rect(boxX, boxY, boxW, 22)
      .fillAndStroke(this.colors.primaryLight, this.colors.primaryLight);

    this.doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('white')
      .text('CONTRATTO DI NOLEGGIO', boxX + 5, boxY + 6, { 
        width: boxW - 10, 
        align: 'center' 
      });

    // Contenuto box
    this.doc
      .fillColor(this.colors.text)
      .fontSize(8)
      .font('Helvetica')
      .text(`Data: ${this.formatDateTime(data.rental_date || data.pickup_date)}`, boxX + 8, boxY + 30)
      .text(`N°: ${data.rental_number}`, boxX + 8, boxY + 45)
      .text(`Codice: ${data.booking_code || 'N/A'}`, boxX + 8, boxY + 60);
  }

  // ============================================
  // SEZIONI CONTENUTO
  // ============================================

  addClientSection(data) {
    const customer = data.customer || data;
    
    this.addSectionTitle('Informazioni Cliente');
    
    const startY = this.doc.y;
    const col1X = this.pageMargin;
    const col2X = this.pageMargin + 270;
    let col1End = startY;
    let col2End = startY;

    // Colonna 1
    this.doc.y = startY;
    col1End = this.addLabelValue('Cliente/Azienda', customer.full_name, col1X);
    col1End = this.addLabelValue('Indirizzo', customer.address, col1X);
    col1End = this.addLabelValue('Città', `${customer.city}, ${customer.zip_code || ''}, ${customer.province || ''}, ${customer.country || 'IT'}`, col1X);
    col1End = this.addLabelValue('C.F.', customer.fiscal_code, col1X);
    if (customer.vat_number) {
      col1End = this.addLabelValue('P. IVA', customer.vat_number, col1X);
    }
    
    // Colonna 2
    this.doc.y = startY;
    col2End = this.addLabelValue('Telefono', customer.phone, col2X);
    col2End = this.addLabelValue('Email', customer.email, col2X);
    col2End = this.addLabelValue('Numero patente', customer.license_number, col2X);
    col2End = this.addLabelValue('Luogo emissione', customer.license_issued_by, col2X);
    col2End = this.addLabelValue('Data emissione', this.formatDate(customer.license_issue_date), col2X);
    col2End = this.addLabelValue('Data Scadenza', this.formatDate(customer.license_expiry_date), col2X);
    
    this.doc.y = Math.max(col1End, col2End) + 5; // Usa la posizione più bassa + un po' di spazio
  }

  addVehicleSection(data) {
    const vehicle = data.vehicle || data;
    
    this.addSectionTitle('Informazioni Veicolo');
    
    const startY = this.doc.y;
    const col1X = this.pageMargin;
    const col2X = this.pageMargin + 130;
    const col3X = this.pageMargin + 260;
    const col4X = this.pageMargin + 390;

    this.doc.y = startY;
    this.addLabelValue('Targa', vehicle.license_plate, col1X);
    this.addLabelValue('Categoria', data.category_name || 'N/A', col2X);
    this.addLabelValue('Marca', vehicle.brand, col3X);
    this.addLabelValue('Modello', vehicle.model, col4X);
    
    this.doc.y = startY + 24; // Avanzamento sicuro dopo 2 righe
  }

  addPricingSection(data) {
    this.addSectionTitle('Dettagli Tariffari');
    
    const items = [
      { label: 'Tariffa di noleggio', value: this.formatCurrency(data.daily_rate) },
      { label: 'Costo consegna/ritiro', value: this.formatCurrency(data.delivery_cost || 0) },
      { label: 'Addebito carburante', value: this.formatCurrency(data.fuel_charge || 0) },
      { label: 'Addebito fuori orario', value: this.formatCurrency(data.after_hours_charge || 0) },
      { label: 'Servizi ed extra', value: this.formatCurrency(data.extras_charge || 0) },
      { label: 'Addebito Km extra', value: this.formatCurrency(data.extra_km_charge || 0) },
      { label: 'Franchigia Addebitata', value: this.formatCurrency(data.franchise_charge || 0) },
      { label: 'Sconto Applicato', value: this.formatCurrency(data.discount || 0) },
    ];

    const col1X = this.pageMargin;
    const col2X = this.pageMargin + 170;
    const col3X = this.pageMargin + 320;

    let currentY = this.doc.y;
    let col3End = currentY;

    // Prima colonna
    for (let i = 0; i < 4; i++) {
      this.doc.y = currentY + (i * 12);
      this.addLabelValue(items[i].label, items[i].value, col1X, 150);
    }

    // Seconda colonna
    for (let i = 4; i < items.length; i++) {
      this.doc.y = currentY + ((i - 4) * 12);
      this.addLabelValue(items[i].label, items[i].value, col2X, 150);
    }

    // Totali (terza colonna)
    this.doc.y = currentY;
    this.doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(this.colors.text);
    
    col3End = this.addLabelValue('Totale', this.formatCurrency(data.total_amount), col3X, 90);
    col3End = this.addLabelValue('Totale Versato', this.formatCurrency(data.amount_paid || 0), col3X, 90);
    col3End = this.addLabelValue('Da versare', this.formatCurrency(data.amount_due || 0), col3X, 90);
    col3End = this.addLabelValue('Metodo di pagamento', data.payment_method || 'Contanti', col3X, 90);
    
    this.doc.font('Helvetica').fontSize(8);
    col3End = this.addLabelValue('Cauzione', this.formatCurrency(data.deposit_amount || 0), col3X, 90);
    col3End = this.addLabelValue('Metodo cauzione', data.deposit_method || 'Contanti', col3X, 90);

    this.doc.y = col3End + 5; // Usa la posizione più bassa della colonna 3 + spazio
  }

  addFranchiseSection(data) {
    this.addSectionTitle('Franchigie Assicurative');
    
    const col1X = this.pageMargin;
    const col2X = this.pageMargin + 190;
    const col3X = this.pageMargin + 380;
    
    const startY = this.doc.y;
    
    this.doc.y = startY;
    this.addLabelValue('Franchigia Furto/Incendio', this.formatCurrency(data.franchise_theft || 0), col1X);
    this.addLabelValue('Franchigia danni', this.formatCurrency(data.franchise_damage || 0), col2X);
    this.addLabelValue('Franchigia RCA', this.formatCurrency(data.franchise_rca || 0), col3X);
    
    this.doc.y = startY + 17; // Avanzamento sicuro
  }

  addServicesSection(data) {
    this.addSectionTitle('Servizi & Extra');
    
    this.doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(`Il veicolo noleggiato include Km ${data.km_included === 'unlimited' || !data.km_included ? 'illimitati' : data.km_included}`, 
        this.pageMargin, this.doc.y, { width: this.contentWidth });
    
    this.doc.y += 15;
  }

  addPickupSection(data) {
    this.addSectionTitle('Informazioni Uscita');
    
    const col1X = this.pageMargin;
    const col2X = this.pageMargin + 250;
    const startY = this.doc.y;
    let col1End, col2End;

    // Colonna 1
    this.doc.y = startY;
    col1End = this.addLabelValue('Luogo', data.pickup_location, col1X, 230);
    col1End = this.addLabelValue('Data', this.formatDateTime(data.pickup_date), col1X, 230);
    
    // Colonna 2
    this.doc.y = startY;
    col2End = this.addLabelValue('Livello Carburante', `${data.pickup_fuel_level}%`, col2X);
    col2End = this.addLabelValue('Km in uscita', data.pickup_km?.toString() || '0', col2X);

    this.doc.y = Math.max(col1End, col2End); // Allinea sotto le colonne

    // Descrizione danni (se presente)
    if (data.pickup_damages) {
      this.doc.y += 5; 
      this.doc
        .fontSize(8)
        .font('Helvetica-Bold')
        .fillColor(this.colors.text)
        .text('Descrizione Danni:', this.pageMargin, this.doc.y);
      
      this.doc.y += 10;
      
      this.doc
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text(data.pickup_damages, this.pageMargin, this.doc.y, { width: this.contentWidth });
        
      this.doc.y += 10; 
    } else {
        this.doc.y += 10; 
    }


    this.doc.y = this.addDamageDiagram() + 5; // AGGIUNTA del diagramma e avanzamento sicuro
  }

  addReturnSection(data) {
    if (data.actual_return_date || data.return_date) {
      // SEZIONE RIENTRO EFFETTUATO
      this.addSectionTitle('Informazioni Rientro');
      
      const col1X = this.pageMargin;
      const col2X = this.pageMargin + 250;
      const startY = this.doc.y;
      let col1End, col2End;

      this.doc.y = startY;
      col1End = this.addLabelValue('Luogo', data.return_location || data.pickup_location, col1X, 230);
      col1End = this.addLabelValue('Data', this.formatDateTime(data.actual_return_date || data.return_date), col1X, 230);
      
      this.doc.y = startY;
      col2End = this.addLabelValue('Livello Carburante', data.return_fuel_level ? `${data.return_fuel_level}%` : 'N/A', col2X);
      col2End = this.addLabelValue('Km al rientro', data.return_km?.toString() || 'N/A', col2X);
      
      this.doc.y = Math.max(col1End, col2End); // Allinea sotto le colonne

      if (data.return_damages) {
        this.doc.y += 5;
        this.doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('Descrizione Danni:', this.pageMargin, this.doc.y);
        
        this.doc.y += 10;
        
        this.doc
          .font('Helvetica')
          .fillColor(this.colors.textLight)
          .text(data.return_damages, this.pageMargin, this.doc.y, { width: this.contentWidth });
          
        this.doc.y += 10;
      } else {
        this.doc.y += 10;
      }

      this.doc.y = this.addDamageDiagram() + 5; // AGGIUNTA del diagramma e avanzamento sicuro
    } else {
      // SEZIONE RIENTRO PREVISTO
      this.addSectionTitle('Rientro Previsto');
      
      const col1X = this.pageMargin;
      const col2X = this.pageMargin + 250;
      const startY = this.doc.y;

      this.doc.y = startY;
      this.addLabelValue('Luogo', data.pickup_location, col1X, 230);
      this.addLabelValue('Data', this.formatDateTime(data.expected_return_date), col1X, 230);
      
      this.doc.y = startY;
      this.addLabelValue('Km inclusi', data.km_included === 'unlimited' ? 'Illimitati' : data.km_included, col2X);

      this.doc.y = startY + 24; // Avanzamento sicuro dopo 2 righe

      this.doc.y += 5;
      this.doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text('Il veicolo dovrà essere riconsegnato nelle stesse condizioni in cui si trovava in sede di consegna. Pulizia e carburante dovranno essere ripristinati come all\'inizio del noleggio, salvo diverse pattuizioni.', 
          this.pageMargin, this.doc.y, { width: this.contentWidth, align: 'justify' });

      this.doc.y += 15;
    }
  }

  // ============================================
  // NUOVO METODO PER IL DIAGRAMMA DANNI
  // ============================================

  addDamageDiagram() {
    const startY = this.doc.y;
    const diagramWidth = 180;
    const diagramHeight = 150; 
    let finalY = startY;

    // Controlla se l'immagine del diagramma esiste
    if (fs.existsSync(DAMAGE_DIAGRAM_IMAGE_PATH)) {
      try {
        const xPos = this.pageMargin;
        
        this.doc.image(DAMAGE_DIAGRAM_IMAGE_PATH, xPos, startY, {
          width: diagramWidth,
          height: diagramHeight,
          fit: [diagramWidth, diagramHeight]
        });
        finalY = startY + diagramHeight; // La posizione finale è dopo l'immagine
      } catch (err) {
        console.error(`Errore nel caricamento del diagramma danni: ${err}`);
        // Fallback: mostra solo il testo, avanza la Y
        this.doc
          .fontSize(7)
          .fillColor(this.colors.textLight)
          .text('Diagramma Danni non disponibile o percorso errato.', this.pageMargin, startY, { width: this.contentWidth, align: 'left' });
        finalY = startY + 15; // Spazio per il messaggio di fallback
      }
    } else {
      // Placeholder se l'immagine non è disponibile
      this.doc
        .fontSize(7)
        .fillColor(this.colors.textLight)
        .text('X: Graffio  O: Ammaccatura', this.pageMargin, startY, { align: 'center', width: this.contentWidth });
      finalY = startY + 15; // Spazio per il placeholder
    }

    return finalY; // Ritorna la posizione Y finale
  }

  // ============================================
  // CONDIZIONI GENERALI (Pagina 2) - AGGIORNATA
  // ============================================

  addTermsAndConditions() {
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text('CONDIZIONI GENERALI DI NOLEGGIO', { align: 'center' });
    
    this.doc.moveDown();
    
    const termsData = [
      { 
        title: 'Introduzione', 
        content: "Il presente contratto rappresenta una sintesi delle principali disposizioni delle Condizioni Generali di Noleggio che insieme alla lettera di noleggio sottoscritta dal Cliente, costituiscono la fonte esclusiva che regola il rapporto contrattuale intercorrente tra la società di noleggio Arparia Rent Car di Arpaia Raffaele VIA TORREBIANCA,12/14 Aversa (CE) e il cliente o propri Affiliati."
      },
      {
        title: '1. AFFIDAMENTO DEL VEICOLO',
        content: "La guida del veicolo e/o motociclo oggetto di locazione è consentita solo a persona in possesso di valida patente di guida di tipo \"A1\" \"A2\" \"A3\" e \"B\".\nE' richiesta la seguente età minima:\n-\"A1\" - 16 anni per motocicli fino a 11 kw - \"A2\" - 18 anni per motocicli fino a 35kw e \"A3\" 24 anni per motocicli superiori a 35kw.\n-\"B\"- 18 anni - solo per neopatentati, veicoli fino a 55 KW - dopo 01 anno di possesso della Patente \"B\" tutti i tipi di Autoveicoli fino a 9 posti.\n-\"B\" - 18 anni per tutti i tipi di Autocarro fino a 35q.\nIl veicolo e/o motociclo è affidato al Cliente nel presupposto che lo stesso lo utilizzi conducendolo personalmente.\nIl Cliente si assume ogni rischio o responsabilità in caso di affidamento della guida del veicolo e/o motociclo a terzi, ed anche agli effetti dell'art. 116 comma 12 del Codice della Strada(D.L.285/92), relativo all'affidamento del veicolo e/o motociclo a persona sprovvista di patente di guida o, comunque, non autorizzata dalla società di noleggio.\nIl Cliente potrà comunicare alla Società di noleggio presso cui ha noleggiato il veicolo e/o motociclo il nominativo di eventuali altre persone che potranno condurre il veicolo e/o motociclo i quali verranno autorizzati in secondo momento sotto presentazione di giusta autorizzazione alla guida(patente). Per ogni altra guida autorizzata è richiesto un supplemento giornaliero il cui importo è pari al 50% di quello descritto per il tipo di veicolo e/o motociclo già noleggiato. Per particolari gruppi di veicoli in particolari zone può essere richiesto, a discrezione della Società di Noleggio, il possesso di due Carte di Credito."
      },
      {
        title: '2. PAGAMENTO DEL NOLO',
        content: "Con Carte di Credito/Debito, previo rilascio di apposita autorizzazione dell'Istituto emittente; e/o contanti. Con il pagamento in contanti è obbligatorio versare un deposito cauzionale mediante assegno Circolare intestato a Arparia Rent Car di Arpaia Raffaele , l'importo viene stabilito in base al tipo di veicolo e/o motociclo da noleggiare. Il cliente possessore di carta di credito finanziaria autorizza la Società di Noleggio ad addebitare sul relativo conto tutti gli oneri a suo carico aventi titolo dal rapporto di noleggio, ivi inclusi quelli eventualmente necessari per il recupero di ogni genere di credito vantato dalla Società di Noleggio nei confronti del cliente in relazione al rapporto di noleggio."
      },
      {
        title: '3. FRANCHIGIE ASSICURAZIONE DANNI RC - KASCO - FURTO - INCENDIO',
        content: "Il veicolo e/o motociclo noleggiato è coperto da assicurazione R.C.A. e KASCO a norma delle vigenti leggi.\nQualora il Cliente debba occorrere uno degli eventi suddetti, sarà a suo carico la franchigia come indicato nella lettera nolo; in caso di furto e/o incendio la franchigia a carico del cliente è quella indicata nella lettera nolo e, in base al veicolo e/o motociclo noleggiato.\n(A) In caso di IRRIPARABILITA' totale del veicolo e/o motociclo noleggiato, dovuto ad incidente grave, per guida in stato di ebbrezza e/o uso di stupefacenti, la franchigia a carico del Cliente è pari al 100% del valore attuale del veicolo e/o motociclo noleggiato.\nPer i veicoli e/o motocicli muniti di antifurto Diablock o Blockshaft, se il Cliente vittima di furto del veicolo e/o motociclo noleggiato, non restituisce oltre alla chiave originale di apertura ed accensione, anche quella di uno degli antifurti citati, dovrà pagare una franchigia pari al 100% del valore attuale del veicolo. In tutti i casi di sinistro, furto, incendio, parziale o totale, è fatto obbligo al Cliente di effettuare regolare denuncia presso le Autorità competenti e, entro le 12 ore dall'evento, di consegnarla alla società di noleggio.\nI danni relativi al sinistro non sono addebitabili al cliente che produca modello C.I.D. con chiara e sottoscritta responsabilità della controparte.\nIl Cliente può scegliere di sottoscrivere il Servizio Aggiuntivo che riduce o elimina la penale per Responsabilità Economica, per chi si rende responsabile di al veicolo e/o motociclo. La sottoscrizione del Servizio Aggiuntivo che riduce o elimina la responsabilità per danni oltre ad avere un costo aggiuntivo al normale prezzo del Listino ufficiale per il veicolo e/o motociclo noleggiato, (con esclusione dei danni di cui al punto(A) che precede), non esonera il Cliente dall'adottare l'ordinaria diligenza nella conduzione del veicolo e/o motociclo.\nArparia Rent Car di Arpaia Raffaele , a titolo di penale si riserva la facoltà di procedere all'addebito di danni riconducibili a responsabilità del Cliente."
      },
      {
        title: '4. SERVIZIO RIFORNIMENTO',
        content: "Il veicolo e/o motociclo noleggiato deve essere riconsegnato con gli stessi litri di carburante esistenti al momento della consegna. Per ogni litro di carburante mancante, sarà addebitato al Cliente un importo di € 2,50 per/litro e una commissione spese per il ripristino carburante di € 30,00 escluso iva."
      },
      {
        title: '5. CHILOMETRAGGIO',
        content: "I limiti di chilometraggio e i costi per i chilometri extra del veicolo e/o motociclo noleggiato sono quelli indicati nella lettera di noleggio."
      },
      {
        title: '6. CIRCOLAZIONE DEL VEICOLO',
        content: "Il Cliente è autorizzato alla circolazione in Italia e si impegna a NON far circolare il veicolo e/o motociclo in paesi diversi da quelli espressamente indicati nella \"carta verde\" consegnata unitamente ai documenti del veicolo e/o motociclo.\nOgni utilizzazione non consentita o illecita per Contratto e/o per legge obbliga il Cliente a risarcire i danni conseguiti, eventualmente anche in solido con ogni altro conducente e comporta il venire meno di qualsiasi limitazione di responsabilità esponendo il Cliente alle relative responsabilità e rivalse. La società di noleggio si riserva di riprendere possesso del veicolo e/o motociclo in qualsiasi luogo e tempo nel caso di violazione delle norme del presente articolo.\nIl Cliente è responsabile della normale circolazione del veicolo e/o motociclo nonchè del suo uso e della manutenzione ordinaria.\nIn caso di necessità di soccorso stradale(es.guasto o sinistro) il Cliente potrà contattare la Società di Noleggio in cui ha noleggiato il veicolo e/o motociclo, chiedendo istruzioni sul da farsi ai numeri specificati nella lettera di noleggio. La società di Noleggio è esclusa da ogni responsabilità per perdite o danni conseguenti a guasti sopravvenuti del veicolo e/o motociclo, mancata o ritardata consegna, deterioramento merci o danni di ogni altro genere, salvo il caso di dolo o colpa grave della Società di Noleggio. Del pari è esclusa da ogni responsabilità per danni a cose trasportate o dimenticate sul veicolo e/o motociclo restituito.\nIl Cliente è responsabile per le contravvenzioni e/o ogni altro addebito conseguenti a violazioni del codice della strada o di altre disposizioni di legge o di regolamenti, dei pedaggi, del costo dei parcheggi e in generale delle somme derivanti dalla guida del veicolo e/o motociclo anche da parte di terzi durante il periodo del noleggio e si obbliga a rimborsare le somme a tale titolo eventualmente anticipate, ivi incluse le ulteriori spese legali, postali e amministrative connesse alla richiesta di rimborso e a manlevare la società di noleggio da ogni danno e/o pretesa di terzi. Ogni pratica amministrativa ha un costo di gestione ed il Cliente ne autorizza sin da ora l'addebito a Suo carico.\nNON E' CONSENTITO IL SERVIZIO DI VIAGGIO A LASCIARE, SE NON SPECIFICAMENTE AUTORIZZATO DALLA SOCIETA' DI NOLEGGIO."
      },
      {
        title: '7. RESTITUZIONE DEL VEICOLO',
        content: "Ad inizio nolo il Cliente dovrà rilasciare impegno relativamente alla data di riconsegna del veicolo e/o motociclo: qualsiasi variazione dell'impegno dovrà essere preventivamente comunicata alla Società di Noleggio.\nUna giornata di noleggio è considerata 24 ore con una tolleranza di 59 minuti, trascorso tale tempo verrà addebitata un'ulteriore giornata di noleggio. Per le tariffe soggette a limiti temporali (es. Week End, Settimana, ecc.) trascorso il tempo di tolleranza, verrà addebitato l'interno nolo a tariffa giornaliera. Il veicolo e/o motociclo deve essere riconsegnato durante l'orario di apertura e/o chiusura della Società di Noleggio.\nNel caso di riconsegna fuori orario possibile purchè preventivamente autorizzata, il noleggio si considererà chiuso in orario di apertura della stessa Società di Noleggio.\nLa mancata riconsegna delle chiavi del veicolo e/o motociclo comporterà la prosecuzione del noleggio fino alla riconsegna delle stesse o a presentazione di denuncia di smarrimento o furto.\nLo smarrimento o furto delle chiavi del veicolo e/o motociclo comporterà una penale per risarcimento pari a € 600,00 (seicento) escluso Iva.\nIl Cliente si impegna a riconsegnare il veicolo e/o motociclo nelle condizioni e con le dotazioni presenti all'inizio noleggio salva normale usura.\nIn caso di smarrimento o furto della Carta di Circolazione originale del veicolo e/o motociclo, il Cliente dovrà risarcire una franchigia di € 200,00 (duecento) escluso Iva"
      },
      {
        title: '8. CONTACHILOMETRI',
        content: "In caso di guasto al contachilometri in dotazione, come nei casi in cui sia materialmente impossibile la rilevazione del chilometraggio percorso, si addebiterà una percorrenza convenzionale di 300 chilometri al giorno."
      },
      {
        title: '9. LEGGE APPLICABILE E FORO COMPETENTE',
        content: "I Termini e Condizioni sono regolate dalla legge italiana. Tutte le controversie che dovessero insorgere relativamente alla validità e/o interpretazione e/o esecuzione e/o risoluzione dei Termini e Condizioni saranno di competenza del Tribunale del luogo in cui il Cliente ha ritirato il Veicolo"
      },
      {
        title: '10. PRIVACY',
        content: "Secondo la normativa indicata, il trattamento relativo al presente servizio sarà improntato ai principi di correttezza, liceità, trasparenza e di tutela della Sua riservatezza e dei Suoi diritti.\nI dati personali dell’utente sono utilizzati da Arparia Rent Car di Arpaia Raffaele - VIA TORREBIANCA,12/14 - Aversa (CE) - P.IVA: 04102740612 - Tel: 0819763973 - E-mail: prenotazioni@arpaiarent.it, che ne è titolare del trattamento.\nAi sensi dell'articolo 13 del GDPR 2016/679, pertanto, Le forniamo le seguenti informazioni:\n1) TIPOLOGIA DI DATI RACCOLTI\nI dati personali che in occasione dell'attivazione del presente servizio saranno raccolti e trattati riguardano:\ndati identificativi (cognome e nome, residenza, domicilio, nascita, numero di telefono, indirizzo di fatturazione, identificativo online), documento d'identità (carta d’identità, passaporto, o patente), dati bancari, dati di localizzazione (ubicazione, GPS, GSM, altro);\n2) FINALITÁ E BASE GIURIDICA DEL TRATTAMENTO\nI dati personali raccolti saranno trattati per le seguenti finalità:\nper la conclusione e l’esecuzione di contratti di noleggio di veicoli e/o motocicli e di eventuali contratti collegati, per l'analisi ed il miglioramento dei Servizi, per la gestione di reclami e controversie, attuazione degli standard internazionali dei sistemi di pagamento (ad es., bonifici bancari, addebiti/accrediti mediante carte di credito, debito, ecc.)\nTali finalità sono congiuntamente definite “Finalità contrattuali”.\ncon il preventivo consenso dell’Utente, per attività di invio di materiale pubblicitario e utilizzo nell’ambito di analisi e studi commerciali e di abitudini di consumo. Tale finalità è definita \"Finalità di marketing\"\nIl trattamento dei dati personali degli Utenti è necessario, con riferimento alle Finalità contrattuali, a dare esecuzione al Contratto. Qualora l’Utente non fornisse i dati personali necessari per le Finalità contrattuali, non sarà possibile procedere alla stipula del contratto.\nIl trattamento per le Finalità di marketing è facoltativo. Qualora l’Utente neghi il suo consenso non potrà ricevere le comunicazioni commerciali. In qualsiasi momento, l’Utente potrà comunque revocare il consenso eventualmente prestato.\n3) MODALITÁ DI TRATTAMENTO DEI DATI\nI dati personali degli Utenti possono essere trattati con strumenti manuali o informatici, idonei a garantirne la sicurezza, la riservatezza e ad evitare accessi non autorizzati, diffusione, modifiche e sottrazioni dei dati grazie all'adozione di adeguate misure di sicurezza tecniche, fisiche ed organizzative.\n4) CATEGORIE DI DESTINATARI\nFerme restando le comunicazioni eseguite in adempimento di obblighi di legge e contrattuali, tutti i dati raccolti ed elaborati potranno essere comunicati esclusivamente per le finalità sopra specificate alle seguenti categorie di destinatari: Banche e istituti di credito; Persone autorizzate; Terzi fornitori di servizi di assistenza e consulenza con riferimento alle attività dei settori (a titolo meramente esemplificativo) tecnologico, contabile, amministrativo, legale, assicurativo, IT; Responsabili del trattamento.\n5) TRASFERIMENTO DATI VERSO UN PAESE ESTERO E/O UN’ORGANIZZAZIONE INTERNAZIONALE\nI dati da lei forniti non saranno oggetto di trasferimento in Paesi Extra UE o organizzazioni internazionali.\n6) TERMINI DI CONSERVAZIONE DEI DATI\na) per le Finalità contrattuali di cui al punto 2, i dati personali degli Utenti vengono conservati per un periodo pari alla durata del Contratto (ivi inclusi eventuali rinnovi) e per i 10 anni successivi al termine, risoluzione o recesso dello stesso, fatti salvi i casi in cui la conservazione per un periodo successivo sia richiesta per eventuali contenziosi, richieste delle autorità competenti o ai sensi della normativa applicabile;\nb) per le Finalità di Marketing relative all'invio di materiale pubblicitario e utilizzo nell’ambito di analisi e studi commerciali e di abitudini di consumo, i dati personali degli Utenti vengono conservati per la durata del Contratto e per un periodo di 5 anni successivo/i alla sua cessazione.\n7) DIRITTI DEGLI UTENTI RISPETTO AI LORO DATI PERSONALI\nSi potrà, in qualsiasi momento, esercitare i seguenti diritti:\nrichiedere maggiori informazioni in relazione ai contenuti della presente informativa;accesso ai dati personali;ottenere la rettifica o la cancellazione degli stessi o la limitazione del trattamento che lo riguardano (nei casi previsti dalla normativa);opporsi al trattamento (nei casi previsti dalla normativa);portabilità dei dati (nei casi previsti dalla normativa);revocare il consenso, ove previsto. La revoca del consenso non pregiudica la liceità del trattamento basata sul consenso conferito prima della revoca;proporre reclamo all'autorità di controllo (Garante Privacy)."
      },
      {
        title: '11. SANZIONI AMMINISTRATIVE',
        content: "In caso di sanzioni amministrative verranno addebitate direttamente al conduttore del veicolo."
      }
    ];
    
    // Stampa l'introduzione
    this.doc.fontSize(8).font('Helvetica').fillColor(this.colors.textLight);
    this.doc
        .text(termsData[0].content, { width: this.contentWidth, align: 'justify' });
    this.doc.moveDown(0.5);

    for (let i = 1; i < termsData.length; i++) {
        const term = termsData[i];
        
        // Titolo (es. 1. AFFIDAMENTO DEL VEICOLO)
        this.doc
            .font('Helvetica-Bold')
            .fillColor(this.colors.text)
            .text(term.title, { continued: false, paragraphGap: 2 });
        
        // Contenuto dell'articolo
        this.doc
            .font('Helvetica')
            .fillColor(this.colors.textLight)
            // L'utilizzo del testo normale con align: 'justify' gestisce bene i ritorni a capo
            .text(term.content, { width: this.contentWidth, align: 'justify' });

        this.doc.moveDown(0.8);
    }
    
    // Clausole finali (fuori dal loop)

    // Clausola 1: Consenso al Trattamento
    this.doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('In relazione al trattamento dei dati personali che lo riguardano, così come sopra descritto, il Cliente esprime liberamente il proprio consenso, ai sensi e per gli effetti della Legge.', 
          { width: this.contentWidth, align: 'justify' });
    this.doc.moveDown(0.3);
    
    // Clausola 2: Nullità
    this.doc
        .text('Qualora una disposizione del presente contratto di noleggio fosse nulla, tale nullità non determinerà l\'invalidità delle altre disposizioni del presente contratto di noleggio.', 
          { width: this.contentWidth, align: 'justify' });
    this.doc.moveDown(0.3);

    // Clausola 3: Valuta
    this.doc
        .text('Se il Cliente decide di pagare in una valuta diversa da quella con cui è stato quotato il costo del noleggio, il controvalore sarà calcolato sul tasso di cambio pubblicato dalla CITIBANK maggiorato del 4% a titolo di rimborso delle spese e commissioni bancarie e rischio oscillazioni cambi.', 
          { width: this.contentWidth, align: 'justify' });
    this.doc.moveDown(0.8);

    // BLOCCO CONSENSO CHECKBOX
    this.doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Il cliente ricevute le informazioni di cui all’art.13 del Regolamento UE 2016/679,', { continued: false });
    
    const consentY = this.doc.y;
    const checkboxX = this.pageMargin;
    const textAfterCheckboxX = checkboxX + 150; 

    // Disegna Checkbox (utilizzando Helvetica-Bold per la visibilità)
    this.doc
        .font('Helvetica-Bold')
        .text('[ X ] acconsente', checkboxX + 5, consentY + 5, { continued: false }); 
    
    this.doc
        .text('[ ] non acconsente', checkboxX + 5, consentY + 17, { continued: false });

    // Disegna il testo accanto alle checkbox
    this.doc
        .font('Helvetica')
        .fillColor(this.colors.textLight)
        .text('al trattamento dei dati personali per attività di invio di materiale pubblicitario e utilizzo nell’ambito di analisi e studi commerciali e di abitudini di consumo così come specificati nell\'informativa all\'articolo 10 (Privacy) punto 2 del presente contratto.', 
          textAfterCheckboxX, consentY + 5, { width: 365, align: 'justify' }); 

    this.doc.y = consentY + 45; // Avanza il cursore dopo il blocco

    // Approvazione finale
    this.doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(this.colors.text)
        .text('Il Cliente avendo preso visione dell\'informativa alla Privacy e delle Condizioni Generali di Noleggio, dichiara di approvarne specificatamente tutte le clausole.', 
            { width: this.contentWidth, align: 'justify' });
    
    this.doc.moveDown();
    this.addSignatureBox('Firma Cliente', this.doc.y);
  }

  // ============================================
  // FOTO (Pagina 3+)
  // ============================================

  addPhotosSection(title, photos) {
    this.doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(title, { align: 'center' });
    
    this.doc.moveDown();
    
    let x = this.pageMargin;
    let y = this.doc.y;
    const photoWidth = 240;
    const photoHeight = 180;
    const spacing = 15;
    
    photos.forEach((photo, index) => {
      // Calcolo la Y per il prossimo elemento prima di disegnare
      if (y > 700 - photoHeight - 40) { // Se lo spazio non è sufficiente per foto + didascalia
        this.doc.addPage();
        y = this.pageMargin;
        x = this.pageMargin;
      }
      
      if (fs.existsSync(photo.file_path)) {
        try {
          this.doc.image(photo.file_path, x, y, {
            width: photoWidth,
            height: photoHeight,
            fit: [photoWidth, photoHeight]
          });
          
          this.doc
            .fontSize(7)
            .font('Helvetica')
            .fillColor(this.colors.textLight)
            .text(`Creata il ${this.formatDateTime(photo.uploaded_at)}`, 
              x, y + photoHeight + 5, { width: photoWidth, align: 'center' });
          
          // Posiziona prossima foto
          if ((index + 1) % 2 === 0) {
            // Vai a nuova riga
            x = this.pageMargin;
            y += photoHeight + 40;
          } else {
            // Prossima colonna
            x += photoWidth + spacing;
          }
        } catch (err) {
          console.error(`Errore caricamento foto ${photo.file_path}:`, err);
        }
      }
    });
    
    this.doc.y = y; // Aggiorno il cursore finale
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  addSectionTitle(title) {
    this.doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(this.colors.primary)
      .text(title, this.pageMargin, this.doc.y);
    
    this.doc
      .moveTo(this.pageMargin, this.doc.y + 2)
      .lineTo(this.pageMargin + this.contentWidth, this.doc.y + 2)
      .stroke(this.colors.border);
    
    this.doc.moveDown(0.5);
  }

  addLabelValue(label, value, x = null, labelWidth = 120) {
    const currentY = this.doc.y;
    const xPos = x !== null ? x : this.pageMargin;
    
    // Stampa Label
    this.doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(this.colors.textLight)
      .text(label + ':', xPos, currentY, { width: labelWidth, continued: false });
    
    // Stampa Value
    this.doc
      .font('Helvetica')
      .fillColor(this.colors.text)
      .text(value || 'N/A', xPos + labelWidth, currentY, { width: 200, continued: false }); 
      
    // Imposta la nuova Y (avanzamento standard)
    const newY = currentY + 12;
    this.doc.y = newY;
    
    return newY; // Ritorna la nuova posizione Y
  }

  addSignatureBox(label, y) {
    const signatureY = y + 20;
    
    this.doc
      .moveTo(400, signatureY)
      .lineTo(540, signatureY)
      .stroke(this.colors.border);
    
    this.doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(this.colors.textLight)
      .text(label, 400, signatureY + 5);
      
    this.doc.y = signatureY + 20; // Avanzamento dopo la firma
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '€ 0.00';
    return `€ ${parseFloat(amount).toFixed(2)}`;
  }
}

module.exports = ContractGenerator;