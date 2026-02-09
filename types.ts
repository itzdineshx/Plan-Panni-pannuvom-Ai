
export enum AcademicLevel {
  UG = 'Undergraduate',
  PG = 'Postgraduate'
}

export enum SkillLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced'
}

export enum CareerGoal {
  Research = 'Research',
  Industry = 'Industry',
  Startup = 'Startup'
}

export interface Source {
  title: string;
  uri: string;
}

export interface LearningResource {
  title: string;
  url: string;
  type: 'documentation' | 'tutorial' | 'paper' | 'course';
  description: string;
}

export interface TechComponent {
  name: string;
  role: string;
  description: string;
}

export interface Dataset {
  name: string;
  source: string;
  url: string;
  description: string;
}

export interface UserProfile {
  academicLevel: AcademicLevel;
  department: string;
  skillLevel: SkillLevel;
  domainInterests: string[];
  techPreferences: string[];
  careerGoal: CareerGoal;
  timeline: string;
  interestPrompt: string;
}

export interface Project {
  id: string;
  title: string;
  problemStatement: string;
  innovationAngle: string;
  solutionIdea: string;
  abstract: string;
  prd: string;
  designDoc: string;
  techStack: TechComponent[];
  algorithms: { name: string; description: string; implementationLogic: string }[];
  datasets: Dataset[];
  roadmap: Milestone[];
  vivaQuestions: VivaQuestion[];
  tasks: Task[];
  sources?: Source[];
  learningResources?: LearningResource[];
  implementationStrategy?: string;
  status: 'ideation' | 'planning' | 'implementation' | 'documentation';
}

export interface Milestone {
  id: string;
  phase: string;
  title: string;
  duration: string;
  description: string;
}

export interface VivaQuestion {
  question: string;
  answerSimple: string;
  answerAdvanced: string;
}

export interface Task {
  id: string;
  title: string;
  assignedTo: string;
  status: 'todo' | 'in-progress' | 'done';
  deadline: string;
}

export type AppView = 'dashboard' | 'ideation' | 'guidance' | 'docs' | 'collaboration' | 'viva';
