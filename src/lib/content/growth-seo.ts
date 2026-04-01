export type SymptomLandingPage = {
  slug: string;
  title: string;
  description: string;
  warning: string;
  ctaLabel: string;
  ctaHref: string;
  consultationTips: string[];
  faqTopicSlug: string;
};

export type FaqTopicCluster = {
  slug: string;
  title: string;
  description: string;
  questions: Array<{
    q: string;
    a: string;
  }>;
};

export const symptomLandingPages: SymptomLandingPage[] = [
  {
    slug: "chest-pain-triage",
    title: "Chest Pain Symptom Triage",
    description:
      "Assess chest pain severity with structured AI follow-up prompts and decide when to seek urgent care.",
    warning:
      "Chest pain with breathing difficulty, sweating, or radiating pain may require emergency care immediately.",
    ctaLabel: "Start Chest Pain Consultation",
    ctaHref: "/dashboard",
    consultationTips: [
      "Describe onset time and pain location clearly.",
      "Mention associated symptoms (shortness of breath, nausea, dizziness).",
      "Share current medications and relevant cardiac history.",
    ],
    faqTopicSlug: "safety-and-accuracy",
  },
  {
    slug: "migraine-headache-check",
    title: "Migraine and Headache Check",
    description:
      "Use AI symptom analysis to identify migraine patterns, red flags, and specialist-routing cues.",
    warning:
      "Sudden severe headache with confusion, weakness, or vision loss requires urgent medical evaluation.",
    ctaLabel: "Start Headache Consultation",
    ctaHref: "/dashboard",
    consultationTips: [
      "Track headache timing, duration, and triggers.",
      "Record nausea, aura, light sensitivity, and sleep impact.",
      "List previous headache medications and response.",
    ],
    faqTopicSlug: "specialist-routing",
  },
  {
    slug: "stomach-pain-assessment",
    title: "Stomach Pain Assessment Guide",
    description:
      "Triage abdominal discomfort with AI-guided questioning before deciding home care versus escalation.",
    warning:
      "Severe abdominal pain with fever, vomiting blood, or black stool needs urgent in-person care.",
    ctaLabel: "Start Stomach Pain Consultation",
    ctaHref: "/dashboard",
    consultationTips: [
      "Describe exact pain area and whether it moves.",
      "Mention food triggers, bowel changes, and hydration status.",
      "Share recent travel, medications, and known GI conditions.",
    ],
    faqTopicSlug: "billing-and-plans",
  },
];

export const faqTopicClusters: FaqTopicCluster[] = [
  {
    slug: "safety-and-accuracy",
    title: "Safety and Accuracy FAQ Cluster",
    description:
      "Understand how CareAI handles symptom safety, model limitations, and emergency escalation boundaries.",
    questions: [
      {
        q: "Can AI provide a final diagnosis?",
        a: "No. CareAI provides triage guidance and next-step recommendations, not a final diagnosis.",
      },
      {
        q: "When should users skip AI and seek emergency care?",
        a: "If there are severe symptoms like chest pain with breathing issues, stroke signs, or uncontrolled bleeding, seek emergency care immediately.",
      },
      {
        q: "How is recommendation quality improved?",
        a: "The workflow asks context-rich follow-up questions and routes users to specialists when symptom complexity is higher.",
      },
    ],
  },
  {
    slug: "specialist-routing",
    title: "Specialist Routing FAQ Cluster",
    description:
      "Learn how consultation details influence specialist recommendations and expected outcomes.",
    questions: [
      {
        q: "What data affects specialist routing?",
        a: "Symptom location, duration, severity, medical history clues, and urgency indicators influence routing decisions.",
      },
      {
        q: "Is specialist routing available on free plans?",
        a: "Specialist routing is limited on Free and fully enabled on Basic and Pro tiers.",
      },
      {
        q: "Can I change specialists if suggestions are not relevant?",
        a: "Yes. Users can re-run suggestions with better symptom details or choose another specialist route manually.",
      },
    ],
  },
  {
    slug: "billing-and-plans",
    title: "Billing and Plans FAQ Cluster",
    description:
      "Compare Free, Basic, and Pro features to understand quality and cost-savings tradeoffs.",
    questions: [
      {
        q: "How does Basic compare to Pro for report quality?",
        a: "Basic supports standard report summaries, while Pro includes comprehensive reports and premium model depth.",
      },
      {
        q: "Is there a discount for upgrading from Free?",
        a: "Campaign periods can include time-bound upgrade discounts such as CARE30 for 7 days.",
      },
      {
        q: "Can users upgrade mid-cycle?",
        a: "Yes. Users can upgrade at any time from pricing and manage billing details through the billing portal.",
      },
    ],
  },
];

export const findSymptomLandingPage = (slug: string) => {
  return symptomLandingPages.find((page) => page.slug === slug) ?? null;
};

export const findFaqTopicCluster = (slug: string) => {
  return faqTopicClusters.find((topic) => topic.slug === slug) ?? null;
};
