export interface Agent {
  name: string;
  division: string;
  role: string;
  capabilities: string[];
}

export const agentTeams = {
  softwareEngineering: [
    'frontend-developer', 'backend-developer', 'full-stack-developer', 
    'software-architect', 'api-developer', 'database-engineer', 
    'devops-engineer', 'code-reviewer'
  ],
  design: ['ui-designer', 'ux-designer', 'product-designer', 'graphic-designer', 'animation-specialist'],
  android: ['android-developer', 'kotlin-developer', 'java-developer', 'flutter-developer', 'apk-build-engineer'],
  gameDev: ['game-architect', 'unity-developer', 'unreal-developer', '3d-artist', 'game-ui-designer', 'gameplay-engineer', 'optimization-engineer'],
  reverseEngineering: ['application-analyst', 'binary-analyst', 'javascript-analyst', 'architecture-investigator', 'security-researcher'],
  security: ['security-auditor', 'vulnerability-analyst', 'code-security-reviewer', 'dependency-auditor'],
  research: ['web-researcher', 'technical-researcher', 'documentation-specialist', 'data-analyst'],
  testing: ['qa-engineer', 'automation-tester', 'performance-tester', 'ui-tester']
};

export class AgentOrchestrator {
  static selectTeam(task: string): string[] {
    const taskLower = task.toLowerCase();
    if (taskLower.includes('android') || taskLower.includes('apk') || taskLower.includes('kotlin')) {
      return agentTeams.android;
    }
    if (taskLower.includes('game') || taskLower.includes('unity') || taskLower.includes('unreal')) {
      return agentTeams.gameDev;
    }
    if (taskLower.includes('reverse') || taskLower.includes('binary') || taskLower.includes('rea') || taskLower.includes('apk analysis')) {
      return agentTeams.reverseEngineering;
    }
    if (taskLower.includes('security') || taskLower.includes('vuln')) {
      return agentTeams.security;
    }
    if (taskLower.includes('research') || taskLower.includes('search')) {
      return agentTeams.research;
    }
    if (taskLower.includes('test') || taskLower.includes('qa')) {
      return agentTeams.testing;
    }
    if (taskLower.includes('design') || taskLower.includes('ui') || taskLower.includes('ux')) {
      return agentTeams.design;
    }
    return agentTeams.softwareEngineering;
  }
  
  static getAllTeams() {
    return agentTeams;
  }
}
