'use client';

import { Server, Plus, CheckCircle, XCircle } from 'lucide-react';

export default function MCPPage() {
  const servers = [
    { name: 'rea', status: 'connected', tools: 207, description: 'Reverse Engineering Assistant' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-500" />
            MCP Manager
          </h1>
          <p className="text-zinc-400">Manage Model Context Protocol servers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
          <Plus className="w-4 h-4" />
          Add Server
        </button>
      </div>

      <div className="space-y-4">
        {servers.map((server) => (
          <div key={server.name} className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Server className="w-8 h-8 text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold">{server.name}</h3>
                  <p className="text-sm text-zinc-400">{server.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Connected</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-400">
              <span>{server.tools} tools available</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
