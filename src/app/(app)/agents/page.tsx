'use client';

import { Bot, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

const teams = [
  { name: 'Software Engineering', count: 8, color: 'blue' },
  { name: 'Design', count: 5, color: 'purple' },
  { name: 'Android Development', count: 5, color: 'green' },
  { name: 'Game Development', count: 7, color: 'orange' },
  { name: 'Reverse Engineering', count: 5, color: 'red' },
  { name: 'Security', count: 4, color: 'yellow' },
  { name: 'Research', count: 4, color: 'cyan' },
  { name: 'Testing', count: 4, color: 'pink' },
];

export default function AgentsPage() {
  const [totalAgents, setTotalAgents] = useState(358);

  useEffect(() => {
    fetch('/api/agents/registry/load')
      .then(res => res.json())
      .then(data => {
        if (data.total) setTotalAgents(data.total);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Bot className="w-6 h-6 text-green-500" />
          Agent Center
        </h1>
        <p className="text-zinc-400">Specialized agents from Agency Agents repository</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-2xl font-bold">{totalAgents}+</div>
          <div className="text-sm text-zinc-400">Total Agents</div>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-2xl font-bold">8</div>
          <div className="text-sm text-zinc-400">Core Teams</div>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-2xl font-bold">Available</div>
          <div className="text-sm text-zinc-400">Status</div>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="text-2xl font-bold">Ready</div>
          <div className="text-sm text-zinc-400">Orchestrator</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {teams.map((team) => (
          <div key={team.name} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-green-500/50 cursor-pointer">
            <Users className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="font-semibold mb-1">{team.name}</h3>
            <p className="text-sm text-zinc-400">{team.count} core agents</p>
          </div>
        ))}
      </div>

      <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Multi-Agent Orchestration
        </h2>
        <p className="text-zinc-400 mb-4">Dynamically selects the smallest effective team for each task with parallel execution support.</p>
        <button className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg">
          Configure Orchestrator
        </button>
      </div>
    </div>
  );
}
