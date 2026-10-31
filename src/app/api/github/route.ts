import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    connected: false,
    message: 'Configure GitHub token in settings'
  });
}
