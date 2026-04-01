'use client';

import { useMemo, useState } from 'react';

type BillingCycle = 'MONTHLY' | 'ANNUAL';

const BASIC_MONTHLY_CENTS = 1900;
const PRO_MONTHLY_CENTS = 4900;
const ANNUAL_DISCOUNT_RATIO = 0.2;

const formatCurrency = (amountCents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
};

export default function PricingComparisonToggle() {
  const [cycle, setCycle] = useState<BillingCycle>('MONTHLY');

  const pricing = useMemo(() => {
    const isAnnual = cycle === 'ANNUAL';

    const basicMonthly = BASIC_MONTHLY_CENTS;
    const proMonthly = PRO_MONTHLY_CENTS;
    const basicAnnual = Math.round(basicMonthly * 12 * (1 - ANNUAL_DISCOUNT_RATIO));
    const proAnnual = Math.round(proMonthly * 12 * (1 - ANNUAL_DISCOUNT_RATIO));

    return {
      basicPriceLabel: isAnnual ? `${formatCurrency(basicAnnual)} / year` : `${formatCurrency(basicMonthly)} / month`,
      proPriceLabel: isAnnual ? `${formatCurrency(proAnnual)} / year` : `${formatCurrency(proMonthly)} / month`,
      basicAnnualSavingsLabel: formatCurrency(basicMonthly * 12 - basicAnnual),
      proAnnualSavingsLabel: formatCurrency(proMonthly * 12 - proAnnual),
    };
  }, [cycle]);

  return (
    <section className='mt-14 overflow-x-auto'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-2xl font-semibold'>Plan Comparison</h2>
        <div className='inline-flex rounded-md border p-1 text-sm'>
          <button
            type='button'
            onClick={() => setCycle('MONTHLY')}
            className={`rounded px-3 py-1 ${cycle === 'MONTHLY' ? 'bg-primary text-primary-foreground' : ''}`}
          >
            Monthly
          </button>
          <button
            type='button'
            onClick={() => setCycle('ANNUAL')}
            className={`rounded px-3 py-1 ${cycle === 'ANNUAL' ? 'bg-primary text-primary-foreground' : ''}`}
          >
            Annual (save 20%)
          </button>
        </div>
      </div>

      <table className='mt-4 min-w-full rounded-xl border text-sm'>
        <thead className='bg-muted/50'>
          <tr>
            <th className='border px-4 py-3 text-left'>Feature</th>
            <th className='border px-4 py-3 text-left'>Free</th>
            <th className='border px-4 py-3 text-left'>Basic</th>
            <th className='border px-4 py-3 text-left'>Pro</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className='border px-4 py-3'>Consultation limits</td>
            <td className='border px-4 py-3'>10 one-time</td>
            <td className='border px-4 py-3'>50 per month</td>
            <td className='border px-4 py-3'>Unlimited</td>
          </tr>
          <tr>
            <td className='border px-4 py-3'>Report quality</td>
            <td className='border px-4 py-3'>Standard summary</td>
            <td className='border px-4 py-3'>Advanced summary</td>
            <td className='border px-4 py-3'>Comprehensive report</td>
          </tr>
          <tr>
            <td className='border px-4 py-3'>Pricing ({cycle.toLowerCase()})</td>
            <td className='border px-4 py-3'>$0</td>
            <td className='border px-4 py-3'>{pricing.basicPriceLabel}</td>
            <td className='border px-4 py-3'>{pricing.proPriceLabel}</td>
          </tr>
          <tr>
            <td className='border px-4 py-3'>Savings vs monthly billing</td>
            <td className='border px-4 py-3'>-</td>
            <td className='border px-4 py-3'>
              {cycle === 'ANNUAL' ? `${pricing.basicAnnualSavingsLabel} / year` : 'Switch to annual to save 20%'}
            </td>
            <td className='border px-4 py-3'>
              {cycle === 'ANNUAL' ? `${pricing.proAnnualSavingsLabel} / year` : 'Switch to annual to save 20%'}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}