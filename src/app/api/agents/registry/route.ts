import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    total: 358,
    loaded: true,
    status: 'active',
    source: '/root/agency-agents',
    message: 'Agency Agents repository loaded'
  });
}
