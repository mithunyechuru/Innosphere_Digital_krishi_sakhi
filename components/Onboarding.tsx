import React, { useState } from 'react';
import { Language, UserProfile } from '../types';
import { TRANSLATIONS } from '../constants';
import { authService } from '../services/authService';
import { Phone, User, ArrowRight, Check, AlertCircle, Loader2, Globe, ChevronDown, ShieldCheck, Wand2, LogIn, UserPlus, Sprout, Moon, Sun } from 'lucide-react';

interface OnboardingProps {
  onComplete: (userProfile: UserProfile) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isDarkMode, toggleTheme }) => {
  const [selectedLang, setSelectedLang] = useState<Language>(Language.ENGLISH);
  const [showLangMenu, setShowLangMenu] = useState(false);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form State
  // Initialize phone with last used number if available for better UX (only for Login mode which is default)
  const [phone, setPhone] = useState(authService.getLastPhone() || '');
  const [name, setName] = useState(''); // Only for Signup
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const languages = [
    { code: Language.ENGLISH, label: 'English', native: 'English' },
    { code: Language.TELUGU, label: 'Telugu', native: 'తెలుగు' },
    { code: Language.HINDI, label: 'Hindi', native: 'हिंदी' },
    { code: Language.TAMIL, label: 'Tamil', native: 'தமிழ்' },
    { code: Language.KANNADA, label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: Language.MALAYALAM, label: 'Malayalam', native: 'മലയാളം' },
  ];

  const handleLangSelect = (lang: Language) => {
    setSelectedLang(lang);
    setShowLangMenu(false);
    setError(null);
  };

  const t = TRANSLATIONS[selectedLang];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (phone.length !== 10) {
        setError(t.invalidMobile || "Please enter valid 10-digit mobile number");
        return;
    }
    if (authMode === 'signup' && name.trim().length < 2) {
        setError("Please enter your full name");
        return;
    }

    setLoading(true);

    try {
        if (!otpSent) {
            // Step 1: Request OTP
            
            // For login, check if user exists first
            if (authMode === 'login') {
                const userExists = authService.findUserByPhone(phone);
                if (!userExists) {
                    throw new Error(t.noAccount || "Account not found. Please Sign Up.");
                }
            } else {
                // For signup, check if user already exists
                 const userExists = authService.findUserByPhone(phone);
                 if (userExists) {
                     throw new Error(t.haveAccount || "User already registered. Please Login.");
                 }
            }

            await authService.requestOtp(phone);
            setOtpSent(true);
            setLoading(false);
        } else {
            // Step 2: Verify OTP and Login/Register
            if (otp.length !== 4) {
                throw new Error("Please enter valid 4-digit OTP");
            }

            authService.verifyOtp(otp); // Throws if invalid

            let user;
            if (authMode === 'login') {
                user = authService.loginUser(phone);
            } else {
                user = authService.register({
                    name,
                    phone,
                    language: selectedLang
                });
            }

            // Update language preference if changed during login
            if (user && user.language !== selectedLang) {
                user = authService.updateUser(user.phone, { language: selectedLang });
            }

            onComplete(user);
        }
    } catch (err: any) {
        setError(err.message || "An error occurred");
        setLoading(false);
    }
  };

  const switchMode = (mode: 'login' | 'signup') => {
      setAuthMode(mode);
      setError(null);
      setOtpSent(false);
      setOtp('');
      setName('');
      
      if (mode === 'signup') {
          // Clear phone number when switching to Create Account
          setPhone('');
      } else {
          // Auto-fill last used phone when switching back to Login
          setPhone(authService.getLastPhone() || '');
      }
  };

  const fillTestData = () => {
    if (authMode === 'signup') {
        const randomPhone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
        setName("Kisan Bhai");
        setPhone(randomPhone);
    } else {
        const users = authService.getAllUsers();
        if (users.length > 0) {
            setPhone(users[users.length - 1].phone);
        } else {
            setPhone('9876543210');
        }
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Background Image with Overlay */}
        <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2940&auto=format&fit=crop')`,
            }}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative w-full max-w-sm md:max-w-md bg-white/95 dark:bg-stone-800/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-500 z-10 border border-white/40 dark:border-stone-700/40">
             
             {/* Header Section - More Compact & Clean */}
             <div className="bg-gradient-to-r from-green-700 to-green-600 p-5 flex items-center justify-between relative">
                {/* Background Blob - overflow handled by parent card */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>
                
                {/* Logo & Title */}
                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner border border-white/10 flex-shrink-0">
                        <Sprout size={20} className="text-white" />
                    </div>
                    
                    <div>
                        <h1 className="text-xl font-bold text-white leading-tight tracking-tight">InnoSphere</h1>
                        <p className="text-green-50 text-[10px] font-bold uppercase tracking-widest opacity-90">Digital Kheti Companion</p>
                    </div>
                </div>

                {/* Inline Language Selector */}
                <div className="relative z-20">
                    <button 
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white pl-2.5 pr-2 py-1.5 rounded-lg transition-colors backdrop-blur-md border border-white/10 shadow-sm active:scale-95"
                    >
                        <Globe size={14} className="opacity-90" />
                        <span className="text-xs font-bold">{languages.find(l => l.code === selectedLang)?.native}</span>
                        <ChevronDown size={12} className={`opacity-80 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showLangMenu && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowLangMenu(false)}></div>
                            <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-40">
                                <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLangSelect(lang.code)}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors border-b border-stone-50 dark:border-stone-700 last:border-0 flex justify-between items-center ${selectedLang === lang.code ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
                                        >
                                            {lang.native}
                                            {selectedLang === lang.code && <Check size={12} className="text-green-600 dark:text-green-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
             </div>

             <div className="px-5 pt-5 pb-2 md:px-6 md:pt-6 md:pb-4">
                
                {/* Tabs */}
                <div className="flex bg-stone-100 dark:bg-stone-700/50 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => switchMode('login')}
                        className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${authMode === 'login' ? 'bg-white dark:bg-stone-600 text-green-700 dark:text-green-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}
                    >
                        <LogIn size={16} strokeWidth={2.5} />
                        {t.login}
                    </button>
                    <button 
                        onClick={() => switchMode('signup')}
                        className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${authMode === 'signup' ? 'bg-white dark:bg-stone-600 text-green-700 dark:text-green-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'}`}
                    >
                        <UserPlus size={16} strokeWidth={2.5} />
                        {t.createAccount}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="text-red-500 dark:text-red-400 shrink-0" size={18} />
                        <p className="text-xs text-red-700 dark:text-red-300 font-bold leading-tight">{error}</p>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    
                    {/* Name Field (Signup Only) */}
                    {authMode === 'signup' && !otpSent && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                             <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                                {t.name}
                             </label>
                             <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-green-600 transition-colors">
                                    <User size={20} />
                                </div>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl focus:border-green-500 focus:bg-white dark:focus:bg-stone-800 focus:ring-4 focus:ring-green-500/10 outline-none text-sm font-bold text-stone-800 dark:text-stone-100 placeholder-stone-400 transition-all"
                                    placeholder="Enter full name"
                                    autoFocus
                                />
                             </div>
                        </div>
                    )}

                    {/* Mobile Number Field */}
                    {!otpSent && (
                         <div>
                            <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 ml-1">
                                {t.mobile}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-green-600 transition-colors">
                                    <Phone size={20} />
                                </div>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    className="w-full pl-12 pr-4 py-3 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl focus:border-green-500 focus:bg-white dark:focus:bg-stone-800 focus:ring-4 focus:ring-green-500/10 outline-none text-sm font-bold text-stone-800 dark:text-stone-100 placeholder-stone-400 transition-all tracking-wide"
                                    placeholder="98765 43210"
                                />
                             </div>
                        </div>
                    )}

                    {/* OTP Field */}
                    {otpSent && (
                        <div className="animate-in zoom-in-95 duration-300 py-2">
                             <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400 mb-3 shadow-inner border border-green-200 dark:border-green-800">
                                    <ShieldCheck size={28} />
                                </div>
                                <p className="text-stone-500 dark:text-stone-400 text-sm font-medium">OTP sent to <span className="text-stone-800 dark:text-stone-200 font-bold">+91 {phone}</span></p>
                                <button type="button" onClick={() => setOtpSent(false)} className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline mt-1">Change Number</button>
                             </div>

                             <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 ml-1 text-center">
                                Enter 4-Digit OTP
                             </label>
                             <div className="flex justify-center">
                                <input
                                    type="tel"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    className="w-48 py-3 text-center text-2xl tracking-[0.5em] font-bold border border-green-300 dark:border-green-700 rounded-xl bg-white dark:bg-stone-800 text-green-800 dark:text-green-400 placeholder-stone-200 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900/30 outline-none transition-all shadow-sm"
                                    placeholder="••••"
                                    autoFocus
                                />
                             </div>
                            <p className="text-center text-xs text-stone-400 mt-3">Try '1234' for demo</p>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl shadow-lg shadow-green-600/20 text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <>
                                {otpSent ? (
                                    <>Verify & {authMode === 'login' ? 'Login' : 'Join'} <Check size={18} strokeWidth={3} /></>
                                ) : (
                                    <>Get OTP <ArrowRight size={18} strokeWidth={3} /></>
                                )}
                            </>
                        )} 
                    </button>
                    
                    {/* Test Helper */}
                    <button
                        type="button"
                        onClick={fillTestData}
                        className="w-full py-1.5 text-[10px] font-bold text-stone-300 hover:text-stone-500 flex items-center justify-center gap-1 transition-colors"
                    >
                        <Wand2 size={12} /> Fill Test Data
                    </button>
                </form>
             </div>
        </div>

        {/* Floating Theme Switcher */}
        {toggleTheme && (
            <button
                onClick={toggleTheme}
                className="absolute bottom-6 right-6 z-20 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all shadow-lg active:scale-95 group"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDarkMode ? <Sun size={20} className="group-hover:rotate-12 transition-transform" /> : <Moon size={20} className="group-hover:-rotate-12 transition-transform" />}
            </button>
        )}
    </div>
  );
};

export default Onboarding;