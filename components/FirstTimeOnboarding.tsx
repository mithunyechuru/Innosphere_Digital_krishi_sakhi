
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, FarmDetails, CropHistory, Language } from '../types';
import { TRANSLATIONS, VOICE_PROMPTS, VOICE_KEYWORDS } from '../constants';
import { MapPin, Sprout, Tractor, Plus, Trash2, Check, Loader2, Navigation, ChevronDown, Ruler, Layers, X, Edit3, Calendar, FlaskConical, Scale, Droplets, Minus, CloudRain, Waves, Disc, Circle, CloudDrizzle, Info, Snowflake, Sun, ThermometerSun, ArrowLeft, Globe, Mic, MicOff, Volume2 } from 'lucide-react';
import { authService } from '../services/authService';

interface FirstTimeOnboardingProps {
  user: UserProfile;
  onComplete: (user: UserProfile) => void;
  onClose?: () => void;
  onBack?: () => void;
  onLanguageChange?: (lang: Language) => void;
}

// --- Custom Select Component ---
interface SelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  iconColor?: string; // Add color support
  iconBg?: string;    // Add background color support
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ElementType;
  className?: string;
  placeholder?: string;
  onFocus?: () => void; // Add focus handler
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, icon: Icon, className, placeholder, onFocus }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  const SelectedIcon = selectedOption?.icon;

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && onFocus) onFocus();
  };

  return (
    <div className={`relative ${className} ${isOpen ? 'z-40' : 'z-0'}`} ref={containerRef}>
      <div 
        onClick={handleToggle}
        className={`w-full bg-stone-50 dark:bg-stone-700 border transition-all duration-200 cursor-pointer flex items-center justify-between
          ${isOpen ? 'border-green-500 ring-4 ring-green-500/10 bg-white dark:bg-stone-800' : 'border-stone-200 dark:border-stone-600 hover:border-green-400 hover:bg-stone-100 dark:hover:bg-stone-600'}
          rounded-xl text-stone-800 dark:text-stone-100 font-bold text-sm h-[50px]
          ${Icon ? 'pl-12 pr-4' : 'px-4'}
        `}
      >
        {Icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors pointer-events-none
            ${isOpen ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-stone-100 dark:bg-stone-600 text-stone-400'}
          `}>
             <Icon size={18} />
          </div>
        )}
        
        <div className="flex items-center gap-2 truncate flex-1">
             {SelectedIcon && !Icon && (
                <div className={`p-1 rounded-md ${selectedOption?.iconBg || 'bg-stone-100 dark:bg-stone-600'}`}>
                    <SelectedIcon size={16} className={selectedOption?.iconColor || 'text-stone-600 dark:text-stone-300'} />
                </div>
             )}
             <span className={`truncate ${!selectedOption && !value ? 'text-stone-400' : ''}`}>
                {selectedOption?.label || value || placeholder}
             </span>
        </div>

        <ChevronDown size={18} className={`ml-2 text-stone-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-green-600' : ''}`} strokeWidth={2.5} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top min-w-[140px]">
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {options.map((option) => {
              const OptionIcon = option.icon;
              return (
                <div
                    key={option.value}
                    onClick={() => {
                        onChange(option.value);
                        setIsOpen(false);
                    }}
                    className={`px-3 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center justify-between group
                    ${value === option.value 
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100'}
                    `}
                >
                    <div className="flex items-center gap-3">
                        {OptionIcon && (
                            <div className={`p-1.5 rounded-md ${option.iconBg || 'bg-stone-100 dark:bg-stone-700'} ${value === option.value ? 'bg-white dark:bg-stone-600' : ''}`}>
                                <OptionIcon size={16} className={option.iconColor || "text-stone-500 dark:text-stone-400"} />
                            </div>
                        )}
                        <span>{option.label}</span>
                    </div>
                    {value === option.value && <Check size={16} className="text-green-600 dark:text-green-400" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Popup Guidance Component ---
const GuidanceBox = ({ guidance, className = "", onClose }: { guidance: any, className?: string, onClose: () => void }) => {
  if (!guidance) return null;
  return (
    <div className={`absolute bottom-full left-0 mb-3 z-50 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 w-72 md:w-80 ${className}`}>
        <div className={`bg-white dark:bg-stone-800 p-3 pr-8 rounded-xl border border-stone-200 dark:border-stone-700 shadow-xl relative overflow-hidden ring-1 ring-black/5`}>
            {/* Color Strip */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${guidance.bg.replace('bg-', 'bg-')}-400`}></div>
            
            {/* Close Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="absolute top-2 right-2 p-1 text-stone-300 hover:text-stone-500 dark:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors"
            >
                <X size={14} />
            </button>

            <div className="flex gap-3 items-start relative z-10">
                <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${guidance.bg} dark:bg-opacity-20 ${guidance.color} shadow-sm`}>
                    {React.createElement(guidance.icon, { size: 18 })}
                </div>
                <div>
                    <h4 className={`font-bold text-xs mb-0.5 ${guidance.color}`}>{guidance.title}</h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-medium">
                        {guidance.text}
                    </p>
                </div>
            </div>
            
            {/* Arrow Pointer */}
            <div className="absolute -bottom-1.5 left-6 w-3 h-3 bg-white dark:bg-stone-800 border-b border-r border-stone-200 dark:border-stone-700 rotate-45 z-20"></div>
        </div>
    </div>
  );
};

// --- Number Parser ---
const parseLocalizedNumber = (text: string) => {
    // Map of localized digits to 0-9
    const digitMap: {[key: string]: string} = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9', // Hindi/Marathi/Nepali
        '೦': '0', '೧': '1', '೨': '2', '೩': '3', '೪': '4', '೫': '5', '೬': '6', '೭': '7', '೮': '8', '೯': '9', // Kannada
        '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4', '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9', // Telugu
        '൦': '0', '൧': '1', '൨': '2', 'മൂ': '3', '൪': '4', '൫': '5', '൬': '6', '൭': '7', '൮': '8', '൯': '9', // Malayalam
        '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9', // Tamil
    };
    
    let normalized = text;
    for (const [key, val] of Object.entries(digitMap)) {
        normalized = normalized.split(key).join(val);
    }
    
    // Also try to match English number words if simple
    // (In a real app, use a library like 'words-to-numbers', but for now regex is safer for digits)
    const match = normalized.match(/(\d+(\.\d+)?)/);
    return match ? match[0] : null;
};


// ----------------------------

const FirstTimeOnboarding: React.FC<FirstTimeOnboardingProps> = ({ user, onComplete, onClose, onBack, onLanguageChange }) => {
  const t = TRANSLATIONS[user.language];
  const translations = t as any;
  const prompts = VOICE_PROMPTS[user.language] || VOICE_PROMPTS[Language.ENGLISH];
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  
  // Voice Assistant State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'speaking' | 'listening' | 'processing'>('idle');
  const [voiceStep, setVoiceStep] = useState(0); // 0: Address, 1: Size, 2: Soil, 3: Irrigation, 4: Finish
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const recognitionRef = useRef<any>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null); // GC protection
  
  // Language Menu State
  const [showLangMenu, setShowLangMenu] = useState(false);

  const isEditing = !!user.farmDetails;
  
  const [location, setLocation] = useState({
    address: user.farmDetails?.location.address || user.location.city || '',
    lat: user.farmDetails?.location.lat || user.location.lat || 21.1458,
    lng: user.farmDetails?.location.lng || user.location.lng || 79.0882,
    captured: !!user.farmDetails
  });
  
  const [farmSize, setFarmSize] = useState(user.farmDetails?.size || '');
  const [sizeUnit, setSizeUnit] = useState(user.farmDetails?.unit || 'Acres');
  const [soilType, setSoilType] = useState(user.farmDetails?.soilType || 'Black Cotton');
  const [irrigation, setIrrigation] = useState(user.farmDetails?.irrigation || 'Rainfed');
  
  // Initialize crops as empty array if no existing data
  const [crops, setCrops] = useState<CropHistory[]>(
    (user.farmDetails?.crops && user.farmDetails.crops.length > 0)
      ? user.farmDetails.crops.map(c => ({
          ...c,
          year: c.year || new Date().getFullYear().toString(),
          area: c.area || '',
          areaUnit: c.areaUnit || 'Acres',
          yieldAmount: c.yieldAmount || '',
          yieldUnit: c.yieldUnit || 'Quintals',
          chemicals: c.chemicals || ''
      }))
      : [] 
  );
  
  const languages = [
    { code: Language.ENGLISH, label: 'English', native: 'English' },
    { code: Language.HINDI, label: 'Hindi', native: 'हिंदी' },
    { code: Language.MARATHI, label: 'Marathi', native: 'मराठी' },
    { code: Language.TELUGU, label: 'Telugu', native: 'తెలుగు' },
    { code: Language.TAMIL, label: 'Tamil', native: 'தமிழ்' },
    { code: Language.KANNADA, label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: Language.MALAYALAM, label: 'Malayalam', native: 'മലയാളം' },
  ];
  
  const handleLangSelect = (lang: Language) => {
    if (onLanguageChange) {
        onLanguageChange(lang);
    }
    setShowLangMenu(false);
  };

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
      const y = new Date().getFullYear() - i;
      return { value: y.toString(), label: y.toString() };
  });

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const reverseGeocodeTimer = useRef<any>(null);
  const resizeTimerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInternalUpdate = useRef(false);
  const isProgrammaticMove = useRef(false);

  // --- Voice Logic ---
  
  // Load voices when component mounts
  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
             window.speechSynthesis.onvoiceschanged = null;
        }
    }
  }, []);

  const getSpeechLang = (lang: Language) => {
    switch(lang) {
        case Language.HINDI: return 'hi-IN';
        case Language.MARATHI: return 'mr-IN';
        case Language.TELUGU: return 'te-IN';
        case Language.TAMIL: return 'ta-IN';
        case Language.KANNADA: return 'kn-IN';
        case Language.MALAYALAM: return 'ml-IN';
        default: return 'en-US';
    }
  };

  // Helper to match voice input to options
  const matchKeyword = (text: string, category: 'soil' | 'irrigation') => {
      const lowerText = text.toLowerCase();
      const map = VOICE_KEYWORDS[category];
      for (const [key, keywords] of Object.entries(map)) {
          if (keywords.some(k => lowerText.includes(k.toLowerCase()))) {
              return key;
          }
      }
      return null;
  };

  const speak = (text: string, callback?: () => void) => {
      if (!synthRef.current) synthRef.current = window.speechSynthesis;
      
      // Cancel pending speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance; // Prevent GC

      const langCode = getSpeechLang(user.language);
      utterance.lang = langCode;
      
      // Intelligent Voice Selection with fallback
      let availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) availableVoices = voices;

      const baseLang = langCode.split('-')[0];
      
      const voice = availableVoices.find(v => v.lang === langCode) || 
                    availableVoices.find(v => v.lang.replace('_', '-') === langCode) ||
                    availableVoices.find(v => v.lang.startsWith(baseLang)) ||
                    (baseLang === 'mr' ? availableVoices.find(v => v.lang.startsWith('hi')) : null);
      
      if (voice) {
          utterance.voice = voice;
      }

      utterance.onstart = () => setVoiceStatus('speaking');
      utterance.onend = () => {
          setVoiceStatus('idle');
          if (callback) callback();
      };

      utterance.onerror = (e) => {
          console.error("TTS Error", e);
          setVoiceStatus('idle');
          // Proceed anyway to avoid getting stuck
          if (callback) callback();
      }

      try {
        synthRef.current.speak(utterance);
      } catch (e) {
          console.error("Speak failed", e);
          if (callback) callback();
      }
  };

  const listen = (callback: (text: string) => void) => {
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
          alert("Voice input not supported.");
          setIsVoiceActive(false);
          return;
      }
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = getSpeechLang(user.language);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      // Stop TTS before listening
      window.speechSynthesis.cancel();

      recognition.onstart = () => setVoiceStatus('listening');
      recognition.onend = () => {
          if (voiceStatus === 'listening') setVoiceStatus('idle');
      };
      
      recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setVoiceStatus('processing');
          callback(text);
      };

      recognition.onerror = (e: any) => {
          setVoiceStatus('idle');
          if (e.error === 'no-speech') {
             // Retry once or give up? For now, we ask again.
             // speak("I didn't hear anything.", () => listen(callback)); 
             // Just stop to avoid infinite loops if environment is noisy/silent
             setIsVoiceActive(false);
          } else {
             console.error("Speech error", e);
             setIsVoiceActive(false);
          }
      };

      try {
        recognition.start();
      } catch (e) {
          console.error("Recognition start failed", e);
      }
  };

  const startVoiceFlow = () => {
      setIsVoiceActive(true);
      setVoiceStep(0);
      setActiveField('address');
      
      // Re-fetch prompts based on current language
      const currentPrompts = VOICE_PROMPTS[user.language] || VOICE_PROMPTS[Language.ENGLISH];
      const introText = currentPrompts.intro || "Welcome. Let's start.";
      speak(introText, () => listen(handleLocationInput));
  };

  const stopVoiceFlow = () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsVoiceActive(false);
      setVoiceStatus('idle');
  };

  const handleLocationInput = (text: string) => {
      const currentPrompts = VOICE_PROMPTS[user.language] || VOICE_PROMPTS[Language.ENGLISH];

      // Step 1: Location
      setLocation(prev => ({ ...prev, address: text }));
      setActiveField('farmSize');
      setVoiceStep(1);
      
      if (text.length > 2) {
          isInternalUpdate.current = false;
      }

      // Speak confirmation + next question
      const confirmText = (currentPrompts.location_confirm || "Okay, finding ") + text + ". ";
      const nextQ = currentPrompts.size || "What is the size?";
      
      speak(confirmText + nextQ, () => listen(handleSizeInput));
  };

  const handleSizeInput = (text: string) => {
      const currentPrompts = VOICE_PROMPTS[user.language] || VOICE_PROMPTS[Language.ENGLISH];

      // Step 2: Size
      const numStr = parseLocalizedNumber(text);
      if (numStr) {
          setFarmSize(numStr);
      }

      const lower = text.toLowerCase();
      if (lower.includes('acre') || lower.includes('ekar')) setSizeUnit('Acres');
      else if (lower.includes('hectare')) setSizeUnit('Hectares');
      else if (lower.includes('guntha')) setSizeUnit('Guntha');

      setVoiceStep(2);
      setActiveField('soilType');
      speak(currentPrompts.soil || "Soil type?", () => listen(handleSoilInput));
  };

  const handleSoilInput = (text: string) => {
      const currentPrompts = VOICE_PROMPTS[user.language] || VOICE_PROMPTS[Language.ENGLISH];

      // Step 3: Soil
      const match = matchKeyword(text, 'soil');
      if (match) {
           // Map simplified keys to full state values
           if (match === 'black') setSoilType('Black Cotton');
           else if (match === 'red') setSoilType('Red');
           else if (match === 'sandy') setSoilType('Sandy');
           else if (match === 'clay') setSoilType('Clay');
           else if (match === 'loamy') setSoilType('Loamy');
           else if (match === 'alluvial') setSoilType('Alluvial');
      }

      setVoiceStep(3);
      setActiveField('irrigation');
      speak(currentPrompts.irrigation || "Irrigation?", () => listen(handleIrrigationInput));
  };

  const handleIrrigationInput = (text: string) => {
      const currentPrompts = VOICE_PROMPTS[user.language] || VOICE_PROMPTS[Language.ENGLISH];

      // Step 4: Irrigation
      const match = matchKeyword(text, 'irrigation');
      if (match) {
          if (match === 'rainfed') setIrrigation('Rainfed');
          else if (match === 'borewell') setIrrigation('Borewell');
          else if (match === 'canal') setIrrigation('Canal');
          else if (match === 'well') setIrrigation('Well');
          else if (match === 'drip') setIrrigation('Drip');
          else if (match === 'sprinkler') setIrrigation('Sprinkler');
          else if (match === 'river') setIrrigation('River');
      }

      setVoiceStep(4);
      setActiveField(null);
      speak(currentPrompts.finish || "Done.");
      setIsVoiceActive(false);
  };

  // --- Guidance Logic ---
  const getFieldGuidance = (fieldKey: string) => {
    // Extract base field name from keys like 'cropName-123'
    const field = fieldKey.split('-')[0];
    
    // Get translations for guidance based on current language
    const guidanceTexts = (TRANSLATIONS[user.language] as any).guidance;
    if (!guidanceTexts || !guidanceTexts[field]) return null;

    const baseGuidance = guidanceTexts[field];

    switch(field) {
        case 'address':
            return {
                ...baseGuidance,
                icon: MapPin,
                color: "text-red-500",
                bg: "bg-red-50"
            };
        case 'farmSize':
            return {
                ...baseGuidance,
                icon: Ruler,
                color: "text-blue-500",
                bg: "bg-blue-50"
            };
        case 'soilType':
            return {
                ...baseGuidance,
                icon: Layers,
                color: "text-amber-600",
                bg: "bg-amber-50"
            };
        case 'irrigation':
            return {
                ...baseGuidance,
                icon: Droplets,
                color: "text-cyan-600",
                bg: "bg-cyan-50"
            };
        case 'cropName':
            return {
                ...baseGuidance,
                icon: Sprout,
                color: "text-green-600",
                bg: "bg-green-50"
            };
        case 'season':
            return {
                ...baseGuidance,
                icon: CloudRain,
                color: "text-indigo-500",
                bg: "bg-indigo-50"
            };
        case 'year':
            return {
                ...baseGuidance,
                icon: Calendar,
                color: "text-teal-500",
                bg: "bg-teal-50"
            };
        case 'yield':
            return {
                ...baseGuidance,
                icon: Scale,
                color: "text-purple-500",
                bg: "bg-purple-50"
            };
        case 'area':
             return {
                ...baseGuidance,
                icon: Ruler,
                color: "text-orange-500",
                bg: "bg-orange-50"
            };
        default:
            return null;
    }
  };

  const currentGuidance = activeField ? getFieldGuidance(activeField) : null;
  const handleCloseGuidance = () => setActiveField(null);

  // --- Map Effects ---
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;
    
    // Safety check: if map already in DOM but we lost ref (Strict Mode)
    // We can't reuse the existing map easily without a ref, so we ensure container is clean or just don't re-init.
    // If mapRef.current is already set, we just use it.
    if (mapRef.current) {
        // Map is already initialized in this component instance
        return;
    }

    const map = L.map(mapContainerRef.current, {
        center: [location.lat, location.lng],
        zoom: 15,
        zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    map.on('moveend', function() {
        if (isProgrammaticMove.current) {
            isProgrammaticMove.current = false;
            return;
        }
        
        // SAFE LAYER REMOVAL
        if (accuracyCircleRef.current) {
            if (map.hasLayer(accuracyCircleRef.current)) {
                map.removeLayer(accuracyCircleRef.current);
            }
            accuracyCircleRef.current = null;
        }

        const center = map.getCenter();
        isInternalUpdate.current = true;
        setLocation(prev => ({ ...prev, lat: center.lat, lng: center.lng, captured: true }));
        
        if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();

        reverseGeocodeTimer.current = setTimeout(async () => {
            abortControllerRef.current = new AbortController();
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=18&addressdetails=1&accept-language=en`, {
                     signal: abortControllerRef.current.signal
                });
                if (!response.ok) return;
                const data = await response.json();
                if (data && data.display_name) {
                    const addr = data.address;
                    const formattedAddress = [
                        addr.village || addr.town || addr.city || addr.hamlet,
                        addr.county,
                        addr.state,
                        addr.postcode
                    ].filter(Boolean).join(', ');
                    
                    isInternalUpdate.current = true;
                    setLocation(prev => ({ ...prev, address: formattedAddress || data.display_name }));
                }
            } catch(err: any) {}
        }, 800);
    });

    mapRef.current = map;
    
    // SAFE INVALIDATE SIZE
    resizeTimerRef.current = setTimeout(() => { 
        if (mapRef.current) mapRef.current.invalidateSize(); 
    }, 400);

    return () => {
        if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
        if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
        if (abortControllerRef.current) abortControllerRef.current.abort();
        
        if (mapRef.current) {
            mapRef.current.off();
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, []);

  useEffect(() => {
     if (mapRef.current) {
        const currentCenter = mapRef.current.getCenter();
        const currentZoom = mapRef.current.getZoom();
        if (Math.abs(currentCenter.lat - location.lat) > 0.00001 || Math.abs(currentCenter.lng - location.lng) > 0.00001) {
             isProgrammaticMove.current = true;
             const targetZoom = Math.max(currentZoom, 15);
             mapRef.current.setView([location.lat, location.lng], targetZoom);
             setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, 100);
        }
     }
  }, [location.lat, location.lng]);

  useEffect(() => {
    const timer = setTimeout(async () => {
        if (location.address && location.address.length > 3 && !isInternalUpdate.current) {
             try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}&limit=1&accept-language=en`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const { lat, lon } = data[0];
                        setLocation(prev => ({ ...prev, lat: parseFloat(lat), lng: parseFloat(lon), captured: true }));
                    }
                }
             } catch(err) {}
        }
        isInternalUpdate.current = false;
    }, 1500);
    return () => clearTimeout(timer);
  }, [location.address]);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      setIsLocating(false);
      return;
    }
    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        isProgrammaticMove.current = true;
        isInternalUpdate.current = true;

        if (mapRef.current) {
            const L = (window as any).L;
            
            // SAFE LAYER REMOVAL
            if (accuracyCircleRef.current) {
                if (mapRef.current.hasLayer(accuracyCircleRef.current)) {
                    mapRef.current.removeLayer(accuracyCircleRef.current);
                }
                accuracyCircleRef.current = null;
            }

            if (L) {
                 accuracyCircleRef.current = L.circle([latitude, longitude], {
                    radius: accuracy, color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.15, weight: 1, dashArray: '5, 5' 
                }).addTo(mapRef.current);
            }
            
            if (accuracy > 100 && accuracyCircleRef.current) {
                try {
                    mapRef.current.fitBounds(accuracyCircleRef.current.getBounds(), { padding: [50, 50], maxZoom: 18, animate: false });
                } catch (e) {
                    // Fallback if bounds are invalid
                    mapRef.current.setView([latitude, longitude], 18, { animate: false });
                }
            } else {
                mapRef.current.setView([latitude, longitude], 18, { animate: false });
            }
        }
        setLocation(prev => ({ ...prev, lat: latitude, lng: longitude, captured: true }));

        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`);
          if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                  const addr = data.address;
                  const formattedAddress = [
                      addr.village || addr.town || addr.city || addr.hamlet, addr.county, addr.state, addr.postcode
                  ].filter(Boolean).join(', ');
                  isInternalUpdate.current = true;
                  setLocation(prev => ({ ...prev, address: formattedAddress || data.display_name }));
              }
          }
        } catch (error) {} finally { setIsLocating(false); }
      },
      (error) => { setIsLocating(false); }, options
    );
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    isInternalUpdate.current = false;
    setLocation(prev => ({ ...prev, address: newVal }));
  };

  const handleIncrementSize = () => {
      const current = parseFloat(farmSize) || 0;
      setFarmSize((current + 0.5).toString());
  };

  const handleDecrementSize = () => {
      const current = parseFloat(farmSize) || 0;
      setFarmSize(Math.max(0, current - 0.5).toString());
  };

  const addCropRow = () => {
    setCrops([...crops, { 
        id: Date.now().toString(), name: '', season: 'Kharif', year: new Date().getFullYear().toString(),
        area: '', areaUnit: sizeUnit, yieldAmount: '', yieldUnit: 'Quintals', chemicals: ''
    }]);
  };

  const removeCropRow = (id: string) => {
    setCrops(crops.filter(c => c.id !== id));
  };

  const updateCrop = (id: string, field: keyof CropHistory, value: string) => {
    setCrops(crops.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      const farmDetails: FarmDetails = {
        location: { address: location.address, lat: location.lat, lng: location.lng },
        size: farmSize,
        unit: sizeUnit,
        soilType: soilType,
        irrigation: irrigation,
        crops: crops.filter(c => c.name.trim() !== '')
      };
      try {
        let city = user.location.city;
        if (location.address) { city = location.address.split(',')[0].trim(); }
        const updates: any = { 
            farmDetails, location: { ...user.location, lat: location.lat, lng: location.lng, city: city }
        };
        const updatedUser = authService.updateUser(user.phone, updates);
        onComplete(updatedUser);
      } catch (error) { setIsSubmitting(false); }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="relative bg-white dark:bg-stone-800 w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[95vh] rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header - Added rounded-t-3xl */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 p-5 md:p-6 flex-shrink-0 relative flex flex-col gap-4 z-30 rounded-t-3xl">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-3xl">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Tractor size={120} />
             </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex justify-between items-center z-50 relative">
             {onBack ? (
                 <button onClick={onBack} className="p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm">
                     <ArrowLeft size={20} />
                 </button>
             ) : (<div></div>)}

             {onClose && (
                <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition-colors backdrop-blur-sm">
                    <X size={20} />
                </button>
             )}
          </div>

          <div className="flex items-center justify-between relative z-10 gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg flex-shrink-0">
                   {isEditing ? <Edit3 size={24} className="text-white" /> : <Tractor size={24} className="text-white" />}
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-bold text-white tracking-tight leading-tight">
                      {isEditing ? "Edit Your Farm Profile" : t.completeProfile}
                  </h2>
                  <p className="text-green-100 text-xs md:text-sm font-medium opacity-90">
                      {isEditing ? "Update your details to get better insights." : "Setup your digital farm to get personalized advisory."}
                  </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Voice Assistant Button */}
                <button
                    onClick={isVoiceActive ? stopVoiceFlow : startVoiceFlow}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all backdrop-blur-md border shadow-sm active:scale-95 ${
                        isVoiceActive 
                        ? 'bg-red-500/80 text-white border-red-400/50 animate-pulse' 
                        : 'bg-white/20 text-white hover:bg-white/30 border-white/10'
                    }`}
                >
                    {isVoiceActive ? <MicOff size={16} /> : <Mic size={16} />}
                    <span className="text-xs font-bold hidden sm:inline">{isVoiceActive ? 'Stop' : 'Voice Guide'}</span>
                </button>

                {/* Language Selector */}
                {onLanguageChange && (
                    <div className="relative">
                        <button 
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white pl-2.5 pr-2 py-1.5 rounded-lg transition-colors backdrop-blur-md border border-white/10 shadow-sm active:scale-95"
                        >
                            <Globe size={14} className="opacity-90" />
                            <span className="text-xs font-bold hidden sm:inline">{languages.find(l => l.code === user.language)?.native}</span>
                            <span className="text-xs font-bold sm:hidden">{user.language.toUpperCase()}</span>
                            <ChevronDown size={12} className={`opacity-80 transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {showLangMenu && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)}></div>
                                {/* Increased z-index to 100 to ensure visibility over footer */}
                                <div className="absolute top-full right-0 mt-2 w-36 bg-white dark:bg-stone-800 rounded-xl shadow-xl border border-stone-100 dark:border-stone-700 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right z-[100]">
                                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                                        {languages.map((lang) => (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleLangSelect(lang.code)}
                                                className={`w-full text-left px-4 py-2.5 text-xs font-bold transition-colors border-b border-stone-50 dark:border-stone-700 last:border-0 flex justify-between items-center ${user.language === lang.code ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
                                            >
                                                {lang.native}
                                                {user.language === lang.code && <Check size={12} className="text-green-600 dark:text-green-400" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <div className="overflow-y-auto flex-1 p-5 md:p-8 bg-stone-50 dark:bg-stone-900
            [&::-webkit-scrollbar]:w-1.5 
            [&::-webkit-scrollbar-track]:bg-stone-100 
            [&::-webkit-scrollbar-thumb]:bg-green-600 
            [&::-webkit-scrollbar-thumb]:rounded-full relative">
            
            {/* Voice Status Overlay */}
            {isVoiceActive && (
                <div className="sticky top-0 z-50 mb-4 bg-stone-900 dark:bg-stone-950 text-white p-3 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${voiceStatus === 'listening' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                            {voiceStatus === 'speaking' && <Volume2 size={16} className="animate-bounce" />}
                            {voiceStatus === 'listening' && <Mic size={16} />}
                            {voiceStatus === 'processing' && <Loader2 size={16} className="animate-spin" />}
                            {voiceStatus === 'idle' && <MicOff size={16} />}
                         </div>
                         <div>
                             <p className="text-xs font-bold text-stone-300 uppercase tracking-wider">Voice Assistant</p>
                             <p className="text-sm font-bold">
                                 {voiceStatus === 'speaking' ? 'Speaking...' : voiceStatus === 'listening' ? 'Listening...' : 'Processing...'}
                             </p>
                         </div>
                    </div>
                    <button onClick={stopVoiceFlow} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={18} />
                    </button>
                </div>
            )}
            
            <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-6 pb-24">
            
            {/* 1. Farm Location Section */}
            <div className={`bg-white dark:bg-stone-800 p-5 rounded-2xl border shadow-sm transition-all duration-300 ${activeField === 'address' ? 'ring-2 ring-green-500 border-green-500 shadow-lg scale-[1.01]' : 'border-stone-200 dark:border-stone-700 ring-1 ring-stone-100/50 dark:ring-stone-700/50'}`}>
                <h3 className="text-base md:text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-sm font-bold border border-green-200 dark:border-green-800 shadow-sm">1</span>
                    {t.farmLocation}
                </h3>
                <div className="space-y-4">
                    <div className="relative w-full h-56 bg-stone-100 dark:bg-stone-700 rounded-xl border border-stone-200 dark:border-stone-600 overflow-hidden group shadow-inner z-0">
                        <div ref={mapContainerRef} className="w-full h-full outline-none z-0"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-[400] pointer-events-none drop-shadow-md pb-1">
                             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3" fill="white"></circle>
                            </svg>
                        </div>
                        <div className="absolute bottom-3 right-3 z-[500]">
                            <button type="button" onClick={handleLocateMe} disabled={isLocating} className="bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-4 py-2 rounded-lg text-xs font-bold shadow-md border border-stone-100 dark:border-stone-700 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all flex items-center gap-2 disabled:opacity-70">
                                {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />} {isLocating ? 'Locating...' : t.locateMe}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">{t.farmAddress}</label>
                        <div className="relative group">
                            {/* Guidance Box Popup */}
                            {activeField === 'address' && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 group-focus-within:text-green-500 transition-colors" size={18} />
                            <input 
                                type="text" 
                                value={location.address}
                                onChange={handleAddressChange}
                                onFocus={() => setActiveField('address')}
                                placeholder="Drag map above or type here..."
                                className={`w-full bg-stone-50 dark:bg-stone-700 border rounded-xl pl-10 pr-4 py-3 text-stone-800 dark:text-stone-100 font-medium text-sm focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-800 focus:border-green-500 outline-none transition-all h-[50px] ${location.captured ? 'border-green-300 dark:border-green-700 bg-green-50/20 dark:bg-green-900/20' : 'border-stone-200 dark:border-stone-600'}`}
                                required
                            />
                            {location.captured && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full p-0.5 animate-in zoom-in">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

         
            <div className={`bg-white dark:bg-stone-800 p-5 rounded-2xl border shadow-sm transition-all duration-300 ${['farmSize', 'soilType', 'irrigation'].includes(activeField || '') ? 'ring-2 ring-green-500 border-green-500 shadow-lg scale-[1.01]' : 'border-stone-200 dark:border-stone-700 ring-1 ring-stone-100/50 dark:ring-stone-700/50'}`}>
                <h3 className="text-base md:text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-sm font-bold border border-green-200 dark:border-green-800 shadow-sm">2</span>
                    {t.farmDetails}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Farm Size */}
                    <div className="md:col-span-2 relative">
                        <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">{t.farmSize}</label>
                        {/* Guidance Box Popup */}
                        {activeField === 'farmSize' && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                        <div className="flex flex-wrap gap-3">
                            <div className="flex flex-1 items-center bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl px-1 min-w-[200px]">
                                <button type="button" onClick={handleDecrementSize} className="p-3 text-stone-400 hover:text-stone-800 dark:text-stone-500 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-lg transition-colors flex-shrink-0">
                                    <Minus size={18} />
                                </button>
                                <input 
                                    type="number" 
                                    value={farmSize}
                                    onChange={(e) => setFarmSize(e.target.value)}
                                    onFocus={() => setActiveField('farmSize')}
                                    min="0" step="any" placeholder="0"
                                    className="flex-1 bg-transparent text-center text-stone-800 dark:text-stone-100 font-bold focus:outline-none h-[50px] min-w-[60px] text-lg
                                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-stone-300 dark:placeholder:text-stone-500"
                                    required
                                />
                                <button type="button" onClick={handleIncrementSize} className="p-3 text-stone-400 hover:text-green-600 dark:text-stone-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex-shrink-0">
                                    <Plus size={18} />
                                </button>
                            </div>
                            <CustomSelect 
                                value={sizeUnit}
                                onChange={setSizeUnit}
                                options={[
                                    { value: "Acres", label: "Acres" },
                                    { value: "Hectares", label: "Hectares" },
                                    { value: "Guntha", label: "Guntha" },
                                    { value: "SqFt", label: "Sq. Ft." }
                                ]}
                                className="w-full sm:w-[130px]"
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">{t.soilType}</label>
                        {/* Guidance Box Popup */}
                        {activeField === 'soilType' && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                        <CustomSelect
                            value={soilType}
                            onChange={setSoilType}
                            onFocus={() => setActiveField('soilType')}
                            icon={Layers}
                            options={[
                                { value: "Black Cotton", label: translations.soilTypes?.blackCotton || "Black Cotton (Kali)", iconColor: "text-stone-700", iconBg: "bg-stone-200", icon: Layers },
                                { value: "Alluvial", label: translations.soilTypes?.alluvial || "Alluvial (Jalodh)", iconColor: "text-amber-600", iconBg: "bg-amber-100", icon: Layers },
                                { value: "Red", label: translations.soilTypes?.red || "Red (Lal)", iconColor: "text-red-500", iconBg: "bg-red-100", icon: Layers },
                                { value: "Sandy", label: translations.soilTypes?.sandy || "Sandy (Retili)", iconColor: "text-orange-400", iconBg: "bg-orange-100", icon: Layers },
                                { value: "Loamy", label: translations.soilTypes?.loamy || "Loamy (Domat)", iconColor: "text-green-600", iconBg: "bg-green-100", icon: Layers },
                                { value: "Clay", label: translations.soilTypes?.clay || "Clay (Chikni)", iconColor: "text-stone-500", iconBg: "bg-stone-200", icon: Layers }
                            ]}
                        />
                    </div>
                    
                    <div className="relative">
                        <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Irrigation Source</label>
                        {/* Guidance Box Popup */}
                        {activeField === 'irrigation' && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                        <CustomSelect
                            value={irrigation}
                            onChange={setIrrigation}
                            onFocus={() => setActiveField('irrigation')}
                            icon={Droplets}
                            options={[
                                { value: "Rainfed", label: translations.irrigationTypes?.rainfed || "Rainfed", icon: CloudRain, iconColor: "text-blue-500", iconBg: "bg-blue-100" },
                                { value: "Borewell", label: translations.irrigationTypes?.borewell || "Borewell", icon: Disc, iconColor: "text-cyan-600", iconBg: "bg-cyan-100" },
                                { value: "Canal", label: translations.irrigationTypes?.canal || "Canal", icon: Waves, iconColor: "text-blue-600", iconBg: "bg-blue-100" },
                                { value: "Drip", label: translations.irrigationTypes?.drip || "Drip", icon: Droplets, iconColor: "text-teal-500", iconBg: "bg-teal-100" },
                                { value: "Sprinkler", label: translations.irrigationTypes?.sprinkler || "Sprinkler", icon: CloudDrizzle, iconColor: "text-sky-500", iconBg: "bg-sky-100" },
                                { value: "Well", label: translations.irrigationTypes?.well || "Well", icon: Circle, iconColor: "text-indigo-500", iconBg: "bg-indigo-100" },
                                { value: "River", label: translations.irrigationTypes?.river || "River", icon: Waves, iconColor: "text-blue-700", iconBg: "bg-blue-100" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Crop History Section - Simplified */}
            <div className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm ring-1 ring-stone-100/50 dark:ring-stone-700/50">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base md:text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center justify-center text-sm font-bold border border-green-200 dark:border-green-800 shadow-sm">3</span>
                        {t.cropHistory} 
                        <span className="text-xs font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-600 ml-1">Optional</span>
                    </h3>
                </div>
                
                <div className="space-y-4">
                    {crops.map((crop, index) => (
                        <div key={crop.id} className="relative p-4 md:p-5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50/30 dark:bg-stone-700/30 group hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50/10 dark:hover:bg-green-900/10 transition-colors animate-in slide-in-from-left-2 duration-300">
                            
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-xs font-bold text-stone-400 dark:text-stone-500 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 px-2 py-1 rounded-md shadow-sm">
                                    Crop #{index + 1}
                                </span>
                                <button type="button" onClick={() => removeCropRow(crop.id)} className="p-1.5 rounded-lg transition-colors border flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border-stone-200 dark:border-stone-600 hover:border-red-100 dark:hover:border-red-900 bg-white dark:bg-stone-800 shadow-sm">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                <div className={`relative ${activeField === `cropName-${crop.id}` ? 'z-50' : 'z-20'}`}>
                                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Crop Name</label>
                                    <div className="relative">
                                        {/* Guidance Box Popup */}
                                        {activeField === `cropName-${crop.id}` && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                                        <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" size={16} />
                                        <input 
                                            type="text" 
                                            value={crop.name}
                                            onChange={(e) => updateCrop(crop.id, 'name', e.target.value)}
                                            onFocus={() => setActiveField(`cropName-${crop.id}`)}
                                            placeholder={t.cropName}
                                            className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl pl-9 pr-3 py-3 text-stone-800 dark:text-stone-100 text-sm font-bold focus:border-green-500 outline-none focus:ring-2 focus:ring-green-500/10 dark:focus:ring-green-900/20 h-[50px]"
                                        />
                                    </div>
                                </div>
                                
                                <div className={`relative ${activeField === `season-${crop.id}` ? 'z-50' : 'z-20'}`}>
                                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Season</label>
                                    {/* Guidance Box Popup */}
                                    {activeField === `season-${crop.id}` && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                                    <CustomSelect
                                        value={crop.season}
                                        onChange={(val) => updateCrop(crop.id, 'season', val)}
                                        onFocus={() => setActiveField(`season-${crop.id}`)}
                                        options={[
                                            { value: "Kharif", label: translations.seasonTypes?.kharif || "Kharif", icon: CloudRain, iconColor: "text-blue-500", iconBg: "bg-blue-100" },
                                            { value: "Rabi", label: translations.seasonTypes?.rabi || "Rabi", icon: Snowflake, iconColor: "text-cyan-500", iconBg: "bg-cyan-100" },
                                            { value: "Zaid", label: translations.seasonTypes?.zaid || "Zaid", icon: Sun, iconColor: "text-orange-500", iconBg: "bg-orange-100" },
                                            { value: "Annual", label: translations.seasonTypes?.annual || "Annual", icon: Calendar, iconColor: "text-purple-500", iconBg: "bg-purple-100" }
                                        ]}
                                        placeholder="Season"
                                    />
                                </div>

                                <div className={`relative ${activeField === `year-${crop.id}` ? 'z-50' : 'z-20'}`}>
                                    <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Year</label>
                                    {/* Guidance Box Popup */}
                                    {activeField === `year-${crop.id}` && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                                    <CustomSelect
                                        value={crop.year}
                                        onChange={(val) => updateCrop(crop.id, 'year', val)}
                                        onFocus={() => setActiveField(`year-${crop.id}`)}
                                        icon={Calendar}
                                        options={yearOptions}
                                        placeholder="Year"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div className={`relative flex-1 ${activeField === `area-${crop.id}` ? 'z-50' : 'z-10'}`}>
                                     <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Area</label>
                                     <div className="relative flex-1">
                                        {/* Guidance Box Popup */}
                                        {activeField === `area-${crop.id}` && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                                                    <Ruler size={16} />
                                                </div>
                                                <input 
                                                    type="number"
                                                    value={crop.area}
                                                    onChange={(e) => updateCrop(crop.id, 'area', e.target.value)}
                                                    onFocus={() => setActiveField(`area-${crop.id}`)}
                                                    placeholder="Area"
                                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl pl-9 pr-2 py-3 text-stone-800 dark:text-stone-100 text-sm font-bold focus:border-green-500 outline-none focus:ring-2 focus:ring-green-500/10 dark:focus:ring-green-900/20 h-[50px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <CustomSelect 
                                                value={crop.areaUnit}
                                                onChange={(val) => updateCrop(crop.id, 'areaUnit', val)}
                                                options={[
                                                    { value: "Acres", label: "Acres" },
                                                    { value: "Hectares", label: "Hectares" },
                                                    { value: "Guntha", label: "Guntha" },
                                                    { value: "SqFt", label: "Sq. Ft." }
                                                ]}
                                                className="w-[110px]"
                                            />
                                        </div>
                                     </div>
                                </div>

                                <div className={`relative flex-1 ${activeField === `yield-${crop.id}` ? 'z-50' : 'z-10'}`}>
                                     <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Yield</label>
                                     <div className="relative flex-1">
                                        {/* Guidance Box Popup */}
                                        {activeField === `yield-${crop.id}` && <GuidanceBox guidance={currentGuidance} onClose={handleCloseGuidance} />}
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500">
                                                    <Scale size={16} />
                                                </div>
                                                <input 
                                                    type="number"
                                                    value={crop.yieldAmount}
                                                    onChange={(e) => updateCrop(crop.id, 'yieldAmount', e.target.value)}
                                                    onFocus={() => setActiveField(`yield-${crop.id}`)}
                                                    placeholder="Yield"
                                                    className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-600 rounded-xl pl-9 pr-2 py-3 text-stone-800 dark:text-stone-100 text-sm font-bold focus:border-green-500 outline-none focus:ring-2 focus:ring-green-500/10 dark:focus:ring-green-900/20 h-[50px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <CustomSelect 
                                                value={crop.yieldUnit}
                                                onChange={(val) => updateCrop(crop.id, 'yieldUnit', val)}
                                                options={[
                                                    { value: "Quintals", label: "Quintals" },
                                                    { value: "Kg", label: "Kg" },
                                                    { value: "Tons", label: "Tons" }
                                                ]}
                                                className="w-[110px]"
                                            />
                                        </div>
                                     </div>
                                </div>
                            </div>
                            
                        </div>
                    ))}

                    <button type="button" onClick={addCropRow} className="mt-2 w-full py-3 border-2 border-dashed border-stone-200 dark:border-stone-600 rounded-xl text-stone-500 dark:text-stone-400 text-sm font-bold hover:border-green-400 dark:hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all flex items-center justify-center gap-2 group h-[50px]">
                        <Plus size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" /> {t.addCrop}
                    </button>
                </div>
            </div>

            </form>
        </div>

        {/* Footer Actions - Added rounded-b-3xl */}
        <div className="p-4 md:p-6 bg-white dark:bg-stone-800 border-t border-stone-100 dark:border-stone-700 flex-shrink-0 z-50 rounded-b-3xl">
             <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold shadow-xl shadow-green-200 dark:shadow-none flex items-center justify-center gap-3 transition-all active:scale-[0.98] text-lg disabled:opacity-70 disabled:cursor-not-allowed"
             >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
                {isSubmitting ? (isEditing ? 'Updating Profile...' : 'Saving Profile...') : (isEditing ? 'Update Profile' : t.saveProfile)}
             </button>
        </div>

      </div>
    </div>
  );
};

export default FirstTimeOnboarding;
