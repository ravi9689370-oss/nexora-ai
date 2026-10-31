'use client';

import { Plug, Download, Star } from 'lucide-react';

export default function PluginsPage() {
  const plugins = [
    { name: 'GitHub Integration', category: 'Development', downloads: '1.2k', rating: 4.8 },
    { name: 'Google Search', category: 'Research', downloads: '2.1k', rating: 4.9 },
    { name: 'File Manager', category: 'Productivity', downloads: '980', rating: 4.7 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Plug className="w-6 h-6 text-purple-500" />
          Plugin Marketplace
        </h1>
        <p className="text-zinc-400">Extend your app with powerful plugins</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((plugin) => (
          <div key={plugin.name} className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-purple-500/50">
            <Plug className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-lg font-semibold mb-1">{plugin.name}</h3>
            <p className="text-sm text-zinc-400 mb-3">{plugin.category}</p>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span>{plugin.rating}</span>
              </div>
              <span className="text-zinc-400">{plugin.downloads} downloads</span>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Install
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
