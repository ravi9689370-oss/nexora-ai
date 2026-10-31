'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Brain,
  Bot,
  SearchCode,
  Plug,
  Server,
  Code2,
  Smartphone,
  Image,
  Globe,
  Github,
  FolderKanban,
  History,
  Settings,
  BarChart3,
  Activity,
  Menu,
  X,
  Zap
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Chat', href: '/chat', icon: MessageSquare },
  { name: 'Model Explorer', href: '/models', icon: Brain },
  { name: 'Agent Center', href: '/agents', icon: Bot },
  { name: 'Reverse Engineering Lab', href: '/rea-lab', icon: SearchCode },
  { name: 'MCP Manager', href: '/mcp', icon: Server },
  { name: 'Plugin Marketplace', href: '/plugins', icon: Plug },
  { name: 'Coding Workspace', href: '/coding', icon: Code2 },
  { name: 'Android Dev Lab', href: '/android-lab', icon: Smartphone },
  { name: 'Image Studio', href: '/image-studio', icon: Image },
  { name: 'Research Center', href: '/research', icon: Globe },
  { name: 'GitHub Manager', href: '/github', icon: Github },
  { name: 'Project Manager', href: '/projects', icon: FolderKanban },
  { name: 'Conversation History', href: '/history', icon: History },
  { name: 'Usage Dashboard', href: '/usage', icon: BarChart3 },
  { name: 'System Diagnostics', href: '/diagnostics', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-black text-white">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-bold">Nexora AI</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-zinc-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-zinc-800 rounded mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {navigation.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'))?.name || 'Nexora AI'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded border border-green-500/30">
              System Online
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
