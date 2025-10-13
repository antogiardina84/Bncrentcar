// contractGenerator.js
// Generatore PDF per Contratto di Noleggio - versione PDFMake (formale e compatta)
// Mantiene tutti i testi, riferimenti e collegamenti preesistenti.

const fs = require('fs');
const path = require('path');
const PdfPrinter = require('pdfmake');

const DAMAGE_DIAGRAM_IMAGE_PATH = path.join(__dirname, 'diagramma.png');

class ContractGenerator {
  constructor() {
    // Margini e caratteristiche generali (stile compatto/formale)
    this.pageSize = 'A4';
    this.pageMargins = [40, 40, 40, 40]; // left, top, right, bottom

    // Colori e stili (coerenti con design originale, compatto)
    this.colors = {
      primary: '#1a4d2e',
      primaryLight: '#4a7c59',
      text: '#2c3e50',
      textLight: '#6c757d',
      border: '#dee2e6'
    };

    // Font configuration: cerca i font nella cartella fonts o usa la variabile env FONTS_DIR
    const fontsDir = process.env.FONTS_DIR || path.join(__dirname, 'fonts');
    this.fonts = {
      Roboto: {
        normal: path.join(fontsDir, 'Roboto-Regular.ttf'),
        bold: path.join(fontsDir, 'Roboto-Medium.ttf'),
        italics: path.join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsDir, 'Roboto-MediumItalic.ttf'),
      }
    };

    // Se i font non esistono, pdfmake lancerà errore all'esecuzione: l'utente deve assicurarsi che i ttf siano disponibili.
    this.printer = new PdfPrinter(this.fonts);
  }

  // Genera il PDF su disco (outputPath)
  async generateContract(rentalData, outputPath) {
    return new Promise(async (resolve, reject) => {
      try {
        // Carica immagini (diagramma e foto) come data URLs se esistono
        const damageDiagramDataUrl = this._loadImageAsDataUrl(DAMAGE_DIAGRAM_IMAGE_PATH);

        // Carica foto di pickup e return trasformandole in dataURL quando esistono
        const pickPhotos = (rentalData.pickup_photos || []).map(p => ({
          dataUrl: this._loadImageAsDataUrl(p.file_path),
          uploaded_at: p.uploaded_at
        }));

        const returnPhotos = (rentalData.return_photos || []).map(p => ({
          dataUrl: this._loadImageAsDataUrl(p.file_path),
          uploaded_at: p.uploaded_at
        }));

        const docDefinition = this._buildDocumentDefinition(rentalData, damageDiagramDataUrl, pickPhotos, returnPhotos);

        const pdfDoc = this.printer.createPdfKitDocument(docDefinition, {});
        const stream = fs.createWriteStream(outputPath);
        pdfDoc.pipe(stream);
        pdfDoc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', (err) => reject(err));
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // Costruzione del documento (pdfmake)
  // ============================================
  _buildDocumentDefinition(data, damageDiagramDataUrl, pickupPhotos, returnPhotos) {
    // Company info (come nel file originale)
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

    // Stili
    const styles = {
      headerCompany: { fontSize: 12, bold: true, color: 'white' },
      headerSmall: { fontSize: 7, color: 'white' },
      boxTitle: { fontSize: 9, bold: true, color: 'white' },
      sectionTitle: { fontSize: 10, bold: true, color: this.colors.primary, margin: [0, 6, 0, 4] },
      label: { fontSize: 8, bold: true, color: this.colors.textLight },
      value: { fontSize: 8, color: this.colors.text },
      termsTitle: { fontSize: 12, bold: true, color: this.colors.primary, alignment: 'center', margin: [0, 6, 0, 8] },
      small: { fontSize: 8, color: this.colors.textLight },
      tiny: { fontSize: 7, color: this.colors.textLight }
    };

    // Left header box (company) + right info box (contract)
    const headerTable = {
      columns: [
        {
          width: 'auto',
          stack: [
            {
              canvas: [
                { type: 'rect', x: 0, y: 0, w: 320, h: 72, r: 4, color: this.colors.primary }
              ]
            },
            {
              // overlay content using absolutePosition is complex in pdfmake;
              // we'll simulate header with a table inside a colored background using background function below
              margin: [0, -68, 0, 0],
              table: {
                widths: [320],
                body: [
                  [
                    {
                      stack: [
                        { text: company.name, style: 'headerCompany', margin: [12, 12, 0, 2] },
                        { text: `${company.address}`, style: 'headerSmall', margin: [12, 0, 0, 0] },
                        { text: `${company.zip} - ${company.city} - ${company.province}`, style: 'headerSmall', margin: [12, 0, 0, 0] },
                        { text: `Cod. Fisc: ${company.cf} / P.IVA ${company.vat}`, style: 'headerSmall', margin: [12, 0, 0, 0] },
                        { text: `Tel: ${company.phone} - Email: ${company.email}`, style: 'headerSmall', margin: [12, 0, 0, 6] },
                      ]
                    }
                  ]
                ]
              },
              layout: {
                defaultBorder: false
              }
            }
          ]
        },
        {
          width: '*',
          stack: [
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: 'CONTRATTO DI NOLEGGIO',
                          style: 'boxTitle',
                          margin: [0, 4, 0, 3],
                          alignment: 'center',
                        }
                      ],
                      fillColor: this.colors.primaryLight,
                      margin: [0, 0, 0, 0]
                    }
                  ],
                  [
                    {
                      columns: [
                        {
                          width: '*',
                          text: [
                            { text: `Data: `, style: 'label' },
                            { text: ` ${this.formatDateTime(data.rental_date || data.pickup_date)}\n`, style: 'value' },
                            { text: `N°: `, style: 'label' },
                            { text: ` ${data.rental_number}\n`, style: 'value' },
                            { text: `Codice: `, style: 'label' },
                            { text: ` ${data.booking_code || 'N/A'}`, style: 'value' }
                          ],
                          margin: [8, 6, 0, 6]
                        }
                      ]
                    }
                  ]
                ]
              },
              layout: 'noBorders'
            }
          ]
        }
      ]
    };

    // Helper: small label/value pair in two columns
    const kv = (label, value) => {
      return {
        columns: [
          { width: 110, text: label + ':', style: 'label' },
          { width: '*', text: value || 'N/A', style: 'value' }
        ],
        columnGap: 6
      };
    };

    // Client section (two columns compact)
    const customer = data.customer || data;
    const clientSection = [
      { text: 'Informazioni Cliente', style: 'sectionTitle' },
      {
        columns: [
          {
            width: '50%',
            stack: [
              kv('Cliente/Azienda', customer.full_name),
              kv('Indirizzo', customer.address),
              kv('Città', `${customer.city}${customer.zip_code ? ', ' + customer.zip_code : ''}${customer.province ? ', ' + customer.province : ''}${customer.country ? ', ' + customer.country : ''}`),
              kv('C.F.', customer.fiscal_code),
              ...(customer.vat_number ? [kv('P. IVA', customer.vat_number)] : [])
            ]
          },
          {
            width: '50%',
            stack: [
              kv('Telefono', customer.phone),
              kv('Email', customer.email),
              kv('Numero patente', customer.license_number),
              kv('Luogo emissione', customer.license_issued_by),
              kv('Data emissione', this.formatDate(customer.license_issue_date)),
              kv('Data Scadenza', this.formatDate(customer.license_expiry_date))
            ]
          }
        ],
        columnGap: 14
      }
    ];

    // Vehicle section (compact three/four columns)
    const vehicle = data.vehicle || data;
    const vehicleSection = [
      { text: 'Informazioni Veicolo', style: 'sectionTitle' },
      {
        columns: [
          { width: 'auto', stack: [kv('Targa', vehicle.license_plate)] },
          { width: 'auto', stack: [kv('Categoria', data.category_name || 'N/A')] },
          { width: 'auto', stack: [kv('Marca', vehicle.brand)] },
          { width: '*', stack: [kv('Modello', vehicle.model)] }
        ],
        columnGap: 10
      }
    ];

    // Pricing section: create a small two-column table + totals
    const pricingItems = [
      { label: 'Tariffa di noleggio', value: this.formatCurrency(data.daily_rate) },
      { label: 'Costo consegna/ritiro', value: this.formatCurrency(data.delivery_cost || 0) },
      { label: 'Addebito carburante', value: this.formatCurrency(data.fuel_charge || 0) },
      { label: 'Addebito fuori orario', value: this.formatCurrency(data.after_hours_charge || 0) },
      { label: 'Servizi ed extra', value: this.formatCurrency(data.extras_charge || 0) },
      { label: 'Addebito Km extra', value: this.formatCurrency(data.extra_km_charge || 0) },
      { label: 'Franchigia Addebitata', value: this.formatCurrency(data.franchise_charge || 0) },
      { label: 'Sconto Applicato', value: this.formatCurrency(data.discount || 0) }
    ];

    const priceLeft = pricingItems.slice(0, 4).map(i => [ { text: i.label, style: 'label' }, { text: i.value, style: 'value', alignment: 'right' } ]);
    const priceRight = pricingItems.slice(4).map(i => [ { text: i.label, style: 'label' }, { text: i.value, style: 'value', alignment: 'right' } ]);

    const pricingSection = [
      { text: 'Dettagli Tariffari', style: 'sectionTitle' },
      {
        columns: [
          {
            width: '58%',
            table: {
              widths: ['*', 80],
              body: [
                ...priceLeft
              ]
            },
            layout: {
              hLineWidth: function(i, node) { return 0; },
              vLineWidth: function(i, node) { return 0; }
            }
          },
          {
            width: '42%',
            stack: [
              {
                table: {
                  widths: ['*', 80],
                  body: [
                    ...priceRight,
                    [{ text: 'Totale', style: 'label' }, { text: this.formatCurrency(data.total_amount), style: 'value', alignment: 'right' }],
                    [{ text: 'Totale Versato', style: 'label' }, { text: this.formatCurrency(data.amount_paid || 0), style: 'value', alignment: 'right' }],
                    [{ text: 'Da versare', style: 'label' }, { text: this.formatCurrency(data.amount_due || 0), style: 'value', alignment: 'right' }],
                    [{ text: 'Metodo di pagamento', style: 'label' }, { text: data.payment_method || 'Contanti', style: 'value', alignment: 'right' }],
                    [{ text: 'Cauzione', style: 'label' }, { text: this.formatCurrency(data.deposit_amount || 0), style: 'value', alignment: 'right' }],
                    [{ text: 'Metodo cauzione', style: 'label' }, { text: data.deposit_method || 'Contanti', style: 'value', alignment: 'right' }],
                  ]
                },
                layout: 'noBorders'
              }
            ]
          }
        ]
      }
    ];

    // Franchigie section
    const franchiseSection = [
      { text: 'Franchigie Assicurative', style: 'sectionTitle' },
      {
        columns: [
          { width: '33%', stack: [kv('Franchigia Furto/Incendio', this.formatCurrency(data.franchise_theft || 0))] },
          { width: '33%', stack: [kv('Franchigia danni', this.formatCurrency(data.franchise_damage || 0))] },
          { width: '33%', stack: [kv('Franchigia RCA', this.formatCurrency(data.franchise_rca || 0))] }
        ],
        columnGap: 8
      }
    ];

    // Services & extras
    const servicesSection = [
      { text: 'Servizi & Extra', style: 'sectionTitle' },
      { text: `Il veicolo noleggiato include Km ${data.km_included === 'unlimited' || !data.km_included ? 'Illimitati' : data.km_included}`, style: 'value', margin: [0, 0, 0, 6] }
    ];

    // Pickup section (with damages description and optional diagram)
    const pickupSection = [
      { text: 'Informazioni Uscita', style: 'sectionTitle' },
      {
        columns: [
          {
            width: '60%',
            stack: [
              kv('Luogo', data.pickup_location),
              kv('Data', this.formatDateTime(data.pickup_date))
            ]
          },
          {
            width: '40%',
            stack: [
              kv('Livello Carburante', `${Number(data.pickup_fuel_level || 0)}%`),
              kv('Km in uscita', data.pickup_km?.toString() || '0')
            ]
          }
        ],
        columnGap: 12
      },
      ...(data.pickup_damages ? [
        { text: 'Descrizione Danni:', style: 'label', margin: [0, 6, 0, 2] },
        { text: data.pickup_damages, style: 'small', margin: [0, 0, 0, 6] }
      ] : [{ text: '', margin: [0, 4, 0, 0] }]),
      // Diagramma danni (se disponibile)
      ...(damageDiagramDataUrl ? [
        {
          columns: [
            { width: '*', image: damageDiagramDataUrl, fit: [180, 140] },
            { width: '*', text: '', margin: [10,0,0,0] }
          ],
          columnGap: 12,
          margin: [0, 0, 0, 6]
        }
      ] : [])
    ];

    // Return section (if actual_return_date else expected)
    let returnSectionContent = [];
    if (data.actual_return_date || data.return_date) {
      returnSectionContent = [
        { text: 'Informazioni Rientro', style: 'sectionTitle' },
        {
          columns: [
            {
              width: '60%',
              stack: [
                kv('Luogo', data.return_location || data.pickup_location),
                kv('Data', this.formatDateTime(data.actual_return_date || data.return_date))
              ]
            },
            {
              width: '40%',
              stack: [
                kv('Livello Carburante', data.return_fuel_level ? `${data.return_fuel_level}%` : 'N/A'),
                kv('Km al rientro', data.return_km?.toString() || 'N/A')
              ]
            }
          ],
          columnGap: 12
        },
        ...(data.return_damages ? [
          { text: 'Descrizione Danni:', style: 'label', margin: [0, 6, 0, 2] },
          { text: data.return_damages, style: 'small', margin: [0, 0, 0, 6] }
        ] : [{ text: '', margin: [0, 4, 0, 0] }]),
        ...(damageDiagramDataUrl ? [
          {
            columns: [
              { width: '*', image: damageDiagramDataUrl, fit: [180, 140] },
              { width: '*', text: '', margin: [10,0,0,0] }
            ],
            columnGap: 12,
            margin: [0, 0, 0, 6]
          }
        ] : [])
      ];
    } else {
      returnSectionContent = [
        { text: 'Rientro Previsto', style: 'sectionTitle' },
        {
          columns: [
            { width: '60%', stack: [ kv('Luogo', data.pickup_location), kv('Data', this.formatDateTime(data.expected_return_date)) ] },
            { width: '40%', stack: [ kv('Km inclusi', data.km_included === 'unlimited' ? 'Illimitati' : data.km_included) ] }
          ],
          columnGap: 12
        },
        {
          text: 'Il veicolo dovrà essere riconsegnato nelle stesse condizioni in cui si trovava in sede di consegna. Pulizia e carburante dovranno essere ripristinati come all\'inizio del noleggio, salvo diverse pattuizioni.',
          style: 'small',
          margin: [0, 6, 0, 10],
          alignment: 'justify'
        }
      ];
    }

    // Firma cliente box compatto (posizionato alla fine della prima pagina se possibile)
    const signatureBlock = [
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 220,
            stack: [
              {
                canvas: [
                  { type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, color: this.colors.border }
                ],
                margin: [0, 20, 0, 2]
              },
              { text: 'Firma Cliente', style: 'tiny', margin: [0, 2, 0, 0], alignment: 'center' }
            ]
          }
        ],
        columnGap: 8
      }
    ];

    // Terms and Conditions - riporto i testi originali (esattamente come nel file)
    const termsData = this._getTermsData();

    // Costruisco l'array dei contenuti principali - prima pagina
    const content = [
      headerTable,
      { text: '\n' },
      ...clientSection,
      { text: '\n' },
      ...vehicleSection,
      { text: '\n' },
      ...pricingSection,
      { text: '\n' },
      ...franchiseSection,
      { text: '\n' },
      ...servicesSection,
      { text: '\n' },
      ...pickupSection,
      { text: '\n' },
      ...returnSectionContent,
      { text: '\n' },
      ...signatureBlock
    ];

    // Pagina successiva: condizioni generali
    const termsPage = [
      { text: 'CONDIZIONI GENERALI DI NOLEGGIO', style: 'termsTitle' },
      { text: termsData.intro, style: 'small', margin: [0, 0, 0, 8], alignment: 'justify' }
    ];

    // aggiungo ogni articolo come titolo + testo
    termsData.articles.forEach(article => {
      termsPage.push({ text: article.title, style: 'label', margin: [0, 6, 0, 2] });
      termsPage.push({ text: article.content, style: 'small', margin: [0, 0, 0, 6], alignment: 'justify' });
    });

    // Clausole finali e blocco consenso checkbox
    termsPage.push({ text: termsData.clauseConsent, style: 'small', margin: [0, 6, 0, 4], alignment: 'justify' });

    // Checkbox consent (compatto)
    termsPage.push({
      columns: [
        {
          width: 120,
          stack: [
            { text: '[ X ] acconsente', style: 'label' },
            { text: '[ ] non acconsente', style: 'label', margin: [0, 6, 0, 0] }
          ]
        },
        {
          width: '*',
          text: 'al trattamento dei dati personali per attività di invio di materiale pubblicitario e utilizzo nell’ambito di analisi e studi commerciali e di abitudini di consumo così come specificati nell\'informativa all\'articolo 10 (Privacy) punto 2 del presente contratto.',
          style: 'small',
          alignment: 'justify'
        }
      ],
      columnGap: 8,
      margin: [0, 4, 0, 8]
    });

    termsPage.push({ text: 'Il Cliente avendo preso visione dell\'informativa alla Privacy e delle Condizioni Generali di Noleggio, dichiara di approvarne specificatamente tutte le clausole.', style: 'small', margin: [0, 6, 0, 8], alignment: 'justify' });

    // Firma alla fine delle condizioni
    termsPage.push({
      columns: [
        { width: '*', text: '' },
        {
          width: 220,
          stack: [
            {
              canvas: [
                { type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.5, color: this.colors.border }
              ],
              margin: [0, 20, 0, 2]
            },
            { text: 'Firma Cliente', style: 'tiny', margin: [0, 2, 0, 0], alignment: 'center' }
          ]
        }
      ]
    });

    // Foto pages: una o più pagine per foto pick/return - 2 per riga, 2 righe per pagina (compact)
    const photosPages = [];
    const makePhotoBlocks = (title, photos) => {
      if (!photos || photos.length === 0) return [];
      const blocks = [];
      blocks.push({ text: title, style: 'termsTitle' });
      const photoRows = [];
      let row = [];
      photos.forEach((p, idx) => {
        const image = p.dataUrl || null;
        const caption = p.uploaded_at ? `Creata il ${this.formatDateTime(p.uploaded_at)}` : 'Creata il N/A';
        const cell = image ? {
          stack: [
            { image: image, width: 240, height: 180, fit: [240, 180] },
            { text: caption, style: 'tiny', margin: [0, 4, 0, 0], alignment: 'center' }
          ]
        } : {
          stack: [
            { text: 'Immagine non disponibile', style: 'tiny', margin: [0, 60, 0, 0], alignment: 'center' },
            { text: caption, style: 'tiny', margin: [0, 4, 0, 0], alignment: 'center' }
          ],
          width: 240
        };

        row.push(cell);

        if (row.length === 2 || idx === photos.length - 1) {
          // fill to two columns if last incomplete
          if (row.length === 1) row.push({ text: '' });
          photoRows.push({ columns: row, columnGap: 15, margin: [0, 10, 0, 10] });
          row = [];
        }
      });

      return blocks.concat(photoRows);
    };

    if (pickupPhotos && pickupPhotos.length > 0) {
      photosPages.push(...makePhotoBlocks('Foto veicolo in uscita', pickupPhotos));
    }
    if (returnPhotos && returnPhotos.length > 0) {
      photosPages.push(...makePhotoBlocks('Foto veicolo al rientro', returnPhotos));
    }

    // Document Definition
    const docDefinition = {
      pageSize: this.pageSize,
      pageMargins: this.pageMargins,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
        color: this.colors.text
      },
      content: [
        ...content,
        { text: '', pageBreak: 'after' },
        ...termsPage,
        ...(photosPages.length > 0 ? [{ text: '', pageBreak: 'after' }, ...photosPages] : [])
      ],
      styles,
      // Background: color block behind left header rectangle
      background: (currentPage, pageSize) => {
        // We only want the header colored on the first page; pdfmake's background function called each page - restrict to first page
        if (currentPage === 1) {
          return [
            {
              canvas: [
                { type: 'rect', x: 40, y: 40, w: 320, h: 72, r: 4, color: this.colors.primary }
              ]
            }
          ];
        }
        return [];
      },
      info: {
        title: `Contratto Noleggio ${data.rental_number}`,
        author: process.env.COMPANY_NAME || 'BNC Energy Rent Car'
      }
    };

    return docDefinition;
  }

  // ============================================
  // Helpers
  // ============================================
  _loadImageAsDataUrl(filePath) {
    try {
      if (!filePath) return null;
      if (!fs.existsSync(filePath)) return null;
      const ext = path.extname(filePath).toLowerCase().replace('.', '');
      const allowed = ['png', 'jpg', 'jpeg'];
      if (!allowed.includes(ext)) return null;
      const data = fs.readFileSync(filePath);
      const base64 = data.toString('base64');
      const mime = ext === 'jpg' ? 'jpeg' : ext;
      return `data:image/${mime};base64,${base64}`;
    } catch (err) {
      // Non fatale: ritorna null
      return null;
    }
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'N/A';
    // orario 24h con due cifre
    const datePart = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timePart = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  }

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '€ 0.00';
    const v = parseFloat(amount);
    if (isNaN(v)) return '€ 0.00';
    return `€ ${v.toFixed(2)}`;
  }

  // Restituisce i testi delle condizioni (identici agli originali)
  _getTermsData() {
    // ATTENZIONE: i testi qui sono stati mantenuti pari pari dal contratto originale.
    const intro = "Il presente contratto rappresenta una sintesi delle principali disposizioni delle Condizioni Generali di Noleggio che insieme alla lettera di noleggio sottoscritta dal Cliente, costituiscono la fonte esclusiva che regola il rapporto contrattuale intercorrente tra la società di noleggio BNCEnergy srl, Via Decio Furnò, 26 Siracusa (SR) e il cliente o propri Affiliati.";

    const articles = [
      {
        title: '1. AFFIDAMENTO DEL VEICOLO',
        content: "La guida del veicolo e/o motociclo oggetto di locazione è consentita solo a persona in possesso di valida patente di guida di tipo \"A1\" \"A2\" \"A3\" e \"B\".\nE' richiesta la seguente età minima:\n-\"A1\" - 16 anni per motocicli fino a 11 kw - \"A2\" - 18 anni per motocicli fino a 35kw e \"A3\" 24 anni per motocicli superiori a 35kw.\n-\"B\"- 18 anni - solo per neopatentati, veicoli fino a 55 KW - dopo 01 anno di possesso della Patente \"B\" tutti i tipi di Autoveicoli fino a 9 posti.\n-\"B\" - 18 anni per tutti i tipi di Autocarro fino a 35q.\nIl veicolo e/o motociclo è affidato al Cliente nel presupposto che lo stesso lo utilizzi conducendolo personalmente.\nIl Cliente si assume ogni rischio o responsabilità in caso di affidamento della guida del veicolo e/o motociclo a terzi, ed anche agli effetti dell'art. 116 comma 12 del Codice della Strada(D.L.285/92), relativo all'affidamento del veicolo e/o motociclo a persona sprovvista di patente di guida o, comunque, non autorizzata dalla società di noleggio.\nIl Cliente potrà comunicare alla Società di noleggio presso cui ha noleggiato il veicolo e/o motociclo il nominativo di eventuali altre persone che potranno condurre il veicolo e/o motociclo i quali verranno autorizzati in secondo momento sotto presentazione di giusta autorizzazione alla guida(patente). Per ogni altra guida autorizzata è richiesto un supplemento giornaliero il cui importo è pari al 50% di quello descritto per il tipo di veicolo e/o motociclo già noleggiato. Per particolari gruppi di veicoli in particolari zone può essere richiesto, a discrezione della Società di Noleggio, il possesso di due Carte di Credito."
      },
      {
        title: '2. PAGAMENTO DEL NOLO',
        content: "Con Carte di Credito/Debito, previo rilascio di apposita autorizzazione dell'Istituto emittente; e/o contanti. Con il pagamento in contanti è obbligatorio versare un deposito cauzionale mediante assegno Circolare intestato a BNCEnergy srl , l'importo viene stabilito in base al tipo di veicolo e/o motociclo da noleggiare. Il cliente possessore di carta di credito finanziaria autorizza la Società di Noleggio ad addebitare sul relativo conto tutti gli oneri a suo carico aventi titolo dal rapporto di noleggio, ivi inclusi quelli eventualmente necessari per il recupero di ogni genere di credito vantato dalla Società di Noleggio nei confronti del cliente in relazione al rapporto di noleggio."
      },
      {
        title: '3. FRANCHIGIE ASSICURAZIONE DANNI RC - KASCO - FURTO - INCENDIO',
        content: "Il veicolo e/o motociclo noleggiato è coperto da assicurazione R.C.A. e KASCO a norma delle vigenti leggi.\nQualora il Cliente debba occorrere uno degli eventi suddetti, sarà a suo carico la franchigia come indicato nella lettera nolo; in caso di furto e/o incendio la franchigia a carico del cliente è quella indicata nella lettera nolo e, in base al veicolo e/o motociclo noleggiato.\n(A) In caso di IRRIPARABILITA' totale del veicolo e/o motociclo noleggiato, dovuto ad incidente grave, per guida in stato di ebbrezza e/o uso di stupefacenti, la franchigia a carico del Cliente è pari al 100% del valore attuale del veicolo e/o motociclo noleggiato.\nPer i veicoli e/o motociccli muniti di antifurto Diablock o Blockshaft, se il Cliente vittima di furto del veicolo e/o motociclo noleggiato, non restituisce oltre alla chiave originale di apertura ed accensione, anche quella di uno degli antifurti citati, dovrà pagare una franchigia pari al 100% del valore attuale del veicolo. In tutti i casi di sinistro, furto, incendio, parziale o totale, è fatto obbligo al Cliente di effettuare regolare denuncia presso le Autorità competenti e, entro le 12 ore dall'evento, di consegnarla alla società di noleggio.\nI danni relativi al sinistro non sono addebitabili al cliente che produca modello C.I.D. con chiara e sottoscritta responsabilità della controparte.\nIl Cliente può scegliere di sottoscrivere il Servizio Aggiuntivo che riduce o elimina la penale per Responsabilità Economica, per chi si rende responsabile di al veicolo e/o motociclo. La sottoscrizione del Servizio Aggiuntivo che riduce o elimina la responsabilità per danni oltre ad avere un costo aggiuntivo al normale prezzo del Listino ufficiale per il veicolo e/o motociclo noleggiato, (con esclusione dei danni di cui al punto(A) che precede), non esonera il Cliente dall'adottare l'ordinaria diligenza nella conduzione del veicolo e/o motociclo.\nBNCEnergy srl , a titolo di penale si riserva la facoltà di procedere all'addebito di danni riconducibili a responsabilità del Cliente."
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
        content: "Secondo la normativa indicata, il trattamento relativo al presente servizio sarà improntato ai principi di correttezza, liceità, trasparenza e di tutela della Sua riservatezza e dei Suoi diritti.\nI dati personali dell’utente sono utilizzati da BNCEnergy srl Via Decio Furnò, 26 Siracusa (SR) - P.IVA: 02024200897 - Tel: 3881951562 - E-mail: info@bncenergy.it, che ne è titolare del trattamento.\nAi sensi dell'articolo 13 del GDPR 2016/679, pertanto, Le forniamo le seguenti informazioni:\n1) TIPOLOGIA DI DATI RACCOLTI\nI dati personali che in occasione dell'attivazione del presente servizio saranno raccolti e trattati riguardano:\ndati identificativi (cognome e nome, residenza, domicilio, nascita, numero di telefono, indirizzo di fatturazione, identificativo online), documento d'identità (carta d’identità, passaporto, o patente), dati bancari, dati di localizzazione (ubicazione, GPS, GSM, altro);\n2) FINALITÁ E BASE GIURIDICA DEL TRATTAMENTO\nI dati personali raccolti saranno trattati per le seguenti finalità:\nper la conclusione e l’esecuzione di contratti di noleggio di veicoli e/o motocicli e di eventuali contratti collegati, per l'analisi ed il miglioramento dei Servizi, per la gestione di reclami e controversie, attuazione degli standard internazionali dei sistemi di pagamento (ad es., bonifici bancari, addebiti/accrediti mediante carte di credito, debito, ecc.)\nTali finalità sono congiuntamente definite “Finalità contrattuali”.\ncon il preventivo consenso dell’Utente, per attività di invio di materiale pubblicitario e utilizzo nell’ambito di analisi e studi commerciali e di abitudini di consumo. Tale finalità è definita \"Finalità di marketing\"\nIl trattamento dei dati personali degli Utenti è necessario, con riferimento alle Finalità contrattuali, a dare esecuzione al Contratto. Qualora l’Utente non fornisse i dati personali necessari per le Finalità contrattuali, non sarà possibile procedere alla stipula del contratto.\nIl trattamento per le Finalità di marketing è facoltativo. Qualora l’Utente neghi il suo consenso non potrà ricevere le comunicazioni commerciali. In qualsiasi momento, l’Utente potrà comunque revocare il consenso eventualmente prestato.\n3) MODALITÁ DI TRATTAMENTO DEI DATI\nI dati personali degli Utenti possono essere trattati con strumenti manuali o informatici, idonei a garantirne la sicurezza, la riservatezza e ad evitare accessi non autorizzati, diffusione, modifiche e sottrazioni dei dati grazie all'adozione di adeguate misure di sicurezza tecniche, fisiche ed organizzative.\n4) CATEGORIE DI DESTINATARI\nFerme restando le comunicazioni eseguite in adempimento di obblighi di legge e contrattuali, tutti i dati raccolti ed elaborati potranno essere comunicati esclusivamente per le finalità sopra specificate alle seguenti categorie di destinatari: Banche e istituti di credito; Persone autorizzate; Terzi fornitori di servizi di assistenza e consulenza con riferimento alle attività dei settori (a titolo meramente esemplificativo) tecnologico, contabile, amministrativo, legale, assicurativo, IT; Responsabili del trattamento.\n5) TRASFERIMENTO DATI VERSO UN PAESE ESTERO E/O UN’ORGANIZZAZIONE INTERNAZIONALE\nI dati da lei forniti non saranno oggetto di trasferimento in Paesi Extra UE o organizzazioni internazionali.\n6) TERMINI DI CONSERVAZIONE DEI DATI\na) per le Finalità contrattuali di cui al punto 2, i dati personali degli Utenti vengono conservati per un periodo pari alla durata del Contratto (ivi inclusi eventuali rinnovi) e per i 10 anni successivi al termine, risoluzione o recesso dello stesso, fatti salvi i casi in cui la conservazione per un periodo successivo sia richiesta per eventuali contenziosi, richieste delle autorità competenti o ai sensi della normativa applicabile;\nb) per le Finalità di Marketing relative all'invio di materiale pubblicitario e utilizzo nell’ambito di analisi e studi commerciali e di abitudini di consumo, i dati personali degli Utenti vengono conservati per la durata del Contratto e per un periodo di 5 anni successivo/i alla sua cessazione.\n7) DIRITTI DEGLI UTENTI RISPETTO AI LORO DATI PERSONALI\nSi potrà, in qualsiasi momento, esercitare i seguenti diritti:\nrichiedere maggiori informazioni in relazione ai contenuti della presente informativa;accesso ai dati personali;ottenere la rettifica o la cancellazione degli stessi o la limitazione del trattamento che lo riguardano (nei casi previsti dalla normativa);opporsi al trattamento (nei casi previsti dalla normativa);portabilità dei dati (nei casi previsti dalla normativa);revocare il consenso, ove previsto. La revoca del consenso non pregiudica la liceità del trattamento basata sul consenso conferito prima della revoca;proporre reclamo all'autorità di controllo (Garante Privacy)."
      },
      {
        title: '11. SANZIONI AMMINISTRATIVE',
        content: "In caso di sanzioni amministrative verranno addebitate direttamente al conduttore del veicolo."
      }
    ];

    const clauseConsent = "In relazione al trattamento dei dati personali che lo riguardano, così come sopra descritto, il Cliente esprime liberamente il proprio consenso, ai sensi e per gli effetti della Legge.";

    return { intro, articles, clauseConsent };
  }
}

module.exports = ContractGenerator;
