
import React, { useState, useEffect, useRef } from 'react';
import { Project, VivaQuestion } from '../types';
import { 
  MessageCircle, 
  HelpCircle, 
  Lightbulb, 
  BookOpen, 
  RefreshCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Database,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { geminiService } from '../services/geminiService';

// In-memory cache keyed by project id
const vivaCache = new Map<string, VivaQuestion[]>();

interface Props {
  project: Project;
}

const VivaPrepPanel: React.FC<Props> = ({ project }) => {
  const [questions, setQuestions] = useState<VivaQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchQuestions = async (forceRegenerate = false) => {
    // Serve from cache unless explicitly regenerating
    if (!forceRegenerate && vivaCache.has(project.id)) {
      setQuestions(vivaCache.get(project.id)!);
      setFromCache(true);
      return;
    }

    setLoading(true);
    setFromCache(false);
    try {
      const q = await geminiService.generateVivaPrep(project);
      setQuestions(q);
      vivaCache.set(project.id, q); // store in cache
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    setExpandedIndex(null);
    fetchQuestions(true);
  };

  const handleClearCache = () => {
    vivaCache.delete(project.id);
    setQuestions([]);
    setFromCache(false);
    setExpandedIndex(null);
  };

  useEffect(() => {
    hasFetchedRef.current = false;
  }, [project.id]);

  useEffect(() => {
    if (project && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchQuestions();
    }
  }, [project.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Viva Voce Preparation</h2>
          <p className="text-slate-500 mt-1">Master your project defense with AI-predicted questions.</p>
        </div>
        <div className="flex items-center gap-2">
          {questions.length > 0 && (
            <>
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="flex items-center gap-2 text-amber-600 font-bold px-4 py-2 rounded-xl hover:bg-amber-50 transition-all border border-amber-200"
                title="Generate a fresh set of questions"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                Regenerate
              </button>
              <button
                onClick={handleClearCache}
                disabled={loading}
                className="flex items-center gap-2 text-red-500 font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-all border border-red-100"
                title="Clear cached questions"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {loading && questions.length === 0 ? (
        <div className="bg-white p-20 rounded-[32px] border border-slate-200 flex flex-col items-center justify-center">
          <Loader2 size={48} className="text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Analyzing project for potential questions...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div 
              key={idx}
              className={`bg-white rounded-[24px] border transition-all overflow-hidden ${
                expandedIndex === idx ? 'border-indigo-500 ring-4 ring-indigo-50 shadow-xl' : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <button 
                onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                className="w-full text-left p-6 flex items-start gap-4"
              >
                <div className={`p-2 rounded-lg shrink-0 ${expandedIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                  <HelpCircle size={20} />
                </div>
                <div className="flex-1 pt-1">
                  <h4 className="font-bold text-slate-800 leading-snug">{q.question}</h4>
                </div>
                <div className="pt-1 text-slate-300">
                  {expandedIndex === idx ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>

              {expandedIndex === idx && (
                <div className="px-6 pb-8 space-y-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold text-sm uppercase tracking-wider">
                      <Lightbulb size={16} /> Simple Explanation
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">"{q.answerSimple}"</p>
                  </div>

                  <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold text-sm uppercase tracking-wider">
                      <BookOpen size={16} /> Advanced Justification
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{q.answerAdvanced}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VivaPrepPanel;
