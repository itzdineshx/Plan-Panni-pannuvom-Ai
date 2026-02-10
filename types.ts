
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

export enum ProjectType {
  MiniProject = 'Mini Project',
  MajorProject = 'Major Project',
  Capstone = 'Capstone / Final Year Project',
  SIH = 'Smart India Hackathon (SIH)',
  Hackathon = 'Other Hackathon / Competition',
  ResearchPaper = 'Research Paper / Publication'
}

export enum Methodology {
  Agile = 'Agile / Scrum',
  Waterfall = 'Waterfall',
  Prototype = 'Rapid Prototyping',
  ResearchBased = 'Research-Based (Literature → Experiment)',
  DesignThinking = 'Design Thinking'
}

export enum ProjectComplexity {
  Basic = 'Basic (Single module, straightforward)',
  Moderate = 'Moderate (Multi-module with integrations)',
  Advanced = 'Advanced (ML/DL, distributed systems, etc.)',
  Research = 'Research-grade (Novel contribution expected)'
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
  semester: string;
  skillLevel: SkillLevel;
  domainInterests: string[];
  techPreferences: string[];
  careerGoal: CareerGoal;
  timeline: string;
  interestPrompt: string;
  projectType: ProjectType;
  teamSize: number;
  methodology: Methodology;
  preferredComplexity: ProjectComplexity;
  knowledgeAreas: string[];
  advisorGuidelines: string;
  budgetConstraint: string;
  hasHardwareComponent: boolean;
  targetPlatform: string[];
  referenceProjects: string;
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
  documentationAttachments?: FileAttachment[];
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
  startDate?: string;
  targetDate?: string;
  aiSuggestedDate?: string;
  completionPercentage?: number;
  status?: 'not-started' | 'in-progress' | 'completed' | 'overdue';
  linkedTaskIds?: string[];
}

export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'document' | 'other';
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  password: string;
  academicLevel?: AcademicLevel;
  department?: string;
  headline?: string;
  avatarUrl?: string;
}

export interface AppNotification {
  id: string;
  type: 'overdue' | 'critical-path' | 'chatbot' | 'milestone' | 'mention' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  relatedTaskId?: string;
  relatedMilestoneId?: string;
}

export interface VivaQuestion {
  question: string;
  answerSimple: string;
  answerAdvanced: string;
}

export enum TaskPriority {
  Critical = 'critical',
  High = 'high',
  Medium = 'medium',
  Low = 'low'
}

export enum TaskComplexity {
  Trivial = 1,
  Simple = 2,
  Moderate = 3,
  Complex = 5,
  Epic = 8
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignedTo: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  deadline: string;
  priority: TaskPriority;
  priorityScore: number; // 0-100 computed score
  complexity: TaskComplexity;
  estimatedHours: number;
  actualHours?: number;
  dependencies: string[]; // IDs of tasks this depends on
  subtasks?: string[]; // IDs of child tasks
  parentTaskId?: string;
  tags: string[];
  scheduledStart?: string;
  scheduledEnd?: string;
  criticalPath?: boolean;
  milestoneId?: string;
  attachments?: FileAttachment[];
}

export interface ChatMessageAttachment {
  id: string;
  file: FileAttachment;
}

export interface ScheduleSlot {
  taskId: string;
  assignee: string;
  startDate: string;
  endDate: string;
  isCriticalPath: boolean;
}

export interface ScheduleResult {
  slots: ScheduleSlot[];
  criticalPathLength: number; // in days
  totalEstimatedHours: number;
  resourceUtilization: Record<string, number>; // assignee -> percentage
  bottlenecks: string[]; // task IDs that are bottlenecks
  suggestedReassignments: { taskId: string; from: string; to: string; reason: string }[];
}

export interface TaskBreakdown {
  parentTask: string;
  subtasks: Omit<Task, 'id' | 'priorityScore' | 'scheduledStart' | 'scheduledEnd' | 'criticalPath'>[];
}

export type AppView = 'dashboard' | 'ideation' | 'guidance' | 'docs' | 'collaboration' | 'viva' | 'tasks';
