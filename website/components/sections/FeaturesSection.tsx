'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Trophy, 
  BarChart3, 
  Users, 
  Zap, 
  Shield, 
  Smartphone,
  ArrowRightLeft,
  Bell,
  Calendar
} from 'lucide-react';

const features = [
  {
    icon: Trophy,
    title: 'Real-time Game Results',
    description: 'Get instant notifications when games are completed with detailed score breakdowns and team performance metrics.',
    color: 'text-orange-500'
  },
  {
    icon: ArrowRightLeft,
    title: 'Advanced Trade Management',
    description: 'Propose, review, and approve trades with a comprehensive system that tracks all league transactions.',
    color: 'text-blue-500'
  },
  {
    icon: BarChart3,
    title: 'Comprehensive Analytics',
    description: 'Deep dive into player stats, team performance, and league trends with interactive charts and graphs.',
    color: 'text-green-500'
  },
  {
    icon: Users,
    title: 'Commissioner Tools',
    description: 'Powerful administrative features for league commissioners to manage settings, approve trades, and oversee operations.',
    color: 'text-purple-500'
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Stay updated with customizable notifications for trades, rating changes, waiver claims, and roster moves.',
    color: 'text-red-500'
  },
  {
    icon: Zap,
    title: 'Lightning Fast Updates',
    description: 'Real-time synchronization with EA servers ensures your league data is always current and accurate.',
    color: 'text-yellow-500'
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: '99.9% uptime with enterprise-grade security to protect your league data and ensure consistent availability.',
    color: 'text-indigo-500'
  },
  {
    icon: Smartphone,
    title: 'Mobile Optimized',
    description: 'Fully responsive design works perfectly on all devices, from desktop to mobile, for management on the go.',
    color: 'text-pink-500'
  },
  {
    icon: Calendar,
    title: 'Schedule Management',
    description: 'Track upcoming games, playoff schedules, and important league dates with integrated calendar features.',
    color: 'text-teal-500'
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-slate-900">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Everything You Need
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            VFL Manager provides all the tools and features you need to run a successful Madden franchise league, 
            from basic stat tracking to advanced analytics and trade management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-300 hover:transform hover:scale-105 group"
            >
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center mb-4 group-hover:bg-slate-600 transition-colors`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-white group-hover:text-orange-400 transition-colors">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Highlight */}
        <div className="mt-20 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-2xl p-8 border border-orange-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-4">
                Seamless EA Integration
              </h3>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Our robust EA API integration automatically syncs your league data in real-time. 
                No manual updates required - just focus on playing while VFL Manager handles the rest.
              </p>
              <div className="space-y-3">
                {[
                  'Automatic roster updates',
                  'Real-time stat synchronization',
                  'Instant game result processing',
                  'Seamless trade execution'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-400">Connected to EA Servers</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Last Sync</span>
                    <span className="text-green-400">2 seconds ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Games Updated</span>
                    <span className="text-orange-400">16/16</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Players Synced</span>
                    <span className="text-blue-400">1,847</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}