
import React, { useEffect, useState, useRef } from 'react';
import { Language, UserProfile, CropPrice } from '../types';
import { TRANSLATIONS, MOCK_CROPS } from '../constants';
import { ShoppingCart, TrendingUp, TrendingDown, Minus, MapPin, Calendar, Filter, Loader2, RefreshCw, ChevronDown, Check, Search, Mic, MicOff, X, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchMandiPrices, detectStateFromAddress } from '../services/mandiService';

interface MandiConnectProps {
  language: Language;
  user: UserProfile;
  onLogout: () => void;
  onProfileClick: () => void;
}

// Custom Select Component for Clean Look
interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, placeholder }) => {
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

    return (
        <div className="relative" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between min-w-[160px] px-4 py-2.5 bg-white dark:bg-stone-800 border transition-all cursor-pointer rounded-xl shadow-sm
                    ${isOpen ? 'border-green-500 ring-2 ring-green-500/20' : 'border-stone-200 dark:border-stone-700 hover:border-green-400 dark:hover:border-green-600'}
                `}
            >
                <span className={`text-sm font-bold truncate ${!value ? 'text-stone-400' : 'text-stone-700 dark:text-stone-200'}`}>
                    {value || placeholder}
                </span>
                <ChevronDown size={16} className={`ml-2 text-stone-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-green-600' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 origin-top-left">
                    <div className="p-1.5 space-y-0.5">
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-between transition-colors
                                    ${value === option ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 hover:text-stone-900 dark:hover:text-stone-100'}
                                `}
                            >
                                {option}
                                {value === option && <Check size={14} className="text-green-600 dark:text-green-400" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const INDIAN_STATES = [
    "All India",
    "Andhra Pradesh", "Telangana", "Maharashtra", "Karnataka", "Tamil Nadu", "Madhya Pradesh", 
    "Uttar Pradesh", "Gujarat", "Punjab", "Haryana", "Rajasthan", "Bihar", "West Bengal", "Odisha", "Kerala"
].sort();

const MandiConnect: React.FC<MandiConnectProps> = ({ language, user, onLogout, onProfileClick }) => {
  const t = TRANSLATIONS[language];
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>('All India');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Search & Voice State
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  // Selected Crop for Highlight View
  const [selectedCrop, setSelectedCrop] = useState<CropPrice | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  // Generate chart history for the last 7 days ending today
  const generateChartData = (currentPrice: number) => {
      const data = [];
      const today = new Date();
      
      // Generate last 7 days
      for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(today.getDate() - i);
          
          // Randomize price slightly for history
          const variance = (Math.random() * 0.1) - 0.05; // +/- 5%
          let price = Math.round(currentPrice * (1 + variance));
          
          if (i === 0) price = currentPrice;

          data.push({
              day: d.toLocaleDateString('en-US', { weekday: 'short' }),
              date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              price: price
          });
      }
      return data;
  };

  useEffect(() => {
    if (selectedCrop) {
        setChartData(generateChartData(selectedCrop.price));
    }
  }, [selectedCrop]);

  useEffect(() => {
    const address = user.farmDetails?.location.address || user.location.city || "";
    const detected = detectStateFromAddress(address);
    if (detected) {
        setSelectedState(detected);
    } else {
        setSelectedState("All India");
    }
  }, [user]);

  useEffect(() => {
    loadPrices(selectedState);
  }, [selectedState]);

  const loadPrices = async (state: string) => {
    setLoading(true);
    const queryState = state === "All India" ? "" : state;
    
    const data = await fetchMandiPrices(queryState);
    
    if (data.length > 0) {
        setPrices(data);
        setSelectedCrop(data[0]); 
    } else {
        setPrices(MOCK_CROPS); 
        setSelectedCrop(MOCK_CROPS[0]);
    }
    setLoading(false);
    setLastUpdated(new Date());
  };

  const handleMicClick = () => {
    if (isListening) {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        return;
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.lang = 'en-US'; 
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript.replace(/\.$/, '')); 
      };
      
      try {
        recognition.start();
      } catch (e) {
        console.error("Mic error", e);
      }
    } else {
      alert("Voice search not supported in this browser.");
    }
  };

  const clearSearch = () => {
      setSearchQuery('');
  };

  // Filter and Sort Prices
  const filteredPrices = prices
    .filter(item => item.crop.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    .sort((a, b) => b.price - a.price);

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900 pb-24 md:pb-0">
        <div className="w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div className="w-full xl:w-auto">
                    <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                        <span className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400"><ShoppingCart size={24} /></span>
                        {t.market}
                    </h2>
                    <p className="text-stone-500 dark:text-stone-400 mt-1 ml-12">Real-time prices from APMC mandis (data.gov.in).</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 z-20 w-full xl:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full sm:flex-1 min-w-[200px]">
                        <div className="flex items-center bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
                            <Search size={18} className="text-stone-400" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search crop..."
                                className="bg-transparent border-none outline-none text-sm font-bold text-stone-700 dark:text-stone-200 placeholder-stone-400 ml-2 w-full"
                            />
                            {searchQuery && (
                                <button onClick={clearSearch} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full text-stone-400 mr-1">
                                    <X size={14} />
                                </button>
                            )}
                            <div className="w-px h-5 bg-stone-200 dark:bg-stone-700 mx-1"></div>
                            <button 
                                onClick={handleMicClick}
                                className={`p-1.5 rounded-lg transition-colors ${isListening ? 'bg-red-50 text-red-500 animate-pulse' : 'hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-400 hover:text-green-600'}`}
                            >
                                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Custom State Selector */}
                        <div className="flex-1 sm:flex-none">
                            <CustomSelect 
                                value={selectedState} 
                                onChange={setSelectedState} 
                                options={INDIAN_STATES} 
                                placeholder="Select State" 
                            />
                        </div>

                        <button 
                            onClick={() => loadPrices(selectedState)}
                            className="p-2.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-500 dark:text-stone-400 hover:text-green-600 dark:hover:text-green-400 hover:border-green-300 dark:hover:border-green-600 transition-all shadow-sm"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Highlight Chart (Dynamic) */}
            {selectedCrop && (
                <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 mb-8 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 text-stone-900 dark:text-stone-100">
                        <TrendingUp size={120} />
                    </div>
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="md:w-1/3 z-10 flex flex-col justify-center">
                            <h3 className="font-bold text-stone-800 dark:text-stone-100 text-2xl mb-1">{selectedCrop.crop}</h3>
                            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-sm mb-6">
                                <MapPin size={14} /> {selectedCrop.market}
                            </div>
                            
                            <div className="mb-6">
                                <span className="text-5xl font-bold text-stone-900 dark:text-stone-50">₹{selectedCrop.price}</span>
                                <span className="text-lg text-stone-400 font-medium ml-1">/ Qt</span>
                            </div>

                            {selectedCrop.minPrice && selectedCrop.maxPrice && (
                                <div className="flex items-center gap-4 mb-4 text-sm text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-700/50 w-fit px-4 py-2 rounded-xl border border-stone-100 dark:border-stone-700">
                                    <div>
                                        <span className="block text-[10px] font-bold text-stone-400 uppercase">Min Price</span>
                                        <span className="font-bold">₹{selectedCrop.minPrice}</span>
                                    </div>
                                    <div className="w-px h-6 bg-stone-200 dark:bg-stone-600"></div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-stone-400 uppercase">Max Price</span>
                                        <span className="font-bold">₹{selectedCrop.maxPrice}</span>
                                    </div>
                                </div>
                            )}

                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold w-fit ${selectedCrop.trend === 'up' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : selectedCrop.trend === 'down' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300'}`}>
                                {selectedCrop.trend === 'up' ? <TrendingUp size={16} /> : selectedCrop.trend === 'down' ? <TrendingDown size={16} /> : <Minus size={16} />}
                                {selectedCrop.trend === 'up' ? '+1.2% this week' : selectedCrop.trend === 'down' ? '-0.8% this week' : 'Stable'}
                            </div>
                        </div>
                        
                        <div className="md:w-2/3 h-64 w-full z-10 bg-stone-50 dark:bg-stone-700/30 rounded-2xl p-2 border border-stone-100 dark:border-stone-700">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#a8a29e', fontSize: 12}} dy={10} />
                                    <Tooltip 
                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#000'}}
                                    itemStyle={{color: '#15803d', fontWeight: 'bold'}}
                                    formatter={(value: any) => [`₹${value}`, 'Price']}
                                    labelFormatter={(label) => {
                                        const item = chartData.find(d => d.day === label);
                                        return item ? `${label}, ${item.date}` : label;
                                    }}
                                    />
                                    <Area type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" animationDuration={1000} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                    Live Market Rates 
                    <span className="text-xs font-normal text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-full border border-stone-200 dark:border-stone-700 hidden sm:inline-block">
                        Updated: {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </h3>
                {searchQuery && (
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                        {filteredPrices.length} results found
                    </span>
                )}
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-stone-200 dark:border-stone-700 h-32 flex items-center justify-center">
                            <Loader2 className="animate-spin text-green-600 dark:text-green-400" />
                        </div>
                    ))}
                </div>
            ) : filteredPrices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {filteredPrices.map((item, index) => (
                        <div 
                            key={index} 
                            onClick={() => {
                                setSelectedCrop(item);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`bg-white dark:bg-stone-800 rounded-2xl p-5 shadow-sm border cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-full
                                ${selectedCrop?.crop === item.crop ? 'border-green-500 ring-2 ring-green-500/10' : 'border-stone-200 dark:border-stone-700 hover:border-green-300 dark:hover:border-green-600'}
                            `}
                        >
                            {selectedCrop?.crop === item.crop && (
                                <div className="absolute top-0 right-0 bg-green-500 text-white p-1 rounded-bl-xl shadow-sm">
                                    <Check size={12} strokeWidth={3} />
                                </div>
                            )}
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-lg text-stone-800 dark:text-stone-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors truncate w-full max-w-[140px]" title={item.crop}>{item.crop}</h4>
                                    <div className="flex items-center gap-1 text-xs text-stone-400 mt-1 font-medium truncate w-full max-w-[160px]">
                                        <MapPin size={12} /> {item.market}
                                    </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    item.trend === 'up' ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : item.trend === 'down' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                                }`}>
                                    {item.trend === 'up' && <TrendingUp size={16} />}
                                    {item.trend === 'down' && <TrendingDown size={16} />}
                                    {item.trend === 'stable' && <Minus size={16} />}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-stone-50 dark:border-stone-700 flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-0.5">Modal Price</p>
                                    <div className="text-xl font-bold text-stone-900 dark:text-stone-50">₹{item.price}</div>
                                    {item.minPrice && item.maxPrice && (
                                        <p className="text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-1 bg-stone-50 dark:bg-stone-700/50 px-2 py-0.5 rounded">
                                            Min: ₹{item.minPrice} - Max: ₹{item.maxPrice}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                                    <Calendar size={12} /> Today
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-stone-800 rounded-3xl border border-dashed border-stone-200 dark:border-stone-700">
                    <div className="w-16 h-16 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center text-stone-400 mb-4">
                        <Search size={28} />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">No data found</h3>
                    <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
                        We couldn't find any prices for "{searchQuery}" in {selectedState}.
                    </p>
                    <button onClick={clearSearch} className="mt-4 px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 text-sm font-bold rounded-lg transition-colors">
                        Clear Search
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default MandiConnect;
