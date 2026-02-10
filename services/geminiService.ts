
import { UserProfile, Project, VivaQuestion, Milestone, Source, Task, TaskBreakdown, TaskPriority, TaskComplexity } from '../types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-001';

async function chatCompletion(systemPrompt: string, userPrompt: string, json = true): Promise<string> {
  const body: any = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  };
  if (json) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Plan Panni Pannuvom',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function extractJSON(text: string): any {
  // Try parsing directly first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch { /* fall through */ }
    }
    // Try finding the first { ... } or [ ... ] blob
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch { /* fall through */ }
    }
    const bracketMatch = text.match(/\[[\s\S]*\]/);
    if (bracketMatch) {
      try {
        return JSON.parse(bracketMatch[0]);
      } catch { /* fall through */ }
    }
    console.error('Failed to parse JSON. Raw response:', text.slice(0, 500));
    throw new Error('Failed to parse JSON from API response');
  }
}

export const geminiService = {
  async generateProjectIdeas(profile: UserProfile): Promise<{ 
    academicIdeas: Partial<Project>[], 
    trendingIdeas: Partial<Project>[], 
    sources: Source[] 
  }> {
    const systemPrompt = `You are an expert academic mentor with deep knowledge of current research trends, IEEE publications, Smart India Hackathon (SIH) problem statements, and real-time technology trends. You always respond with valid JSON only.`;

    const userPrompt = `
      Based on the user profile below, generate project ideas in two categories:
      1. Academic Research & SIH Themes: 3 project ideas derived from latest research trends, IEEE Xplore papers, Google Scholar, and recent Smart India Hackathon (SIH) problem statements (2024-2025).
      2. Real-time Trends: 3 project ideas derived from real-time pain points, technical challenges, and societal issues currently trending on X (formerly Twitter) and major technology news outlets.
      
      User Profile:
      Level: ${profile.academicLevel}
      Dept: ${profile.department}
      Interests: ${profile.domainInterests.join(', ')}
      Tech: ${profile.techPreferences.join(', ')}
      Context: ${profile.interestPrompt}
      
      Return a JSON object with exactly this structure:
      {
        "academic": [
          { "title": "...", "problemStatement": "...", "innovationAngle": "...", "solutionIdea": "..." }
        ],
        "trending": [
          { "title": "...", "problemStatement": "...", "innovationAngle": "...", "solutionIdea": "..." }
        ]
      }
      Each array must have exactly 3 items.
    `;

    const responseText = await chatCompletion(systemPrompt, userPrompt);
    const parsed = extractJSON(responseText);

    const sources: Source[] = [
      { title: 'IEEE Xplore Digital Library', uri: 'https://ieeexplore.ieee.org/' },
      { title: 'Google Scholar', uri: 'https://scholar.google.com/' },
      { title: 'Smart India Hackathon', uri: 'https://sih.gov.in/' },
    ];

    return { 
      academicIdeas: parsed.academic, 
      trendingIdeas: parsed.trending, 
      sources 
    };
  },

  async generateProjectDocumentation(project: Partial<Project>, profile: UserProfile): Promise<{ abstract: string; prd: string; designDoc: string }> {
    // Split into 3 separate plain-text calls for reliability
    const abstractPrompt = `You are an academic research assistant.
Generate an ACADEMIC ABSTRACT in a STRICTLY STRUCTURED FORMAT.

PROJECT DETAILS:
- Title: ${project.title}
- Domain: ${profile.department}
- Problem Statement: ${project.problemStatement}
- Techniques: ${project.innovationAngle}
- Expected Outcome: ${project.solutionIdea}

FORMAT RULES (MANDATORY):
- Use EXACTLY the following section labels in UPPERCASE followed by a colon
- Each section must be 2-3 sentences
- DO NOT merge sections into one paragraph
- DO NOT add extra headings
- Separate each section with a blank line

OUTPUT FORMAT (follow this EXACTLY, return ONLY the formatted text below, no JSON, no code fences):

BACKGROUND:
<2-3 sentences about domain context>

PROBLEM STATEMENT:
<2-3 sentences defining the core problem>

PROPOSED SOLUTION:
<2-3 sentences describing the proposed approach>

METHODOLOGY:
<2-3 sentences on techniques, algorithms, and tools used>

EXPECTED RESULTS:
<2-3 sentences on anticipated outcomes and impact>`;

    const prdPrompt = `You are a senior system analyst.
Generate a PRODUCT REQUIREMENTS DOCUMENT (PRD) in a STRICT, NUMBERED, OFFICIAL FORMAT.

PROJECT:
- Title: ${project.title}
- Problem: ${project.problemStatement}
- Solution: ${project.solutionIdea}
- Target Users: Students, researchers, and relevant industry professionals
- Constraints: 6 Months timeline, limited compute resources

FORMAT RULES (MANDATORY):
- Use numbered headings EXACTLY as given below
- Use bullet points (- ) for all requirements and list items
- DO NOT write continuous paragraphs
- Each requirement MUST be on its own line
- Separate major sections with blank lines
- Return ONLY the formatted document text, no JSON, no code fences

DOCUMENT STRUCTURE (follow this EXACTLY):

1. Introduction

1.1 Purpose
- <bullet point>

1.2 Intended Audience
- <bullet point>

1.3 Project Overview
- <bullet point>

2. Problem Definition

2.1 Existing System
- <bullet point>

2.2 Limitations of Existing System
- <bullet point list>

2.3 Proposed System
- <bullet point>

3. Functional Requirements
- FR1: <requirement>
- FR2: <requirement>
- FR3: <requirement>
- FR4: <requirement>

4. Non-Functional Requirements

4.1 Performance
- <bullet point>

4.2 Scalability
- <bullet point>

4.3 Security
- <bullet point>

4.4 Usability
- <bullet point>

5. Assumptions & Dependencies
- <bullet points>

6. Constraints
- <bullet points>

7. Success Criteria
- <bullet points>`;

    const sddPrompt = `You are a software architect.
Generate a SYSTEM DESIGN DOCUMENT (SDD) in a STRICTLY STRUCTURED FORMAT.

INPUT:
- Project Title: ${project.title}
- Problem: ${project.problemStatement}
- Solution: ${project.solutionIdea}
- Tech Stack: ${profile.techPreferences.join(', ') || 'React, Node.js, Python, MongoDB'}
- AI/ML Models: ${project.innovationAngle}

FORMAT RULES (MANDATORY):
- Use numbered headings EXACTLY as given
- Use bullet points (- ) for module descriptions
- Use arrow notation (→) for data flow steps
- DO NOT write paragraph-only explanations
- Separate sections with blank lines
- Return ONLY the formatted document text, no JSON, no code fences

DOCUMENT STRUCTURE (follow this EXACTLY):

1. System Overview
- <bullet point description>

2. System Architecture

2.1 High-Level Architecture
- <bullet point describing architecture layers>

2.2 Component Description
- <bullet point per component>

3. Module Design

3.1 User Interface Module
- <bullet points>

3.2 Backend Processing Module
- <bullet points>

3.3 AI/ML Processing Module
- <bullet points>

3.4 Database Module
- <bullet points>

4. Data Flow Description
- Step 1 → <description>
- Step 2 → <description>
- Step 3 → <description>
- Step 4 → <description>

5. Workflow Description
- <bullet points describing the end-to-end workflow>

6. Technology Stack Justification
- <bullet point per technology choice with justification>

7. Security Considerations
- <bullet points>

8. Scalability & Future Enhancements
- <bullet points>`;

    const sysAbstract = 'You are an expert academic writer. Return ONLY the formatted document text. No JSON. No markdown code fences.';
    const sysPrd = 'You are a senior system analyst. Return ONLY the formatted document text. No JSON. No markdown code fences.';
    const sysSdd = 'You are a software architect. Return ONLY the formatted document text. No JSON. No markdown code fences.';

    const [abstract, prd, designDoc] = await Promise.all([
      chatCompletion(sysAbstract, abstractPrompt, false),
      chatCompletion(sysPrd, prdPrompt, false),
      chatCompletion(sysSdd, sddPrompt, false),
    ]);

    // Strip any accidental code fences the model might still add
    const clean = (text: string) => text.replace(/^```[\w]*\n?/gm, '').replace(/```$/gm, '').trim();

    return {
      abstract: clean(abstract),
      prd: clean(prd),
      designDoc: clean(designDoc),
    };
  },

  async generateGuidance(project: Partial<Project>): Promise<{ 
    techStack: any[]; 
    algorithms: any[]; 
    datasets: any[];
    roadmap: Milestone[]; 
    implementationStrategy: string; 
    learningResources: any[] 
  }> {
    const systemPrompt = `You are a Senior Technical Consultant with deep expertise in software architecture, AI/ML, and academic project planning. You always respond with valid JSON only.`;

    const userPrompt = `
      Provide a detailed technical blueprint for: "${project.title}".
      The guidance MUST be highly specific to this project title and its core domain.
      
      Sections Required:
      1. Modern Tech Stack: Specific frameworks and libraries with their architectural roles.
      2. Algorithms: At least 3 specific mathematical/AI/ML algorithms with detailed implementation logic.
      3. Datasets & Data Sources: Suggest real-world datasets (Kaggle, UCI, GitHub) or API sources for training/testing.
      4. Architecture & Strategy: A multi-layered description of the system architecture (UI -> Backend -> ML Pipeline -> Data Storage).
      5. Modular Roadmap: 4 phases of execution.
      6. Deep Dive Learning: Links to documentation, research papers, and tutorials.
      
      Return as a JSON object with this exact structure:
      {
        "techStack": [{ "name": "...", "role": "...", "description": "..." }],
        "algorithms": [{ "name": "...", "description": "...", "implementationLogic": "..." }],
        "datasets": [{ "name": "...", "source": "...", "url": "...", "description": "..." }],
        "implementationStrategy": "...",
        "roadmap": [{ "phase": "...", "title": "...", "duration": "...", "description": "..." }],
        "learningResources": [{ "title": "...", "url": "...", "type": "documentation|tutorial|paper|course", "description": "..." }]
      }
    `;

    const responseText = await chatCompletion(systemPrompt, userPrompt);
    return extractJSON(responseText);
  },

  async generateVivaPrep(project: Project): Promise<VivaQuestion[]> {
    const systemPrompt = `You are an academic examiner preparing challenging viva voce questions. You always respond with valid JSON only.`;

    const userPrompt = `
      Generate 10 challenging Viva Voce questions for the project: ${project.title}.
      Problem Statement: ${project.problemStatement}
      Innovation Angle: ${project.innovationAngle}
      
      For each question, provide:
      1. A simple explanation for basic understanding.
      2. An advanced academic explanation including technical justifications.
      
      Return a JSON object with this structure:
      {
        "questions": [
          { "question": "...", "answerSimple": "...", "answerAdvanced": "..." }
        ]
      }
      The "questions" array must have exactly 10 items.
    `;

    const responseText = await chatCompletion(systemPrompt, userPrompt);
    const parsed = extractJSON(responseText);
    return parsed.questions || parsed;
  },

  async generateTaskBreakdown(project: Partial<Project>, teamMembers: string[]): Promise<TaskBreakdown[]> {
    const systemPrompt = `You are a senior project manager and software engineering lead specializing in academic project planning. You break down complex projects into well-defined, dependency-aware tasks with accurate time estimates. You always respond with valid JSON only.`;

    const userPrompt = `
      Break down the following academic project into granular, actionable tasks for a team of ${teamMembers.length} members: ${teamMembers.join(', ')}.
      
      Project Title: ${project.title}
      Problem Statement: ${project.problemStatement}
      Tech Stack: ${project.techStack?.map(t => t.name).join(', ') || 'To be decided'}
      Roadmap Phases: ${project.roadmap?.map(m => m.title).join(' → ') || 'Standard 4-phase'}
      
      For EACH major project phase, create a parent task and break it into 3-5 subtasks.
      
      RULES:
      - Every task MUST have: title, description, assignedTo (pick from team), deadline (YYYY-MM-DD format, spread over 6 months from 2026-02-09), priority (critical/high/medium/low), complexity (1=trivial, 2=simple, 3=moderate, 5=complex, 8=epic), estimatedHours, tags, dependencies (list of other task titles this depends on)
      - Use realistic time estimates (2-40 hours per task)
      - Create meaningful dependency chains (e.g., "Design DB Schema" must come before "Implement Backend API")
      - Assign tasks balanced across team members
      - Include at least 4 parent phases with 3-5 subtasks each
      
      Return a JSON object:
      {
        "phases": [
          {
            "parentTask": "Phase 1: Research & Planning",
            "subtasks": [
              {
                "title": "...",
                "description": "...",
                "assignedTo": "...",
                "status": "todo",
                "deadline": "YYYY-MM-DD",
                "priority": "high",
                "complexity": 3,
                "estimatedHours": 10,
                "dependencies": [],
                "tags": ["research", "planning"]
              }
            ]
          }
        ]
      }
    `;

    const responseText = await chatCompletion(systemPrompt, userPrompt);
    const parsed = extractJSON(responseText);
    return parsed.phases || [];
  },

  async chatWithAI(
    messages: { role: 'user' | 'assistant'; content: string }[],
    projectContext?: Partial<Project> | null
  ): Promise<string> {
    const systemPrompt = `You are Plan Panni Pannuvom AI — an expert academic project assistant. You help students with project planning, research guidance, technical decisions, debugging, documentation, and viva preparation.

${projectContext ? `
CURRENT PROJECT CONTEXT:
Title: ${projectContext.title || 'Not set'}
Problem: ${projectContext.problemStatement || 'Not set'}
Tech Stack: ${projectContext.techStack?.map(t => t.name).join(', ') || 'Not set'}
Status: ${projectContext.status || 'Not set'}
` : 'No project is currently selected.'}

RULES:
- Be concise but thorough. Use bullet points and structured formatting.
- When asked about code, provide working examples.
- Reference the current project context when relevant.
- For research questions, cite real papers / datasets / tools.
- Be encouraging and mentor-like in tone.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Plan Panni Pannuvom',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: apiMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
};
