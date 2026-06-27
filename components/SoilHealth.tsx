
import React, { useRef, useState, useEffect } from 'react';
import { Language, UserProfile } from '../types';
import { TRANSLATIONS } from '../constants';
import { ClipboardCheck, Upload, MapPin, Trash2, FileText, CheckCircle, ExternalLink, FileCheck, RefreshCw, Search, Sprout, ChevronRight, AlertCircle, Volume2, StopCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { analyzeSoilHealthCard } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface SoilHealthProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
  onProfileClick: () => void;
}

const SoilHealth: React.FC<SoilHealthProps> = ({ user, onUpdateUser, onLogout, onProfileClick }) => {
  const t = TRANSLATIONS[user.language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Robust voice loading
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    
    // Chrome requires this event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
        window.speechSynthesis.cancel();
    };
  }, []);

  const handleReadAloud = (textToRead: string | undefined) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!textToRead) return;

    // 1. Force load voices if empty (common Chrome bug)
    let availableVoices = voices;
    if (availableVoices.length === 0) {
        availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
    }

    // 2. Advanced text cleaning for natural speech
    const cleanText = textToRead
      .replace(/\*\*/g, '')           // Remove bold markers
      .replace(/\*/g, '')             // Remove single asterisks
      .replace(/###/g, '. ')          // Headers to pauses
      .replace(/##/g, '. ')
      .replace(/#/g, '. ')
      .replace(/---/g, '')            // Remove Separators
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Keep link text, remove url
      .replace(/[*•-]\s/g, '. ')      // List items to periods for pause
      .replace(/[:]/g, '. ')          // Colons to periods for pause
      .replace(/\n+/g, '. ')          // Newlines to periods
      .replace(/\.\s*\./g, '.')       // Dedup periods
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance; // Prevent garbage collection
    
    // 3. Language Mapping
    const langMap: Record<Language, string> = {
      [Language.ENGLISH]: 'en-IN',
      [Language.HINDI]: 'hi-IN',
      [Language.MARATHI]: 'mr-IN',
      [Language.TELUGU]: 'te-IN',
      [Language.TAMIL]: 'ta-IN',
      [Language.KANNADA]: 'kn-IN',
      [Language.MALAYALAM]: 'ml-IN'
    };
    
    const targetLang = langMap[user.language] || 'en-US';
    utterance.lang = targetLang;
    utterance.rate = 0.9; // Slightly slower for clarity

    // 4. Robust Voice Selection Logic
    const baseLang = targetLang.split('-')[0];

    // Priority: Exact Match -> Normalized Match -> Base Language Match -> Script Fallback
    const voice = availableVoices.find(v => v.lang === targetLang) || 
                  availableVoices.find(v => v.lang.replace('_', '-') === targetLang) ||
                  availableVoices.find(v => v.lang.startsWith(baseLang)) ||
                  // Fallback for Marathi -> Hindi (Shared Devanagari Script) if Marathi voice missing
                  (baseLang === 'mr' ? availableVoices.find(v => v.lang.startsWith('hi')) : null);
    
    if (voice) {
        utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
        console.error("Speech error", e);
        setIsSpeaking(false);
    };

    window.speechSynthesis.cancel(); // Stop any previous
    window.speechSynthesis.speak(utterance);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        alert("File size should be less than 5MB");
        return;
      }

      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        
        try {
            const updatedUser = authService.updateUser(user.phone, {
              soilHealthCard: {
                data: base64Data,
                fileName: file.name,
                mimeType: file.type,
                uploadedAt: new Date().toISOString(),
                analysis: undefined
              }
            });

            onUpdateUser(updatedUser);
            setIsUploading(false);
            setShowSuccessModal(true);
            
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error("Upload failed", error);
            setIsUploading(false);
            alert("Failed to upload card. Please try again.");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this card?")) {
        try {
            const updatedUser = authService.updateUser(user.phone, {
                soilHealthCard: null
            } as any);
            
            onUpdateUser(updatedUser);
            
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete card. Please try again.");
        }
    }
  };
  
  const handleUpdateClick = () => {
      fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
      if (!user.soilHealthCard) return;
      
      setIsAnalyzing(true);
      try {
          const base64Raw = user.soilHealthCard.data.split(',')[1];
          const analysisResult = await analyzeSoilHealthCard(base64Raw, user.soilHealthCard.mimeType, user.language);
          
          const updatedUser = authService.updateUser(user.phone, {
              soilHealthCard: {
                  ...user.soilHealthCard,
                  analysis: analysisResult
              }
          });
          
          onUpdateUser(updatedUser);
      } catch (error) {
          console.error("Analysis failed", error);
          alert("Failed to analyze card. Please try again.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleFindLabs = () => {
    window.open("https://soilhealth.dac.gov.in/soilTestingLabs", "_blank");
  };

  const card = user.soilHealthCard;

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900 pb-24 md:pb-0 relative">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                    <span className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400"><ClipboardCheck size={24} /></span>
                    {t.soilHealthCard}
                </h2>
                <p className="text-stone-500 dark:text-stone-400 mt-1 ml-12 text-sm md:text-base">Manage your soil health reports and find testing centers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col h-full relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                     
                     <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 z-10">{t.existingCard}</h3>
                     
                     {card ? (
                        <div className="flex-1 flex flex-col items-center justify-center z-10 animate-in fade-in zoom-in duration-300 w-full">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4 border border-green-100 dark:border-green-800 shadow-sm relative group-hover:scale-105 transition-transform">
                                <FileCheck size={40} />
                                <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-md">
                                    <CheckCircle size={12} fill="white" className="text-green-500" />
                                </div>
                            </div>
                            <h4 className="font-bold text-stone-800 dark:text-stone-100 text-center px-4 truncate w-full max-w-[250px]" title={card.fileName}>
                                {card.fileName}
                            </h4>
                            <p className="text-xs text-stone-400 mt-1 mb-6">
                                Uploaded: {new Date(card.uploadedAt).toLocaleDateString()}
                            </p>
                            
                            <div className="flex flex-col w-full gap-2">
                                <div className="flex gap-2 w-full">
                                    <a 
                                        href={card.data} 
                                        download={card.fileName}
                                        className="flex-1 py-2.5 bg-stone-100 dark:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                                    >
                                        <FileText size={16} /> {t.viewCard}
                                    </a>
                                    <button 
                                        onClick={handleUpdateClick}
                                        className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-200 dark:shadow-none"
                                    >
                                        <RefreshCw size={16} /> Update
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={handleDelete}
                                    className="w-full py-2.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900"
                                >
                                    <Trash2 size={16} /> {t.deleteCard}
                                </button>

                                {!card.analysis && (
                                    <button 
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                        className="w-full py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-lg shadow-stone-200 dark:shadow-none mt-2 disabled:opacity-70"
                                    >
                                        {isAnalyzing ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                                        {isAnalyzing ? "Analyzing..." : "Analyze Report with AI"}
                                    </button>
                                )}
                            </div>
                        </div>
                     ) : (
                        <div className="flex-1 flex flex-col items-center justify-center z-10 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl p-6 hover:border-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/10 transition-all cursor-pointer group/upload" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-16 h-16 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center text-stone-400 dark:text-stone-500 mb-4 group-hover/upload:scale-110 transition-transform group-hover/upload:bg-white dark:group-hover/upload:bg-stone-600 group-hover/upload:text-green-500 dark:group-hover/upload:text-green-400 shadow-sm">
                                <Upload size={28} />
                            </div>
                            <p className="font-bold text-stone-600 dark:text-stone-300 mb-1">{t.uploadSoilCard}</p>
                            <p className="text-xs text-stone-400 text-center max-w-[200px]">Supported: JPG, PNG, PDF (Max 5MB)</p>
                        </div>
                     )}

                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                        className="hidden"
                     />
                     
                     {isUploading && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="font-bold text-green-800 dark:text-green-400 text-sm animate-pulse">Uploading...</p>
                            </div>
                        </div>
                     )}
                </div>

                <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-200 dark:border-stone-700 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-bl-full -mr-8 -mt-8 z-0"></div>
                    
                    <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 z-10 flex items-center gap-2">
                        Testing Labs <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full">Government</span>
                    </h3>
                    
                    <div className="flex-1 flex flex-col items-center justify-center z-10 text-center">
                        <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-500 dark:text-blue-400 mb-4 animate-pulse">
                            <MapPin size={32} />
                        </div>
                        <p className="text-stone-500 dark:text-stone-400 text-sm mb-8 px-4 leading-relaxed">
                            Find government approved soil testing laboratories near your village to get accurate NPK and pH reports.
                        </p>
                        
                        <button 
                            onClick={handleFindLabs}
                            className="w-full py-3 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-stone-800 dark:hover:bg-stone-200 transition-all shadow-xl shadow-stone-200 dark:shadow-none"
                        >
                            {t.findLabs} <ExternalLink size={16} />
                        </button>
                    </div>
                </div>

            </div>
            
            {card?.analysis && (
                <div className="mt-8 bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-gradient-to-r from-green-700 to-green-800 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white">
                                <Sprout size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-white">AI Soil Analysis Report</h3>
                                    <button 
                                        onClick={() => handleReadAloud(card.analysis)}
                                        className={`p-1.5 rounded-full backdrop-blur-sm transition-all ${isSpeaking ? 'bg-white text-green-700 animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                        title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                                    >
                                        {isSpeaking ? <StopCircle size={16} /> : <Volume2 size={16} />}
                                    </button>
                                </div>
                                <p className="text-green-100 text-xs">Detailed insights based on your card.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            className="text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 backdrop-blur-sm"
                        >
                            <RefreshCw size={12} className={isAnalyzing ? "animate-spin" : ""} /> Re-analyze
                        </button>
                    </div>
                    
                    <div className="p-6 md:p-8">
                        <div className="prose prose-stone dark:prose-invert max-w-none">
                            <ReactMarkdown
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-2xl font-extrabold text-green-700 dark:text-green-400 mb-4" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mt-6 mb-3 border-b border-green-100 dark:border-green-800 pb-2" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mt-4 mb-2" {...props} />,
                                    strong: ({node, ...props}) => <strong className="text-green-700 dark:text-green-400 font-bold" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-5 space-y-1 text-stone-600 dark:text-stone-300 mb-4" {...props} />,
                                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    p: ({node, ...props}) => <p className="text-stone-600 dark:text-stone-300 leading-relaxed mb-3" {...props} />,
                                }}
                            >
                                {card.analysis}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
            
            {!card?.analysis && (
                <div className="mt-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-4 flex gap-4">
                    <div className="mt-1">
                        <FileText className="text-amber-600 dark:text-amber-400" size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-1">Why Soil Health Card?</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed opacity-90">
                            A Soil Health Card (SHC) provides information on the nutrient status of your soil along with recommendations on appropriate dosage of nutrients to be applied for improving soil health and its fertility.
                        </p>
                    </div>
                </div>
            )}
        </div>

        {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}></div>
                <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative z-10 animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-4 shadow-sm">
                        <CheckCircle size={32} strokeWidth={3} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Upload Successful!</h3>
                    <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">
                        Your soil health card has been securely saved to your profile. Click "Analyze Report with AI" to get detailed insights.
                    </p>
                    <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all"
                    >
                        OK
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default SoilHealth;
