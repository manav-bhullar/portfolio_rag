'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Users, MessageSquare, Clock, Globe, ArrowLeft, Lock, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { getRealAnalytics, AnalyticsSummary } from '@/lib/analytics-tracker';
import { ADMIN_AUTH_KEY } from './AdminShortcutListener';
import { toast } from 'sonner';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    // Check authentication
    const keyParam = searchParams.get('key') || searchParams.get('admin');
    const isSecretParam = keyParam === 'manav' || keyParam === '1' || keyParam === 'true';

    const hasStoredAuth = typeof window !== 'undefined' && localStorage.getItem(ADMIN_AUTH_KEY) === 'true';

    if (isSecretParam) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setIsAuthorized(true);
      setData(getRealAnalytics());
    } else if (hasStoredAuth) {
      setIsAuthorized(true);
      setData(getRealAnalytics());
    } else {
      setIsAuthorized(false);
      // Quietly redirect unauthorized visitors back to homepage
      router.replace('/');
    }
  }, [router, searchParams]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      toast.info('Locked Analytics Dashboard');
      router.push('/');
    }
  };

  const handleRefresh = () => {
    setData(getRealAnalytics());
    toast.success('Analytics Updated');
  };

  if (isAuthorized === null || isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-[100dvh] bg-background p-4 sm:p-6 md:p-12 font-sans">
      <div className="mx-auto max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <button 
              onClick={() => router.push('/')}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Portfolio
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Portfolio Analytics</h1>
              <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-500 border border-green-500/20">
                Live Private
              </span>
            </div>
            <p className="text-muted-foreground mt-1">Real-time metrics tracking actual visitors, chatbot queries, and topic breakdown.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
              title="Refresh real data"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 transition-all"
              title="Lock and hide dashboard from this browser"
            >
              <Lock className="h-3.5 w-3.5" /> Lock Access
            </button>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Total Visitors</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.totalVisitors}</div>
            <div className="mt-1 text-xs text-green-500 font-medium">Tracked in real time</div>
          </div>
          
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">AI Queries</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.totalQueries}</div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              {data.totalQueries === 0 ? 'Ask questions to see live counts' : `${data.totalQueries} questions answered`}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Avg Session</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {Math.floor(data.avgSessionSeconds / 60)}m {data.avgSessionSeconds % 60}s
            </div>
            <div className="mt-1 text-xs text-green-500 font-medium">Interactive duration</div>
          </div>

          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Globe className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Telemetry</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.topRegion}</div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">Active Stream</div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Traffic Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm lg:col-span-2"
          >
            <h3 className="text-lg font-bold tracking-tight mb-6">Traffic Breakdown (Weekly)</h3>
            <div className="h-48 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trafficByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3E8EDE" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3E8EDE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="visitors" stroke="#3E8EDE" strokeWidth={3} fillOpacity={1} fill="url(#colorVisitors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* AI Query Breakdown */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold tracking-tight mb-6">Live AI Query Topics</h3>
            <div className="h-48 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.queriesByTopic} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} width={80} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.queriesByTopic.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Real-time Query Activity Feed */}
        {data.recentQueries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 sm:mt-8 rounded-xl border bg-card p-4 sm:p-6 shadow-sm"
          >
            <h3 className="text-base sm:text-lg font-bold tracking-tight mb-4">Recent Question Ledger</h3>
            <div className="divide-y divide-border">
              {data.recentQueries.map((q, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground shrink-0">
                      {q.topic}
                    </span>
                    <span className="text-sm text-foreground font-medium line-clamp-2 sm:line-clamp-none">
                      {q.query}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 pl-1 sm:pl-0">{q.time}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
