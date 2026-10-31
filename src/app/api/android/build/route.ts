import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { projectName, template } = await req.json();
  return NextResponse.json({
    status: 'building',
    projectName,
    template,
    message: 'Android build pipeline initiated',
    steps: ['Planning', 'Code Generation', 'Gradle Setup', 'Building APK']
  });
}
