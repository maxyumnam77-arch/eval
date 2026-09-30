import React from 'react';
import { ActiveNavTab } from '../types';
import { Sun, Moon } from 'lucide-react';

interface NavbarProps {
  workspace: 'grading' | 'admin';
  onWorkspaceChange: (workspace: 'grading' | 'admin') => void;
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  gradedCount: number;
  totalSubmissions: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  workspace,
  onWorkspaceChange,
  activeTab,
  onTabChange,
  gradedCount,
  totalSubmissions,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  const gradingTabs: { id: ActiveNavTab; label: string; badge?: string }[] = [
    { id: 'grade', label: 'Grade Answer' },
    { id: 'mcq', label: 'Grade MCQs' },
    { id: 'results', label: 'Results & Review', badge: `${gradedCount}/${totalSubmissions}` },
  ];
  const adminTabs: { id: ActiveNavTab; label: string; badge?: string }[] = [
    { id: 'bank', label: 'Question Bank' },
    { id: 'mcq', label: 'MCQ Answer Keys' },
    { id: 'model', label: 'Model & Evaluation' },
  ];
  const tabs = workspace === 'grading' ? gradingTabs : adminTabs;

  return (
    <header
      className={`flex flex-col lg:flex-row items-center justify-between gap-4 pb-4 border-b transition-colors ${
        isDark ? 'border-white/10 text-white' : 'border-slate-200/90 text-slate-800'
      }`}
    >
      {/* Brand Zone - Matches Folderprint branding layout */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
        <div className="flex items-center gap-2.5">
          {/* Exact Folderprint double-rectangle icon */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Back square */}
            <div
              className={`absolute top-0 left-0 w-6 h-6 rounded-lg backdrop-blur-sm transition-colors ${
                isDark
                  ? 'bg-white/10 border border-white/40'
                  : 'bg-blue-100 border border-blue-300'
              }`}
            />
            {/* Front square */}
            <div
              className={`relative top-1 left-1.5 w-6 h-6 rounded-lg backdrop-blur-md shadow-sm transition-colors ${
                isDark
                  ? 'bg-white/20 border-2 border-white'
                  : 'bg-blue-600/15 border-2 border-blue-600'
              }`}
            />
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-bold tracking-tight font-sans transition-colors ${
                isDark ? 'text-white drop-shadow-sm' : 'text-slate-900'
              }`}
            >
              Smart Exam Evaluation
            </span>
            <span
              className={`text-sm hidden sm:inline ${
                isDark ? 'text-white/30' : 'text-slate-300'
              }`}
            >
              |
            </span>
            <span
              className={`text-xs font-medium tracking-wide hidden sm:inline transition-colors ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Evaluation Portal
            </span>
          </div>
        </div>

        {/* Mobile Theme Toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                : 'bg-slate-200/80 hover:bg-slate-300 border-slate-300 text-slate-700'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex gap-1 text-xs font-bold rounded-xl border border-slate-400/30 p-1">
        <button onClick={() => onWorkspaceChange('grading')} className={`px-3 py-1.5 rounded-lg ${workspace === 'grading' ? 'bg-blue-600 text-white' : ''}`}>Grading</button>
        <button onClick={() => onWorkspaceChange('admin')} className={`px-3 py-1.5 rounded-lg ${workspace === 'admin' ? 'bg-blue-600 text-white' : ''}`}>Admin</button>
      </div>
      {/* Navigation Links */}
      <nav
        className={`flex items-center gap-1 p-1 rounded-full border overflow-x-auto max-w-full backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-white/[0.06] border-white/15'
            : 'bg-slate-200/60 border-slate-300/80 shadow-xs'
        }`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-1.5 text-xs rounded-full whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? isDark
                    ? 'bg-white text-slate-900 shadow-md font-bold'
                    : 'bg-slate-900 text-white shadow-md font-bold'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/10 font-medium'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? isDark
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-white/15 text-slate-200'
                      : 'bg-slate-300/80 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Controls - Theme Toggle (Sun in Dark Mode, Moon in Light Mode) */}
      <div className="hidden lg:flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all shadow-sm cursor-pointer ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 border-white/25 text-white hover:text-amber-200'
              : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-800" />}
        </button>
      </div>
    </header>
  );
};
