'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Wifi,
  CreditCard,
  Users,
  Map as MapIcon,
  Activity,
  Smartphone,
  CheckCircle2,
  Shield,
  Globe,
  Terminal,
  Cpu,
  Server,
  Zap,
  Network
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-blue-500/30">
      {/* Header/Nav */}
      <header className="px-6 h-16 flex items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <Wifi className="w-5 h-5" />
          </div>
          <span className="text-white tracking-tight">
            Noloji<span className="text-blue-500">OS</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">Login</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              Create Account <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

          <div className="container relative z-10 mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-mono text-blue-400 mb-6 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                SYSTEM V2.0 LIVE
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">ISP Infrastructure</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-xl mb-8 font-light">
                Orchestrate your entire network from a single kernel. Manage bandwidth, automate billing, and visualize fiber optics with military-grade precision.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 text-lg bg-white text-black hover:bg-gray-200">
                    Deploy Now
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/20 text-white hover:bg-white/10 hover:text-white bg-transparent">
                    View Topology
                  </Button>
                </Link>
              </div>
            </div>

            {/* Terminal / System Status Visual */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur opacity-20"></div>
              <div className="relative bg-black border border-white/10 rounded-lg shadow-2xl overflow-hidden font-mono text-xs md:text-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <div className="ml-2 text-gray-500">root@noloji-core:~</div>
                </div>
                <div className="p-6 space-y-2 text-gray-300">
                  <div className="flex gap-2">
                    <span className="text-green-400">➜</span>
                    <span>init infrastructure --mode=production</span>
                  </div>
                  <div className="text-gray-500 mt-2">initializing core services...</div>
                  <div className="text-blue-400">[INFO] Billing Engine.......... ONLINE (14ms)</div>
                  <div className="text-blue-400">[INFO] Radius Server........... CONNECTED</div>
                  <div className="text-blue-400">[INFO] MikroTik Sync........... ACTIVE</div>
                  <div className="text-blue-400">[INFO] Fiber GIS Mapping....... LOADED</div>
                  <div className="text-green-400 mt-2">✓ System ready. 1,024 active sessions found.</div>
                  <div className="flex gap-2 animate-pulse mt-4">
                    <span className="text-green-400">➜</span>
                    <span className="w-2 h-4 bg-gray-500 block"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Network Metrics Strip */}
        <section className="border-b border-white/5 bg-white/[0.02]">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center md:items-start">
                <div className="text-3xl font-mono font-bold text-white mb-1">99.99%</div>
                <div className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Uptime SLA</div>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <div className="text-3xl font-mono font-bold text-white mb-1">&lt;5ms</div>
                <div className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Auth Latency</div>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <div className="text-3xl font-mono font-bold text-white mb-1">AES-256</div>
                <div className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Encryption</div>
              </div>
              <div className="flex flex-col items-center md:items-start">
                <div className="text-3xl font-mono font-bold text-white mb-1">100k+</div>
                <div className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Packets/Sec</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <div className="inline-block px-3 py-1 mb-4 text-xs font-mono font-medium tracking-wider text-blue-400 uppercase bg-blue-500/10 rounded-full border border-blue-500/20">
                Capabilities
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Core Modules</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                A suite of high-performance tools engineered for the modern telecom provider.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {/* Large Card - Automated Billing */}
              <div className="md:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 hover:bg-white/[0.05] transition-colors">
                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-600/10 to-transparent"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Automated Financial Core</h3>
                    <p className="text-gray-400 max-w-sm">
                      Set and forget. Recurring invoicing, MPESA STK integration, and automated suspension logic working in harmony.
                    </p>
                  </div>
                  <div className="mt-8 relative h-48 rounded-xl bg-black border border-white/10 overflow-hidden">
                    {/* Abstract Visualization of transactions */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex gap-4 opacity-50">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-24 w-16 bg-white/5 rounded animate-pulse" style={{ animationDelay: `${i * 200}ms` }}></div>
                        ))}
                      </div>
                      <div className="absolute text-center bg-black/80 backdrop-blur px-4 py-2 rounded border border-white/20">
                        <div className="text-green-400 font-mono text-sm">PAYMENT RECEIVED</div>
                        <div className="text-xs text-gray-500">TX_ID: 8X92M201</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card - Network Management */}
              <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 hover:bg-white/[0.05] transition-colors">
                <div className="h-12 w-12 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center mb-6">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Router Sync</h3>
                <p className="text-gray-400 text-sm">
                  Direct MikroTik integration via API. Push queues, managing PPPoE secrets, and monitor interface traffic real-time.
                </p>
              </div>

              {/* Card - GIS */}
              <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 hover:bg-white/[0.05] transition-colors">
                <div className="h-12 w-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
                  <MapIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Fiber GIS</h3>
                <p className="text-gray-400 text-sm">
                  Map your physical layer. Track fiber cores, splice points, and customer drops with satellite precision.
                </p>
              </div>

              {/* Card - Technician App */}
              <div className="md:col-span-3 lg:col-span-1 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 hover:bg-white/[0.05] transition-colors">
                <div className="h-12 w-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-6">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Field Ops</h3>
                <p className="text-gray-400 text-sm">
                  Mobile command for technicians. Geotagged installations and inventory tracking.
                </p>
              </div>

              {/* Card - Hotspot */}
              <div className="md:col-span-2 lg:col-span-2 group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-8 hover:bg-white/[0.05] transition-colors flex items-center justify-between">
                <div className="max-w-md">
                  <div className="h-12 w-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-6">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">Hotspot Vouchers</h3>
                  <p className="text-gray-400 text-sm">
                    Generate revenue instantly with time-based vouchers. Portal customization included.
                  </p>
                </div>
                <div className="hidden md:block w-32 h-32 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Network Diagram Section */}
        <section className="py-24 border-t border-white/10 bg-black">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center mb-16">
              <h2 className="text-3xl font-bold mb-8">Integrated Architecture</h2>
              <div className="w-full max-w-4xl p-8 border border-white/10 rounded-2xl bg-white/[0.02] relative">
                {/* Simple CSS illustration of architecture */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-blue-900/40 rounded-xl border border-blue-500/50 flex items-center justify-center mb-4">
                      <Server className="w-8 h-8 text-blue-400" />
                    </div>
                    <div className="font-mono text-sm">Noloji Cloud</div>
                  </div>

                  <div className="hidden md:flex flex-1 items-center px-4">
                    <div className="h-[1px] w-full bg-gradient-to-r from-blue-500/50 via-white/20 to-green-500/50 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-black px-2 text-xs text-gray-500 font-mono">API SYNC</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-green-900/40 rounded-xl border border-green-500/50 flex items-center justify-center mb-4">
                      <Network className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="font-mono text-sm">MikroTik Edge</div>
                  </div>

                  <div className="hidden md:flex flex-1 items-center px-4">
                    <div className="h-[1px] w-full bg-gradient-to-r from-green-500/50 via-white/20 to-purple-500/50 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 bg-black px-2 text-xs text-gray-500 font-mono">PPPoE</div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-purple-900/40 rounded-xl border border-purple-500/50 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="font-mono text-sm">Customer CPE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-24 border-t border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-900/10"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Initialize Your ISP Growth</h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
              Start with our free tier. Scale to thousands of subscribers with infrastructure that grows with you.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                Create Account
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-12 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Terminal className="w-4 h-4" />
              <span className="font-mono">Noloji Systems v2.1.0</span>
            </div>
            <div>&copy; 2026 Noloji Systems. All traffic encrypted.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
