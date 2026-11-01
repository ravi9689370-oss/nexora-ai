'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cpu, Search, RefreshCw, Play, CheckCircle2, XCircle, Loader2, Eye, Wrench, Brain, Zap } from 'lucide-react';

type CatalogModel = {
  id: string; name: string; provider: string; upstream?: string;
  contextLength: number | null; maxOutput: number | null;
  streaming: boolean; imageInput: boolean; toolCalling: boolean; reasoning: boolean;
  free: boolean; gateway: 'openrouter' | 'pollinations'; _seed?: boolean;
};

type DiscoverResult = {
  source: 'live' | 'cache' | 'fallback';
  fetchedAt: string;
  total: number;
  freeCount: number;
  models: CatalogModel[];
  catalogHealth: Record<string, { ok?: boolean; error?: string; count?: number; probe?: { ok: boolean; latencyMs?: number; error?: string } }>;
  routing?: { openRouterKeyPresent: boolean; keylessChannel: string; freeUsableNow: number };
};

type TestState = { status: 'running' | 'OK' | 'ERROR'; latencyMs?: number; provider?: string; error?: string; content?: string };

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'free', label: 'Free' },
  { key: 'paid', label: 'Paid' },
  { key: 'vision', label: 'Vision' },
  { key: 'tools', label: 'Tool Calling' },
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'fast', label: 'Fast (small ctx ok)', short: true },
] as const;

function Caps({ m }: { m: CatalogModel }) {
  return (
    <div className="flex gap-1.5 text-[10px] flex-wrap">
      {m.imageInput && <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 flex items-center gap-0.5"><Eye className="w-3 h-3" />vision</span>}
      {m.toolCalling && <span className="px-1.5 py-0.5 rounded bg-sky-900/50 text-sky-300 flex items-center gap-0.5"><Wrench className="w-3 h-3" />tools</span>}
      {m.reasoning && <span className="px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 flex items-center gap-0.5"><Brain className="w-3 h-3" />reasoning</span>}
      {m.streaming && <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 flex items-center gap-0.5"><Zap className="w-3 h-3" />stream</span>}
    </div>
  );
}

export default function ModelsPage() {
  const [data, setData] = useState<DiscoverResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestState | undefined>>({});
  const [filter, setFilter] = useState<string>('free');
  const [q, setQ] = useState('');

  const load = async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/models/discover${force ? '?force=1&probe=1' : '?probe=1'}`);
      const json = (await res.json()) as DiscoverResult;
      setData(json);
    } catch (err) {
      console.error('discover failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(false); }, []);

  const models = useMemo(() => {
    let list = data?.models ?? [];
    if (filter === 'free') list = list.filter((m) => m.free);
    if (filter === 'paid') list = list.filter((m) => !m.free);
    if (filter === 'vision') list = list.filter((m) => m.imageInput);
    if (filter === 'tools') list = list.filter((m) => m.toolCalling);
    if (filter === 'reasoning') list = list.filter((m) => m.reasoning);
    if (filter === 'fast') list = list.filter((m) => (m.contextLength ?? 0) <= 200000 && (m.free || true)).slice(0, 40);
    if (q.trim()) list = list.filter((m) => (m.id + ' ' + m.name).toLowerCase().includes(q.toLowerCase()));
    return list.slice(0, 120);
  }, [data, filter, q]);

  const testModel = async (m: CatalogModel) => {
    // A test = REAL minimal completion via /api/chat on that model id.
    setResults((r) => ({ ...r, [m.id]: { status: 'running' } }));
    setTesting(m.id);
    const t0 = Date.now();
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model: m.id, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], maxTokens: 24 }),
      });
      const json = await res.json();
      const latencyMs = Date.now() - t0;
      if (json.status === 'OK') {
        setResults((r) => ({ ...r, [m.id]: { status: 'OK', latencyMs, provider: json.provider, content: String(json.content).slice(0, 120) } }));
      } else {
        setResults((r) => ({ ...r, [m.id]: { status: 'ERROR', latencyMs, error: json.error || json.status } }));
      }
    } catch (err) {
      setResults((r) => ({ ...r, [m.id]: { status: 'ERROR', latencyMs: Date.now() - t0, error: err instanceof Error ? err.message : 'network error' } }));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Cpu className="w-6 h-6 text-cyan-500" />
            Model Explorer
          </h1>
          <p className="text-zinc-400">
            LIVE catalog discovery — OpenRouter public catalog + keyless Pollinations. Nothing hardcoded;
            every entry shows real metadata, and the Test button runs a real API call.
          </p>
        </div>
        <button onClick={() => load(true)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh (force live)
        </button>
      </div>

      {data && (
        <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-zinc-500">Source</div><div className="font-semibold">{data.source}{data.source === 'cache' ? ' (TTL 10min)' : ''}</div></div>
          <div><div className="text-zinc-500">Models</div><div className="font-semibold">{data.total} <span className="text-zinc-500">({data.freeCount} free)</span></div></div>
          <div>
            <div className="text-zinc-500">Keyless channel</div>
            <div className={`font-semibold ${data.catalogHealth?.pollinations?.probe?.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.catalogHealth?.pollinations?.probe?.ok ? `LIVE (${data.catalogHealth.pollinations.probe.latencyMs}ms)` : 'PROBE FAIL'}
            </div>
          </div>
          <div>
            <div className="text-zinc-500">Usable free now</div>
            <div className="font-semibold">{data.routing?.freeUsableNow ?? '—'}{!data.routing?.openRouterKeyPresent && <span className="text-zinc-500 block text-xs">OpenRouter key add karoge to saare :free models unlock</span>}</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === f.key ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            {f.label}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models…"
            className="pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm w-56 focus:outline-none focus:border-cyan-500" />
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading live catalog…</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {models.length === 0 && <div className="text-zinc-500">Is filter ke liye koi model nahi mila.</div>}
          {models.map((m) => {
            const r = results[m.id];
            return (
              <div key={m.id} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${m.free ? 'bg-emerald-900/40 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                      {m.free ? 'FREE' : 'PAID'}
                    </span>
                    <span className="text-sm font-semibold truncate">{m.name}</span>
                    <span className="text-[11px] text-zinc-500">{m.gateway === 'pollinations' ? 'keyless' : m.provider}</span>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500 mt-1 truncate">{m.id}</div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <Caps m={m} />
                    <span className="text-[10px] text-zinc-600">ctx {m.contextLength ? m.contextLength.toLocaleString() : 'n/a'}{m.maxOutput ? ` · out ${m.maxOutput.toLocaleString()}` : ''}</span>
                  </div>
                  {r && r.status === 'OK' && (
                    <div className="mt-2 text-xs text-emerald-400">✓ real test PASS ({r.latencyMs}ms) via {r.provider}{r.content ? ` — "${r.content}"` : ''}</div>
                  )}
                  {r && r.status === 'ERROR' && (
                    <div className="mt-2 text-xs text-red-400 break-all">✗ {r.error}</div>
                  )}
                  {r && r.status === 'running' && <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> testing real API call…</div>}
                </div>
                <button onClick={() => testModel(m)} disabled={testing !== null}
                  className="shrink-0 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5">
                  {testing === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Test
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-500 space-y-1">
        <p>Honesty notes:</p>
        <p>• Catalog <span className="text-zinc-300">{data?.source}</span> fresh {data?.fetchedAt ? new Date(data.fetchedAt).toLocaleTimeString() : ''} — discovery me TTL cache (10 min) lagta hai, Force refresh se live jaata hai.</p>
        <p>• <span className="text-zinc-300">{data?.routing?.keylessChannel}</span> — keyless, par rate-limited; usage Claim mat samjho, provider ka quota follow hota hai.</p>
        <p>• Paid models test karne ke liye OpenRouter/OpenAI/Gemini/Kilo key Settings me add karo; bina keys wale tests CONFIGURATION_REQUIRED/ERROR dikhayenge — yahi honest behaviour hai.</p>
      </div>
    </div>
  );
}
