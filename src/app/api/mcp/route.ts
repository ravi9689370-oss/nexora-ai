import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    servers: [
      { name: 'rea', status: 'connected', tools: 207, description: 'Reverse Engineering Assistant' }
    ],
    total: 1
  });
}
