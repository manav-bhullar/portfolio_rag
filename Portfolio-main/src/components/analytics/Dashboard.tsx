'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Users, MessageSquare, Clock, Globe, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const visitorData = [
  { name: 'Mon', visitors: 140 },
  { name: 'Tue', visitors: 200 },
  { name: 'Wed', visitors: 180 },
  { name: 'Thu', visitors: 320 },
  { name: 'Fri', visitors: 250 },
  { name: 'Sat', visitors: 110 },
  { name: 'Sun', visitors: 90 },
];

const queriesData = [
  { name: 'Projects', count: 145, color: '#3E8EDE' },
  { name: 'Skills', count: 120, color: '#3FB37F' },
  { name: 'Experience', count: 90, color: '#F0954A' },
  { name: 'Contact', count: 45, color: '#8B5FE0' },
  { name: 'Other', count: 30, color: '#E0559C' },
];

export default function Dashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-6 md:p-12 font-sans">
      <div className="mx-auto max-w-5xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <button 
              onClick={() => router.push('/')}
              className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Portfolio
            </button>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Portfolio Analytics</h1>
            <p className="text-muted-foreground mt-1">Live metrics powered by PostHog & custom RAG event tracking.</p>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Total Visitors</h3>
            </div>
            <div className="text-3xl font-bold text-foreground">1,090</div>
            <div className="mt-1 text-xs text-green-500 font-medium">+12% from last week</div>
          </div>
          
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">AI Queries</h3>
            </div>
            <div className="text-3xl font-bold text-foreground">430</div>
            <div className="mt-1 text-xs text-green-500 font-medium">Avg 3 per user session</div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Avg Session</h3>
            </div>
            <div className="text-3xl font-bold text-foreground">2m 45s</div>
            <div className="mt-1 text-xs text-green-500 font-medium">+45s since Chatbot V2</div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Globe className="h-4 w-4" />
              <h3 className="text-sm font-semibold uppercase tracking-wider">Top Region</h3>
            </div>
            <div className="text-3xl font-bold text-foreground">US & India</div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">65% of total traffic</div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Traffic Chart */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-2"
          >
            <h3 className="text-lg font-bold tracking-tight mb-6">Traffic (Past 7 Days)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={visitorData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            className="rounded-xl border bg-card p-6 shadow-sm"
          >
            <h3 className="text-lg font-bold tracking-tight mb-6">Top AI Query Topics</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queriesData} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} width={80} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                    {queriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
