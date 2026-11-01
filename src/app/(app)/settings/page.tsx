'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Save, TestTube2, CheckCircle2, XCircle, Loader2, ShieldAlert } from 'lucide-react';

type ProviderDef = {
  key: string; label: string; envVar: string; hint: string;
};

const PROVIDERS: ProviderDef[] = [
  { key: 'openrouterKey', label: 'OpenRouter', envVar: 'OPENROUTER_API_KEY', hint: 'OpenRouter pe saare :free models (Flint, Nemotron VL, DeepSeek, Beam…) unlock hote hain. openrouter.ai/keys' },
  { key: 'kiloKey', label: 'Kilo Gateway', envVar: 'KILO_API_KEY', hint: 'OpenCode/Kilo Gateway ke free models. Base URL env KILO_GATEWAY_URL se override ho sakta hai.' },
  { key: 'openaiKey', label: 'OpenAI', envVar: 'OPENAI_API_KEY', hint: 'Paid — GPT-4.1-mini/model.juggling. platform.openai.com' },
  { key: 'geminiKey', label: 'Google Gemini', envVar: 'GEMINI_API_KEY', hint: 'Gemini models + image generation. aistudio.google.com/apikey' },
  { key: 'githubKey', label: 'GitHub Models', envVar: 'GITHUB_TOKEN', hint: 'github.com settings → developer tokens (models scope).' },
];

type TestResult = { status: string; latencyMs?: number; error?: string; provider?: string };

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestResult | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [testingNow, setTestingNow] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((j) => {
        const s = (j.settings ?? {}) as Record<string, unknown>;
        const next: Record<string, string> = {};
        for (const p of PROVIDERS) {
          const v = s[p.key];
          next[p.key] = typeof v === 'string' ? v : '';
        }
        setValues(next);
        setSavedAt(j.updatedAt ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: string) => setValues((old) => ({ ...old, [k]: v }));

  const testProvider = async (p: ProviderDef) => {
    const keyVal = values[p.key]?.trim();
    // Server pe saved key ho sakti hai — browser wali nahi to server value use hogi.
    const headers: Record<string, string> = { 'content-type': 'application/json', 'x-save-mode': '1' };
    setTests((t) => ({ ...t, [p.key]: { status: 'running' } }));
    setTestingNow(p.key);
    try {
      const res = await fetch(`/api/test-provider?provider=${p.label === 'GitHub Models' ? 'github' : p.label === 'Kilo Gateway' ? 'kilo' : p.label === 'OpenRouter' ? 'openrouter' : p.label === 'OpenAI' ? 'openai' : 'gemini'}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider: p.label === 'GitHub Models' ? 'github' : p.label === 'Kilo Gateway' ? 'kilo' : p.label === 'OpenRouter' ? 'openrouter' : p.label === 'OpenAI' ? 'openai' : 'gemini', key: keyVal || undefined }),
      });
      const j = (await res.json()) as TestResult & { status: string };
      setTests((t) => ({ ...t, [p.key]: j }));
    } catch (err) {
      setTests((t) => ({ ...t, [p.key]: { status: 'ERROR', error: err instanceof Error ? err.message : 'network' } }));
    } finally {
      setTestingNow(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const p of PROVIDERS) {
        if (values[p.key]?.trim()) payload[p.key] = values[p.key].trim();
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ settings: payload }),
      });
      const j = await res.json();
      if (j.status === 'OK') {
        setSavedAt(new Date().toISOString());
      } else {
        alert('Save failed: ' + (j.error || 'unknown'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-amber-500" />
          Settings — API Keys
        </h1>
        <p className="text-zinc-400">
          Keys server-side <code className="bg-zinc-800 px-1 rounded">data/settings.json</code> me save hoti hain aur API routes automatically
          use karti hain. Test button ek ASLI chhoti API call chalata hai — set/fail dono honest dikhte hain.
        </p>
        {savedAt && <p className="text-xs text-zinc-600 mt-1">Last saved: {new Date(savedAt).toLocaleString()}</p>}
      </div>

      <div className="p-4 bg-amber-900/20 border border-amber-800 rounded-xl flex items-start gap-3 text-sm">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-amber-200/90">
          Keys कभी client bundle me nahi jati — sirf server par store hoti hain. Env vars (envVar column) priority rakhte hain
          agar server pe set hain. Pollinations keyless channel bina kisi key ke hamesha rahega.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : (
        <>
          <div className="space-y-4">
            {PROVIDERS.map((p) => {
              const test = tests[p.key];
              return (
                <div key={p.key} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {p.label}
                        {test?.status === 'CONNECTED' && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />connected {test.latencyMs}ms</span>}
                        {test?.status === 'running' && <span className="text-xs text-zinc-400 flex items-center gap-1"><Loader2 className="w-3.5 h-3.5 animate-spin" />testing…</span>}
                        {(test?.status === 'ERROR' || test?.status === 'CONFIGURATION_REQUIRED') && <span className="text-xs text-red-400 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{test?.error || 'failed'}</span>}
                      </div>
                      <div className="text-xs text-zinc-500">{p.hint}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => testProvider(p)} disabled={testingNow !== null}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5">
                        <TestTube2 className="w-3.5 h-3.5" /> Test
                      </button>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={values[p.key] ?? ''}
                    onChange={(e) => set(p.key, e.target.value)}
                    placeholder={`Paste ${p.label} key (ya server env ${p.envVar})`}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg flex items-center gap-2 font-medium">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Keys
            </button>
            <span className="text-xs text-zinc-500">Save ke baad Chat/Agents ki calls turant in keys ka istamaal karengi.</span>
          </div>
        </>
      )}
    </div>
  );
}
