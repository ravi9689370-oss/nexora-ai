'use client';

import { useEffect, useState } from 'react';
import { Activity, RefreshCw, Loader2, CheckCircle2, XCircle, MinusCircle, Cog, HelpCircle } from 'lucide-react';

type Status = 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' | 'CONFIGURATION_REQUIRED' | 'NOT_IMPLEMENTED' | 'UNVERIFIED' | 'ERROR';

type Subsystem = {
  key: string; name: string; status: Status; detail: string;
  howToFix?: string; latencyMs?: number; checkedAt: string;
};

type Health = { overall: Status | string; checkedAt: string; note: string; subsystems: Subsystem[] };

const STYLE: Record<string, { pill: string; text: string; icon: typeof CheckCircle2 }> = {
  CONNECTED: { pill: 'bg-emerald-900/50 text-emerald-300', text: 'text-emerald-400', icon: CheckCircle2 },
  DEGRADED: { pill: 'bg-amber-900/50 text-amber-300', text: 'text-amber-400', icon: MinusCircle },
  DISCONNECTED: { pill: 'bg-red-900/50 text-red-300', text: 'text-red-400', icon: XCircle },
  ERROR: { pill: 'bg-red-900/50 text-red-300', text: 'text-red-400', icon: XCircle },
  CONFIGURATION_REQUIRED: { pill: 'bg-violet-900/50 text-violet-300', text: 'text-violet-400', icon: Cog },
  NOT_IMPLEMENTED: { pill: 'bg-zinc-800 text-zinc-400', text: 'text-zinc-400', icon: HelpCircle },
  UNVERIFIED: { pill: 'bg-sky-900/50 text-sky-300', text: 'text-sky-400', icon: HelpCircle },
};

export default function DiagnosticsPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      setHealth(await res.json());
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const overall = (health?.overall ?? '').toString();
  const overallStyle =
    overall === 'CONNECTED' ? 'border-emerald-700 bg-emerald-900/30' :
    overall === 'DEGRADED' ? 'border-amber-700 bg-amber-900/30' :
    overall === 'ERROR' || overall === 'DISCONNECTED' ? 'border-red-700 bg-red-900/30' :
    'border-violet-700 bg-violet-900/30';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            System Diagnostics
          </h1>
          <p className="text-zinc-400">
            Har subsystem ka ASLI status — live probes (DB, AI keyless channel, catalog, agents registry, MCP, GitHub).
            Yahan koi fake “all operational” banner nahi hai: jo configured nahi, wo saaf dikhaya jaata hai.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {health && (
        <div className={`p-4 rounded-xl border ${overallStyle} flex items-center justify-between`}>
          <div>
            <div className="text-xs text-zinc-400 uppercase tracking-wide">Overall</div>
            <div className="text-xl font-bold">{overall}</div>
          </div>
          <div className="text-xs text-zinc-500 text-right">
            {new Date(health.checkedAt).toLocaleString()}<br />
            {health.subsystems.filter((s) => s.status === 'CONNECTED').length}/{health.subsystems.length} CONNECTED
          </div>
        </div>
      )}

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {health.subsystems.map((s) => {
            const st = STYLE[s.status] ?? STYLE.UNVERIFIED;
            const Icon = st.icon;
            return (
              <div key={s.key} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${st.text}`} /> {s.name}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.pill}`}>{s.status}</span>
                </div>
                <div className="text-xs text-zinc-400">{s.detail}</div>
                {s.howToFix && <div className="mt-1.5 text-xs text-zinc-500">Fix: {s.howToFix}</div>}
                {s.latencyMs != null && <div className="mt-1 text-[10px] text-zinc-600">probe latency: {s.latencyMs}ms</div>}
              </div>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" /> Live check chal raha hai…</div>
      )}
    </div>
  );
}
