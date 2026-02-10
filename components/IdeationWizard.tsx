
import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  Check, 
  Loader2,
  Cpu,
  Globe,
  TrendingUp,
  FlaskConical,
  Zap,
  ExternalLink,
  Twitter,
  Newspaper,
  BookOpen,
  Trophy,
  Flame
} from 'lucide-react';
import { 
  UserProfile, 
  AcademicLevel, 
  SkillLevel, 
  CareerGoal, 
  Project,
  Source,
  AppUser,
  TaskPriority,
  TaskComplexity
} from '../types';
import { geminiService } from '../services/geminiService';

interface Props {
  onComplete: (project: Project) => void;
  currentUser: AppUser;
  teamMembers: AppUser[];
}

const IdeationWizard: React.FC<Props> = ({ onComplete, currentUser, teamMembers }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [academicIdeas, setAcademicIdeas] = useState<Partial<Project>[]>([]);
  const [trendingIdeas, setTrendingIdeas] = useState<Partial<Project>[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    academicLevel: AcademicLevel.UG,
    department: 'CSE',
    skillLevel: SkillLevel.Intermediate,
    domainInterests: [],
    techPreferences: [],
    careerGoal: CareerGoal.Industry,
    timeline: '6 Months',
    interestPrompt: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleGenerateIdeas = async () => {
    setLoading(true);
    setLoadingStep('Searching IEEE, Scholar, X, and News for trending problems...');
    try {
      const result = await geminiService.generateProjectIdeas(profile);
      setAcademicIdeas(result.academicIdeas);
      setTrendingIdeas(result.trendingIdeas);
      setSources(result.sources);
      nextStep();
    } catch (error) {
      alert("Failed to generate ideas. Please try again.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSelectIdea = async (idea: Partial<Project>, id: string) => {
    setSelectedIdeaId(id);
    setLoading(true);
    setLoadingStep('Generating deep documentation and architectural roadmap...');
    
    try {
      const [docs, guidance] = await Promise.all([
        geminiService.generateProjectDocumentation(idea, profile),
        geminiService.generateGuidance(idea)
      ]);
      
      // Generate initial tasks (non-fatal — project still created if this fails)
      let generatedTasks: any[] = [];
      try {
        setLoadingStep('Generating project tasks...');
        const memberNames = teamMembers.map(m => m.fullName).filter(Boolean);
        const names = memberNames.length > 0 ? memberNames : [currentUser.fullName];
        const taskBreakdowns = await geminiService.generateTaskBreakdown({
          title: idea.title!,
          problemStatement: idea.problemStatement!,
          solutionIdea: idea.solutionIdea!,
          techStack: guidance.techStack,
        }, names);

        generatedTasks = taskBreakdowns.flatMap(breakdown => {
          const parentTaskId = Math.random().toString(36).substr(2, 9);
          const childIds = (breakdown.subtasks || []).map(() => Math.random().toString(36).substr(2, 9));
          const parentTask = {
            id: parentTaskId,
            title: breakdown.parentTask,
            description: `Parent task for ${breakdown.parentTask}`,
            assignedTo: currentUser.fullName,
            status: 'todo' as const,
            deadline: 'No Deadline',
            priority: TaskPriority.Medium,
            priorityScore: 0,
            complexity: TaskComplexity.Moderate,
            estimatedHours: (breakdown.subtasks || []).reduce((sum: number, sub: any) => sum + (sub.estimatedHours || 0), 0),
            dependencies: [],
            subtasks: childIds,
            tags: ['auto-generated'],
          };

          const subtasks = (breakdown.subtasks || []).map((sub: any, idx: number) => ({
            ...sub,
            id: childIds[idx],
            status: sub.status || 'todo',
            priority: sub.priority || TaskPriority.Medium,
            complexity: sub.complexity || TaskComplexity.Moderate,
            priorityScore: 0,
            dependencies: sub.dependencies || [],
            subtasks: [],
            tags: sub.tags || ['auto-generated'],
            parentTaskId: parentTaskId,
            estimatedHours: sub.estimatedHours || 4,
            assignedTo: sub.assignedTo || currentUser.fullName,
            deadline: sub.deadline || 'No Deadline',
          }));

          return [parentTask, ...subtasks];
        });
      } catch (taskErr) {
        console.warn('Task generation failed (non-fatal):', taskErr);
      }

      const fullProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        title: idea.title!,
        problemStatement: idea.problemStatement!,
        innovationAngle: idea.innovationAngle!,
        solutionIdea: idea.solutionIdea!,
        abstract: docs.abstract || '',
        prd: docs.prd || '',
        designDoc: docs.designDoc || '',
        techStack: guidance.techStack || [],
        algorithms: guidance.algorithms || [],
        datasets: guidance.datasets || [],
        roadmap: guidance.roadmap || [],
        implementationStrategy: guidance.implementationStrategy || '',
        learningResources: guidance.learningResources || [],
        vivaQuestions: [],
        tasks: generatedTasks,
        sources: sources,
        status: 'planning'
      };
      
      onComplete(fullProject);
    } catch (error: any) {
      console.error('Error finalizing project:', error);
      alert(`Error finalizing project: ${error?.message || 'Unknown error. Check console for details.'}`);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const toggleInterest = (interest: string) => {
    setProfile(p => ({
      ...p,
      domainInterests: p.domainInterests.includes(interest)
        ? p.domainInterests.filter(i => i !== interest)
        : [...p.domainInterests, interest]
    }));
  };

  const toggleTech = (tech: string) => {
    setProfile(p => ({
      ...p,
      techPreferences: p.techPreferences.includes(tech)
        ? p.techPreferences.filter(t => t !== tech)
        : [...p.techPreferences, tech]
    }));
  };

  const renderIdeaCard = (idea: Partial<Project>, idx: number, type: 'academic' | 'trending') => {
    const id = `${type}-${idx}`;
    return (
      <div 
        key={id}
        onClick={() => !loading && handleSelectIdea(idea, id)}
        className={`p-6 rounded-3xl border-2 cursor-pointer transition-all group relative overflow-hidden flex flex-col h-full ${
          selectedIdeaId === id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-slate-800 leading-tight pr-8">{idea.title}</h3>
          {loading && selectedIdeaId === id ? (
            <Loader2 className="animate-spin text-indigo-600" size={20} />
          ) : (
            <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
          )}
        </div>
        <p className="text-slate-600 text-xs leading-relaxed line-clamp-4 mb-4 flex-1">{idea.problemStatement}</p>
        
        <div className="flex flex-wrap gap-2 mt-auto">
          <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${
            type === 'academic' 
              ? 'text-indigo-600 bg-white border-indigo-100' 
              : 'text-rose-600 bg-white border-rose-100'
          }`}>
            {type === 'academic' ? <BookOpen size={12} /> : <Flame size={12} />}
            {type === 'academic' ? 'Academic/SIH' : 'Real-time Trending'}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-white border border-emerald-100 px-2 py-1 rounded-lg">
            <Zap size={12} /> Innovation
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="mb-12 flex justify-between items-center px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
              step === i ? 'bg-indigo-600 text-white shadow-lg' : step > i ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > i ? <Check size={20} /> : i}
            </div>
            {i < 3 && <div className={`w-20 md:w-32 h-1 mx-2 rounded-full ${step > i ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 md:p-10 rounded-[32px] border border-slate-200 dark:border-gray-700 shadow-xl shadow-slate-200/50 relative overflow-hidden min-h-[500px]">
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Architecting Your Project</h3>
            <p className="text-slate-500 font-medium max-w-xs">{loadingStep}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Build Your Profile</h2>
              <p className="text-slate-500">Tell us about your academic background and domain interests.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Academic Level</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={profile.academicLevel}
                  onChange={e => setProfile({...profile, academicLevel: e.target.value as AcademicLevel})}
                >
                  <option value={AcademicLevel.UG}>Undergraduate (UG)</option>
                  <option value={AcademicLevel.PG}>Postgraduate (PG)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Department</label>
                <input 
                  type="text"
                  placeholder="e.g. CSE, IT, AI & DS"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={profile.department}
                  onChange={e => setProfile({...profile, department: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700">Domain Interests</label>
              <div className="flex flex-wrap gap-2">
                {['Machine Learning', 'Cybersecurity', 'IoT', 'Blockchain', 'Web 3.0', 'NLP', 'Computer Vision', 'Cloud Computing', 'Quantum Computing'].map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium border transition-all ${
                      profile.domainInterests.includes(interest)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-slate-700">Preferred Technologies</label>
              <div className="flex flex-wrap gap-2">
                {['Python', 'React', 'Node.js', 'TensorFlow', 'PyTorch', 'MongoDB', 'AWS', 'Flutter', 'Next.js'].map(tech => (
                  <button
                    key={tech}
                    onClick={() => toggleTech(tech)}
                    className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium border transition-all ${
                      profile.techPreferences.includes(tech)
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    {tech}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={nextStep}
                className="flex items-center gap-2 bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg"
              >
                Next Step <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">Refine Your Vision</h2>
              <p className="text-slate-500">Describe any specific problems you're passionate about solving.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Interest Prompt</label>
              <textarea 
                rows={4}
                placeholder="e.g. I want to build a solution for real-time traffic monitoring in smart cities using computer vision..."
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                value={profile.interestPrompt}
                onChange={e => setProfile({...profile, interestPrompt: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Career Goal</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(CareerGoal).map(goal => (
                    <button
                      key={goal}
                      onClick={() => setProfile({...profile, careerGoal: goal})}
                      className={`p-3 text-left rounded-xl border text-sm font-medium transition-all ${
                        profile.careerGoal === goal ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Available Timeline</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={profile.timeline}
                  onChange={e => setProfile({...profile, timeline: e.target.value})}
                >
                  <option>3 Months</option>
                  <option>6 Months</option>
                  <option>1 Year</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <button 
                onClick={prevStep}
                className="flex items-center gap-2 text-slate-500 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-all"
              >
                <ArrowLeft size={18} /> Back
              </button>
              <button 
                onClick={handleGenerateIdeas}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-70"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                Generate Recommendations
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 mb-1">Project Recommendations</h2>
                <p className="text-slate-500">Curated from Academic Research, SIH, X, and Tech News.</p>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-indigo-100">
                <Globe size={14} className="animate-pulse" /> Live Search Grounding Active
              </div>
            </div>

            <div className="space-y-12">
              {/* Section 1: Academic & SIH */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl shadow-sm">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Research & Competition Driven</h3>
                    <p className="text-sm text-slate-500">IEEE Xplore, Google Scholar, and Smart India Hackathon (SIH) themes.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {academicIdeas.map((idea, idx) => renderIdeaCard(idea, idx, 'academic'))}
                </div>
              </section>

              {/* Section 2: Real-time Trending (X & News) */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-rose-100 text-rose-700 p-2 rounded-xl shadow-sm">
                    <Flame size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Real-time Trending Problems</h3>
                    <p className="text-sm text-slate-500">Directly from Twitter (X) discussions and technology news articles.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {trendingIdeas.map((idea, idx) => renderIdeaCard(idea, idx, 'trending'))}
                </div>
              </section>
            </div>

            {sources.length > 0 && (
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <ExternalLink size={12} /> Reference Grounding Sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {sources.slice(0, 10).map((source, i) => (
                    <a 
                      key={i} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all hover:shadow-sm hover:border-indigo-300"
                    >
                      {source.title.length > 35 ? source.title.substring(0, 35) + '...' : source.title}
                      <ExternalLink size={10} className="text-slate-300" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-start pt-6 border-t border-slate-100">
              <button 
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-2 text-slate-500 font-bold px-6 py-3 rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                <ArrowLeft size={18} /> Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IdeationWizard;
