import Dashboard from '@/components/analytics/Dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio Analytics | Manav Bhullar',
  description: 'Live analytics dashboard for Manav Bhullar portfolio.',
};

export default function AnalyticsPage() {
  return <Dashboard />;
}
