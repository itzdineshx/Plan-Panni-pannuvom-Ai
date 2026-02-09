import React, { useState, useMemo, useCallback } from 'react';
import { Project, Task, TaskPriority, TaskComplexity, ScheduleResult } from '../types';
import {
  Users,
  Plus,
  Search,
  Calendar,
  Circle,
  Clock,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  User,
  Tag,
  Zap,
  AlertTriangle,
  BarChart3,
  GitBranch,
  Brain,
  Loader2,
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Lock,
  Shield
} from 'lucide-react';
import {
  rankTasks,
  optimizeSchedule,
  applySchedule,
  createTask,
  getReadyTasks,
  detectBlockedTasks,
  getPriorityColor,
  getScoreColor,
} from '../services/taskBreakdownService';
import { geminiService } from '../services/geminiService';

interface Props {
  project: Project;
}

const TEAM_MEMBERS = ['Aditya', 'Rahul', 'Sneha'];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: TaskPriority.Critical, label: 'Critical' },
  { value: TaskPriority.High, label: 'High' },
  { value: TaskPriority.Medium, label: 'Medium' },
  { value: TaskPriority.Low, label: 'Low' },
];

const COMPLEXITY_OPTIONS: { value: TaskComplexity; label: string }[] = [
  { value: TaskComplexity.Trivial, label: '1 - Trivial' },
  { value: TaskComplexity.Simple, label: '2 - Simple' },
  { value: TaskComplexity.Moderate, label: '3 - Moderate' },
  { value: TaskComplexity.Complex, label: '5 - Complex' },
  { value: TaskComplexity.Epic, label: '8 - Epic' },
];

// ── Helper sub-components ────────────────────────────────────────────────────

const PriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => (
  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getPriorityColor(priority)}`}>
    {priority}
  </span>
);

const ScoreBar: React.FC<{ score: number }> = ({ score }) => (
  <div className="flex items-center gap-2 min-w-[100px]">
    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${getScoreColor(score)}`} style={{ width: `${score}%` }} />
    </div>
    <span className="text-[10px] font-mono font-bold text-slate-500 w-6 text-right">{score}</span>
  </div>
);

const StatusIcon: React.FC<{ status: Task['status'] }> = ({ status }) => {
  switch (status) {
    case 'done': return <CheckCircle2 size={22} className="text-emerald-500" />;
    case 'in-progress': return <Clock size={22} className="text-indigo-500 animate-pulse" />;
    case 'blocked': return <Lock size={22} className="text-rose-400" />;
    default: return <Circle size={22} className="text-slate-300" />;
  }
};

// ── Main component ───────────────────────────────────────────────────────────

const CollaborationBoard: React.FC<Props> = ({ project }) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const defaults: Task[] = [
      createTask({ title: 'Setup GitHub Repo', assignedTo: 'Aditya', status: 'done', deadline: '2026-03-10', priority: TaskPriority.High, complexity: TaskComplexity.Simple, estimatedHours: 2, tags: ['setup'] }),
      createTask({ title: 'Data Cleaning Script', assignedTo: 'Rahul', status: 'in-progress', deadline: '2026-03-15', priority: TaskPriority.Medium, complexity: TaskComplexity.Moderate, estimatedHours: 8, tags: ['data'] }),
      createTask({ title: 'Draft Literature Survey', assignedTo: 'Sneha', status: 'todo', deadline: '2026-03-20', priority: TaskPriority.High, complexity: TaskComplexity.Complex, estimatedHours: 16, tags: ['research'] }),
      createTask({ title: 'System Architecture Diagram', assignedTo: 'Aditya', status: 'todo', deadline: '2026-03-12', priority: TaskPriority.Critical, complexity: TaskComplexity.Moderate, estimatedHours: 6, tags: ['architecture'] }),
    ];
    return rankTasks(defaults);
  });

  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule' | 'insights'>('tasks');
  const [isGenerating, setIsGenerating] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>(TaskPriority.Medium);
  const [newTaskComplexity, setNewTaskComplexity] = useState<TaskComplexity>(TaskComplexity.Moderate);
  const [newTaskHours, setNewTaskHours] = useState('4');
  const [newTaskDeps, setNewTaskDeps] = useState<string[]>([]);

  // Filters & sort
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all');
  const [sortBy, setSortBy] = useState<'priorityScore' | 'deadline' | 'assignee' | 'status'>('priorityScore');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // ── Derived data ──────────────────────────────────────────────────────────
  const readyTasks = useMemo(() => getReadyTasks(tasks), [tasks]);
  const blockedTasks = useMemo(() => detectBlockedTasks(tasks), [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchesSearch =
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'priorityScore': return b.priorityScore - a.priorityScore;
          case 'deadline': return a.deadline.localeCompare(b.deadline);
          case 'assignee': return a.assignedTo.localeCompare(b.assignedTo);
          case 'status': {
            const order: Record<string, number> = { 'blocked': 0, 'in-progress': 1, 'todo': 2, 'done': 3 };
            return (order[a.status] ?? 2) - (order[b.status] ?? 2);
          }
          default: return 0;
        }
      });
  }, [tasks, statusFilter, sortBy, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const critical = tasks.filter(t => t.priority === TaskPriority.Critical && t.status !== 'done').length;
    const totalHours = tasks.reduce((s, t) => s + t.estimatedHours, 0);
    const doneHours = tasks.filter(t => t.status === 'done').reduce((s, t) => s + t.estimatedHours, 0);
    return { total, done, critical, blocked: blockedTasks.length, ready: readyTasks.length, totalHours, doneHours };
  }, [tasks, blockedTasks, readyTasks]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const addTask = useCallback(() => {
    if (!newTaskTitle) return;
    const task = createTask({
      title: newTaskTitle,
      assignedTo: newTaskAssignee || 'Unassigned',
      deadline: newTaskDeadline || 'No Deadline',
      priority: newTaskPriority,
      complexity: newTaskComplexity,
      estimatedHours: parseInt(newTaskHours) || 4,
      dependencies: newTaskDeps,
      tags: [],
    });
    setTasks(prev => rankTasks([task, ...prev]));
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskDeadline('');
    setNewTaskPriority(TaskPriority.Medium);
    setNewTaskComplexity(TaskComplexity.Moderate);
    setNewTaskHours('4');
    setNewTaskDeps([]);
  }, [newTaskTitle, newTaskAssignee, newTaskDeadline, newTaskPriority, newTaskComplexity, newTaskHours, newTaskDeps]);

  const updateStatus = useCallback((id: string, status: Task['status']) => {
    setTasks(prev => rankTasks(prev.map(t => t.id === id ? { ...t, status } : t)));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => rankTasks(prev.filter(t => t.id !== id)));
  }, []);

  const runScheduleOptimization = useCallback(() => {
    const result = optimizeSchedule(tasks, TEAM_MEMBERS);
    setSchedule(result);
    setTasks(prev => applySchedule(prev, result));
    setActiveTab('schedule');
  }, [tasks]);

  const generateAIBreakdown = useCallback(async () => {
    setIsGenerating(true);
    try {
      const phases = await geminiService.generateTaskBreakdown(project, TEAM_MEMBERS);
      const titleToIdMap = new Map<string, string>();
      const allNewTasks: Task[] = [];

      for (const phase of phases) {
        const parentTask = createTask({
          title: phase.parentTask,
          priority: TaskPriority.High,
          complexity: TaskComplexity.Epic,
          estimatedHours: 0,
          tags: ['phase'],
        });
        titleToIdMap.set(parentTask.title, parentTask.id);

        const childIds: string[] = [];
        for (const sub of phase.subtasks) {
          const depIds = (sub.dependencies || [])
            .map((depTitle: string) => titleToIdMap.get(depTitle))
            .filter(Boolean) as string[];

          const child = createTask({
            title: sub.title,
            description: sub.description,
            assignedTo: sub.assignedTo || 'Unassigned',
            deadline: sub.deadline || 'No Deadline',
            priority: (sub.priority as TaskPriority) || TaskPriority.Medium,
            complexity: (sub.complexity as TaskComplexity) || TaskComplexity.Moderate,
            estimatedHours: sub.estimatedHours || 4,
            dependencies: depIds,
            parentTaskId: parentTask.id,
            tags: sub.tags || [],
          });
          titleToIdMap.set(sub.title, child.id);
          childIds.push(child.id);
          allNewTasks.push(child);
        }

        parentTask.subtasks = childIds;
        parentTask.estimatedHours = allNewTasks
          .filter(t => childIds.includes(t.id))
          .reduce((s, t) => s + t.estimatedHours, 0);
        allNewTasks.push(parentTask);
      }

      setTasks(rankTasks(allNewTasks));
    } catch (err) {
      console.error('AI breakdown failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [project]);

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* ── Stats Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Tasks</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-emerald-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.done}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-red-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-rose-400 mb-1">Blocked</p>
          <p className="text-2xl font-bold text-rose-500">{stats.blocked}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-blue-400 mb-1">Ready to Start</p>
          <p className="text-2xl font-bold text-blue-600">{stats.ready}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1">Hours Left</p>
          <p className="text-2xl font-bold text-indigo-600">{stats.totalHours - stats.doneHours}<span className="text-sm text-slate-400">/{stats.totalHours}h</span></p>
        </div>
      </div>

      {/* ── Team Members ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {TEAM_MEMBERS.map((member, i) => {
          const memberTasks = tasks.filter(t => t.assignedTo === member && t.status !== 'done');
          const memberHours = memberTasks.reduce((s, t) => s + t.estimatedHours, 0);
          return (
            <div key={member} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <img src={`https://picsum.photos/seed/${i + 1}/48/48`} className="w-12 h-12 rounded-full border-2 border-indigo-200" alt={member} />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 text-sm">{member}</h4>
                <p className="text-[10px] text-slate-400">{memberTasks.length} tasks · {memberHours}h remaining</p>
              </div>
            </div>
          );
        })}
        <button className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-all gap-2">
          <Plus size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">Invite</span>
        </button>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={generateAIBreakdown}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
          {isGenerating ? 'AI is Breaking Down...' : 'AI Smart Breakdown'}
        </button>
        <button
          onClick={runScheduleOptimization}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 hover:shadow transition-all"
        >
          <Sparkles size={16} className="text-amber-500" />
          Optimize Schedule
        </button>
        <button
          onClick={() => setTasks(rankTasks(tasks))}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-50 hover:shadow transition-all"
        >
          <RefreshCw size={16} className="text-blue-500" />
          Re-score Priorities
        </button>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['tasks', 'schedule', 'insights'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'tasks' && <span className="flex items-center gap-1.5"><Tag size={13} /> Tasks</span>}
            {tab === 'schedule' && <span className="flex items-center gap-1.5"><Calendar size={13} /> Schedule</span>}
            {tab === 'insights' && <span className="flex items-center gap-1.5"><BarChart3 size={13} /> Insights</span>}
          </button>
        ))}
      </div>

      {/* ── Tab: Tasks ───────────────────────────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="flex-1 bg-white border border-slate-200 rounded-[24px] shadow-sm flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-5 border-b border-slate-100 space-y-4 shrink-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Tag className="text-indigo-600" size={18} /> Smart Task Board
              </h3>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                {(['all', 'todo', 'in-progress', 'blocked', 'done'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      statusFilter === s ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by title, member or tag..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-2 w-full lg:w-auto">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase"><ArrowUpDown size={12} /> Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-slate-50 text-xs font-bold px-3 py-2 rounded-xl border border-transparent focus:border-indigo-500 outline-none"
                >
                  <option value="priorityScore">Priority Score</option>
                  <option value="deadline">Deadline</option>
                  <option value="assignee">Assignee</option>
                  <option value="status">Status</option>
                </select>
              </div>
            </div>

            {/* New Task Form */}
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
              <div className="flex flex-col xl:flex-row items-end gap-3">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Task Title</label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="What needs to be done?"
                    className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="w-full xl:w-36 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Auto-assign</option>
                    {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="w-full xl:w-36 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Deadline</label>
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={e => setNewTaskDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div className="w-full xl:w-32 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="w-full xl:w-32 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Complexity</label>
                  <select
                    value={newTaskComplexity}
                    onChange={e => setNewTaskComplexity(Number(e.target.value) as TaskComplexity)}
                    className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {COMPLEXITY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="w-full xl:w-24 space-y-1">
                  <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Est. Hours</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newTaskHours}
                    onChange={e => setNewTaskHours(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <button
                  onClick={addTask}
                  className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 shrink-0"
                  title="Add Task"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-2 scroll-smooth">
            {filteredAndSortedTasks.length > 0 ? (
              filteredAndSortedTasks.map(task => {
                const isPhase = task.subtasks && task.subtasks.length > 0;
                const isExpanded = expandedTasks.has(task.id);
                const childTasks = isPhase ? tasks.filter(t => task.subtasks!.includes(t.id)) : [];

                return (
                  <React.Fragment key={task.id}>
                    <div
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group ${
                        task.criticalPath ? 'bg-red-50/30 border-red-200/50 hover:bg-red-50/50' :
                        task.status === 'blocked' ? 'bg-rose-50/30 border-rose-100 hover:bg-rose-50/50' :
                        'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      {/* Expand or Status toggle */}
                      {isPhase ? (
                        <button onClick={() => toggleExpand(task.id)} className="text-slate-400 hover:text-indigo-600 transition">
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(task.id, task.status === 'done' ? 'todo' : task.status === 'todo' ? 'in-progress' : 'done')}
                          className="transition-colors"
                        >
                          <StatusIcon status={task.status} />
                        </button>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-sm text-slate-800 ${task.status === 'done' ? 'line-through opacity-40' : ''}`}>
                            {task.title}
                          </p>
                          <PriorityBadge priority={task.priority} />
                          {task.criticalPath && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 flex items-center gap-0.5">
                              <Zap size={9} /> Critical Path
                            </span>
                          )}
                          {task.dependencies.length > 0 && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200 flex items-center gap-0.5">
                              <GitBranch size={9} /> {task.dependencies.length} dep{task.dependencies.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-lg">{task.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                            <User size={10} className="text-indigo-400" /> {task.assignedTo}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                            <Calendar size={10} /> {task.deadline}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                            <Clock size={10} /> {task.estimatedHours}h
                          </span>
                          {task.scheduledStart && task.scheduledEnd && (
                            <span className="text-[10px] text-indigo-500 font-medium flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                              <Sparkles size={10} /> {task.scheduledStart} → {task.scheduledEnd}
                            </span>
                          )}
                          {task.tags.map(tag => (
                            <span key={tag} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 border border-indigo-100">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="hidden md:block">
                        <ScoreBar score={task.priorityScore} />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.status === 'todo' && (
                          <button onClick={() => updateStatus(task.id, 'in-progress')} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Start">
                            <Clock size={16} />
                          </button>
                        )}
                        {task.status === 'blocked' && (
                          <button onClick={() => updateStatus(task.id, 'todo')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Unblock">
                            <RefreshCw size={16} />
                          </button>
                        )}
                        <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded children */}
                    {isPhase && isExpanded && childTasks.map(child => (
                      <div
                        key={child.id}
                        className={`ml-10 flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                          child.status === 'blocked' ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-50/30 border-slate-100 hover:bg-white hover:shadow-sm'
                        }`}
                      >
                        <button
                          onClick={() => updateStatus(child.id, child.status === 'done' ? 'todo' : child.status === 'todo' ? 'in-progress' : 'done')}
                          className="transition-colors"
                        >
                          <StatusIcon status={child.status} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-semibold text-xs text-slate-700 ${child.status === 'done' ? 'line-through opacity-40' : ''}`}>
                              {child.title}
                            </p>
                            <PriorityBadge priority={child.priority} />
                          </div>
                          {child.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md">{child.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                              <User size={9} /> {child.assignedTo}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock size={9} /> {child.estimatedHours}h
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                              <Calendar size={9} /> {child.deadline}
                            </span>
                          </div>
                        </div>
                        <div className="hidden md:block"><ScoreBar score={child.priorityScore} /></div>
                        <button onClick={() => deleteTask(child.id)} className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </React.Fragment>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Search size={40} className="mb-2 opacity-20" />
                <p className="font-medium">No tasks found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Schedule ────────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
        <div className="flex-1 bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-indigo-600" size={18} /> Optimized Schedule
            </h3>
            {!schedule && <p className="text-sm text-slate-400 mt-1">Click &quot;Optimize Schedule&quot; to generate a dependency-aware schedule.</p>}
          </div>
          {schedule ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-indigo-400 mb-1">Project Duration</p>
                  <p className="text-xl font-bold text-indigo-700">{schedule.criticalPathLength} days</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-blue-400 mb-1">Total Effort</p>
                  <p className="text-xl font-bold text-blue-700">{schedule.totalEstimatedHours}h</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-amber-500 mb-1">Bottlenecks</p>
                  <p className="text-xl font-bold text-amber-700">{schedule.bottlenecks.length}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl">
                  <p className="text-[10px] font-bold uppercase text-emerald-400 mb-1">Tasks Scheduled</p>
                  <p className="text-xl font-bold text-emerald-700">{schedule.slots.length}</p>
                </div>
              </div>

              {/* Resource utilization */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp size={14} className="text-indigo-500" /> Resource Utilization</h4>
                <div className="space-y-2">
                  {Object.entries(schedule.resourceUtilization).map(([member, pct]) => (
                    <div key={member} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600 w-20">{member}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500 w-10 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline slots */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Calendar size={14} className="text-indigo-500" /> Timeline</h4>
                <div className="space-y-2">
                  {schedule.slots.map(slot => {
                    const task = tasks.find(t => t.id === slot.taskId);
                    return (
                      <div key={slot.taskId} className={`flex items-center gap-3 p-3 rounded-xl border ${slot.isCriticalPath ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{task?.title || slot.taskId}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1"><User size={10} /> {slot.assignee}</span>
                            <span className="flex items-center gap-1"><Calendar size={10} /> {slot.startDate}</span>
                            <ArrowRight size={10} />
                            <span>{slot.endDate}</span>
                            {slot.isCriticalPath && <span className="text-red-500 font-bold flex items-center gap-0.5"><Zap size={9} /> CRITICAL</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reassignment suggestions */}
              {schedule.suggestedReassignments.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Shield size={14} className="text-amber-500" /> Suggested Reassignments</h4>
                  <div className="space-y-2">
                    {schedule.suggestedReassignments.map((r, i) => {
                      const task = tasks.find(t => t.id === r.taskId);
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                          <div className="flex-1 text-xs">
                            <p className="font-bold text-slate-700">Move &quot;{task?.title}&quot; from {r.from} → {r.to}</p>
                            <p className="text-slate-500 mt-0.5">{r.reason}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300">
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Run schedule optimization to see results here</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Insights ────────────────────────────────────────────── */}
      {activeTab === 'insights' && (
        <div className="flex-1 bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-indigo-600" size={18} /> Priority Insights &amp; Analytics
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Priority distribution */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">Priority Distribution</h4>
              <div className="grid grid-cols-4 gap-3">
                {PRIORITY_OPTIONS.map(p => {
                  const count = tasks.filter(t => t.priority === p.value && t.status !== 'done').length;
                  return (
                    <div key={p.value} className={`p-4 rounded-xl border ${getPriorityColor(p.value)}`}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] font-bold uppercase">{p.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workload per member */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3">Workload Distribution (hours)</h4>
              <div className="space-y-2">
                {TEAM_MEMBERS.map(member => {
                  const memberTasks = tasks.filter(t => t.assignedTo === member && t.status !== 'done');
                  const hours = memberTasks.reduce((s, t) => s + t.estimatedHours, 0);
                  const maxHours = Math.max(...TEAM_MEMBERS.map(m => tasks.filter(t => t.assignedTo === m && t.status !== 'done').reduce((s, t) => s + t.estimatedHours, 0)), 1);
                  return (
                    <div key={member} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600 w-20">{member}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(hours / maxHours) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-500 w-10 text-right">{hours}h</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dependency graph summary */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><GitBranch size={14} className="text-violet-500" /> Dependency Summary</h4>
              <div className="space-y-2">
                {tasks.filter(t => t.dependencies.length > 0).map(t => (
                  <div key={t.id} className="flex items-center gap-2 p-3 rounded-xl bg-violet-50/50 border border-violet-100 flex-wrap">
                    <GitBranch size={14} className="text-violet-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-700">{t.title}</span>
                    <span className="text-[10px] text-slate-400">depends on →</span>
                    {t.dependencies.map(depId => {
                      const dep = tasks.find(d => d.id === depId);
                      return (
                        <span key={depId} className="text-[10px] font-bold text-violet-600 bg-white px-2 py-0.5 rounded-full border border-violet-200">
                          {dep?.title || depId}
                        </span>
                      );
                    })}
                  </div>
                ))}
                {tasks.filter(t => t.dependencies.length > 0).length === 0 && (
                  <p className="text-sm text-slate-400">No dependencies defined yet. Use AI Smart Breakdown to generate dependency chains.</p>
                )}
              </div>
            </div>

            {/* Top priority tasks */}
            <div>
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Target size={14} className="text-red-500" /> Top Priority Tasks (Next Actions)</h4>
              <div className="space-y-2">
                {rankTasks(tasks).filter(t => t.status !== 'done').slice(0, 5).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 w-6 h-6 flex items-center justify-center rounded-full">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{t.title}</p>
                      <p className="text-[10px] text-slate-400">{t.assignedTo} · {t.estimatedHours}h · Due {t.deadline}</p>
                    </div>
                    <ScoreBar score={t.priorityScore} />
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring algorithm explanation */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Brain size={14} className="text-indigo-500" /> How Priority Scoring Works</h4>
              <div className="space-y-2 text-xs text-slate-500">
                <p>Each task receives a <strong>0-100 priority score</strong> computed from four weighted factors:</p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700">35% — Urgency</p>
                    <p>Higher when deadline is closer. 100 if overdue, 0 if 30+ days away.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700">25% — Dependency Impact</p>
                    <p>Higher when many other tasks are blocked by this one.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700">20% — Complexity / Time Ratio</p>
                    <p>Higher when complex tasks have tight deadlines relative to estimated hours.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700">20% — Manual Priority</p>
                    <p>Critical=100, High=75, Medium=50, Low=25 base weight.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationBoard;
