

import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Language, UserProfile, AppNotification } from './types';
import Navigation from './components/Navigation';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import KrishiSakhi from './components/KrishiSakhi';
import PestDoctor from './components/PestDoctor';
import MandiConnect from './components/MandiConnect';
import SoilHealth from './components/SoilHealth';
import Recommendations from './components/Recommendations';
import FirstTimeOnboarding from './components/FirstTimeOnboarding';
import { TourGuide } from './components/TourGuide';
import { authService } from './services/authService';
import { Sprout, LogOut, MessageCircle, ChevronLeft, ChevronRight, Globe, ChevronUp, Check, Edit, User } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('onboarding');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  // Language Menu State
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Lifted Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const languages = [
    { code: Language.ENGLISH, label: 'English', native: 'English' },
    { code: Language.HINDI, label: 'Hindi', native: 'हिंदी' },
    { code: Language.MARATHI, label: 'Marathi', native: 'मराठी' },
    { code: Language.TELUGU, label: 'Telugu', native: 'తెలుగు' },
    { code: Language.TAMIL, label: 'Tamil', native: 'தமிழ்' },
    { code: Language.KANNADA, label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: Language.MALAYALAM, label: 'Malayalam', native: 'മലയാളം' },
  ];

  // Load user from local session on mount
  useEffect(() => {
    const sessionUser = authService.getSession();
    if (sessionUser) {
        setUser(sessionUser);
        setView('dashboard');
    }
    setIsLoading(false);
  }, []);

  // Check if farm details are missing
  const showFirstTimeSetup = user ? !user.farmDetails : false;

  // Check for tour trigger when user is loaded
  useEffect(() => {
    // Only trigger tour if:
    // 1. User is logged in
    // 2. Has NOT seen tour
    // 3. View is dashboard
    // 4. Profile modal is NOT open (manual edit)
    // 5. First time setup (farm details) is COMPLETE (showFirstTimeSetup is false)
    if (user && user.hasSeenTour === false && view === 'dashboard' && !isProfileOpen && !showFirstTimeSetup) {
       // Small delay to ensure UI is ready
       const timer = setTimeout(() => {
          setIsTourOpen(true);
       }, 1000);
       return () => clearTimeout(timer);
    }
  }, [user, view, isProfileOpen, showFirstTimeSetup]);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
            setShowLangMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOnboardingComplete = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleProfileUpdateComplete = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    setIsProfileOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('onboarding');
    setIsProfileOpen(false);
    setIsChatOpen(false);
    setIsTourOpen(false);
    setNotifications([]);
  };

  const handleLanguageChange = (lang: Language) => {
    if (user) {
        const updatedUser = authService.updateUser(user.phone, { language: lang });
        setUser(updatedUser);
        setShowLangMenu(false);
    }
  };
  
  const handleTourComplete = () => {
      if (user) {
          const updatedUser = authService.updateUser(user.phone, { hasSeenTour: true });
          setUser(updatedUser);
      }
      setIsTourOpen(false);
  };

  const addNotification = (notification: AppNotification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  if (isLoading) {
      return <div className="h-screen w-full flex items-center justify-center bg-stone-50 text-green-600"><Sprout className="animate-bounce" size={48} /></div>;
  }

  if (view === 'onboarding' || !user) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen bg-stone-50 w-full overflow-hidden font-sans text-stone-900">
      
      {/* Farm Profile Modal (First time setup OR Edit mode) */}
      {(showFirstTimeSetup || isProfileOpen) && (
        <FirstTimeOnboarding 
            user={user} 
            onComplete={handleProfileUpdateComplete} 
            onClose={showFirstTimeSetup ? undefined : () => setIsProfileOpen(false)}
            onBack={showFirstTimeSetup ? handleLogout : () => setIsProfileOpen(false)}
            onLanguageChange={handleLanguageChange}
        />
      )}

      {/* Tour Guide Overlay */}
      <TourGuide 
         isOpen={isTourOpen} 
         onComplete={handleTourComplete} 
         onClose={() => setIsTourOpen(false)} 
         language={user.language}
      />

      {/* Sidebar Navigation (Desktop) */}
      <aside className={`hidden md:flex flex-col bg-white border-r border-stone-200 z-20 shadow-sm flex-shrink-0 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className="p-6 border-b border-stone-100 relative">
           <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
             <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-200 flex-shrink-0">
                <Sprout size={24} />
             </div>
             {!isSidebarCollapsed && (
               <div className="overflow-hidden">
                  <h1 className="font-bold text-stone-800 text-xl tracking-tight whitespace-nowrap">InnoSphere</h1>
                  <p className="text-xs text-stone-500 font-medium tracking-wide uppercase whitespace-nowrap">Digital Kheti Companion</p>
               </div>
             )}
           </div>
           
           {/* Collapse Button */}
           <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-stone-200 rounded-full p-1 shadow-sm text-stone-400 hover:text-green-600 hover:border-green-300 transition-all z-30"
           >
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>
        </div>
        
        <div className="flex-1 py-6 px-4 overflow-hidden">
            <Navigation currentView={view} setView={setView} language={user.language} variant="sidebar" isCollapsed={isSidebarCollapsed} />
        </div>
        
        <div className="p-4 border-t border-stone-100 bg-stone-50/50">
             {/* User Profile Card */}
             {!isSidebarCollapsed ? (
               <div 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-stone-200 shadow-sm mb-3 cursor-pointer hover:bg-stone-50 transition-colors group"
               >
                   <img src={`https://ui-avatars.com/api/?name=${user.name}&background=166534&color=fff`} className="w-10 h-10 rounded-full ring-2 ring-green-100 group-hover:ring-green-300 transition-all flex-shrink-0" alt={user.name} />
                   <div className="overflow-hidden flex-1">
                      <p className="font-bold text-sm text-stone-800 truncate">{user.name}</p>
                      <p className="text-xs text-stone-500 truncate">{user.location.city}</p>
                   </div>
               </div>
             ) : (
                <div 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex justify-center mb-3 cursor-pointer"
                >
                   <img src={`https://ui-avatars.com/api/?name=${user.name}&background=166534&color=fff`} className="w-10 h-10 rounded-full ring-2 ring-green-100 hover:ring-green-300 transition-all" alt={user.name} />
                </div>
             )}

             {/* Language Selector (Under Profile Container) */}
             <div className="relative mb-3" ref={langMenuRef}>
                 {showLangMenu && (
                     <div className={`absolute bottom-full left-0 mb-2 w-full bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden animate-in slide-in-from-bottom-2 fade-in z-50 ${isSidebarCollapsed ? 'left-10 w-48' : ''}`}>
                         <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
                             {languages.map((lang) => (
                                 <button
                                     key={lang.code}
                                     onClick={() => handleLanguageChange(lang.code)}
                                     className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex justify-between items-center hover:bg-stone-50 transition-colors ${user.language === lang.code ? 'text-green-700 bg-green-50' : 'text-stone-600'}`}
                                 >
                                     <span className="truncate">{lang.native}</span>
                                     {user.language === lang.code && <Check size={14} className="text-green-600 flex-shrink-0" />}
                                 </button>
                             ))}
                         </div>
                     </div>
                 )}
                 <button 
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold text-stone-500 border border-stone-200 bg-white hover:text-green-600 hover:border-green-300 transition-all ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                 >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Globe size={16} />
                        {!isSidebarCollapsed && <span className="truncate">{languages.find(l => l.code === user.language)?.native}</span>}
                    </div>
                    {!isSidebarCollapsed && <ChevronUp size={14} className={`transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />}
                 </button>
             </div>
             
             <button onClick={handleLogout} className={`w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:bg-red-50 py-2 rounded-lg transition-colors font-medium ${isSidebarCollapsed ? 'px-0' : ''}`} title="Logout">
                <LogOut size={20} /> 
                {!isSidebarCollapsed && <span>Logout</span>}
             </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden bg-stone-50">
        <main className="flex-1 relative w-full h-full overflow-hidden">
            {view === 'dashboard' && (
                <Dashboard 
                    user={user} 
                    language={user.language} 
                    onProfileClick={() => setIsProfileOpen(true)}
                    notifications={notifications}
                    addNotification={addNotification}
                    setView={setView}
                    onLogout={handleLogout}
                    onUpdateUser={handleProfileUpdateComplete}
                />
            )}
            {view === 'pest-doctor' && (
                <PestDoctor 
                    language={user.language} 
                    addNotification={addNotification} 
                    user={user}
                    onLogout={handleLogout}
                    onProfileClick={() => setIsProfileOpen(true)}
                    onUpdateUser={handleProfileUpdateComplete}
                />
            )}
            {view === 'mandi' && (
                <MandiConnect 
                    language={user.language} 
                    user={user} 
                    onLogout={handleLogout}
                    onProfileClick={() => setIsProfileOpen(true)}
                />
            )}
            {view === 'soil-health' && (
                <SoilHealth 
                    user={user} 
                    onUpdateUser={handleProfileUpdateComplete} 
                    onLogout={handleLogout}
                    onProfileClick={() => setIsProfileOpen(true)}
                />
            )}
            {view === 'recommendations' && (
                <Recommendations 
                    user={user}
                    onUpdateUser={handleProfileUpdateComplete}
                />
            )}
            
            {/* Mobile Profile View */}
            {view === 'profile' && (
                <div className="h-full overflow-y-auto bg-stone-50 pb-24 md:pb-0">
                    <div className="max-w-xl mx-auto p-4">
                        <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                             <span className="p-2 bg-green-100 rounded-lg text-green-700"><User size={24} /></span>
                             Profile & Settings
                        </h2>
                        
                        {/* User Card */}
                        <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200 mb-6 flex items-center gap-4 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-6 -mt-6"></div>
                             
                             <img src={`https://ui-avatars.com/api/?name=${user.name}&background=166534&color=fff`} className="w-16 h-16 rounded-full ring-4 ring-green-100 flex-shrink-0 z-10" alt={user.name} />
                             <div className="flex-1 z-10">
                                 <h3 className="font-bold text-lg text-stone-900">{user.name}</h3>
                                 <p className="text-stone-500 text-sm flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> {user.location.city}</p>
                             </div>
                             <button 
                                onClick={() => setIsProfileOpen(true)} 
                                className="p-3 bg-stone-100 rounded-full text-stone-600 hover:bg-stone-200 transition-colors z-10 active:scale-95"
                                title="Edit Profile"
                             >
                                <Edit size={20} />
                             </button>
                        </div>

                        {/* Language Selector */}
                        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden mb-6">
                            <div className="p-4 bg-stone-50 border-b border-stone-100 font-bold text-stone-700 flex items-center gap-2">
                                <Globe size={18} className="text-stone-400" /> Language
                            </div>
                            <div className="divide-y divide-stone-50">
                                {languages.map(lang => (
                                    <button 
                                        key={lang.code} 
                                        onClick={() => handleLanguageChange(lang.code)} 
                                        className={`w-full text-left p-4 flex justify-between items-center transition-colors ${user.language === lang.code ? 'bg-green-50 text-green-800' : 'hover:bg-stone-50 text-stone-600'}`}
                                    >
                                        <span className="font-bold text-sm">{lang.native}</span>
                                        {user.language === lang.code && <Check size={18} className="text-green-600" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Logout */}
                        <button 
                            onClick={handleLogout} 
                            className="w-full bg-white border border-red-100 text-red-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all hover:bg-red-50"
                        >
                            <LogOut size={20} /> Logout
                        </button>
                        
                        <p className="text-center text-xs text-stone-400 mt-8 mb-4">
                            InnoSphere Version 1.0.0
                        </p>
                    </div>
                </div>
            )}
        </main>

        {/* Bottom Navigation (Mobile Only) */}
        <Navigation currentView={view} setView={setView} language={user.language} variant="bottom" />
      </div>

      {/* Global Chat Floating Action Button */}
      {!isChatOpen && user && (
          <button
            id="chat-fab"
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 p-4 bg-green-600 text-white rounded-full shadow-lg shadow-green-200 hover:bg-green-700 hover:scale-105 active:scale-95 transition-all animate-in zoom-in duration-300"
          >
            <MessageCircle size={28} />
          </button>
       )}

       {/* Global Chat Overlay */}
       {isChatOpen && user && (
          <div className="fixed inset-0 z-[100] md:inset-auto md:bottom-8 md:right-8 md:w-[400px] md:h-[600px] bg-white md:rounded-2xl md:shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-300 border border-stone-200">
              <KrishiSakhi language={user.language} onClose={() => setIsChatOpen(false)} />
          </div>
       )}
    </div>
  );
};

export default App;
