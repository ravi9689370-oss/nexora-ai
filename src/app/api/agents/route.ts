import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agents/orchestrator';

export async function GET() {
  const teams = AgentOrchestrator.getAllTeams();
  return NextResponse.json({ teams, totalAgents: 358, loaded: true });
}

export async function POST(req: Request) {
  const { task } = await req.json();
  const selectedTeam = AgentOrchestrator.selectTeam(task || '');
  return NextResponse.json({ task, selectedTeam, status: 'orchestrating' });
}
