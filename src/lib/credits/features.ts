export const PAYG_FEATURE_KEYS = [
  'symptom-scan',
  'drug-interaction',
  'lab-explainer',
  'second-opinion',
  'nutrition-plan',
  'appointment-prep',
  'wellness-checkin',
  'health-export',
  'referral-letter',
] as const;

export type PaygFeatureKey = (typeof PAYG_FEATURE_KEYS)[number];

export type PaygFeatureDefinition = {
  key: PaygFeatureKey;
  label: string;
  description: string;
  costCents: number;
};

export const PAYG_FEATURES: PaygFeatureDefinition[] = [
  {
    key: 'symptom-scan',
    label: 'Symptom Deep Scan',
    description: 'Structured urgency, condition, and self-care triage summary.',
    costCents: 99,
  },
  {
    key: 'drug-interaction',
    label: 'Drug Interaction Check',
    description: 'Medication interaction risk summary with practical guidance.',
    costCents: 99,
  },
  {
    key: 'lab-explainer',
    label: 'Lab Report Explainer',
    description: 'Marker-by-marker explanation in plain language.',
    costCents: 149,
  },
  {
    key: 'second-opinion',
    label: 'Second Opinion Brief',
    description: 'Alternative angles and questions to ask your clinician.',
    costCents: 249,
  },
  {
    key: 'nutrition-plan',
    label: 'Condition-Aware Nutrition Plan',
    description: '3/5/7-day meal planning aligned to your health goal.',
    costCents: 299,
  },
  {
    key: 'appointment-prep',
    label: 'Appointment Prep Sheet',
    description: 'Questions, documents, and symptom prompts before your visit.',
    costCents: 199,
  },
  {
    key: 'wellness-checkin',
    label: 'Mental Wellness Check-in',
    description: 'PHQ-9/GAD-7 scoring with guidance and escalation support.',
    costCents: 149,
  },
  {
    key: 'health-export',
    label: 'Health Timeline PDF Export',
    description: 'One-click PDF timeline from your feature history.',
    costCents: 399,
  },
  {
    key: 'referral-letter',
    label: 'GP Referral Letter Draft',
    description: 'Structured referral draft for specialist review.',
    costCents: 499,
  },
];

const PAYG_FEATURE_MAP: Record<PaygFeatureKey, PaygFeatureDefinition> = PAYG_FEATURES.reduce(
  (acc, feature) => {
    acc[feature.key] = feature;
    return acc;
  },
  {} as Record<PaygFeatureKey, PaygFeatureDefinition>
);

export const getPaygFeature = (key: PaygFeatureKey): PaygFeatureDefinition => {
  return PAYG_FEATURE_MAP[key];
};
