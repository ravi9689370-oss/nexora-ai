'use client';

import { 
  MessageSquare, 
  Brain, 
  Bot, 
  SearchCode, 
  Zap,
  Code2,
  Smartphone,
  Image,
  Globe,
  Activity
} from 'lucide-react';
import Link from 'next/link';

const features = [
  { name: 'AI Chat', href: '/chat', icon: MessageSquare, color: 'blue', desc: 'Multi-model conversations' },
  { name: 'Model Explorer', href: '/models', icon: Brain, color: 'purple', desc: '200+ AI models' },
  { name: 'Agent Center', href: '/agents', icon: Bot, color: 'green', desc: '358+ specialized agents' },
  { name: 'Reverse Engineering Lab', href: '/rea-lab', icon: SearchCode, color: 'red', desc: 'REA-powered analysis' },
  { name: 'Coding Workspace', href: '/coding', icon: Code2, color: 'cyan', desc: 'Autonomous coding' },
  { name: 'Android Dev Lab', href: '/android-lab', icon: Smartphone, color: 'emerald', desc: 'Build APKs with AI' },
  { name: 'Image Studio', href: '/image-studio', icon: Image, color: 'pink', desc: 'AI image generation' },
  { name: 'Research Center', href: '/research', icon: Globe, color: 'orange', desc: 'Live web research' },
];

const colorMap: Record<string, string> = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
  purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
  green: 'from-green-500/20 to-green-600/10 border-green-500/30 text-green-400',
  red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
  cyan: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400',
  emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
  pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400',
  orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30 text-orange-400',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Zap className="w-8 h-8 text-purple-500" />
          Nexora AI
        </h1>
        <p className="text-zinc-400">Multi-model intelligence • Specialized agents • Reverse engineering • Full-stack development</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feature) => (
          <Link
            key={feature.name}
            href={feature.href}
            className={`p-6 rounded-xl bg-gradient-to-br border hover:scale-105 transition-transform ${colorMap[feature.color]}`}
          >
            <feature.icon className="w-8 h-8 mb-3" />
            <h3 className="text-lg font-semibold mb-1 text-white">{feature.name}</h3>
            <p className="text-sm text-zinc-400">{feature.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">AI Models</span>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">4+ Models Ready</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Agent Orchestrator</span>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">358 Agents Loaded</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">REA Integration</span>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Connected (207 tools)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">MCP Servers</span>
              <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">1 Active</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Quick Start</h2>
          <div className="space-y-2">
            <Link href="/chat" className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
              <div className="font-medium">Start AI Chat</div>
              <div className="text-sm text-zinc-400">Chat with any of your configured models</div>
            </Link>
            <Link href="/rea-lab" className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
              <div className="font-medium">Analyze an App</div>
              <div className="text-sm text-zinc-400">Use REA to reverse engineer applications</div>
            </Link>
            <Link href="/android-lab" className="block p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
              <div className="font-medium">Build Android APK</div>
              <div className="text-sm text-zinc-400">Generate installable APKs with AI</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
