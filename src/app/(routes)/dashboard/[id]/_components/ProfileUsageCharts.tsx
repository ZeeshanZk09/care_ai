'use client';

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend
);

type ProfileUsageChartsProps = {
  dailyLabels: string[];
  dailyValues: number[];
  monthlyLabels: string[];
  monthlyValues: number[];
  successfulConsultations: number;
  deniedConsultations: number;
};

export default function ProfileUsageCharts({
  dailyLabels,
  dailyValues,
  monthlyLabels,
  monthlyValues,
  successfulConsultations,
  deniedConsultations,
}: Readonly<ProfileUsageChartsProps>) {
  const lineData = {
    labels: dailyLabels,
    datasets: [
      {
        label: 'Daily Consultations (Last 30 Days)',
        data: dailyValues,
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const barData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Monthly Consultations (Last 6 Months)',
        data: monthlyValues,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
    ],
  };

  const doughnutData = {
    labels: ['Successful', 'Denied'],
    datasets: [
      {
        label: 'Consultation Outcome',
        data: [successfulConsultations, deniedConsultations],
        backgroundColor: ['rgba(34, 197, 94, 0.85)', 'rgba(239, 68, 68, 0.85)'],
        borderColor: ['rgb(22, 163, 74)', 'rgb(220, 38, 38)'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  const hasAnyActivity =
    successfulConsultations > 0 ||
    deniedConsultations > 0 ||
    dailyValues.some((value) => value > 0) ||
    monthlyValues.some((value) => value > 0);

  return (
    <section className='space-y-4'>
      <h2 className='text-xl font-semibold'>Usage Insights</h2>

      {hasAnyActivity ? null : (
        <div className='rounded-xl border bg-card p-6 text-sm text-muted-foreground'>
          No consultation activity found yet. Start your first consultation to see usage charts
          here.
        </div>
      )}

      <div className='grid gap-4 lg:grid-cols-2'>
        <article className='rounded-xl border bg-card p-5 shadow-sm'>
          <h3 className='text-sm font-semibold text-muted-foreground'>Daily Trend</h3>
          <div className='mt-3 h-72'>
            <Line data={lineData} options={chartOptions} />
          </div>
        </article>

        <article className='rounded-xl border bg-card p-5 shadow-sm'>
          <h3 className='text-sm font-semibold text-muted-foreground'>Outcome Breakdown</h3>
          <div className='mt-3 h-72'>
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </article>
      </div>

      <article className='rounded-xl border bg-card p-5 shadow-sm'>
        <h3 className='text-sm font-semibold text-muted-foreground'>Monthly Trend</h3>
        <div className='mt-3 h-72'>
          <Bar data={barData} options={chartOptions} />
        </div>
      </article>
    </section>
  );
}
