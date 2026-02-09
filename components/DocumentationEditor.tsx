
import React, { useState, useRef, useEffect } from 'react';
import { AppUser, FileAttachment, Project } from '../types';
import { 
  Download, 
  Copy, 
  FileText, 
  Settings, 
  Maximize2,
  FileCheck,
  Type,
  Paperclip,
  Trash2
} from 'lucide-react';
import { uploadFile, getAttachmentIcon, formatBytes } from '../services/fileUploadService';
import { exportProjectDocumentationPDF } from '../services/exportService';

// ── Structured document renderer ────────────────────────────────────────────
// Parses the strict academic formatting and renders with proper visual hierarchy

const FormattedDocContent: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return <p className="text-slate-400 italic">No content generated yet.</p>;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      elements.push(<div key={i} className="h-3" />);
      continue;
    }

    // Section labels like "BACKGROUND:", "PROBLEM STATEMENT:", "EXPECTED RESULTS:", etc.
    if (/^[A-Z][A-Z &/]+:/.test(trimmed) && !trimmed.startsWith('- ') && !trimmed.startsWith('FR')) {
      const colonIdx = trimmed.indexOf(':');
      const label = trimmed.slice(0, colonIdx);
      const rest = trimmed.slice(colonIdx + 1).trim();

      elements.push(
        <div key={i} className="mt-6 mb-2">
          <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-indigo-100">
            {label}
          </span>
          {rest && <p className="mt-2 text-slate-700 leading-relaxed">{rest}</p>}
        </div>
      );
      continue;
    }

    // Top-level numbered headings: "1. Introduction", "2. Problem Definition"
    if (/^\d+\.\s+[A-Z]/.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) {
      elements.push(
        <h3 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-3 pb-2 border-b border-slate-100">
          {trimmed}
        </h3>
      );
      continue;
    }

    // Sub-numbered headings: "1.1 Purpose", "2.1 Existing System", "4.2 Scalability"
    if (/^\d+\.\d+\s+/.test(trimmed)) {
      elements.push(
        <h4 key={i} className="text-base font-semibold text-slate-800 mt-5 mb-2 ml-2">
          {trimmed}
        </h4>
      );
      continue;
    }

    // Functional requirement lines: "- FR1:", "- FR2:", or standalone "FR1:"
    if (/^-?\s*FR\d+:/.test(trimmed)) {
      const label = trimmed.match(/FR\d+/)?.[0] || '';
      const rest = trimmed.replace(/^-?\s*FR\d+:\s*/, '');
      elements.push(
        <div key={i} className="flex gap-3 ml-4 my-1.5">
          <span className="shrink-0 bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-100 mt-0.5">{label}</span>
          <span className="text-slate-700">{rest}</span>
        </div>
      );
      continue;
    }

    // Arrow-notation data flow: "- Step 1 →", "Step 2 →"
    if (/^-?\s*Step\s+\d+\s*→/i.test(trimmed)) {
      const rest = trimmed.replace(/^-?\s*/, '');
      elements.push(
        <div key={i} className="flex items-start gap-3 ml-4 my-1.5 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
          <span className="text-blue-500 mt-0.5 shrink-0">→</span>
          <span className="text-slate-700 text-sm">{rest}</span>
        </div>
      );
      continue;
    }

    // Bullet points: "- item"
    if (/^-\s+/.test(trimmed)) {
      elements.push(
        <div key={i} className="flex items-start gap-2.5 ml-4 my-1">
          <span className="text-indigo-400 mt-1.5 shrink-0 text-[6px]">●</span>
          <span className="text-slate-700">{trimmed.slice(2)}</span>
        </div>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-slate-700 leading-relaxed my-1">{trimmed}</p>
    );
  }

  return <>{elements}</>;
};

interface Props {
  project: Project;
  onUpdateProject: (project: Project) => void;
  currentUser: AppUser;
}

const DocumentationEditor: React.FC<Props> = ({ project, onUpdateProject, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'abstract' | 'prd' | 'dd'>('abstract');
  const [attachments, setAttachments] = useState<FileAttachment[]>(project.documentationAttachments || []);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAttachments(project.documentationAttachments || []);
  }, [project.id]);

  const content = {
    abstract: project.abstract,
    prd: project.prd,
    dd: project.designDoc
  };

  const handleExport = () => {
    exportProjectDocumentationPDF(project, activeTab);
  };

  const handleCopy = async () => {
    const text = content[activeTab] || '';
    await navigator.clipboard.writeText(text);
  };

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: FileAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const att = await uploadFile(files[i], currentUser.fullName);
        uploaded.push(att);
      }
      const updated = [...attachments, ...uploaded];
      setAttachments(updated);
      onUpdateProject({
        ...project,
        documentationAttachments: updated,
      });
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const updated = attachments.filter(att => att.id !== attachmentId);
    setAttachments(updated);
    onUpdateProject({
      ...project,
      documentationAttachments: updated,
    });
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
          <button
            onClick={handleCopy}
            className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-200"
            aria-label="Copy documentation"
          >
            <Copy size={20} />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg"
          >
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
          <button className="text-slate-400 hover:text-slate-600" aria-label="Expand editor">
            <Maximize2 size={16} />
          </button>
        </div>
        <div className="flex-1 p-10 overflow-y-auto text-base leading-relaxed text-slate-700 selection:bg-indigo-100 selection:text-indigo-900 font-sans">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">
            {activeTab === 'abstract' && 'Academic Abstract'}
            {activeTab === 'prd' && 'Product Requirements Document'}
            {activeTab === 'dd' && 'System Design Document'}
          </h2>
          <FormattedDocContent text={content[activeTab] || ''} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Paperclip size={16} /> Documentation Attachments
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.pptx"
              className="hidden"
              aria-label="Upload documentation attachments"
              onChange={e => handleAttachFiles(e.target.files)}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-60"
            >
              {uploading ? 'Uploading...' : 'Attach Files'}
            </button>
          </div>
        </div>
        {attachments.length === 0 ? (
          <p className="text-sm text-slate-400">No attachments yet. Add reference files, diagrams, or notes.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {attachments.map(att => (
              <div
                key={att.id}
                className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                <span className={`text-xs px-2 py-1 rounded-lg ${getAttachmentIcon(att.type).color}`}>
                  {getAttachmentIcon(att.type).emoji}
                </span>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-700 font-medium hover:text-indigo-600"
                >
                  {att.name}
                </a>
                <span className="text-xs text-slate-400">{formatBytes(att.size)}</span>
                <button
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="text-slate-400 hover:text-rose-500"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentationEditor;
