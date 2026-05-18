/* NeuroMap — Sample data
   Note d'esempio di uno studente di medicina al 3° anno.
   Cross-linkate per illustrare l'auto-link e l'Atlante.
*/

const FOLDERS = [
  { id: 'fisio',  name: 'Fisiologia',   tag: 'tag-fisio',  color: 'var(--accent)' },
  { id: 'anato',  name: 'Anatomia',     tag: 'tag-anato',  color: 'var(--ocra)' },
  { id: 'isto',   name: 'Istologia',    tag: 'tag-isto',   color: 'oklch(45% 0.07 145)' },
  { id: 'pato',   name: 'Patologia',    tag: 'tag-pato',   color: 'var(--rose)' },
  { id: 'farma',  name: 'Farmacologia', tag: 'tag-farma',  color: 'var(--plum)' },
  { id: 'clin',   name: 'Clinica',      tag: 'tag-clin',   color: 'var(--sky)' },
];

// Body regions — px,py = pin position (outside body); tx,ty = organ anchor
// on the silhouette where the leader line points. hit = invisible click area
// over the organ. ViewBox 360x820 (tall to include feet).
const REGIONS = [
  // Left-side pins
  { id: 'cervello', label: 'Cervello',  px: 60,  py: 56,  tx: 180, ty: 60,
    hit: 'M150,28 a30,38 0 1,0 60,0 a30,38 0 1,0 -60,0' },
  { id: 'polmoni',  label: 'Polmoni',   px: 60,  py: 188, tx: 140, ty: 210,
    hit: 'M118,166 h44 v68 h-44 z' },
  { id: 'fegato',   label: 'Fegato',    px: 60,  py: 262, tx: 152, ty: 274,
    hit: 'M128,254 h54 v38 h-54 z' },
  { id: 'pancreas', label: 'Pancreas',  px: 60,  py: 308, tx: 180, ty: 308,
    hit: 'M150,300 h60 v14 h-60 z' },
  { id: 'intestino',label: 'Intestino', px: 60,  py: 384, tx: 180, ty: 392,
    hit: 'M142,348 h76 v66 h-76 z' },

  // Right-side pins
  { id: 'tiroide',  label: 'Tiroide',   px: 300, py: 126, tx: 180, ty: 130,
    hit: 'M165,118 h30 v18 h-30 z' },
  { id: 'cuore',    label: 'Cuore',     px: 300, py: 200, tx: 186, ty: 198,
    hit: 'M168,178 h36 v44 h-36 z' },
  { id: 'stomaco',  label: 'Stomaco',   px: 300, py: 272, tx: 210, ty: 282,
    hit: 'M190,258 h36 v32 h-36 z' },
  { id: 'reni',     label: 'Reni',      px: 300, py: 326, tx: 224, ty: 326,
    hit: 'M214,312 h28 v34 h-28 z' },
  { id: 'scheletro',label: 'Scheletro', px: 300, py: 550, tx: 226, ty: 556,
    hit: 'M210,520 h30 v100 h-30 z' },
];

const NOTES = [
  {
    id: 'n01',
    title: 'Ciclo cardiaco',
    starred: true,
    folder: 'fisio',
    regions: ['cuore'],
    subregions: ['ventricolo-sx', 'valvole'],
    refs: ['guyton-14', 'berne-7'],
    updated: '2 giorni fa',
    excerpt: 'Sistole atriale, sistole ventricolare isovolumetrica, eiezione rapida, eiezione ridotta, protodiastole, rilasciamento isovolumetrico, riempimento ventricolare rapido e diastasi.',
    related: ['n02', 'n03', 'n04'],
    blocks: [
      { type: 'p', text: 'Il [[ciclo cardiaco]] è la sequenza di eventi meccanici ed elettrici che si ripetono ad ogni battito. La sua durata a 75 bpm è di circa 0.8 secondi.' },
      { type: 'h2', text: 'Le sette fasi' },
      { type: 'p', text: 'Si distinguono classicamente sette fasi, raggruppate in sistole e diastole. La [[contrazione isovolumetrica]] genera il primo tono cardiaco; il rilasciamento isovolumetrico il secondo.' },
      { type: 'callout', kind: '', text: 'Mnemonica: <b>SIRD</b> — Sistole atriale, contrazione Isovolumetrica, eiezione Rapida, eiezione Ridotta. Diastole inizia con il rilasciamento isovolumetrico.' },
      { type: 'h3', text: 'Pressioni a confronto' },
      { type: 'table',
        head: ['Camera', 'Pressione sistolica', 'Pressione diastolica'],
        rows: [
          ['Ventricolo sinistro', '120 mmHg', '0–10 mmHg'],
          ['Aorta', '120 mmHg', '80 mmHg'],
          ['Ventricolo destro', '25 mmHg', '0–8 mmHg'],
          ['Arteria polmonare', '25 mmHg', '8–10 mmHg'],
        ]},
      { type: 'image', caption: 'Diagramma di Wiggers — pressioni, volumi, ECG e fonocardiogramma sovrapposti.' },
      { type: 'p', text: 'L\'apertura della [[valvola mitrale]] segna l\'inizio del riempimento ventricolare; la sua chiusura coincide con l\'inizio della contrazione isovolumetrica.' },
      { type: 'callout', kind: 'ocra', text: 'Cross-reference: vedi [[Anatomia del cuore]] per la disposizione delle valvole, e [[Beta-bloccanti]] per il loro effetto sul ciclo (riduzione di FC e contrattilità).' },
    ],
  },
  {
    id: 'n02',
    title: 'Anatomia del cuore',
    folder: 'anato',
    regions: ['cuore'],
    subregions: ['atrio-dx', 'atrio-sx', 'ventricolo-dx', 'ventricolo-sx', 'valvole', 'coronarie'],
    refs: ['netter-7'],
    updated: '5 giorni fa',
    excerpt: 'Posizione mediastinica, 4 camere, valvole atrio-ventricolari e semilunari, vasi epicardici, sistema di conduzione.',
    related: ['n01', 'n03'],
    blocks: [
      { type: 'p', text: 'Il cuore è situato nel mediastino medio, racchiuso dal pericardio. Pesa ~300 g nell\'adulto.' },
    ],
  },
  {
    id: 'n03',
    title: 'Infarto miocardico acuto',
    folder: 'pato',
    regions: ['cuore'],
    subregions: ['ventricolo-sx', 'coronarie'],
    refs: ['robbins-10', 'esc-2023'],
    updated: 'ieri',
    excerpt: 'Necrosi del miocardio per occlusione coronarica. STEMI vs NSTEMI. Diagnosi: clinica + ECG + troponine. Finestra terapeutica.',
    related: ['n01', 'n04'],
    blocks: [
      { type: 'p', text: 'L\'IMA è la conseguenza più grave della cardiopatia ischemica.' },
    ],
  },
  {
    id: 'n04',
    title: 'Beta-bloccanti',
    folder: 'farma',
    regions: ['cuore'],
    subregions: ['conduzione', 'ventricolo-sx'],
    refs: ['katzung-15'],
    updated: '3 giorni fa',
    excerpt: 'Antagonisti competitivi dei recettori β-adrenergici. Riducono FC, contrattilità e conduzione AV. Indicazioni: ipertensione, IMA, scompenso, aritmie.',
    related: ['n01', 'n03'],
    blocks: [
      { type: 'p', text: 'I beta-bloccanti riducono frequenza e contrattilità modulando la risposta simpatica.' },
    ],
  },
  {
    id: 'n05',
    title: 'Nefrone e filtrazione glomerulare',
    starred: true,
    folder: 'fisio',
    regions: ['reni'],
    subregions: ['nefrone', 'corteccia'],
    refs: ['guyton-14'],
    updated: '1 settimana fa',
    excerpt: 'Unità funzionale del rene. Glomerulo, capsula di Bowman, tubulo prossimale, ansa di Henle, tubulo distale, dotto collettore. GFR normale ~120 ml/min.',
    related: ['n06', 'n07', 'n10'],
    blocks: [
      { type: 'p', text: 'Ogni rene contiene circa 1 milione di nefroni.' },
    ],
  },
  {
    id: 'n06',
    title: 'ACE-inibitori',
    folder: 'farma',
    regions: ['reni', 'cuore'],
    subregions: ['nefrone', 'vasi', 'ventricolo-sx'],
    refs: ['katzung-15'],
    updated: '4 giorni fa',
    excerpt: 'Inibitori dell\'enzima di conversione dell\'angiotensina. Effetti renali ed emodinamici. Indicati in ipertensione, scompenso, nefropatia diabetica.',
    related: ['n05', 'n07', 'n04'],
    blocks: [
      { type: 'p', text: 'Riducono la conversione di angiotensina I in angiotensina II.' },
    ],
  },
  {
    id: 'n07',
    title: 'Insufficienza renale cronica',
    folder: 'pato',
    regions: ['reni'],
    subregions: ['nefrone', 'corteccia', 'midollare'],
    refs: ['robbins-10', 'kdigo-2024'],
    updated: '6 giorni fa',
    excerpt: 'Riduzione progressiva e irreversibile del GFR <60 ml/min per ≥3 mesi. Stadi KDIGO. Complicanze: anemia, acidosi, alterazioni del metabolismo del calcio e dell\'osso.',
    related: ['n05', 'n06', 'n10'],
    blocks: [
      { type: 'p', text: 'L\'IRC si associa a una complessa alterazione del metabolismo minerale e osseo.' },
    ],
  },
  {
    id: 'n08',
    title: 'Tessuto osseo',
    starred: true,
    folder: 'isto',
    regions: ['scheletro'],
    refs: ['ross-8'],
    updated: '2 settimane fa',
    excerpt: 'Tessuto connettivo specializzato mineralizzato. Componente cellulare: osteoblasti, osteociti, osteoclasti. Componente extracellulare: matrice osteoide + sali minerali (idrossiapatite). Le ossa lunghe presentano diafisi ed epifisi.',
    related: ['n09', 'n10'],
    blocks: [
      { type: 'p', text: 'Le ossa sono tessuti dinamici in continuo rimodellamento.' },
    ],
  },
  {
    id: 'n09',
    title: 'Osteoporosi',
    folder: 'pato',
    regions: ['scheletro'],
    refs: ['robbins-10'],
    updated: '8 giorni fa',
    excerpt: 'Riduzione della massa ossea e alterazione della microarchitettura del tessuto osseo, con aumento della fragilità e del rischio di frattura. Le ossa diventano porose. Diagnosi: DEXA (T-score ≤ -2.5).',
    related: ['n08', 'n10'],
    blocks: [
      { type: 'p', text: 'L\'osteoporosi primaria è la forma più comune; quella postmenopausale colpisce le donne dopo la menopausa.' },
    ],
  },
  {
    id: 'n10',
    title: 'Metabolismo del calcio',
    folder: 'fisio',
    regions: ['scheletro', 'reni', 'tiroide'],
    refs: ['guyton-14'],
    updated: '4 giorni fa',
    excerpt: 'Regolazione della calcemia da parte di paratormone (PTH), vitamina D e calcitonina. Ossa, intestino e reni come organi bersaglio. Il calcio nelle ossa rappresenta il 99% del totale corporeo.',
    related: ['n05', 'n07', 'n08', 'n09'],
    blocks: [
      { type: 'p', text: 'Il PTH agisce su ossa, reni e intestino per mantenere la calcemia.' },
    ],
  },
  {
    id: 'n11',
    title: 'Cirrosi epatica',
    folder: 'pato',
    regions: ['fegato'],
    refs: ['robbins-10'],
    updated: '5 giorni fa',
    excerpt: 'Sostituzione del parenchima epatico con tessuto fibroso e noduli rigenerativi. Cause: virali, alcoliche, NASH. Complicanze: ipertensione portale, ascite, encefalopatia.',
    related: [],
    blocks: [
      { type: 'p', text: 'La cirrosi è lo stadio finale di molte epatopatie croniche.' },
    ],
  },
  {
    id: 'n12',
    title: 'Insulina e glicemia',
    folder: 'fisio',
    regions: ['pancreas'],
    refs: ['guyton-14'],
    updated: '1 settimana fa',
    excerpt: 'Le cellule β del pancreas secernono insulina in risposta all\'aumento della glicemia. L\'insulina promuove l\'uptake di glucosio nel muscolo e nel tessuto adiposo.',
    related: [],
    blocks: [
      { type: 'p', text: 'La glicemia a digiuno normale è 70–99 mg/dL.' },
    ],
  },
  {
    id: 'n13',
    title: 'Polmonite comunitaria',
    folder: 'clin',
    regions: ['polmoni'],
    refs: ['harrison-21'],
    updated: '3 giorni fa',
    excerpt: 'Infezione acuta del parenchima polmonare contratta fuori dall\'ambito ospedaliero. Agente più comune: Streptococcus pneumoniae. Criteri CURB-65 per la stratificazione.',
    related: [],
    blocks: [
      { type: 'p', text: 'La CAP è una delle prime cause di mortalità infettiva nel mondo.' },
    ],
  },
  {
    id: 'n14',
    title: 'Asse ipotalamo-ipofisi',
    folder: 'fisio',
    regions: ['cervello'],
    subregions: ['ipofisi'],
    refs: ['guyton-14'],
    updated: '6 giorni fa',
    excerpt: 'Il connettoma neuroendocrino centrale. L\'ipotalamo regola l\'ipofisi tramite releasing hormones. Sei assi: tiroideo, surrenalico, gonadico, somatotropo, lattotropo, vasopressinergico.',
    related: ['n10'],
    blocks: [
      { type: 'p', text: 'L\'ipotalamo è il direttore d\'orchestra del sistema endocrino.' },
    ],
  },
];

const BIBLIO = {
  'guyton-14':  { authors: 'Hall JE, Hall ME', year: 2020, title: 'Guyton and Hall Textbook of Medical Physiology', journal: '14ª ed., Elsevier' },
  'berne-7':    { authors: 'Koeppen BM, Stanton BA', year: 2017, title: 'Berne & Levy Physiology', journal: '7ª ed., Elsevier' },
  'netter-7':   { authors: 'Netter FH', year: 2018, title: 'Atlas of Human Anatomy', journal: '7ª ed., Saunders' },
  'robbins-10': { authors: 'Kumar V, Abbas AK, Aster JC', year: 2020, title: 'Robbins and Cotran Pathologic Basis of Disease', journal: '10ª ed., Elsevier' },
  'esc-2023':   { authors: 'Byrne RA, Rossello X, et al.', year: 2023, title: '2023 ESC Guidelines for the management of acute coronary syndromes', journal: 'European Heart Journal' },
  'katzung-15': { authors: 'Katzung BG, Vanderah TW', year: 2021, title: 'Basic & Clinical Pharmacology', journal: '15ª ed., McGraw-Hill' },
  'kdigo-2024': { authors: 'KDIGO Working Group', year: 2024, title: 'Clinical Practice Guideline for the Evaluation and Management of CKD', journal: 'Kidney Int. Suppl.' },
  'ross-8':     { authors: 'Pawlina W', year: 2019, title: 'Ross Histology: A Text and Atlas', journal: '8ª ed., Wolters Kluwer' },
  'harrison-21':{ authors: 'Loscalzo J, Fauci A, et al.', year: 2022, title: "Harrison's Principles of Internal Medicine", journal: '21ª ed., McGraw-Hill' },
};

// REGIONS seeds the store's editable region catalogue.
export { FOLDERS, NOTES, BIBLIO, REGIONS };
