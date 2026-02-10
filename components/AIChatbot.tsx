import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project } from '../types';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ArrowDown,
  Trash2,
  Minimize2,
  Maximize2,
  GraduationCap,
  Copy,
  Check,
  Globe,
  BookOpen,
  Code,
  Lightbulb,
  Mic,
  MicOff,
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import ParticleOrb from './ParticleOrb';

interface Props {
  project?: Project | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTION_CHIPS = [
  { icon: <Lightbulb size={13} />, label: 'Suggest project improvements' },
  { icon: <Code size={13} />, label: 'Help me write a module' },
  { icon: <BookOpen size={13} />, label: 'Explain my tech stack' },
  { icon: <Globe size={13} />, label: 'Find related research papers' },
];

// ── Markdown-lite renderer ─────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = '';

  const processInline = (line: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    // Bold, inline code, links
    const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={key++} className="font-bold">{match[2]}</strong>);
      } else if (match[4]) {
        parts.push(<code key={key++} className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded text-[11px] font-mono">{match[4]}</code>);
      } else if (match[6] && match[7]) {
        parts.push(<a key={key++} href={match[7]} target="_blank" rel="noreferrer" className="text-indigo-600 underline hover:text-indigo-800">{match[6]}</a>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) parts.push(line.slice(lastIndex));
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto my-2 leading-relaxed">
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-bold text-slate-800 text-sm mt-3 mb-1">{processInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-bold text-slate-800 text-base mt-3 mb-1">{processInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="font-bold text-slate-800 text-lg mt-3 mb-1">{processInline(line.slice(2))}</h2>);
    } else if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-indigo-400 mt-1 shrink-0">•</span>
          <span>{processInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.match(/^\d+\. /)) {
      const num = line.match(/^(\d+)\. /)?.[1];
      elements.push(
        <div key={i} className="flex gap-2 my-0.5">
          <span className="text-indigo-500 font-bold mt-0 shrink-0 text-xs w-5 text-right">{num}.</span>
          <span>{processInline(line.replace(/^\d+\. /, ''))}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i} className="my-0.5">{processInline(line)}</p>);
    }
  }

  // Close unclosed code block
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre key="unclosed" className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto my-2 leading-relaxed">
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <>{elements}</>;
}

// ── Main Component ─────────────────────────────────────────────────────────

const AIChatbot: React.FC<Props> = ({ project }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      // Auto-detect language or standard
      recognitionRef.current.lang = navigator.language || 'en-US'; 

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
           setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
           // Optional: Auto-stop after final result or keep open?
           // Keeping it open allows for longer dictation.
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        stopListening();
      };
      
      recognitionRef.current.onend = () => {
         if (isListening) {
             // If theoretically still listening but stopped (e.g. silence), restart
             // recognitionRef.current.start(); 
         } else {
             stopListening();
         }
      };
    }
  }, []);

  const startListening = async () => {
    setIsListening(true);
    try {
        // 1. Start Audio Context for Visualizer
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        // 2. Start Speech Recognition
        if (recognitionRef.current) {
            recognitionRef.current.start();
        }
    } catch (error) {
        console.error("Error accessing microphone:", error);
        setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
        recognitionRef.current.stop();
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const toggleVoiceInput = () => {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          stopListening();
      }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Scroll detection
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScroll(scrollHeight - scrollTop - clientHeight > 100);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = useCallback(async (content?: string) => {
    const text = content || input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await geminiService.chatWithAI(history, project);

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Please check your API key and try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, project]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  // ── Floating Icon (closed state) — Pixelated Orb Animation ───
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] group transition-transform hover:scale-105"
        title="Ask Plan Panni Pannuvom AI"
      >
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Three.js Particle Orb */}
          <div className="absolute inset-0 pointer-events-none">
             <ParticleOrb className="w-full h-full" />
          </div>
          
          {/* Subtle Center Icon (Optional, keeps it grounded) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
            <Sparkles size={24} className="text-white drop-shadow-md" />
          </div>
          
          {/* Label tooltip */}
          <div className="absolute bottom-full right-0 mb-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
            Ask AI Assistant
            <div className="absolute top-full right-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      </button>
    );
  }

  // ── Full-page Chat (open state) ───────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-50/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-white dark:bg-black border-b border-slate-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-[-3px] rounded-full border border-indigo-300/25 orbit-ring" style={{ animationDuration: '4s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="orbit-dot-1" style={{ animationDuration: '2.5s' }}>
                <div className="w-1 h-1 rounded-full bg-cyan-400" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="orbit-dot-2" style={{ animationDuration: '2.5s' }}>
                <div className="w-1 h-1 rounded-full bg-violet-400" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50 border border-white/10">
              <Sparkles size={18} className="text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">Plan Panni Pannuvom AI</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-slate-400 font-medium">
                {project ? `Context: ${project.title}` : 'General Assistant'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
            title="Clear chat"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ── Messages Area ───────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            // ── Welcome / Empty State ────────────────────────────────
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              {/* Three.js Particle Orb (Large) */}
              <div className="relative w-72 h-72 -my-8 flex items-center justify-center pointer-events-none transition-all duration-300" style={{ transform: isListening ? 'scale(1.2)' : 'scale(1)' }}>
                 <ParticleOrb className="w-full h-full" analyserRef={analyserRef} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTION_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(chip.label)}
                    className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl text-sm text-slate-600 dark:text-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all text-left group"
                  >
                    <span className="text-slate-400 group-hover:text-indigo-500 transition-colors">{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ── Message List ─────────────────────────────────────────
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 relative mt-0.5">
                      {/* Mini orbit for bot avatar */}
                      <div className="absolute inset-[-3px] rounded-full border border-indigo-300/20 orbit-ring" style={{ animationDuration: '4s' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="orbit-dot-1" style={{ animationDuration: '2.5s' }}>
                          <div className="w-1 h-1 rounded-full bg-cyan-400" />
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="orbit-dot-2" style={{ animationDuration: '2.5s' }}>
                          <div className="w-1 h-1 rounded-full bg-violet-400" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm border border-white/10">
                        <Bot size={14} className="text-white" />
                      </div>
                    </div>
                  )}
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-md'
                          : 'bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-white rounded-tl-md shadow-sm'
                      }`}
                    >
                      {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-slate-300">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="p-1 text-slate-300 hover:text-slate-500 transition-colors rounded"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 bg-slate-200 rounded-xl flex items-center justify-center mt-0.5">
                      <User size={16} className="text-slate-500" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator — orbit animation */}
              {isLoading && (
                <div className="flex gap-3 items-start">
                  <div className="shrink-0 w-8 h-8 relative mt-0.5">
                    <div className="absolute inset-[-3px] rounded-full border border-indigo-300/20 orbit-ring" style={{ animationDuration: '4s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="orbit-dot-1" style={{ animationDuration: '2.5s' }}>
                        <div className="w-1 h-1 rounded-full bg-cyan-400" />
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="orbit-dot-2" style={{ animationDuration: '2.5s' }}>
                        <div className="w-1 h-1 rounded-full bg-violet-400" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-sm border border-white/10">
                      <Bot size={14} className="text-white" />
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-[-4px] rounded-full border border-indigo-200/30 orbit-ring" style={{ animationDuration: '3s' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="orbit-dot-1" style={{ animationDuration: '1.8s' }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="orbit-dot-2" style={{ animationDuration: '1.8s' }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/50" />
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="orbit-dot-3" style={{ animationDuration: '1.8s' }}>
                          <div className="w-1 h-1 rounded-full bg-violet-400 shadow-sm shadow-violet-400/50" />
                        </div>
                      </div>
                      <div className="absolute inset-1 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
                        <Sparkles size={14} className="text-indigo-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      {showScroll && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-full p-2 shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <ArrowDown size={16} className="text-slate-500" />
          </button>
        </div>
      )}

      {/* ── Input Area ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-700 rounded-2xl focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your project..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 outline-none max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <div className="absolute right-2 bottom-2 flex gap-2">
                <button
                onClick={toggleVoiceInput}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    isListening 
                    ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/50 shadow-lg' 
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                title={isListening ? "Stop listening" : "Use voice input"}
                >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl flex items-center justify-center transition-all shadow-sm disabled:shadow-none"
                >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-300 text-center mt-2">
            Plan Panni Pannuvom AI can make mistakes. Verify important information independently.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
