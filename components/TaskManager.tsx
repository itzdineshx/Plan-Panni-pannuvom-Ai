import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Edit3,
  Trash2,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Paperclip,
  Upload,
  Download,
  CheckSquare
} from 'lucide-react';
import { AppUser, FileAttachment, Project, Task, TaskPriority, TaskComplexity } from '../types';
import { rankTasks, computePriorityScore } from '../services/taskBreakdownService';
import { checkTaskAlerts, checkDeadlineReminders } from '../services/notificationService';
import { uploadFile, getAttachmentIcon, formatBytes } from '../services/fileUploadService';
import { exportTasksToCsv, exportTasksToXlsx } from '../services/exportService';

interface Props {
  project: Project;
  onUpdateProject: (project: Project) => void;
  teamMembers: string[];
  currentUser: AppUser;
}

interface SortableTaskItemProps {
  task: Task;
  allTasks: Task[];
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtasks: (taskId: string) => void;
  expandedTasks: Set<string>;
  level: number;
  uploadedBy: string;
}

const SortableTaskItem: React.FC<SortableTaskItemProps> = ({
  task,
  allTasks,
  onUpdate,
  onDelete,
  onToggleSubtasks,
  expandedTasks,
  level,
  uploadedBy
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const subtasks = task.subtasks?.map(id => allTasks.find(t => t.id === id)).filter(Boolean) || [];
  const hasSubtasks = subtasks.length > 0;
  const isExpanded = expandedTasks.has(task.id);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'in-progress': return <PlayCircle size={16} className="text-blue-500" />;
      case 'blocked': return <XCircle size={16} className="text-red-500" />;
      default: return <Circle size={16} className="text-slate-400" />;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.Critical: return 'bg-red-100 text-red-700 border-red-200';
      case TaskPriority.High: return 'bg-orange-100 text-orange-700 border-orange-200';
      case TaskPriority.Medium: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case TaskPriority.Low: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const daysUntilDeadline = task.deadline && task.deadline !== 'No Deadline'
    ? Math.ceil((new Date(task.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const isDueSoon = daysUntilDeadline !== null && daysUntilDeadline <= 3 && daysUntilDeadline >= 0;
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const next: FileAttachment[] = [...(task.attachments || [])];
      for (let i = 0; i < files.length; i++) {
        const attachment = await uploadFile(files[i], uploadedBy);
        next.push(attachment);
      }
      onUpdate({ ...task, attachments: next });
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    onUpdate({
      ...task,
      attachments: (task.attachments || []).filter(att => att.id !== attachmentId),
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-slate-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-all ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      } ${level > 0 ? 'ml-6 border-l-4 border-l-indigo-300' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
        >
          ⋮⋮
        </div>

        <button
          onClick={() => onToggleSubtasks(task.id)}
          className={`mt-1 ${hasSubtasks ? 'text-slate-600 hover:text-slate-800' : 'text-slate-300 cursor-default'}`}
          disabled={!hasSubtasks}
        >
          {hasSubtasks ? (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <div className="w-4" />
          )}
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(task.status)}
              <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                {task.title}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              <button
                onClick={() => onUpdate({ ...task, status: task.status === 'done' ? 'todo' : 'done' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="text-slate-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-sm text-slate-600 mb-3">{task.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <User size={12} />
              {task.assignedTo}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              {task.estimatedHours}h
            </div>
            {task.deadline && task.deadline !== 'No Deadline' && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : ''}`}>
                <Calendar size={12} />
                {isOverdue ? 'Overdue' : isDueSoon ? `${daysUntilDeadline}d left` : task.deadline}
              </div>
            )}
            {task.complexity > 1 && (
              <div className="flex items-center gap-1">
                <Zap size={12} />
                {TaskComplexity[task.complexity]}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {task.attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1 text-xs"
                  >
                    <span className={`text-[10px] px-2 py-0.5 rounded ${getAttachmentIcon(att.type).color}`}>
                      {getAttachmentIcon(att.type).emoji}
                    </span>
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-700 hover:text-indigo-600"
                    >
                      {att.name}
                    </a>
                    <span className="text-[10px] text-slate-400">{formatBytes(att.size)}</span>
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-500"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx"
                className="hidden"
                aria-label="Attach files to task"
                onChange={e => handleAttachmentUpload(e.target.files)}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? <Upload size={12} className="animate-pulse" /> : <Paperclip size={12} />}
                Attach
              </button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && subtasks.length > 0 && (
        <div className="mt-3 pl-8 border-l-2 border-slate-100">
          {subtasks.map(subtask => (
            <SortableTaskItem
              key={subtask!.id}
              task={subtask!}
              allTasks={allTasks}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToggleSubtasks={onToggleSubtasks}
              expandedTasks={expandedTasks}
              level={level + 1}
              uploadedBy={uploadedBy}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TaskManager: React.FC<Props> = ({ project, onUpdateProject, teamMembers, currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>(project.tasks || []);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'assignee'>('priority');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setTasks(project.tasks || []);
  }, [project.tasks]);

  useEffect(() => {
    // Check for task alerts and deadline reminders periodically
    const interval = setInterval(() => {
      checkTaskAlerts(tasks);
      checkDeadlineReminders(tasks);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      if (filter === 'all') return true;
      return task.status === filter;
    });

    // Sort tasks
    switch (sortBy) {
      case 'priority':
        filtered = rankTasks(filtered);
        break;
      case 'deadline':
        filtered.sort((a, b) => {
          if (!a.deadline || a.deadline === 'No Deadline') return 1;
          if (!b.deadline || b.deadline === 'No Deadline') return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
        break;
      case 'assignee':
        filtered.sort((a, b) => a.assignedTo.localeCompare(b.assignedTo));
        break;
    }

    return filtered;
  }, [tasks, filter, sortBy]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredAndSortedTasks.findIndex(task => task.id === active.id);
      const newIndex = filteredAndSortedTasks.findIndex(task => task.id === over.id);

      const reorderedTasks = arrayMove(filteredAndSortedTasks, oldIndex, newIndex);

      // Update the tasks array while preserving the original order for non-filtered tasks
      const updatedTasks = [...tasks];
      // This is a simplified approach - in a real app, you'd want more sophisticated reordering logic
      setTasks(reorderedTasks);

      // Update project
      onUpdateProject({
        ...project,
        tasks: reorderedTasks
      });
    }
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const updatedTasks = tasks.map(task =>
      task.id === updatedTask.id ? { ...updatedTask, priorityScore: computePriorityScore(updatedTask, tasks) } : task
    );
    setTasks(updatedTasks);
    onUpdateProject({
      ...project,
      tasks: updatedTasks
    });
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(task => task.id !== taskId);
    setTasks(updatedTasks);
    onUpdateProject({
      ...project,
      tasks: updatedTasks
    });
  };

  const handleAddTask = (newTask: Omit<Task, 'id' | 'priorityScore'>) => {
    const task: Task = {
      ...newTask,
      id: Math.random().toString(36).substr(2, 9),
      priorityScore: 0,
    };
    task.priorityScore = computePriorityScore(task, [...tasks, task]);

    const updatedTasks = [...tasks, task];
    setTasks(updatedTasks);
    onUpdateProject({
      ...project,
      tasks: updatedTasks
    });
    setShowAddForm(false);
  };

  const toggleSubtasks = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const progressStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const overdue = tasks.filter(t => {
      if (!t.deadline || t.deadline === 'No Deadline' || t.status === 'done') return false;
      return new Date(t.deadline) < new Date();
    }).length;

    return { total, completed, inProgress, overdue, progress: total > 0 ? (completed / total) * 100 : 0 };
  }, [tasks]);

  const handleExportCsv = () => {
    exportTasksToCsv({ ...project, tasks });
  };

  const handleExportXlsx = () => {
    exportTasksToXlsx({ ...project, tasks });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Task Manager</h2>
          <p className="text-slate-600">Manage and track your project tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:border-indigo-200"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={handleExportXlsx}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium hover:border-indigo-200"
          >
            <Download size={16} /> Export Excel
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-blue-500" size={20} />
            <span className="text-sm font-medium text-slate-600">Total Tasks</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{progressStats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-emerald-500" size={20} />
            <span className="text-sm font-medium text-slate-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{progressStats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <PlayCircle className="text-blue-500" size={20} />
            <span className="text-sm font-medium text-slate-600">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{progressStats.inProgress}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-500" size={20} />
            <span className="text-sm font-medium text-slate-600">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{progressStats.overdue}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Overall Progress</h3>
          <span className="text-sm text-slate-600">{Math.round(progressStats.progress)}% Complete</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressStats.progress}%` }}
          />
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
          >
            <option value="all">All Tasks</option>
            <option value="todo">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 border border-slate-300 rounded-lg text-sm"
          >
            <option value="priority">Priority</option>
            <option value="deadline">Deadline</option>
            <option value="assignee">Assignee</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredAndSortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {filteredAndSortedTasks.map(task => (
              <SortableTaskItem
                key={task.id}
                task={task}
                allTasks={tasks}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                onToggleSubtasks={toggleSubtasks}
                expandedTasks={expandedTasks}
                level={0}
                uploadedBy={currentUser.fullName}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredAndSortedTasks.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <CheckSquare size={48} className="mx-auto mb-4 text-slate-300" />
          <p>No tasks found matching your filters.</p>
        </div>
      )}

      {/* Add/Edit Task Modal would go here - simplified for now */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Add New Task</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              handleAddTask({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                assignedTo: formData.get('assignee') as string,
                status: 'todo',
                deadline: formData.get('deadline') as string || 'No Deadline',
                priority: formData.get('priority') as TaskPriority,
                complexity: parseInt(formData.get('complexity') as string) as TaskComplexity,
                estimatedHours: parseInt(formData.get('hours') as string),
                dependencies: [],
                subtasks: [],
                tags: [],
              });
            }}>
              <div className="space-y-4">
                <input name="title" placeholder="Task title" aria-label="Task title" required className="w-full p-2 border rounded" />
                <textarea name="description" placeholder="Description" aria-label="Task description" className="w-full p-2 border rounded" />
                {teamMembers.length > 0 ? (
                  <select name="assignee" aria-label="Assignee" required className="w-full p-2 border rounded" defaultValue={currentUser.fullName}>
                    {teamMembers.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                ) : (
                  <input name="assignee" placeholder="Assigned to" aria-label="Assignee" required className="w-full p-2 border rounded" />
                )}
                <input name="deadline" type="date" aria-label="Deadline" className="w-full p-2 border rounded" />
                <select name="priority" aria-label="Priority" required className="w-full p-2 border rounded">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <select name="complexity" aria-label="Complexity" required className="w-full p-2 border rounded">
                  <option value="1">Trivial</option>
                  <option value="2">Simple</option>
                  <option value="3">Moderate</option>
                  <option value="5">Complex</option>
                  <option value="8">Epic</option>
                </select>
                <input name="hours" type="number" placeholder="Estimated hours" aria-label="Estimated hours" required className="w-full p-2 border rounded" />
              </div>
              <div className="flex gap-2 mt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded">Add Task</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 border border-slate-300 py-2 rounded">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;