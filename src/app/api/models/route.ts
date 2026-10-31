import { NextResponse } from 'next/server';
import { ModelRouter } from '@/lib/models/router';

export async function GET() {
  const models = ModelRouter.getModels();
  return NextResponse.json({ models, total: models.length });
}
