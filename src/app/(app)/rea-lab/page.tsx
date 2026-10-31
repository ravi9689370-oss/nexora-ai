'use client';

import { useState } from 'react';
import { SearchCode, Upload, FileSearch, Code, Smartphone, Globe, Loader2 } from 'lucide-react';

export default function RealLabPage() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!target.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rea/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type: 'general' })
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Analysis failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <SearchCode className="w-6 h-6 text-red-500" />
          Reverse Engineering Lab
        </h1>
        <p className="text-zinc-400">Powered by REA MCP - 207 tools available</p>
      </div>

      <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
        <h2 className="text-lg font-semibold mb-4">Analyze Target</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter URL, file path, or app identifier..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-red-500"
          />
          <button onClick={handleAnalyze} disabled={loading} className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Analyzing...' : 'Start Analysis'}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Upload className="w-4 h-4" />
          <span>Or drag and drop files here</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-red-500/50 cursor-pointer">
          <Globe className="w-8 h-8 text-blue-400 mb-2" />
          <h3 className="font-semibold">Website Analysis</h3>
          <p className="text-sm text-zinc-400">Analyze web apps and sites</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-red-500/50 cursor-pointer">
          <Code className="w-8 h-8 text-yellow-400 mb-2" />
          <h3 className="font-semibold">JavaScript/Electron</h3>
          <p className="text-sm text-zinc-400">Analyze JS apps and Electron</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-red-500/50 cursor-pointer">
          <Smartphone className="w-8 h-8 text-green-400 mb-2" />
          <h3 className="font-semibold">Android APK</h3>
          <p className="text-sm text-zinc-400">Inspect Android applications</p>
        </div>
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-red-500/50 cursor-pointer">
          <FileSearch className="w-8 h-8 text-purple-400 mb-2" />
          <h3 className="font-semibold">Native Binaries</h3>
          <p className="text-sm text-zinc-400">Analyze executables</p>
        </div>
      </div>

      {result && (
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
          <h2 className="text-lg font-semibold mb-4">Analysis Results</h2>
          <pre className="bg-zinc-950 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
