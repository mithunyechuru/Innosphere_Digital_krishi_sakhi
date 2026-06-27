import React from 'react';
import { ViewState, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { Home, ScanLine, ShoppingCart, ClipboardCheck, Sprout, User } from 'lucide-react';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  language: Language;
  variant?: 'bottom' | 'sidebar';
  isCollapsed?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, language, variant = 'bottom', isCollapsed = false }) => {
  const t = TRANSLATIONS[language];

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: Home },
    { id: 'pest-doctor', label: t.scan, icon: ScanLine },
    { id: 'mandi', label: t.market, icon: ShoppingCart },
    { id: 'soil-health', label: t.soilHealth, icon: ClipboardCheck },
    { id: 'recommendations', label: t.recommendations, icon: Sprout },
  ];

  if (variant === 'sidebar') {
    return (
      <nav className="flex flex-col w-full space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setView(item.id as ViewState)}
              className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4 gap-3'} py-3.5 rounded-xl transition-all duration-200 group relative ${
                isActive 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 font-bold' 
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700/50 hover:text-stone-900 dark:hover:text-stone-200 font-medium'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              {isActive && <div className="absolute left-0 w-1 h-8 bg-green-600 dark:bg-green-500 rounded-r-full"></div>}
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-green-600 dark:text-green-400' : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors'} />
              {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>
    );
  }

  // Mobile Bottom Navigation
  const mobileNavItems = navItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Blur Backdrop */}
      <div className="absolute inset-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-t border-stone-200 dark:border-stone-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]"></div>
      
      <div className="relative flex justify-around items-center h-16 px-1">
        {mobileNavItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setView(item.id as ViewState)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 ${
                isActive ? 'text-green-700 dark:text-green-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              <div className={`p-1 rounded-full transition-all ${isActive ? 'bg-green-100 dark:bg-green-900/30 translate-y-[-2px]' : 'bg-transparent'}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-medium truncate max-w-[64px] ${isActive ? 'opacity-100' : 'opacity-70'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;