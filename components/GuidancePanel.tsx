
import React from 'react';
import { Project } from '../types';
import { 
  Code2, 
  Binary, 
  Map, 
  Database, 
  Network,
  Cpu,
  Layers,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Info,
  Globe,
  Youtube,
  FileText,
  Workflow,
  ShieldCheck,
  Server
} from 'lucide-react';

interface Props {
  project: Project;
}

const GuidancePanel: React.FC<Props> = ({ project }) => {
  const getResourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tutorial': return <Youtube size={16} className="text-rose-500" />;
      case 'paper': return <FileText size={16} className="text-indigo-500" />;
      case 'documentation': return <BookOpen size={16} className="text-emerald-500" />;
      default: return <Globe size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Dynamic Header */}
      <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-8">
          <div className="bg-indigo-600 p-6 rounded-[32px] text-white flex-shrink-0 shadow-xl shadow-indigo-100">
            <Workflow size={48} />
          </div>
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-3">{project.title}</h2>
            <p className="text-slate-500 leading-relaxed max-w-3xl text-lg">
              A deep technical blueprint covering architecture, data engineering, and core algorithms optimized for <span className="font-semibold text-slate-800">Final Year Implementation</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Sidebar (4/12) */}
        <div className="lg:col-span-4 space-y-10">
          
          {/* Tech Stack Components */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Code2 size={24} /></div>
              <h3 className="text-xl font-bold text-slate-800">Tech Stack</h3>
            </div>
            <div className="space-y-4">
              {project.techStack.map((tech, i) => (
                <div key={i} className="group p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-200 transition-all hover:bg-white hover:shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-indigo-700">{tech.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">{tech.role}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Datasets & Sources */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-rose-50 p-2 rounded-lg text-rose-600"><Database size={24} /></div>
              <h3 className="text-xl font-bold text-slate-800">Data Engineering</h3>
            </div>
            <div className="space-y-4">
              {project.datasets?.map((ds, i) => (
                <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl group">
                  <h4 className="text-sm font-bold text-slate-800 mb-1">{ds.name}</h4>
                  <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{ds.description}</p>
                  <a 
                    href={ds.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 transition-colors uppercase tracking-wider"
                  >
                    <ExternalLink size={12} /> Source: {ds.source}
                  </a>
                </div>
              ))}
              {!project.datasets?.length && (
                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-400 italic">No specific datasets identified. Consider generating synthetic data or using web scraping.</div>
              )}
            </div>
          </div>

          {/* Resources */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><BookOpen size={24} /></div>
              <h3 className="text-xl font-bold text-slate-800">Learning Hub</h3>
            </div>
            <div className="space-y-4">
              {project.learningResources?.map((resource, i) => (
                <a 
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col p-5 bg-white border border-slate-100 rounded-3xl hover:border-emerald-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getResourceIcon(resource.type)}
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700 line-clamp-1">{resource.title}</span>
                    <ExternalLink size={12} className="ml-auto text-slate-300 group-hover:text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{resource.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Main Content (8/12) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Architecture Section */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><Layers size={24} /></div>
              <h3 className="text-2xl font-bold text-slate-800">System Architecture</h3>
            </div>
            <div className="p-8 bg-slate-50 border border-slate-100 rounded-[32px] text-slate-600 text-md leading-relaxed whitespace-pre-wrap font-sans border-l-4 border-l-indigo-600">
              {project.implementationStrategy || 'System architecture is modular. Please refer to the design documents for detailed flow diagrams.'}
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Globe size={18} /></div>
                <span className="text-xs font-bold text-slate-700 uppercase">Frontend</span>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
                <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Server size={18} /></div>
                <span className="text-xs font-bold text-slate-700 uppercase">Backend</span>
              </div>
              <div className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center gap-3">
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><ShieldCheck size={18} /></div>
                <span className="text-xs font-bold text-slate-700 uppercase">Security</span>
              </div>
            </div>
          </div>

          {/* Algorithms Deep Dive */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-rose-50 p-2 rounded-lg text-rose-600"><Binary size={24} /></div>
              <h3 className="text-2xl font-bold text-slate-800">Core Algorithms & Logic</h3>
            </div>
            <div className="space-y-6">
              {project.algorithms.map((algo, i) => (
                <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-[32px] hover:bg-white hover:shadow-xl hover:border-rose-200 transition-all group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h4 className="text-xl font-bold text-slate-800 group-hover:text-rose-700 transition-colors flex items-center gap-2">
                       <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">{i+1}</span>
                       {algo.name}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Theoretical Overview</h5>
                      <p className="text-sm text-slate-600 leading-relaxed">{algo.description}</p>
                    </div>
                    <div className="p-5 bg-white border border-slate-100 rounded-2xl">
                      <h5 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Code2 size={12}/> Implementation Logic</h5>
                      <p className="text-xs text-slate-500 font-mono leading-relaxed bg-slate-50 p-3 rounded-lg">{algo.implementationLogic}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Roadmap */}
          <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-12">
              <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Map size={24} /></div>
              <h3 className="text-2xl font-bold text-slate-800">Development Roadmap</h3>
            </div>
            
            <div className="relative space-y-12 before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-1 before:bg-slate-100">
              {project.roadmap.map((milestone, i) => (
                <div key={i} className="relative pl-16 group">
                  <div className="absolute left-0 top-1 w-12 h-12 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center z-10 transition-all group-hover:border-indigo-200 group-hover:shadow-lg">
                    <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600">{i + 1}</span>
                  </div>
                  <div className="p-8 bg-slate-50 border border-slate-100 rounded-[32px] group-hover:bg-white group-hover:shadow-xl group-hover:border-indigo-100 transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em]">{milestone.phase}</span>
                      <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-200 group-hover:border-indigo-200">{milestone.duration}</span>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-3">{milestone.title}</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GuidancePanel;
