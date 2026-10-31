import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();
    
    const response = `**Ultra AI Super App Response** (Model: ${model || 'kilo-auto/free'})\n\nI can help you with:\n- **Coding**: Write, debug, and review code\n- **Research**: Deep research with multiple sources\n- **Agents**: Orchestrate specialized AI agents\n- **Reverse Engineering**: Analyze apps with REA\n- **Android Development**: Build APKs with AI\n\nHow can I assist you today?`;
    
    return NextResponse.json({ 
      content: response,
      model: model || 'kilo-auto/free'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
