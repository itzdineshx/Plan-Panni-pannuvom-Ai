import { Task, TaskPriority, TaskComplexity, ScheduleResult, ScheduleSlot } from '../types';

// ─── Priority Scoring Engine ────────────────────────────────────────────────
// Computes a 0-100 score using weighted factors:
//   Urgency (deadline proximity)   – 35%
//   Dependency impact (blockers)   – 25%
//   Complexity-to-time ratio       – 20%
//   Manual priority weight         – 20%

const PRIORITY_WEIGHTS = {
  [TaskPriority.Critical]: 100,
  [TaskPriority.High]: 75,
  [TaskPriority.Medium]: 50,
  [TaskPriority.Low]: 25,
};

function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** How many other tasks are blocked by this one? */
function dependentCount(taskId: string, allTasks: Task[]): number {
  return allTasks.filter(t => t.dependencies.includes(taskId)).length;
}

/** Urgency score (0-100): 100 when deadline is today or past, 0 when 30+ days away */
function urgencyScore(deadline: string): number {
  if (!deadline || deadline === 'No Deadline') return 20; // low urgency placeholder
  const daysLeft = daysBetween(todayISO(), deadline);
  if (daysLeft <= 0) return 100;
  if (daysLeft >= 30) return 0;
  return Math.round(100 * (1 - daysLeft / 30));
}

/** Dependency impact score (0-100): grows with # of tasks this task blocks */
function dependencyImpactScore(taskId: string, allTasks: Task[]): number {
  const count = dependentCount(taskId, allTasks);
  // cap at 5 dependents → 100
  return Math.min(100, count * 20);
}

/** Complexity-to-time ratio score (0-100): high when complex tasks have tight deadlines */
function complexityTimeScore(task: Task): number {
  if (!task.deadline || task.deadline === 'No Deadline') return task.complexity * 10;
  const daysLeft = Math.max(1, daysBetween(todayISO(), task.deadline));
  const hoursPerDay = 6; // productive hours per day
  const availableHours = daysLeft * hoursPerDay;
  const ratio = task.estimatedHours / availableHours;
  return Math.min(100, Math.round(ratio * 100));
}

/** Compute priority score for a single task */
export function computePriorityScore(task: Task, allTasks: Task[]): number {
  if (task.status === 'done') return 0;
  if (task.status === 'blocked') return 5; // very low, can't act on it

  const u = urgencyScore(task.deadline);
  const d = dependencyImpactScore(task.id, allTasks);
  const c = complexityTimeScore(task);
  const p = PRIORITY_WEIGHTS[task.priority] ?? 50;

  return Math.round(u * 0.35 + d * 0.25 + c * 0.20 + p * 0.20);
}

/** Recompute all priority scores in-place and return sorted (highest first) */
export function rankTasks(tasks: Task[]): Task[] {
  const scored = tasks.map(t => ({
    ...t,
    priorityScore: computePriorityScore(t, tasks),
  }));
  return scored.sort((a, b) => b.priorityScore - a.priorityScore);
}

// ─── Topological Sort (Kahn's Algorithm) ────────────────────────────────────

function topologicalSort(tasks: Task[]): Task[] {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const t of tasks) {
    inDegree.set(t.id, 0);
    adjList.set(t.id, []);
  }

  for (const t of tasks) {
    for (const dep of t.dependencies) {
      if (taskMap.has(dep)) {
        adjList.get(dep)!.push(t.id);
        inDegree.set(t.id, (inDegree.get(t.id) || 0) + 1);
      }
    }
  }

  // Start with nodes that have no dependencies, prioritise by score
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  queue.sort((a, b) => (taskMap.get(b)!.priorityScore) - (taskMap.get(a)!.priorityScore));

  const sorted: Task[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(taskMap.get(id)!);
    for (const neighbor of adjList.get(id)!) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
        queue.sort((a, b) => (taskMap.get(b)!.priorityScore) - (taskMap.get(a)!.priorityScore));
      }
    }
  }

  // If there are cycles, append remaining tasks at end
  if (sorted.length < tasks.length) {
    const sortedIds = new Set(sorted.map(t => t.id));
    for (const t of tasks) {
      if (!sortedIds.has(t.id)) sorted.push(t);
    }
  }

  return sorted;
}

// ─── Critical Path Analysis ─────────────────────────────────────────────────

function computeCriticalPath(tasks: Task[]): Set<string> {
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Earliest start / finish (forward pass)
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  const sorted = topologicalSort(tasks);

  for (const t of sorted) {
    let earliest = 0;
    for (const dep of t.dependencies) {
      if (ef.has(dep)) {
        earliest = Math.max(earliest, ef.get(dep)!);
      }
    }
    es.set(t.id, earliest);
    ef.set(t.id, earliest + t.estimatedHours);
  }

  // Latest start / finish (backward pass)
  const projectEnd = Math.max(...Array.from(ef.values()), 0);
  const ls = new Map<string, number>();
  const lf = new Map<string, number>();

  for (let i = sorted.length - 1; i >= 0; i--) {
    const t = sorted[i];
    // Find successors
    const successors = tasks.filter(s => s.dependencies.includes(t.id));
    if (successors.length === 0) {
      lf.set(t.id, projectEnd);
    } else {
      lf.set(t.id, Math.min(...successors.map(s => ls.get(s.id) ?? projectEnd)));
    }
    ls.set(t.id, lf.get(t.id)! - t.estimatedHours);
  }

  // Float = 0 → critical path
  const critical = new Set<string>();
  for (const t of tasks) {
    const float = (ls.get(t.id) ?? 0) - (es.get(t.id) ?? 0);
    if (Math.abs(float) < 0.01) {
      critical.add(t.id);
    }
  }

  return critical;
}

// ─── Schedule Optimizer ─────────────────────────────────────────────────────
// Uses dependency-aware list scheduling with resource leveling

export function optimizeSchedule(tasks: Task[], teamMembers: string[]): ScheduleResult {
  if (tasks.length === 0) {
    return {
      slots: [],
      criticalPathLength: 0,
      totalEstimatedHours: 0,
      resourceUtilization: {},
      bottlenecks: [],
      suggestedReassignments: [],
    };
  }

  // 1) Score and rank
  const scored = rankTasks(tasks.filter(t => t.status !== 'done'));

  // 2) Critical path
  const criticalIds = computeCriticalPath(scored);

  // 3) Topological order
  const ordered = topologicalSort(scored);

  // 4) Greedy list-scheduling per assignee
  const assigneeFinishDay = new Map<string, number>();
  const taskFinishDay = new Map<string, number>();
  const slots: ScheduleSlot[] = [];

  const hoursPerDay = 6;
  const startDate = new Date(todayISO());

  for (const m of teamMembers) {
    assigneeFinishDay.set(m, 0);
  }

  for (const task of ordered) {
    // Earliest start: after all dependencies finish
    let earliestStart = 0;
    for (const dep of task.dependencies) {
      earliestStart = Math.max(earliestStart, taskFinishDay.get(dep) || 0);
    }

    // Pick assignee with the earliest available slot (resource leveling)
    let assignee = task.assignedTo;
    if (!assignee || assignee === 'Unassigned' || !teamMembers.includes(assignee)) {
      // Auto-assign to least-loaded member
      assignee = teamMembers.reduce((best, m) =>
        (assigneeFinishDay.get(m) || 0) < (assigneeFinishDay.get(best) || 0) ? m : best,
        teamMembers[0]
      );
    }

    const memberAvailable = assigneeFinishDay.get(assignee) || 0;
    const actualStart = Math.max(earliestStart, memberAvailable);
    const durationDays = Math.max(1, Math.ceil(task.estimatedHours / hoursPerDay));
    const actualEnd = actualStart + durationDays;

    assigneeFinishDay.set(assignee, actualEnd);
    taskFinishDay.set(task.id, actualEnd);

    const sDate = new Date(startDate);
    sDate.setDate(sDate.getDate() + actualStart);
    const eDate = new Date(startDate);
    eDate.setDate(eDate.getDate() + actualEnd);

    slots.push({
      taskId: task.id,
      assignee,
      startDate: sDate.toISOString().split('T')[0],
      endDate: eDate.toISOString().split('T')[0],
      isCriticalPath: criticalIds.has(task.id),
    });
  }

  // 5) Resource utilization
  const projectLengthDays = Math.max(...Array.from(taskFinishDay.values()), 1);
  const resourceUtilization: Record<string, number> = {};
  for (const member of teamMembers) {
    const memberSlots = slots.filter(s => s.assignee === member);
    const busyDays = memberSlots.reduce((sum, s) => sum + daysBetween(s.startDate, s.endDate), 0);
    resourceUtilization[member] = Math.round((busyDays / projectLengthDays) * 100);
  }

  // 6) Identify bottlenecks (tasks on critical path with high dependency count)
  const bottlenecks = scored
    .filter(t => criticalIds.has(t.id) && dependentCount(t.id, scored) >= 2)
    .map(t => t.id);

  // 7) Suggest reassignments for overloaded members
  const suggestedReassignments: { taskId: string; from: string; to: string; reason: string }[] = [];
  const avgUtilization = Object.values(resourceUtilization).reduce((a, b) => a + b, 0) / teamMembers.length;

  for (const member of teamMembers) {
    if ((resourceUtilization[member] ?? 0) > avgUtilization + 25) {
      // Find least-loaded candidate
      const leastLoaded = teamMembers.reduce((best, m) =>
        (resourceUtilization[m] ?? 100) < (resourceUtilization[best] ?? 100) ? m : best,
        teamMembers[0]
      );
      if (leastLoaded !== member) {
        // Suggest moving a non-critical task
        const movable = slots.find(s => s.assignee === member && !s.isCriticalPath);
        if (movable) {
          suggestedReassignments.push({
            taskId: movable.taskId,
            from: member,
            to: leastLoaded,
            reason: `${member} is overloaded (${resourceUtilization[member]}% util) vs ${leastLoaded} (${resourceUtilization[leastLoaded]}% util)`,
          });
        }
      }
    }
  }

  return {
    slots,
    criticalPathLength: projectLengthDays,
    totalEstimatedHours: scored.reduce((sum, t) => sum + t.estimatedHours, 0),
    resourceUtilization,
    bottlenecks,
    suggestedReassignments,
  };
}

// ─── Smart Task Breakdown Helpers ───────────────────────────────────────────

/** Create a well-formed Task object with defaults */
export function createTask(partial: Partial<Task> & { title: string }): Task {
  return {
    id: partial.id || Math.random().toString(36).substr(2, 9),
    title: partial.title,
    description: partial.description || '',
    assignedTo: partial.assignedTo || 'Unassigned',
    status: partial.status || 'todo',
    deadline: partial.deadline || 'No Deadline',
    priority: partial.priority || TaskPriority.Medium,
    priorityScore: partial.priorityScore || 0,
    complexity: partial.complexity || TaskComplexity.Moderate,
    estimatedHours: partial.estimatedHours || 4,
    actualHours: partial.actualHours,
    dependencies: partial.dependencies || [],
    subtasks: partial.subtasks,
    parentTaskId: partial.parentTaskId,
    tags: partial.tags || [],
    scheduledStart: partial.scheduledStart,
    scheduledEnd: partial.scheduledEnd,
    criticalPath: partial.criticalPath,
    milestoneId: partial.milestoneId,
  };
}

/** Apply schedule results back onto tasks */
export function applySchedule(tasks: Task[], schedule: ScheduleResult): Task[] {
  const slotMap = new Map(schedule.slots.map(s => [s.taskId, s]));

  return tasks.map(t => {
    const slot = slotMap.get(t.id);
    if (slot) {
      return {
        ...t,
        scheduledStart: slot.startDate,
        scheduledEnd: slot.endDate,
        criticalPath: slot.isCriticalPath,
        assignedTo: slot.assignee,
      };
    }
    return t;
  });
}

/** Detect tasks whose dependencies are all met and can start immediately */
export function getReadyTasks(tasks: Task[]): Task[] {
  const doneIds = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));
  return tasks.filter(t => {
    if (t.status !== 'todo') return false;
    return t.dependencies.every(dep => doneIds.has(dep));
  });
}

/** Detect blocked tasks (have unfinished dependencies) */
export function detectBlockedTasks(tasks: Task[]): Task[] {
  const doneIds = new Set(tasks.filter(t => t.status === 'done').map(t => t.id));
  return tasks.filter(t => {
    if (t.status === 'done') return false;
    return t.dependencies.some(dep => !doneIds.has(dep));
  });
}

/** Get a color class for a priority level */
export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case TaskPriority.Critical: return 'text-red-600 bg-red-50 border-red-200';
    case TaskPriority.High: return 'text-orange-600 bg-orange-50 border-orange-200';
    case TaskPriority.Medium: return 'text-blue-600 bg-blue-50 border-blue-200';
    case TaskPriority.Low: return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}

/** Get a color for score bars */
export function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-blue-500';
  return 'bg-slate-300';
}
