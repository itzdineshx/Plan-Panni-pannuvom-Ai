import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppUser, Project, Task, Milestone, TaskPriority, TaskComplexity, FileAttachment, AppNotification } from '../types';
import {
  Users, Plus, Trash2, ChevronDown, ChevronRight, Clock, AlertTriangle,
  Calendar, BarChart3, Target, Zap, ArrowRight, CheckCircle2, Circle,
  Timer, Flame, Shield, Loader2, RefreshCw, Flag, TrendingUp,
  Paperclip, Upload, Image, FileText, X, Download, Eye,
  Bell, BellRing, Check, ExternalLink, Milestone as MilestoneIcon,
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import {
  rankTasks, optimizeSchedule, createTask, applySchedule,
  getReadyTasks, detectBlockedTasks, getPriorityColor, getScoreColor,
} from '../services/taskBreakdownService';
import {
  requestNotificationPermission, subscribeNotifications, checkTaskAlerts,
  checkMilestoneAlerts, markAsRead, markAllAsRead, dismissNotification,
  clearAllNotifications, addNotification,
} from '../services/notificationService';
import {
  uploadFile, getAttachmentIcon, formatBytes,
} from '../services/fileUploadService';

interface Props {
  project: Project;
  onUpdateProject: (project: Project) => void;
  teamMembers: string[];
  currentUser: AppUser;
}

type BoardTab = 'board' | 'milestones' | 'analytics';

// ════════════════════════════════════════════════════════════════════════════
// ── Notification Toast Component ─────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const NotificationToast: React.FC<{
  notification: AppNotification;
  onDismiss: (id: string) => void;
  onRead: (id: string) => void;
}> = ({ notification, onDismiss, onRead }) => {
  const typeStyles: Record<string, string> = {
    overdue: 'border-l-red-500 bg-red-50',
    'critical-path': 'border-l-orange-500 bg-orange-50',
    chatbot: 'border-l-indigo-500 bg-indigo-50',
    milestone: 'border-l-purple-500 bg-purple-50',
    mention: 'border-l-blue-500 bg-blue-50',
    info: 'border-l-slate-400 bg-slate-50',
  };
  const typeIcons: Record<string, React.ReactNode> = {
    overdue: <AlertTriangle size={14} className="text-red-500" />,
    'critical-path': <Flame size={14} className="text-orange-500" />,
    chatbot: <Zap size={14} className="text-indigo-500" />,
    milestone: <Target size={14} className="text-purple-500" />,
    mention: <Users size={14} className="text-blue-500" />,
    info: <Bell size={14} className="text-slate-400" />,
  };

  return (
    <div
      className={`border-l-4 rounded-r-lg p-3 flex items-start gap-3 shadow-sm transition-all ${
        typeStyles[notification.type] || typeStyles.info
      } ${notification.read ? 'opacity-60' : ''}`}
    >
      <div className="shrink-0 mt-0.5">{typeIcons[notification.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate">{notification.title}</p>
        <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-[10px] text-slate-400 mt-1">
          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!notification.read && (
          <button
            onClick={() => onRead(notification.id)}
            className="p-1 hover:bg-white/60 rounded text-slate-400 hover:text-green-600"
            title="Mark read"
          >
            <Check size={12} />
          </button>
        )}
        <button
          onClick={() => onDismiss(notification.id)}
          className="p-1 hover:bg-white/60 rounded text-slate-400 hover:text-red-500"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── Notification Bell Dropdown ───────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeNotifications(setNotifications);
    return unsub;
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition-colors ${
          open ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        {unreadCount > 0 ? <BellRing size={18} className="animate-pulse" /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">Notifications</h4>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAllNotifications()}
                  className="text-[11px] text-slate-400 hover:text-red-500"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto max-h-72 p-2 space-y-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <Bell size={24} className="mx-auto mb-2 opacity-40" />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <NotificationToast
                  key={n.id}
                  notification={n}
                  onDismiss={dismissNotification}
                  onRead={markAsRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── File Attachment Components ───────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const FilePreviewModal: React.FC<{
  attachment: FileAttachment;
  onClose: () => void;
}> = ({ attachment, onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8" onClick={onClose}>
    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getAttachmentIcon(attachment.type).emoji}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">{attachment.name}</p>
            <p className="text-[11px] text-slate-400">{formatBytes(attachment.size)} • {attachment.uploadedBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={attachment.url}
            download={attachment.name}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"
          >
            <Download size={16} />
          </a>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="p-6 flex items-center justify-center bg-slate-50 min-h-[300px]">
        {attachment.type === 'image' ? (
          <img src={attachment.url} alt={attachment.name} className="max-w-full max-h-[60vh] rounded-lg shadow-md object-contain" />
        ) : attachment.type === 'pdf' ? (
          <iframe src={attachment.url} title={attachment.name} className="w-full h-[60vh] rounded-lg border" />
        ) : (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">{getAttachmentIcon(attachment.type).emoji}</span>
            <p className="text-sm text-slate-600 font-medium">{attachment.name}</p>
            <a
              href={attachment.url}
              download={attachment.name}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
            >
              <Download size={14} /> Download File
            </a>
          </div>
        )}
      </div>
    </div>
  </div>
);

const FileUploadZone: React.FC<{
  onUpload: (attachment: FileAttachment) => void;
  compact?: boolean;
  uploadedBy?: string;
}> = ({ onUpload, compact, uploadedBy }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const att = await uploadFile(files[i], uploadedBy || 'Current User');
        onUpload(att);
      }
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx"
          className="hidden"
          aria-label="Upload attachments"
          onChange={e => handleFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          title="Attach file"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
        </button>
      </>
    );
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
        isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx"
        className="hidden"
        aria-label="Upload attachments"
        onChange={e => handleFiles(e.target.files)}
      />
      {uploading ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 size={18} className="animate-spin text-indigo-500" />
          <span className="text-sm text-indigo-600 font-medium">Uploading…</span>
        </div>
      ) : (
        <>
          <Upload size={20} className="mx-auto text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">
            <span className="text-indigo-600 font-medium">Click to upload</span> or drag & drop
          </p>
          <p className="text-[10px] text-slate-400 mt-1">PDF, images, docs up to 10 MB</p>
        </>
      )}
    </div>
  );
};

const AttachmentChip: React.FC<{
  attachment: FileAttachment;
  onRemove?: () => void;
  onPreview: () => void;
}> = ({ attachment, onRemove, onPreview }) => {
  const icon = getAttachmentIcon(attachment.type);
  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg group hover:border-indigo-200 transition-colors">
      {attachment.thumbnailUrl ? (
        <img src={attachment.thumbnailUrl} alt="" className="w-6 h-6 rounded object-cover" />
      ) : (
        <span className="text-sm">{icon.emoji}</span>
      )}
      <button onClick={onPreview} className="text-xs text-slate-700 font-medium truncate max-w-[120px] hover:text-indigo-600">
        {attachment.name}
      </button>
      <span className="text-[10px] text-slate-400">{formatBytes(attachment.size)}</span>
      {onRemove && (
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity">
          <X size={12} />
        </button>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── Milestones Tab ──────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const MilestonesTab: React.FC<{
  milestones: Milestone[];
  tasks: Task[];
  onUpdateMilestone: (id: string, updates: Partial<Milestone>) => void;
}> = ({ milestones, tasks, onUpdateMilestone }) => {

  // Compute completion for each milestone from linked tasks
  const enrichedMilestones = useMemo(() => {
    return milestones.map(ms => {
      const linkedTasks = tasks.filter(t => t.milestoneId === ms.id);
      const totalTasks = linkedTasks.length;
      const doneTasks = linkedTasks.filter(t => t.status === 'done').length;
      const completionPercentage = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (ms.completionPercentage || 0);

      // AI-suggested date logic based on task deadlines + dependencies
      let aiSuggestedDate = ms.aiSuggestedDate;
      if (!aiSuggestedDate && linkedTasks.length > 0) {
        const latestDeadline = linkedTasks
          .filter(t => t.deadline && t.deadline !== 'No Deadline')
          .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())[0];
        if (latestDeadline) {
          const d = new Date(latestDeadline.deadline);
          d.setDate(d.getDate() + 3); // buffer days
          aiSuggestedDate = d.toISOString().split('T')[0];
        }
      }

      // Status derivation
      let status: Milestone['status'] = ms.status || 'not-started';
      const today = new Date().toISOString().split('T')[0];
      if (completionPercentage === 100) status = 'completed';
      else if (ms.targetDate && ms.targetDate < today && completionPercentage < 100) status = 'overdue';
      else if (completionPercentage > 0) status = 'in-progress';

      return { ...ms, completionPercentage, aiSuggestedDate, status, linkedTaskCount: totalTasks, doneTaskCount: doneTasks };
    });
  }, [milestones, tasks]);

  const overallProgress = enrichedMilestones.length > 0
    ? Math.round(enrichedMilestones.reduce((s, m) => s + m.completionPercentage, 0) / enrichedMilestones.length)
    : 0;

  const statusColors: Record<string, string> = {
    'not-started': 'bg-slate-100 text-slate-600',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700',
  };

  const progressBarColor = (pct: number): string => {
    if (pct === 100) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 30) return 'bg-amber-500';
    return 'bg-slate-400';
  };

  return (
    <div className="space-y-6">
      {/* ── Overall Progress Card ── */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">Project Milestones</h3>
            <p className="text-indigo-200 text-sm mt-1">
              {enrichedMilestones.filter(m => m.status === 'completed').length} of {enrichedMilestones.length} milestones complete
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">{overallProgress}%</div>
            <p className="text-indigo-200 text-xs">Overall</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3">
          <div
            className="bg-white rounded-full h-3 transition-all duration-700 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="flex gap-4 mt-4">
          {(['not-started', 'in-progress', 'completed', 'overdue'] as const).map(status => {
            const count = enrichedMilestones.filter(m => m.status === status).length;
            return (
              <div key={status} className="text-center">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[10px] text-indigo-200 capitalize">{status.replace('-', ' ')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Milestone Timeline ── */}
      <div className="space-y-4">
        {enrichedMilestones.map((ms, idx) => (
          <div
            key={ms.id}
            className={`bg-white rounded-xl border border-slate-200 p-5 transition-all hover:shadow-md ${
              ms.status === 'overdue' ? 'border-l-4 border-l-red-500' :
              ms.status === 'completed' ? 'border-l-4 border-l-emerald-500' :
              ms.status === 'in-progress' ? 'border-l-4 border-l-blue-500' :
              'border-l-4 border-l-slate-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  ms.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  ms.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  ms.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {ms.status === 'completed' ? <CheckCircle2 size={16} /> : idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{ms.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ms.phase} • {ms.duration}</p>
                  {ms.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ms.description}</p>
                  )}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold capitalize ${statusColors[ms.status || 'not-started']}`}>
                {(ms.status || 'not-started').replace('-', ' ')}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-slate-500">{ms.doneTaskCount}/{ms.linkedTaskCount} tasks</span>
                <span className={`text-xs font-bold ${ms.completionPercentage === 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                  {ms.completionPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`rounded-full h-2.5 transition-all duration-500 ease-out ${progressBarColor(ms.completionPercentage)}`}
                  style={{ width: `${ms.completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-3 text-[11px]">
              {ms.targetDate && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar size={12} />
                  <span>Target: <span className="font-medium text-slate-700">{ms.targetDate}</span></span>
                </div>
              )}
              {ms.aiSuggestedDate && (
                <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  <Zap size={11} />
                  <span>AI Suggested: <span className="font-medium">{ms.aiSuggestedDate}</span></span>
                </div>
              )}
              {ms.startDate && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <ArrowRight size={12} />
                  <span>Started: {ms.startDate}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {enrichedMilestones.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Target size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No milestones defined yet</p>
            <p className="text-xs mt-1">Generate tasks from the Board tab to auto-create milestones</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ── Main CollaborationBoard Component ───────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const COLUMNS: { key: Task['status']; label: string; color: string; icon: React.ReactNode }[] = [
  { key: 'todo', label: 'To Do', color: 'border-slate-300 bg-slate-50', icon: <Circle size={14} className="text-slate-400" /> },
  { key: 'in-progress', label: 'In Progress', color: 'border-blue-300 bg-blue-50', icon: <Timer size={14} className="text-blue-500" /> },
  { key: 'done', label: 'Done', color: 'border-emerald-300 bg-emerald-50', icon: <CheckCircle2 size={14} className="text-emerald-500" /> },
  { key: 'blocked', label: 'Blocked', color: 'border-red-300 bg-red-50', icon: <Shield size={14} className="text-red-500" /> },
];

const CollaborationBoard: React.FC<Props> = ({ project, onUpdateProject, teamMembers, currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>(project.tasks || []);
  const [milestones, setMilestones] = useState<Milestone[]>(project.roadmap || []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<BoardTab>('board');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<FileAttachment | null>(null);
  const dragItem = useRef<string | null>(null);
  const initializedRef = useRef(false);

  const teamList = useMemo(() => {
    if (teamMembers.length > 0) return teamMembers;
    return [currentUser.fullName || 'Team Member'];
  }, [teamMembers, currentUser.fullName]);

  useEffect(() => {
    setTasks(project.tasks || []);
    setMilestones(project.roadmap || []);
    initializedRef.current = false;
  }, [project.id]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    onUpdateProject({
      ...project,
      tasks,
      roadmap: milestones,
    });
  }, [tasks, milestones]);

  // ── Request notification permission on mount ──
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // ── Check for overdue tasks + milestone alerts periodically ──
  useEffect(() => {
    checkTaskAlerts(tasks);
    checkMilestoneAlerts(milestones);
    const interval = setInterval(() => {
      checkTaskAlerts(tasks);
      checkMilestoneAlerts(milestones);
    }, 60_000); // every minute
    return () => clearInterval(interval);
  }, [tasks, milestones]);

  // ── Link tasks to milestones based on roadmap phases ──
  useEffect(() => {
    if (milestones.length > 0 && tasks.length > 0) {
      const updatedTasks = tasks.map(t => {
        if (t.milestoneId) return t;
        // Try to match by tags against milestone title keywords
        for (const ms of milestones) {
          const keywords = ms.title.toLowerCase().split(/\s+/);
          if (t.tags.some(tag => keywords.includes(tag.toLowerCase()))) {
            return { ...t, milestoneId: ms.id };
          }
        }
        return t;
      });

      // Auto-assign unlinked tasks round-robin to milestones
      let msIdx = 0;
      const fullyLinked = updatedTasks.map(t => {
        if (t.milestoneId) return t;
        const linked = { ...t, milestoneId: milestones[msIdx % milestones.length].id };
        msIdx++;
        return linked;
      });

      // Only update if changed
      if (JSON.stringify(fullyLinked) !== JSON.stringify(tasks)) {
        setTasks(fullyLinked);
      }
    }
  }, [milestones.length]); // only run when milestones first load

  // ── Generate tasks via AI ──
  const generateTasks = async () => {
    setIsGenerating(true);
    try {
      const breakdowns = await geminiService.generateTaskBreakdown(project, teamList);
      const allTasks: Task[] = [];
      const generatedMilestones: Milestone[] = [];

      let phaseIdx = 0;
      for (const phase of breakdowns) {
        const milestoneId = `ms-${Math.random().toString(36).substr(2, 6)}`;
        const parentId = `parent-${Math.random().toString(36).substr(2, 6)}`;

        // Create milestone from phase
        generatedMilestones.push({
          id: milestoneId,
          phase: `Phase ${phaseIdx + 1}`,
          title: phase.parentTask.replace(/^Phase \d+:\s*/, ''),
          duration: `${phase.subtasks.length * 5}-${phase.subtasks.length * 8} days`,
          description: `AI-generated phase encompassing ${phase.subtasks.length} tasks.`,
          status: 'not-started',
          completionPercentage: 0,
          linkedTaskIds: [],
        });

        const parent = createTask({
          id: parentId,
          title: phase.parentTask,
          status: 'todo',
          assignedTo: teamList[phaseIdx % teamList.length],
          priority: TaskPriority.High,
          complexity: TaskComplexity.Epic,
          estimatedHours: 0,
          tags: ['phase'],
          milestoneId,
        });

        const childIds: string[] = [];
        for (const sub of phase.subtasks) {
          const childId = `task-${Math.random().toString(36).substr(2, 6)}`;
          childIds.push(childId);

          const deps: string[] = [];
          if (sub.dependencies && sub.dependencies.length > 0) {
            for (const depTitle of sub.dependencies) {
              const depTask = allTasks.find(t => t.title.toLowerCase().includes(depTitle.toLowerCase()));
              if (depTask) deps.push(depTask.id);
            }
          }

          allTasks.push(createTask({
            ...sub,
            id: childId,
            parentTaskId: parentId,
            dependencies: deps,
            priority: (sub.priority as TaskPriority) || TaskPriority.Medium,
            complexity: (sub.complexity as any as TaskComplexity) || TaskComplexity.Moderate,
            milestoneId,
          }));
        }

        parent.subtasks = childIds;
        parent.estimatedHours = allTasks.filter(t => childIds.includes(t.id)).reduce((s, t) => s + t.estimatedHours, 0);
        allTasks.push(parent);
        phaseIdx++;
      }

      // Rank & optionally schedule
      const ranked = rankTasks(allTasks);
      const schedule = optimizeSchedule(ranked, teamList);
      const scheduled = applySchedule(ranked, schedule);

      // Update milestone target dates from scheduled tasks
      for (const ms of generatedMilestones) {
        const msTasks = scheduled.filter(t => t.milestoneId === ms.id);
        const latestEnd = msTasks
          .map(t => t.scheduledEnd || t.deadline)
          .filter(d => d && d !== 'No Deadline')
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
        if (latestEnd) {
          ms.targetDate = latestEnd;
          const startDates = msTasks
            .map(t => t.scheduledStart)
            .filter(Boolean)
            .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());
          if (startDates[0]) ms.startDate = startDates[0];
        }
        // AI suggested date with buffer
        if (ms.targetDate) {
          const d = new Date(ms.targetDate);
          d.setDate(d.getDate() + 3);
          ms.aiSuggestedDate = d.toISOString().split('T')[0];
        }
      }

      setTasks(scheduled);
      setMilestones(generatedMilestones);

      addNotification({
        type: 'info',
        title: 'Tasks Generated',
        message: `${scheduled.length} tasks across ${generatedMilestones.length} milestones created.`,
      });

    } catch (err: any) {
      console.error('Breakdown error:', err);
      addNotification({
        type: 'info',
        title: 'Generation Failed',
        message: err.message || 'Could not generate tasks.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Drag & drop status change ──
  const handleDragStart = (taskId: string) => { dragItem.current = taskId; };

  const handleDrop = (newStatus: Task['status']) => {
    if (!dragItem.current) return;
    setTasks(prev => prev.map(t =>
      t.id === dragItem.current ? { ...t, status: newStatus } : t
    ));
    dragItem.current = null;
  };

  // ── Update milestone helper ──
  const handleUpdateMilestone = (id: string, updates: Partial<Milestone>) => {
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  // ── Task file attachment ──
  const handleTaskAttachment = (taskId: string, attachment: FileAttachment) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, attachments: [...(t.attachments || []), attachment] };
    }));
  };

  const handleRemoveAttachment = (taskId: string, attachmentId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, attachments: (t.attachments || []).filter(a => a.id !== attachmentId) };
    }));
  };

  // ── Stats ──
  const totalTasks = tasks.filter(t => !t.subtasks?.length).length;
  const doneTasks = tasks.filter(t => t.status === 'done' && !t.subtasks?.length).length;

  const tabs: { key: BoardTab; label: string; icon: React.ReactNode }[] = [
    { key: 'board', label: 'Board', icon: <BarChart3 size={15} /> },
    { key: 'milestones', label: 'Milestones', icon: <Target size={15} /> },
    { key: 'analytics', label: 'Analytics', icon: <TrendingUp size={15} /> },
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDER ──
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users size={24} className="text-indigo-600" />
            Team Collaboration
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {totalTasks} tasks • {doneTasks} completed • {milestones.length} milestones
          </p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={generateTasks}
            disabled={isGenerating}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-lg shadow-indigo-200"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {isGenerating ? 'Generating…' : tasks.length > 0 ? 'Regenerate Tasks' : 'AI Generate Tasks'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'milestones' && (
        <MilestonesTab
          milestones={milestones}
          tasks={tasks}
          onUpdateMilestone={handleUpdateMilestone}
        />
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Tasks', value: totalTasks, color: 'text-indigo-600 bg-indigo-50', icon: <BarChart3 size={18} /> },
              { label: 'Completed', value: doneTasks, color: 'text-emerald-600 bg-emerald-50', icon: <CheckCircle2 size={18} /> },
              { label: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: 'text-blue-600 bg-blue-50', icon: <Timer size={18} /> },
              { label: 'Blocked', value: tasks.filter(t => t.status === 'blocked').length, color: 'text-red-600 bg-red-50', icon: <Shield size={18} /> },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>{stat.icon}</div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Team workload */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="font-bold text-slate-800 mb-4">Team Workload</h4>
            <div className="space-y-3">
              {teamList.map(member => {
                const memberTasks = tasks.filter(t => t.assignedTo === member && !t.subtasks?.length);
                const done = memberTasks.filter(t => t.status === 'done').length;
                const pct = memberTasks.length > 0 ? Math.round((done / memberTasks.length) * 100) : 0;
                return (
                  <div key={member} className="flex items-center gap-4">
                    <div className="w-20 text-sm font-medium text-slate-700">{member}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-3">
                      <div className="bg-indigo-500 rounded-full h-3 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right">{done}/{memberTasks.length}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Critical path tasks */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Flame size={16} className="text-orange-500" /> Critical Path Tasks
            </h4>
            <div className="space-y-2">
              {tasks.filter(t => t.criticalPath).length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No critical path identified yet</p>
              ) : (
                tasks.filter(t => t.criticalPath).map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg">
                    <Flame size={13} className="text-orange-500 shrink-0" />
                    <span className="text-sm text-slate-700 font-medium flex-1">{t.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      t.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                      t.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{t.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'board' && (
        <>
          {tasks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap size={32} className="text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Tasks Yet</h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Click "AI Generate Tasks" to have AI break down your project into actionable tasks with dependencies, priorities, and schedules.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-5">
              {COLUMNS.map(col => {
                const colTasks = tasks
                  .filter(t => t.status === col.key && !t.parentTaskId)
                  .sort((a, b) => b.priorityScore - a.priorityScore);

                return (
                  <div
                    key={col.key}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(col.key)}
                    className={`rounded-xl border-2 border-dashed p-3 min-h-[400px] ${col.color} transition-all`}
                  >
                    <div className="flex items-center gap-2 mb-4 px-1">
                      {col.icon}
                      <span className="text-sm font-bold text-slate-700">{col.label}</span>
                      <span className="ml-auto text-xs bg-white/80 px-2 py-0.5 rounded-full font-semibold text-slate-500">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {colTasks.map(task => {
                        const isExpanded = expandedTask === task.id;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={() => handleDragStart(task.id)}
                            className="bg-white rounded-xl border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                          >
                            {/* Header */}
                            <div className="flex items-start gap-2">
                              <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="shrink-0 mt-0.5">
                                {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 leading-tight">{task.title}</p>
                                {task.criticalPath && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-1">
                                    <Flame size={9} /> CRITICAL
                                  </span>
                                )}
                              </div>
                              {/* Priority Score Badge */}
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${getScoreColor(task.priorityScore)}`}>
                                {task.priorityScore}
                              </div>
                            </div>

                            {/* Tags */}
                            {task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2 ml-6">
                                {task.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{tag}</span>
                                ))}
                              </div>
                            )}

                            {/* Meta row */}
                            <div className="flex items-center gap-2 mt-2 ml-6 text-[11px] text-slate-400">
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {task.estimatedHours}h
                              </span>
                              {task.deadline && task.deadline !== 'No Deadline' && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} /> {task.deadline}
                                </span>
                              )}
                            </div>

                            {/* Assignee */}
                            <div className="flex items-center gap-2 mt-2 ml-6">
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                {task.assignedTo.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-[11px] text-slate-500">{task.assignedTo}</span>
                            </div>

                            {/* Attachments preview */}
                            {task.attachments && task.attachments.length > 0 && (
                              <div className="ml-6 mt-2 flex flex-wrap gap-1">
                                {task.attachments.map(att => (
                                  <AttachmentChip
                                    key={att.id}
                                    attachment={att}
                                    onPreview={() => setPreviewAttachment(att)}
                                    onRemove={() => handleRemoveAttachment(task.id, att.id)}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-100 ml-6 space-y-3">
                                {task.description && (
                                  <p className="text-xs text-slate-600">{task.description}</p>
                                )}
                                {task.scheduledStart && (
                                  <div className="text-[11px] text-slate-500">
                                    📅 Scheduled: {task.scheduledStart} → {task.scheduledEnd}
                                  </div>
                                )}
                                {task.dependencies.length > 0 && (
                                  <div className="text-[11px] text-slate-500">
                                    🔗 Depends on: {task.dependencies.map(d => {
                                      const dep = tasks.find(t => t.id === d);
                                      return dep?.title || d;
                                    }).join(', ')}
                                  </div>
                                )}

                                {/* File upload zone for this task */}
                                <div className="mt-2">
                                  <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                                    <Paperclip size={11} /> Attachments
                                  </p>
                                  <FileUploadZone
                                    onUpload={(att) => handleTaskAttachment(task.id, att)}
                                    uploadedBy={currentUser.fullName}
                                  />
                                </div>

                                {/* Subtasks */}
                                {task.subtasks && task.subtasks.length > 0 && (
                                  <div>
                                    <p className="text-[11px] font-semibold text-slate-600 mb-1">Subtasks</p>
                                    {task.subtasks.map(sid => {
                                      const sub = tasks.find(t => t.id === sid);
                                      if (!sub) return null;
                                      return (
                                        <div key={sid} className="flex items-center gap-2 py-1">
                                          <div className={`w-1.5 h-1.5 rounded-full ${
                                            sub.status === 'done' ? 'bg-emerald-500' :
                                            sub.status === 'in-progress' ? 'bg-blue-500' :
                                            sub.status === 'blocked' ? 'bg-red-500' :
                                            'bg-slate-300'
                                          }`} />
                                          <span className={`text-xs ${sub.status === 'done' ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                                            {sub.title}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── File Preview Modal ── */}
      {previewAttachment && (
        <FilePreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
};

export default CollaborationBoard;