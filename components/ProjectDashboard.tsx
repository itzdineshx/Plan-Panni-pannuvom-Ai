
import React from 'react';
import { Project } from '../types';
import { Plus, Clock, CheckCircle2, Layout, BookOpen, Users, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
}

const ProjectDashboard: React.FC<Props> = ({ projects, selectedProjectId, onSelectProject, onNewProject }) => {
  const data = [
    { name: 'Ph 1', progress: 100 },
    { name: 'Ph 2', progress: 75 },
    { name: 'Ph 3', progress: 30 },
    { name: 'Ph 4', progress: 0 },
  ];

  // Calculate task statistics for selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const taskStats = selectedProject?.tasks ? {
    total: selectedProject.tasks.length,
    completed: selectedProject.tasks.filter(t => t.status === 'done').length,
    inProgress: selectedProject.tasks.filter(t => t.status === 'in-progress').length,
    todo: selectedProject.tasks.filter(t => t.status === 'todo').length,
    overdue: selectedProject.tasks.filter(t => {
      if (!t.deadline || t.deadline === 'No Deadline' || t.status === 'done') return false;
      return new Date(t.deadline) < new Date();
    }).length,
    progress: selectedProject.tasks.length > 0 ? 
      (selectedProject.tasks.filter(t => t.status === 'done').length / selectedProject.tasks.length) * 100 : 0
  } : null;

  const taskStatusData = taskStats ? [
    { name: 'Completed', value: taskStats.completed, color: '#10b981' },
    { name: 'In Progress', value: taskStats.inProgress, color: '#3b82f6' },
    { name: 'To Do', value: taskStats.todo, color: '#6b7280' },
    { name: 'Overdue', value: taskStats.overdue, color: '#ef4444' },
  ].filter(item => item.value > 0) : [];

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
        <div className="bg-indigo-50 p-6 rounded-full mb-6 text-indigo-600">
          <Layout size={48} />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">No Projects Found</h3>
        <p className="text-slate-500 max-w-md mb-8">
          Start your academic journey by generating a new project idea using our AI ideation wizard.
        </p>
        <button 
          onClick={onNewProject}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200"
        >
          <Plus size={20} />
          New Project Ideation
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Active Projects</span>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><Layout size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">{projects.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Docs Completed</span>
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><BookOpen size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">2 / {projects.length * 3}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-sm font-medium">Team Synergy</span>
            <div className="bg-orange-50 text-orange-600 p-2 rounded-lg"><Users size={20} /></div>
          </div>
          <p className="text-3xl font-bold text-slate-800">High</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">Recent Projects</h3>
            <button onClick={onNewProject} className="text-indigo-600 font-semibold text-sm hover:underline flex items-center gap-1">
              <Plus size={16} /> New Idea
            </button>
          </div>
          <div className="space-y-4">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedProjectId === project.id 
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-md shadow-indigo-100' 
                    : 'border-slate-100 hover:border-slate-300 bg-slate-50/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 mb-1">{project.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{project.problemStatement}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                       project.status === 'implementation' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                     }`}>
                       {project.status}
                     </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1"><Clock size={12} /> 2 days ago</div>
                  <div className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> 60% Done</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedProject && taskStats && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-8">Task Progress</h3>
            
            {/* Task Statistics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="text-emerald-600" size={16} />
                  <span className="text-sm font-medium text-emerald-700">Completed</span>
                </div>
                <p className="text-xl font-bold text-emerald-800">{taskStats.completed}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-blue-600" size={16} />
                  <span className="text-sm font-medium text-blue-700">In Progress</span>
                </div>
                <p className="text-xl font-bold text-blue-800">{taskStats.inProgress}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="text-slate-600" size={16} />
                  <span className="text-sm font-medium text-slate-700">Remaining</span>
                </div>
                <p className="text-xl font-bold text-slate-800">{taskStats.todo}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="text-red-600" size={16} />
                  <span className="text-sm font-medium text-red-700">Overdue</span>
                </div>
                <p className="text-xl font-bold text-red-800">{taskStats.overdue}</p>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">Overall Progress</span>
                <span className="text-sm font-bold text-slate-800">{Math.round(taskStats.progress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${taskStats.progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {!selectedProject && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-8">Overall Progress</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                  />
                  <Bar 
                    dataKey="progress" 
                    fill="#4f46e5" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500 font-medium mb-1">Upcoming Milestone</p>
                <p className="text-sm font-bold text-slate-800">Submit Design Doc</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl">
                <p className="text-xs text-slate-500 font-medium mb-1">Time Left</p>
                <p className="text-sm font-bold text-rose-600">12 Days</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboard;
