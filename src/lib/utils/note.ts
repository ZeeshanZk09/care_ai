// --- Keyword fallback (guarantees a result when AI fails) ---
function keywordMatch(notes: string, doctors: any[]): any[] {
  const lower = notes.toLowerCase();
  const matches: any[] = [];

  // Use expanded keyword map defined below
  for (const [keyword, specialties] of Object.entries(specialtyKeywords)) {
    if (lower.includes(keyword)) {
      for (const spec of specialties) {
        const doc = doctors.find((d) => d.specialist === spec);
        if (doc && !matches.some((m) => m.id === doc.id)) matches.push(doc);
      }
    }
  }

  return matches;
}

// Strict matcher that only returns matches when explicit keywords are found
// (does NOT fallback to General Practitioner). Used to avoid excessive AI calls.
function keywordMatchStrict(notes: string, doctors: any[]): any[] {
  const lower = notes.toLowerCase();
  const matches: any[] = [];
  for (const [keyword, specialties] of Object.entries(specialtyKeywords)) {
    if (lower.includes(keyword)) {
      for (const spec of specialties) {
        const doc = doctors.find((d) => d.specialist === spec);
        if (doc && !matches.some((m) => m.id === doc.id)) matches.push(doc);
      }
    }
  }
  return matches;
}

// Expanded keyword -> specialties map
const specialtyKeywords: Record<string, string[]> = {
  // ---------- General / Primary Care ----------
  'general illness': ['General Physician'],
  sick: ['General Physician'],
  unwell: ['General Physician'],
  fatigue: ['General Physician', 'Endocrinologist'],
  tired: ['General Physician', 'Endocrinologist'],

  // ---------- Neurology ----------
  headache: ['Neurologist'],
  migraine: ['Neurologist'],
  dizzy: ['Neurologist', 'Cardiologist'],
  dizziness: ['Neurologist', 'Cardiologist'],
  faint: ['Cardiologist', 'Neurologist'],
  seizure: ['Neurologist'],
  neuropathy: ['Neurologist'],
  numbness: ['Neurologist'],
  tingling: ['Neurologist'],
  stroke: ['Neurologist'],
  'brain fog': ['Neurologist', 'General Physician'],

  // ---------- Cardiology / Chest ----------
  'chest pain': ['Cardiologist'],
  chest: ['Cardiologist'],
  palpitations: ['Cardiologist'],
  'high blood pressure': ['Cardiologist'],
  hypertension: ['Cardiologist'],
  'heart failure': ['Cardiologist'],
  'heart attack': ['Cardiologist'],
  coronary: ['Cardiologist'],

  // ---------- Musculoskeletal / Orthopedic ----------
  'arm pain': ['Orthopedic', 'Cardiologist'],
  'left arm': ['Orthopedic', 'Cardiologist'],
  'right arm': ['Orthopedic', 'Cardiologist'],
  'back pain': ['Orthopedic'],
  leg: ['Orthopedic', 'Vascular Surgeon'],
  'joint pain': ['Rheumatologist', 'Orthopedic'],
  'pain in leg': ['Orthopedic', 'Vascular Surgeon'],
  joint: ['Rheumatologist', 'Orthopedic'],
  knee: ['Orthopedic', 'Rheumatologist'],
  fracture: ['Orthopedic'],
  sprain: ['Orthopedic'],
  strain: ['Orthopedic'],
  arthritis: ['Rheumatologist', 'Orthopedic'],
  bone: ['Orthopedic'],
  'muscle pain': ['Orthopedic', 'General Physician'],

  // ---------- Rheumatology ----------
  autoimmune: ['Rheumatologist'],
  lupus: ['Rheumatologist'],
  fibromyalgia: ['Rheumatologist'],
  rheumatoid: ['Rheumatologist'],

  // ---------- Sexual / Urology ----------
  erectile: ['Sexologist', 'Urologist'],
  erection: ['Sexologist', 'Urologist'],
  libido: ['Sexologist', 'Psychiatrist'],
  porn: ['Psychiatrist', 'Psychologist', 'Sexologist'],
  'low stamina': ['Sexologist', 'Cardiologist', 'Endocrinologist'],
  sexual: ['Sexologist', 'Urologist', 'Gynecologist'],
  'urinary tract infection': ['Urologist'],
  uti: ['Urologist'],
  incontinence: ['Urologist'],
  prostate: ['Urologist'],
  'kidney stone': ['Urologist'],

  // ---------- Mental Health / Addiction ----------
  anxiety: ['Psychologist', 'Psychiatrist'],
  depression: ['Psychologist', 'Psychiatrist'],
  panic: ['Psychologist', 'Psychiatrist'],
  addiction: ['Psychiatrist', 'Psychologist'],
  alcohol: ['Psychiatrist', 'Psychologist'],
  stress: ['Psychologist', 'Psychiatrist'],
  therapy: ['Psychologist'],
  counseling: ['Psychologist'],
  mood: ['Psychiatrist', 'Psychologist'],
  bipolar: ['Psychiatrist'],
  schizophrenia: ['Psychiatrist'],
  medication: ['Psychiatrist'],

  // ---------- Respiratory / Pulmonology ----------
  cough: ['Pulmonologist'],
  wheeze: ['Pulmonologist'],
  breathless: ['Pulmonologist', 'Cardiologist'],
  breathing: ['Pulmonologist', 'Cardiologist'],
  asthma: ['Pulmonologist', 'Allergist'],
  copd: ['Pulmonologist'],
  pneumonia: ['Pulmonologist'],
  'shortness of breath': ['Pulmonologist', 'Cardiologist'],

  // ---------- GI / Gastroenterology ----------
  stomach: ['Gastroenterologist'],
  abdominal: ['Gastroenterologist'],
  diarrhea: ['Gastroenterologist'],
  constipation: ['Gastroenterologist'],
  reflux: ['Gastroenterologist'],
  heartburn: ['Gastroenterologist'],
  nausea: ['Gastroenterologist', 'General Physician'],
  vomiting: ['Gastroenterologist', 'General Physician'],
  ibs: ['Gastroenterologist'],

  // ---------- Skin / Dermatology ----------
  rash: ['Dermatologist'],
  skin: ['Dermatologist'],
  acne: ['Dermatologist'],
  eczema: ['Dermatologist'],
  psoriasis: ['Dermatologist'],
  hives: ['Dermatologist', 'Allergist'],

  // ---------- ENT ----------
  sore: ['ENT Specialist'],
  throat: ['ENT Specialist'],
  ear: ['ENT Specialist'],
  sinus: ['ENT Specialist'],
  'hearing loss': ['ENT Specialist'],
  tinnitus: ['ENT Specialist'],
  vertigo: ['ENT Specialist', 'Neurologist'],

  // ---------- Eyes / Ophthalmology ----------
  eye: ['Ophthalmologist'],
  vision: ['Ophthalmologist'],
  'blurred vision': ['Ophthalmologist'],
  'dry eyes': ['Ophthalmologist'],
  glaucoma: ['Ophthalmologist'],
  cataract: ['Ophthalmologist'],

  // ---------- Dental ----------
  tooth: ['Dentist'],
  toothache: ['Dentist'],
  gum: ['Dentist'],
  'bleeding gums': ['Dentist'],
  dental: ['Dentist'],
  oral: ['Dentist'],

  // ---------- Women's Health / Gynecology ----------
  period: ['Gynecologist'],
  pregnancy: ['Gynecologist'],
  menstrual: ['Gynecologist'],
  'pelvic pain': ['Gynecologist'],
  contraception: ['Gynecologist'],
  fertility: ['Gynecologist'],
  menopause: ['Gynecologist', 'Endocrinologist'],

  // ---------- Endocrine / Metabolism ----------
  thyroid: ['Endocrinologist'],
  diabetes: ['Endocrinologist'],
  hormone: ['Endocrinologist'],
  metabolic: ['Endocrinologist'],
  adrenal: ['Endocrinologist'],
  weight: ['Nutritionist', 'Endocrinologist'],

  // ---------- Allergy / Immunology ----------
  allergy: ['Allergist'],
  anaphylaxis: ['Allergist'],
  'hay fever': ['Allergist'],
  'food allergy': ['Allergist'],
  'skin allergy': ['Allergist'],

  // ---------- Podiatry ----------
  foot: ['Podiatrist'],
  heel: ['Podiatrist'],
  ankle: ['Podiatrist'],
  'plantar fasciitis': ['Podiatrist'],
  bunion: ['Podiatrist'],
  'diabetic foot': ['Podiatrist'],

  // ---------- Oncology ----------
  cancer: ['Oncologist'],
  tumor: ['Oncologist'],
  chemotherapy: ['Oncologist'],
  radiotherapy: ['Oncologist'],
  malignancy: ['Oncologist'],
  neoplasm: ['Oncologist'],

  // ---------- Pediatrics ----------
  child: ['Pediatrician'],
  baby: ['Pediatrician'],
  kid: ['Pediatrician'],
  infant: ['Pediatrician'],
  toddler: ['Pediatrician'],

  // ---------- Nutrition ----------
  diet: ['Nutritionist'],
  'weight loss': ['Nutritionist'],
  'weight gain': ['Nutritionist'],
  nutrition: ['Nutritionist'],
  'eating disorder': ['Nutritionist'],
  obesity: ['Nutritionist'],
};

// fails requests for any type of abuse to prevent malicious use of the endpoint
function findGibrishInNotes(notes: string) {
  const gibberishPatterns = [
    /(?:\b\w+\b\s*){50,}/, // Excessively long input with many words
    /[^\x00-\x7F]+/, // Non-ASCII characters
    /([a-zA-Z0-9]{5,}\s*){10,}/, // Repeated patterns of words/characters
    /\b[a-zA-Z]{12,}\b/, // Single very long token of letters (likely gibberish)
    /^[A-Za-z]{3,}(?:;[A-Za-z]{1,}){3,}$/, // multiple short alpha tokens separated by semicolons
    /[<>$&;|`\\]/, // no symbols allowed except basic punctuation to prevent code injection
    /(\w)\1{10,}/, // Repeated characters (aaaaaaa...)
    /[0-9]{15,}/, // Very long number sequences
    /\b[a-z0-9]{50,}\b/i, // Extremely long alphanumeric token
    /(%[0-9a-f]{2}){5,}/i, // URL-encoded injection patterns
    /[\x00-\x1F]+/, // Control characters
    /javascript:|onerror=|onclick=/i, // XSS attempts
  ];

  for (const pattern of gibberishPatterns) {
    if (pattern.test(notes)) {
      return {
        success: false,
        message: 'Input contains gibberish or potentially malicious content.',
      };
    }
  }

  if (typeof notes !== 'string' || notes.length > 1200 || notes.trim().length < 20) {
    return {
      success: false,
      message:
        'Invalid input: Notes must be a string with a maximum length of 1200 characters and minimum length of 20 characters.',
    };
  }

  return { success: true };
}

export { keywordMatch, keywordMatchStrict, findGibrishInNotes, specialtyKeywords };
