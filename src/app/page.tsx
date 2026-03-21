import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Zap, Layers, Cpu } from 'lucide-react'

export default async function Home() {
  const { userId } = await auth()

  if (userId) {
    redirect('/workflows')
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-zinc-800 selection:text-white overflow-hidden">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-zinc-900/40 blur-[120px] rounded-full pointer-events-none -translate-y-1/2" />
      
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-black rotate-45" />
          </div>
          <span className="font-bold text-xl tracking-tight">NextFlow</span>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/sign-in" className="text-white">Sign In</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-5xl mx-auto pb-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400 mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
          Phase 1: Build the future of workflows
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent leading-[1.1]">
          Orchestrate LLMs <br /> with Precision.
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed">
          The pixel-perfect canvas for building, running, and scaling complex AI workflows. 
          Experience a professional-grade workspace inspired by Krea.ai.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link 
            href="/sign-up" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            href="https://github.com" 
            className="flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all"
          >
            Star on GitHub
          </Link>
        </div>

        {/* Floating Feature Icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full">
          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm group hover:border-zinc-700 transition-colors">
            <Zap className="w-8 h-8 text-zinc-500 mb-4 group-hover:text-white transition-colors" />
            <h3 className="font-bold text-lg mb-2 text-white">Trigger.dev Native</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Background execution powered by Trigger.dev for reliable, long-running tasks.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm group hover:border-zinc-700 transition-colors">
            <Layers className="w-8 h-8 text-zinc-500 mb-4 group-hover:text-white transition-colors" />
            <h3 className="font-bold text-lg mb-2 text-white">Visual Canvas</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Drag-and-drop React Flow interface designed for high-performance workflow building.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm group hover:border-zinc-700 transition-colors">
            <Cpu className="w-8 h-8 text-zinc-500 mb-4 group-hover:text-white transition-colors" />
            <h3 className="font-bold text-lg mb-2 text-white">Multi-Model AI</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Connect Google Gemini and other leading models directly into your logic chains.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 px-8 py-12 flex flex-col md:flex-row items-center justify-between text-zinc-600 text-sm max-w-7xl mx-auto w-full">
        <div>© 2026 NextFlow. High-fidelity LLM workflows.</div>
        <div className="flex items-center gap-6 mt-4 md:mt-0">
          <Link href="#" className="hover:text-white">Twitter</Link>
          <Link href="#" className="hover:text-white">Discord</Link>
          <Link href="#" className="hover:text-white">Terms</Link>
        </div>
      </footer>
    </div>
  )
}

