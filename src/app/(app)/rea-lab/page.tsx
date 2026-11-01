'use client';

import { useState } from 'react';
import { SearchCode, Loader2, CheckCircle2, XCircle, Cog, ShieldCheck } from 'lucide-react';

type AnalyzeResult = {
  status?: string;
  mode?: string;
  via?: string;
  target?: string;
  result?: unknown;
  symbolsPreview?: string;
  note?: string;
  error?: string;
  howToFix?: string;
  workflow?: string[];
  local?: { rizinInstalled: boolean; targetExistsLocally: boolean };
};

export default function RealLabPage() {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const handleAnalyze = async () => {
    if (!target.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/rea/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, type: 'general' }),
      });
      const data = (await res.json()) as AnalyzeResult;
      setResult(data);
    } catch (error) {
      setResult({ status: 'ERROR', error: error instanceof Error ? error.message : 'Analysis failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <SearchCode className="w-6 h-6 text-red-500" />
          Reverse Engineering Lab
        </h1>
        <p className="text-zinc-400">REA (Reverse Engineering Assistant) MCP par, jab endpoint configured ho. Target analysis ka apna authorized material ho hi.</p>
        <p className="text-xs text-zinc-600 mt-1 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Sirf apne owned ya written-permission wale targets — app ka workflow isko enforce karta hai.</p>
      </div>

      <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
        <h2 className="text-lg font-semibold mb-4">Analyze Target</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter file path or URL (apna authorized target)…"
            className="flex-1 min-w-[240px] px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-red-500"
          />
          <button onClick={handleAnalyze} disabled={loading}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Analyzing…' : 'Start Analysis'}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Ye form asli request /api/rea/analyze par bhejta hai. REA MCP endpoint configured nahi hai to honest
          CONFIGURATION_REQUIRED + setup steps dikhenge — koi fake “analyzing” progress nahi.
        </p>
      </div>

      {result && (
        <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800 space-y-3">
          {result.status === 'CONNECTED' && (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" /> Analysis CONNECTED via {result.via || result.mode}
            </div>
          )}
          {(result.status === 'CONFIGURATION_REQUIRED' || result.status === 'ERROR') && (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${result.status === 'CONFIGURATION_REQUIRED' ? 'text-violet-300' : 'text-red-400'}`}>
                {result.status === 'CONFIGURATION_REQUIRED' ? <Cog className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                <span className="font-semibold">{result.status}</span>
              </div>
              {result.local && (
                <div className="text-xs text-zinc-500">
                  Local: rizin {result.local.rizinInstalled ? 'installed' : 'not installed'} · target file {result.local.targetExistsLocally ? 'milegi' : 'nahi mili'} (server par)
                </div>
              )}
              {result.error && <div className="text-sm text-zinc-300">{result.error}</div>}
              {result.howToFix && <div className="text-sm text-zinc-400">Fix: {result.howToFix}</div>}
            </div>
          )}

          {result.symbolsPreview && (
            <pre className="text-xs bg-black/40 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">{result.symbolsPreview}</pre>
          )}
          {result.result != null && (
            <pre className="text-xs bg-black/40 p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">{JSON.stringify(result.result, null, 2).slice(0, 4000)}</pre>
          )}
          {result.note && <div className="text-xs text-zinc-500">{result.note}</div>}

          {result.workflow && (
            <div>
              <div className="text-sm font-medium text-zinc-300 mb-2">Documented workflow (ya to deploy karne par chalega):</div>
              <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                {result.workflow.map((w) => <li key={w}>{w}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
