'use client';

import { useEffect, useState } from 'react';
import { Server, Plus, CheckCircle2, XCircle, Loader2, Trash2, TestTube2, Info } from 'lucide-react';

type MCPServer = { name: string; url: string; tags?: string[]; addedAt?: string };

export default function MCPPage() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mcp-servers');
      const j = await res.json();
      setServers(j.servers ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, url: url.trim(), action: 'add' }),
      });
      const j = await res.json();
      if (j.status === 'CONNECTED') {
        setMessage({ ok: true, text: `${j.server.name} connect ho gaya (${j.endpoint}, ${j.latencyMs}ms). Registry me save ho gaya.` });
        setUrl(''); setName('');
        setServers(j.servers ?? []);
      } else {
        setMessage({ ok: false, text: `Connect FAIL: ${j.error || j.status}. Sirf reachable hi add hota hai — fake entry save nahi karte.` });
      }
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'network error' });
    } finally {
      setBusy(false);
    }
  };

  const testOne = async (s: MCPServer) => {
    setTesting(s.url);
    try {
      const res = await fetch('/api/mcp-servers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: s.url, action: 'test' }),
      });
      const j = await res.json();
      setMessage({ ok: j.status === 'CONNECTED', text: `${s.name}: ${j.status === 'CONNECTED' ? `reachable (${j.latencyMs}ms)` : `FAIL — ${j.error || j.status}`}` });
    } finally {
      setTesting(null);
    }
  };

  const remove = async (s: MCPServer) => {
    await fetch(`/api/mcp-servers?url=${encodeURIComponent(s.url)}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-500" />
          MCP Manager
        </h1>
        <p className="text-zinc-400">Model Context Protocol servers — sirf REAL reachability. Har add/test request asli HTTP probe chalati hai.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm flex items-start gap-2 ${message.ok ? 'bg-emerald-900/30 text-emerald-200' : 'bg-red-900/30 text-red-200'}`}>
          {message.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <XCircle className="w-4 h-4 mt-0.5" />}
          {message.text}
        </div>
      )}

      <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://127.0.0.1:8718 (MCP base URL)"
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
          <button onClick={add} disabled={busy || !url.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg flex items-center justify-center gap-2 text-sm">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add (test + save)
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-2">Add hone se pehle /healthz, /status, /mcp, / — koi bhi ek 200 de, tabhi entry save hoti hai.</p>
      </div>

      <div className="p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 text-xs text-zinc-500 space-y-1">
        <div className="flex items-center gap-2 text-zinc-400 font-medium"><Info className="w-4 h-4" /> REA MCP local setup (honest guide):</div>
        <p>1. REA tool apne machine par chalao: <code className="bg-zinc-800 px-1 rounded">npx rea mcp</code> ya REA desktop agent me MCP server enable karo.</p>
        <p>2. Jo port mile (jaise <code className="bg-zinc-800 px-1 rounded">http://127.0.0.1:8718</code>), wo upar Add karo — probe pass hone par registry me save hoga.</p>
        <p>3. Phir REA Lab page par analysis requests us MCP endpoint se jaayengi. Config na ho to REA Lab “CONFIGURATION_REQUIRED” dikhata hai — jhooth nahi.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
      ) : servers.length === 0 ? (
        <div className="p-6 bg-zinc-900 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-500">
          Koi MCP server registered nahi hai. (Pehle wala fake “rea · connected · 207 tools” card hata diya gaya hai — deploy me real configuration hoti hai.)
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <div key={s.url} className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold text-sm">{s.name}</div>
                <div className="font-mono text-xs text-zinc-500 truncate">{s.url}</div>
                {s.addedAt && <div className="text-[10px] text-zinc-600">added {new Date(s.addedAt).toLocaleString()}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => testOne(s)} disabled={testing !== null}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 rounded-lg text-xs flex items-center gap-1.5">
                  {testing === s.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube2 className="w-3.5 h-3.5" />} Test
                </button>
                <button onClick={() => remove(s)}
                  className="px-3 py-2 bg-red-900/40 hover:bg-red-900/60 rounded-lg text-xs flex items-center gap-1.5 text-red-300">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
