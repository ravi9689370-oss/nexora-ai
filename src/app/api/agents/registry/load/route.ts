import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const agencyPath = '/root/agency-agents';
    const agents = [];
    
    const divisions = ['engineering', 'design', 'game-development', 'research', 'security', 
                      'testing', 'product', 'project-management', 'marketing', 'sales',
                      'support', 'finance', 'healthcare', 'academic', 'specialized'];
    
    for (const division of divisions) {
      const divPath = path.join(agencyPath, division);
      if (fs.existsSync(divPath)) {
        const files = fs.readdirSync(divPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            agents.push({
              name: file.replace('.md', ''),
              division,
              file: path.join(division, file)
            });
          }
        }
      }
    }
    
    return NextResponse.json({
      total: agents.length,
      agents: agents.slice(0, 100),
      loaded: true,
      source: agencyPath
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load agents' }, { status: 500 });
  }
}
