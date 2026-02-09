
import React, { useState, useMemo } from 'react';
import { Project, Task } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  Calendar,
  MoreVertical,
  Circle,
  Clock,
  CheckCircle2,
  Trash2,
  Filter,
  ArrowUpDown,
  User,
  Tag
} from 'lucide-react';

interface Props {
  project: Project;
}

const CollaborationBoard: React.FC<Props> = ({ project }) => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Setup GitHub Repo', assignedTo: 'Aditya', status: 'done', deadline: '2025-05-10' },
    { id: '2', title: 'Data Cleaning Script', assignedTo: 'Rahul', status: 'in-progress', deadline: '2025-05-15' },
    { id: '3', title: 'Draft Literature Survey', assignedTo: 'Sneha', status: 'todo', deadline: '2025-05-20' },
    { id: '4', title: 'System Architecture Diagram', assignedTo: 'Aditya', status: 'todo', deadline: '2025-05-12' },
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  
  const [statusFilter, setStatusFilter] = useState<'all' | Task['status']>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'assignee' | 'status'>('deadline');
  const [searchQuery, setSearchQuery] = useState('');

  const addTask = () => {
    if (!newTaskTitle) return;
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTaskTitle,
      assignedTo: newTaskAssignee || 'Unassigned',
      status: 'todo',
      deadline: newTaskDeadline || 'No Deadline'
    };
    setTasks([task, ...tasks]);
    setNewTaskTitle('');
    setNewTaskAssignee('');
    setNewTaskDeadline('');
  };

  const updateStatus = (id: string, status: Task['status']) => {
    setTasks(tasks.map(t => t.id === id ? {...t, status} : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filteredAndSortedTasks = useMemo(() => {
    return tasks
      .filter(t => {
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          return a.deadline.localeCompare(b.deadline);
        } else if (sortBy === 'assignee') {
          return a.assignedTo.localeCompare(b.assignedTo);
        } else {
          const order = { 'todo': 0, 'in-progress': 1, 'done': 2 };
          return order[a.status] - order[b.status];
        }
      });
  }, [tasks, statusFilter, sortBy, searchQuery]);

  return (
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col items-center">
          <img src="https://picsum.photos/seed/1/60/60" className="w-16 h-16 rounded-full mb-3 border-2 border-indigo-500" />
          <h4 className="font-bold text-slate-800">Aditya (Lead)</h4>
          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-1 rounded-full mt-1 uppercase">AI / Architect</span>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col items-center">
          <img src="https://picsum.photos/seed/2/60/60" className="w-16 h-16 rounded-full mb-3 border-2 border-slate-100" />
          <h4 className="font-bold text-slate-800">Rahul</h4>
          <span className="text-[10px] bg-slate-50 text-slate-600 font-bold px-2 py-1 rounded-full mt-1 uppercase">Fullstack</span>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex flex-col items-center">
          <img src="https://picsum.photos/seed/3/60/60" className="w-16 h-16 rounded-full mb-3 border-2 border-slate-100" />
          <h4 className="font-bold text-slate-800">Sneha</h4>
          <span className="text-[10px] bg-slate-50 text-slate-600 font-bold px-2 py-1 rounded-full mt-1 uppercase">Cloud Ops</span>
        </div>
        <button className="bg-slate-50 p-6 rounded-[24px] border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-all">
          <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-2">
            <Plus size={24} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Invite Member</span>
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col overflow-hidden">
        {/* Controls Header */}
        <div className="p-6 border-b border-slate-100 space-y-4 shrink-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Tag className="text-indigo-600" size={20} /> Task Allocation
            </h3>
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
              {(['all', 'todo', 'in-progress', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    statusFilter === s 
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="relative flex-1 w-full lg:w-auto">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filter by title or member..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all" 
              />
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase">
                <ArrowUpDown size={14} /> Sort:
              </span>
              <select 
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-slate-50 text-xs font-bold px-3 py-2 rounded-xl border border-transparent focus:border-indigo-500 outline-none"
              >
                <option value="deadline">Deadline</option>
                <option value="assignee">Assignee</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>

          {/* New Task Entry Form */}
          <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex flex-col lg:flex-row items-end gap-3">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Task Title</label>
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full px-4 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="w-full lg:w-48 space-y-1">
              <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Assignee</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input 
                  type="text" 
                  value={newTaskAssignee}
                  onChange={e => setNewTaskAssignee(e.target.value)}
                  placeholder="Who?"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
            <div className="w-full lg:w-48 space-y-1">
              <label className="text-[10px] font-bold text-indigo-600 uppercase ml-1">Deadline</label>
              <input 
                type="date" 
                value={newTaskDeadline}
                onChange={e => setNewTaskDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <button 
              onClick={addTask} 
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 shrink-0"
              title="Add Task"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scroll-smooth">
          {filteredAndSortedTasks.length > 0 ? (
            filteredAndSortedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                <button 
                  onClick={() => updateStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                  className="text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  {task.status === 'done' ? <CheckCircle2 size={26} className="text-emerald-500" /> : <Circle size={26} />}
                </button>
                
                <div className="flex-1">
                  <p className={`font-bold text-slate-800 ${task.status === 'done' ? 'line-through opacity-40' : ''}`}>{task.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      <User size={12} className="text-indigo-400" /> {task.assignedTo}
                    </span>
                    <span className={`text-xs font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${
                      task.deadline === new Date().toISOString().split('T')[0] 
                        ? 'text-rose-600 bg-rose-50 border-rose-100' 
                        : 'text-slate-500 bg-white border-slate-100'
                    }`}>
                      <Calendar size={12} /> {task.deadline}
                    </span>
                    {task.status === 'in-progress' && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider">
                        <Clock size={10} /> Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.status !== 'in-progress' && task.status !== 'done' && (
                    <button 
                      onClick={() => updateStatus(task.id, 'in-progress')}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Set to Active"
                    >
                      <Clock size={18} />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete Task"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Search size={40} className="mb-2 opacity-20" />
              <p className="font-medium">No tasks found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationBoard;
