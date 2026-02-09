
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Lightbulb, 
  BookOpen, 
  FileText, 
  Users, 
  MessageSquare,
  Menu,
  X,
  Bell,
  ChevronRight,
  GraduationCap,
  ListChecks,
  LogOut,
  UserRound
} from 'lucide-react';
import { AppView, Project, AppUser } from './types';
import ProjectDashboard from './components/ProjectDashboard';
import IdeationWizard from './components/IdeationWizard';
import GuidancePanel from './components/GuidancePanel';
import DocumentationEditor from './components/DocumentationEditor';
import CollaborationBoard from './components/CollaborationBoard';
import VivaPrepPanel from './components/VivaPrepPanel';
import AIChatbot from './components/AIChatbot';
import TaskManager from './components/TaskManager';
import AuthScreen from './components/AuthScreen';
import ProfileModal from './components/ProfileModal';
import { getCurrentUser, getUsers, logoutUser } from './services/authService';
import { requestNotificationPermission } from './services/notificationService';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(getCurrentUser());
  const [teamMembers, setTeamMembers] = useState<AppUser[]>(getUsers());
  const [showProfile, setShowProfile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleAddProject = (newProject: Project) => {
    setProjects(prev => [...prev, newProject]);
    setSelectedProjectId(newProject.id);
    setActiveView('dashboard');
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  useEffect(() => {
    if (!currentUser) return;
    const stored = localStorage.getItem(`academigen_projects_${currentUser.id}`);
    setProjects(stored ? JSON.parse(stored) : []);
    setSelectedProjectId(null);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    localStorage.setItem(`academigen_projects_${currentUser.id}`, JSON.stringify(projects));
  }, [projects, currentUser?.id]);

  useEffect(() => {
    setTeamMembers(getUsers());
  }, [currentUser]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ideation', label: 'Project Ideation', icon: Lightbulb },
    { id: 'guidance', label: 'Tech Guidance', icon: BookOpen, disabled: !selectedProject },
    { id: 'docs', label: 'Documentation', icon: FileText, disabled: !selectedProject },
    { id: 'tasks', label: 'Task Manager', icon: ListChecks, disabled: !selectedProject },
    { id: 'collaboration', label: 'Team Space', icon: Users, disabled: !selectedProject },
    { id: 'viva', label: 'Viva Preparation', icon: MessageSquare, disabled: !selectedProject },
  ];

  if (!currentUser) {
    return <AuthScreen onAuthenticated={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-72' : 'w-20'
        } transition-all duration-300 bg-white border-r border-slate-200 flex flex-col z-50`}
      >
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <GraduationCap size={24} />
          </div>
          {sidebarOpen && <span className="font-bold text-xl tracking-tight text-slate-800">AcademiGen</span>}
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveView(item.id as AppView)}
              disabled={item.disabled}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeView === item.id 
                  ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                  : item.disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <item.icon size={22} strokeWidth={activeView === item.id ? 2.5 : 2} />
              {sidebarOpen && <span>{item.label}</span>}
              {activeView === item.id && sidebarOpen && <ChevronRight size={16} className="ml-auto" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-4 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            {sidebarOpen && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-800">
              {menuItems.find(i => i.id === activeView)?.label}
            </h2>
            {selectedProject && (
              <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-sm font-medium text-indigo-700">{selectedProject.title}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <button
              className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
            </button>
            <div className="relative flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-slate-800">{currentUser.fullName}</p>
                <p className="text-xs text-slate-500">{currentUser.headline || 'Team Member'}</p>
              </div>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2"
                aria-label="Open profile menu"
              >
                <img
                  src={currentUser.avatarUrl || 'https://picsum.photos/seed/user/40/40'}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border border-slate-200"
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                  <button
                    onClick={() => {
                      setShowProfile(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <UserRound size={14} /> Profile
                  </button>
                  <button
                    onClick={() => {
                      logoutUser();
                      setCurrentUser(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <LogOut size={14} /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {activeView === 'dashboard' && (
            <ProjectDashboard 
              projects={projects} 
              onSelectProject={setSelectedProjectId} 
              onNewProject={() => setActiveView('ideation')}
              selectedProjectId={selectedProjectId}
            />
          )}
          {activeView === 'ideation' && (
            <IdeationWizard
              onComplete={handleAddProject}
              currentUser={currentUser}
              teamMembers={teamMembers}
            />
          )}
          {activeView === 'guidance' && selectedProject && (
            <GuidancePanel project={selectedProject} />
          )}
          {activeView === 'docs' && selectedProject && (
            <DocumentationEditor
              project={selectedProject}
              onUpdateProject={handleUpdateProject}
              currentUser={currentUser}
            />
          )}
          {activeView === 'tasks' && selectedProject && (
            <TaskManager
              project={selectedProject}
              onUpdateProject={handleUpdateProject}
              teamMembers={teamMembers.map(member => member.fullName)}
              currentUser={currentUser}
            />
          )}
          {activeView === 'collaboration' && selectedProject && (
            <CollaborationBoard
              project={selectedProject}
              onUpdateProject={handleUpdateProject}
              teamMembers={teamMembers.map(member => member.fullName)}
              currentUser={currentUser}
            />
          )}
          {activeView === 'viva' && selectedProject && (
            <VivaPrepPanel project={selectedProject} />
          )}
        </div>
      </main>
      {/* AI Chatbot Floating Button + Full-page Overlay */}
      <AIChatbot project={selectedProject} />
      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onUpdated={updated => {
            setCurrentUser(updated);
            setTeamMembers(getUsers());
          }}
        />
      )}
    </div>
  );
};

export default App;
