
import React, { useState } from 'react';
import { Project } from '../types';
import { 
  Download, 
  Copy, 
  FileText, 
  Settings, 
  Maximize2,
  FileCheck,
  Type
} from 'lucide-react';

interface Props {
  project: Project;
}

const DocumentationEditor: React.FC<Props> = ({ project }) => {
  const [activeTab, setActiveTab] = useState<'abstract' | 'prd' | 'dd'>('abstract');

  const content = {
    abstract: project.abstract,
    prd: project.prd,
    dd: project.designDoc
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          {[
            { id: 'abstract', label: 'Abstract', icon: Type },
            { id: 'prd', label: 'PRD', icon: FileCheck },
            { id: 'dd', label: 'Design Doc', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-200">
            <Copy size={20} />
          </button>
          <button className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg">
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <FileText size={14} />
            Editor Mode: Read-Only (Generated)
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <Maximize2 size={16} />
          </button>
        </div>
        <div className="flex-1 p-10 overflow-y-auto font-serif text-lg leading-relaxed text-slate-700 whitespace-pre-wrap selection:bg-indigo-100 selection:text-indigo-900">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100 font-sans">
            {activeTab === 'abstract' && 'Academic Abstract'}
            {activeTab === 'prd' && 'Product Requirements Document'}
            {activeTab === 'dd' && 'System Design Document'}
          </h2>
          {content[activeTab]}
        </div>
      </div>
    </div>
  );
};

export default DocumentationEditor;
