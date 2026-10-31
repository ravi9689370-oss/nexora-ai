import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  return NextResponse.json({
    query,
    results: [
      { title: 'Research Result', snippet: 'Configure search providers for live results', source: 'system' }
    ],
    status: 'ready'
  });
}
