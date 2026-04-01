'use client';

import PaygGate from '@/components/credits/PaygGate';
import { Button } from '@/components/ui/button';
import { PAYG_FEATURES, type PaygFeatureKey } from '@/lib/credits/features';
import {
  ClipboardList,
  FileText,
  HeartPulse,
  Pill,
  Salad,
  ScanHeart,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { type ComponentType, useMemo, useState } from 'react';
import { toast } from 'sonner';

const featureIconMap: Record<PaygFeatureKey, ComponentType<{ className?: string }>> = {
  'symptom-scan': ScanHeart,
  'drug-interaction': Pill,
  'lab-explainer': FileText,
  'second-opinion': ShieldAlert,
  'nutrition-plan': Salad,
  'appointment-prep': ClipboardList,
  'wellness-checkin': HeartPulse,
  'health-export': Sparkles,
  'referral-letter': Stethoscope,
};

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountCents / 100);
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const parseCsv = (value: string) => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

type ToolsClientProps = {
  initialLastUsedByFeature: Record<string, string>;
  initialTrialUsedByFeature: Record<string, boolean>;
};

export default function ToolsClient({
  initialLastUsedByFeature,
  initialTrialUsedByFeature,
}: Readonly<ToolsClientProps>) {
  const [activeFeatureKey, setActiveFeatureKey] = useState<PaygFeatureKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastUsedByFeature, setLastUsedByFeature] = useState(initialLastUsedByFeature);
  const [trialUsedByFeature, setTrialUsedByFeature] = useState(initialTrialUsedByFeature);
  const [resultsByFeature, setResultsByFeature] = useState<Record<string, unknown>>({});
  const [paygGateState, setPaygGateState] = useState<{
    open: boolean;
    balance: number;
    required: number;
    featureLabel: string;
  }>({
    open: false,
    balance: 0,
    required: 0,
    featureLabel: '',
  });

  const [symptomScanForm, setSymptomScanForm] = useState({
    symptoms: 'headache, fever',
    duration: '2 days',
    age: '32',
    sex: 'female',
  });

  const [drugInteractionForm, setDrugInteractionForm] = useState({
    drugs: 'ibuprofen, aspirin',
  });

  const [labExplainerForm, setLabExplainerForm] = useState({
    reportText: 'Hemoglobin: 10.9 g/dL (ref 12-15), ALT: 68 U/L (ref 7-40)',
  });

  const [secondOpinionForm, setSecondOpinionForm] = useState({
    primaryDiagnosis: 'Migraine',
    symptoms: 'headache, light sensitivity, nausea',
    currentTreatment: 'PRN pain medication',
    concerns: 'Symptoms still recurring weekly.',
  });

  const [nutritionPlanForm, setNutritionPlanForm] = useState({
    condition: 'Type 2 diabetes',
    dietaryRestrictions: 'no shellfish',
    goal: 'stabilize blood sugar and reduce cravings',
    daysRequested: '5',
  });

  const [appointmentPrepForm, setAppointmentPrepForm] = useState({
    specialistType: 'Cardiologist',
    reasonForVisit: 'Palpitations and occasional chest discomfort',
    currentSymptoms: 'palpitations, shortness of breath',
    currentMedications: 'metformin',
    concerns: 'Want to know if this is stress or heart related.',
  });

  const [wellnessCheckinForm, setWellnessCheckinForm] = useState({
    phq9Responses: '1,1,2,1,1,1,0,1,0',
    gad7Responses: '1,2,1,1,1,1,1',
    freeText: '',
  });

  const [referralLetterForm, setReferralLetterForm] = useState({
    patientAge: '41',
    sex: 'male',
    symptoms: 'persistent cough, weight loss, night sweats',
    duration: '6 weeks',
    relevantHistory: 'Former smoker, family history of respiratory disease.',
    requestedSpecialist: 'Pulmonologist',
    urgency: 'urgent',
  });

  const activeFeature = useMemo(
    () => PAYG_FEATURES.find((feature) => feature.key === activeFeatureKey) ?? null,
    [activeFeatureKey]
  );

  const getPayloadForFeature = (featureKey: PaygFeatureKey) => {
    switch (featureKey) {
      case 'symptom-scan':
        return {
          symptoms: parseCsv(symptomScanForm.symptoms),
          duration: symptomScanForm.duration,
          age: Number(symptomScanForm.age),
          sex: symptomScanForm.sex,
        };
      case 'drug-interaction':
        return {
          drugs: parseCsv(drugInteractionForm.drugs),
        };
      case 'lab-explainer':
        return {
          reportText: labExplainerForm.reportText,
        };
      case 'second-opinion':
        return {
          primaryDiagnosis: secondOpinionForm.primaryDiagnosis,
          symptoms: parseCsv(secondOpinionForm.symptoms),
          currentTreatment: secondOpinionForm.currentTreatment,
          concerns: secondOpinionForm.concerns,
        };
      case 'nutrition-plan':
        return {
          condition: nutritionPlanForm.condition,
          dietaryRestrictions: parseCsv(nutritionPlanForm.dietaryRestrictions),
          goal: nutritionPlanForm.goal,
          daysRequested: Number(nutritionPlanForm.daysRequested),
        };
      case 'appointment-prep':
        return {
          specialistType: appointmentPrepForm.specialistType,
          reasonForVisit: appointmentPrepForm.reasonForVisit,
          currentSymptoms: parseCsv(appointmentPrepForm.currentSymptoms),
          currentMedications: parseCsv(appointmentPrepForm.currentMedications),
          concerns: appointmentPrepForm.concerns,
        };
      case 'wellness-checkin':
        return {
          phq9Responses: parseCsv(wellnessCheckinForm.phq9Responses).map(Number),
          gad7Responses: parseCsv(wellnessCheckinForm.gad7Responses).map(Number),
          freeText: wellnessCheckinForm.freeText || undefined,
        };
      case 'health-export':
        return {};
      case 'referral-letter':
        return {
          patientAge: Number(referralLetterForm.patientAge),
          sex: referralLetterForm.sex,
          symptoms: parseCsv(referralLetterForm.symptoms),
          duration: referralLetterForm.duration,
          relevantHistory: referralLetterForm.relevantHistory,
          requestedSpecialist: referralLetterForm.requestedSpecialist,
          urgency: referralLetterForm.urgency,
        };
      default:
        return {};
    }
  };

  const invokeFeature = async (featureKey: PaygFeatureKey) => {
    setSubmitting(true);

    try {
      const payload = getPayloadForFeature(featureKey);
      const response = await fetch(`/api/features/${featureKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);

      if (response.status === 402 && body?.error === 'insufficient_credits') {
        setPaygGateState({
          open: true,
          balance: Number(body.balance ?? 0),
          required: Number(body.required ?? 0),
          featureLabel:
            PAYG_FEATURES.find((feature) => feature.key === featureKey)?.label ?? featureKey,
        });
        return;
      }

      if (!response.ok) {
        throw new Error(body?.error || 'Feature call failed.');
      }

      setResultsByFeature((prev) => ({
        ...prev,
        [featureKey]: body,
      }));

      setLastUsedByFeature((prev) => ({
        ...prev,
        [featureKey]: new Date().toISOString(),
      }));

      setTrialUsedByFeature((prev) => ({
        ...prev,
        [featureKey]: true,
      }));

      if (featureKey === 'health-export' && body?.url) {
        window.open(body.url, '_blank', 'noopener,noreferrer');
      }

      toast.success(
        `${PAYG_FEATURES.find((feature) => feature.key === featureKey)?.label} completed.`
      );
      setActiveFeatureKey(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Feature request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFeatureForm = (featureKey: PaygFeatureKey) => {
    switch (featureKey) {
      case 'symptom-scan':
        return (
          <div className='space-y-3'>
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={symptomScanForm.symptoms}
              onChange={(event) =>
                setSymptomScanForm((prev) => ({ ...prev, symptoms: event.target.value }))
              }
              placeholder='Symptoms (comma separated)'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={symptomScanForm.duration}
              onChange={(event) =>
                setSymptomScanForm((prev) => ({ ...prev, duration: event.target.value }))
              }
              placeholder='Duration'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={symptomScanForm.age}
              onChange={(event) =>
                setSymptomScanForm((prev) => ({ ...prev, age: event.target.value }))
              }
              placeholder='Age'
              type='number'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={symptomScanForm.sex}
              onChange={(event) =>
                setSymptomScanForm((prev) => ({ ...prev, sex: event.target.value }))
              }
              placeholder='Sex'
            />
          </div>
        );
      case 'drug-interaction':
        return (
          <input
            className='w-full rounded-md border px-3 py-2 text-sm'
            value={drugInteractionForm.drugs}
            onChange={(event) => setDrugInteractionForm({ drugs: event.target.value })}
            placeholder='Drugs (comma separated)'
          />
        );
      case 'lab-explainer':
        return (
          <textarea
            className='h-36 w-full rounded-md border px-3 py-2 text-sm'
            value={labExplainerForm.reportText}
            onChange={(event) => setLabExplainerForm({ reportText: event.target.value })}
            placeholder='Paste lab report text'
          />
        );
      case 'second-opinion':
        return (
          <div className='space-y-3'>
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={secondOpinionForm.primaryDiagnosis}
              onChange={(event) =>
                setSecondOpinionForm((prev) => ({ ...prev, primaryDiagnosis: event.target.value }))
              }
              placeholder='Primary diagnosis'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={secondOpinionForm.symptoms}
              onChange={(event) =>
                setSecondOpinionForm((prev) => ({ ...prev, symptoms: event.target.value }))
              }
              placeholder='Symptoms (comma separated)'
            />
            <textarea
              className='h-24 w-full rounded-md border px-3 py-2 text-sm'
              value={secondOpinionForm.currentTreatment}
              onChange={(event) =>
                setSecondOpinionForm((prev) => ({ ...prev, currentTreatment: event.target.value }))
              }
              placeholder='Current treatment'
            />
            <textarea
              className='h-24 w-full rounded-md border px-3 py-2 text-sm'
              value={secondOpinionForm.concerns}
              onChange={(event) =>
                setSecondOpinionForm((prev) => ({ ...prev, concerns: event.target.value }))
              }
              placeholder='Concerns'
            />
          </div>
        );
      case 'nutrition-plan':
        return (
          <div className='space-y-3'>
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={nutritionPlanForm.condition}
              onChange={(event) =>
                setNutritionPlanForm((prev) => ({ ...prev, condition: event.target.value }))
              }
              placeholder='Condition'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={nutritionPlanForm.dietaryRestrictions}
              onChange={(event) =>
                setNutritionPlanForm((prev) => ({
                  ...prev,
                  dietaryRestrictions: event.target.value,
                }))
              }
              placeholder='Dietary restrictions (comma separated)'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={nutritionPlanForm.goal}
              onChange={(event) =>
                setNutritionPlanForm((prev) => ({ ...prev, goal: event.target.value }))
              }
              placeholder='Goal'
            />
            <select
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={nutritionPlanForm.daysRequested}
              onChange={(event) =>
                setNutritionPlanForm((prev) => ({ ...prev, daysRequested: event.target.value }))
              }
            >
              <option value='3'>3 days</option>
              <option value='5'>5 days</option>
              <option value='7'>7 days</option>
            </select>
          </div>
        );
      case 'appointment-prep':
        return (
          <div className='space-y-3'>
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={appointmentPrepForm.specialistType}
              onChange={(event) =>
                setAppointmentPrepForm((prev) => ({ ...prev, specialistType: event.target.value }))
              }
              placeholder='Specialist type'
            />
            <textarea
              className='h-20 w-full rounded-md border px-3 py-2 text-sm'
              value={appointmentPrepForm.reasonForVisit}
              onChange={(event) =>
                setAppointmentPrepForm((prev) => ({ ...prev, reasonForVisit: event.target.value }))
              }
              placeholder='Reason for visit'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={appointmentPrepForm.currentSymptoms}
              onChange={(event) =>
                setAppointmentPrepForm((prev) => ({ ...prev, currentSymptoms: event.target.value }))
              }
              placeholder='Current symptoms (comma separated)'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={appointmentPrepForm.currentMedications}
              onChange={(event) =>
                setAppointmentPrepForm((prev) => ({
                  ...prev,
                  currentMedications: event.target.value,
                }))
              }
              placeholder='Current medications (comma separated)'
            />
            <textarea
              className='h-20 w-full rounded-md border px-3 py-2 text-sm'
              value={appointmentPrepForm.concerns}
              onChange={(event) =>
                setAppointmentPrepForm((prev) => ({ ...prev, concerns: event.target.value }))
              }
              placeholder='Concerns'
            />
          </div>
        );
      case 'wellness-checkin':
        return (
          <div className='space-y-3'>
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={wellnessCheckinForm.phq9Responses}
              onChange={(event) =>
                setWellnessCheckinForm((prev) => ({ ...prev, phq9Responses: event.target.value }))
              }
              placeholder='PHQ-9 responses (9 numbers 0-3, comma separated)'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={wellnessCheckinForm.gad7Responses}
              onChange={(event) =>
                setWellnessCheckinForm((prev) => ({ ...prev, gad7Responses: event.target.value }))
              }
              placeholder='GAD-7 responses (7 numbers 0-3, comma separated)'
            />
            <textarea
              className='h-20 w-full rounded-md border px-3 py-2 text-sm'
              value={wellnessCheckinForm.freeText}
              onChange={(event) =>
                setWellnessCheckinForm((prev) => ({ ...prev, freeText: event.target.value }))
              }
              placeholder='Optional free text context'
            />
          </div>
        );
      case 'health-export':
        return (
          <p className='text-sm text-muted-foreground'>
            No input required. We will compile all saved feature results into a PDF.
          </p>
        );
      case 'referral-letter':
        return (
          <div className='space-y-3'>
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.patientAge}
              type='number'
              onChange={(event) =>
                setReferralLetterForm((prev) => ({ ...prev, patientAge: event.target.value }))
              }
              placeholder='Patient age'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.sex}
              onChange={(event) =>
                setReferralLetterForm((prev) => ({ ...prev, sex: event.target.value }))
              }
              placeholder='Sex'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.symptoms}
              onChange={(event) =>
                setReferralLetterForm((prev) => ({ ...prev, symptoms: event.target.value }))
              }
              placeholder='Symptoms (comma separated)'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.duration}
              onChange={(event) =>
                setReferralLetterForm((prev) => ({ ...prev, duration: event.target.value }))
              }
              placeholder='Duration'
            />
            <textarea
              className='h-20 w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.relevantHistory}
              onChange={(event) =>
                setReferralLetterForm((prev) => ({ ...prev, relevantHistory: event.target.value }))
              }
              placeholder='Relevant history'
            />
            <input
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.requestedSpecialist}
              onChange={(event) =>
                setReferralLetterForm((prev) => ({
                  ...prev,
                  requestedSpecialist: event.target.value,
                }))
              }
              placeholder='Requested specialist'
            />
            <select
              className='w-full rounded-md border px-3 py-2 text-sm'
              value={referralLetterForm.urgency}
              onChange={(event) =>
                setReferralLetterForm((prev) => ({ ...prev, urgency: event.target.value }))
              }
            >
              <option value='routine'>Routine</option>
              <option value='urgent'>Urgent</option>
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {PAYG_FEATURES.map((feature) => {
          const Icon = featureIconMap[feature.key];
          const freeTrialUsed = Boolean(trialUsedByFeature[feature.key]);
          const lastUsed = lastUsedByFeature[feature.key];
          const result = resultsByFeature[feature.key];

          return (
            <article key={feature.key} className='rounded-xl border bg-card p-4 shadow-sm'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <Icon className='h-5 w-5 text-primary' />
                  <h3 className='text-base font-semibold'>{feature.label}</h3>
                </div>
                <span className='rounded-full border px-2 py-1 text-xs font-semibold'>
                  {formatCurrency(feature.costCents)}
                </span>
              </div>

              <p className='mt-2 text-sm text-muted-foreground'>{feature.description}</p>

              {!freeTrialUsed ? (
                <span className='mt-3 inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'>
                  1 free trial remaining
                </span>
              ) : null}

              <p className='mt-2 text-xs text-muted-foreground'>
                Last used: {lastUsed ? formatDate(lastUsed) : 'Never'}
              </p>

              <div className='mt-3'>
                <Button type='button' onClick={() => setActiveFeatureKey(feature.key)}>
                  Open Tool
                </Button>
              </div>

              {result ? (
                <details className='mt-3 rounded-lg border p-2'>
                  <summary className='cursor-pointer text-sm font-medium'>
                    Last inline result
                  </summary>
                  <pre className='mt-2 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground'>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              ) : null}
            </article>
          );
        })}
      </div>

      {activeFeature ? (
        <div className='fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-xl rounded-xl border bg-background p-5 shadow-xl'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold'>{activeFeature.label}</h3>
              <Button type='button' variant='ghost' onClick={() => setActiveFeatureKey(null)}>
                Close
              </Button>
            </div>

            <p className='mt-1 text-sm text-muted-foreground'>{activeFeature.description}</p>
            <p className='mt-1 text-xs text-muted-foreground'>
              Cost: {formatCurrency(activeFeature.costCents)}
            </p>

            <div className='mt-4'>{renderFeatureForm(activeFeature.key)}</div>

            <div className='mt-4 flex justify-end'>
              <Button
                type='button'
                onClick={() => void invokeFeature(activeFeature.key)}
                disabled={submitting}
              >
                {submitting ? 'Running...' : 'Run Feature'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <PaygGate
        open={paygGateState.open}
        balance={paygGateState.balance}
        required={paygGateState.required}
        featureLabel={paygGateState.featureLabel}
        onClose={() =>
          setPaygGateState((prev) => ({
            ...prev,
            open: false,
          }))
        }
      />
    </>
  );
}
