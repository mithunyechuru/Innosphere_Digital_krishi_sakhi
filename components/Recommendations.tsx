
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, CropRecommendation, WeatherData, TimelineEvent, ActiveCropCycle, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { generateCropRecommendations } from '../services/geminiService';
import { fetchWeather } from '../services/weatherService';
import { authService } from '../services/authService';
import { Sprout, Calendar, ArrowRight, Loader2, CheckCircle, Droplets, Clock, Eye, ListChecks, PlayCircle, RefreshCw, Zap, Scissors, Trash2, Sun, CloudRain, Layers, FileCheck, AlertCircle, Lock } from 'lucide-react';

interface RecommendationsProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
}

const Recommendations: React.FC<RecommendationsProps> = ({ user, onUpdateUser }) => {
  const t = TRANSLATIONS[user.language];
  const [recommendations, setRecommendations] = useState<CropRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  
  const [selectedCrop, setSelectedCrop] = useState<CropRecommendation | ActiveCropCycle | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    const init = async () => {
        const weatherData = await fetchWeather(user.location.lat, user.location.lng);
        setWeather(weatherData);

        const cached = localStorage.getItem(`innosphere_recs_${user.phone}`);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setRecommendations(parsed);
                }
            } catch (e) {
                console.error("Failed to load cached recommendations");
                localStorage.removeItem(`innosphere_recs_${user.phone}`);
            }
        }
    };
    init();
  }, [user.location, user.phone]);

  const handleGenerate = async (force: boolean = false) => {
    if (!weather) return;
    
    if (!force && recommendations.length > 0) return;

    setLoading(true);
    const data = await generateCropRecommendations(user, weather);
    setRecommendations(data);
    
    localStorage.setItem(`innosphere_recs_${user.phone}`, JSON.stringify(data));
    setLoading(false);
  };

  const isActiveCycle = useMemo(() => {
      return selectedCrop && 'id' in selectedCrop && 'progress' in selectedCrop;
  }, [selectedCrop]);

  const dailySchedule = useMemo(() => {
    if (!selectedCrop) return [];

    const daysMap = new Map<number, TimelineEvent[]>();
    
    const timelineEvents = Array.isArray(selectedCrop.timeline) ? selectedCrop.timeline : [];

    const addEvent = (d: number, evt: TimelineEvent) => {
        if (!daysMap.has(d)) daysMap.set(d, []);
        daysMap.get(d)!.push(evt);
    };

    timelineEvents.forEach(event => {
        if (event.endDay && event.endDay > event.day) {
            for (let d = event.day; d <= event.endDay; d++) {
                addEvent(d, { ...event, day: d, endDay: undefined });
            }
        } else {
            addEvent(event.day, event);
        }
    });

    let duration = selectedCrop.durationDays;
    if (!duration) {
        const maxDay = timelineEvents.reduce((max, e) => Math.max(max, e.day || 0, e.endDay || 0), 0);
        duration = maxDay > 0 ? maxDay : 120;
    }

    const completeList: { day: number, events: TimelineEvent[] }[] = [];
    let currentStage = "Land Preparation"; 

    for (let day = 1; day <= duration; day++) {
        let events = daysMap.get(day) || [];

        const stageEvent = events.find(e => e.stage);
        if (stageEvent) currentStage = stageEvent.stage;

        if (events.length === 0) {
            // Only add placeholders if needed, currently empty days are just filler
            // We only want to show days with events in the UI for clarity?
            // Actually the design shows full list but that might be long.
            // Let's stick to generating full list but UI can filter or show gaps.
            // For now, let's just push an empty event placeholder if we want to show every day,
            // OR we can skip empty days in the UI rendering.
            // The prompt says "Daily Crop Schedule", usually implies actionable days.
            // Let's allow gaps in the `dailySchedule` list by filtering out empty days below if preferred, 
            // OR keep placeholders. The previous code added "Routine Care".
            // Let's keep it consistent.
            events.push({
                day: day,
                time: "09:00 AM", 
                stage: currentStage,
                activity: user.language === Language.HINDI ? "नियमित देखभाल" : "Routine Care", // Simple fallback
                description: user.language === Language.HINDI ? "फसल के स्वास्थ्य की निगरानी करें।" : "Monitor crop health."
            });
        } else {
            events.sort((a, b) => {
                const parseTime = (t: string) => {
                     if (!t) return 0;
                     const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
                     if (!match) return 0;
                     let h = parseInt(match[1]);
                     if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
                     if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
                     return h * 60 + parseInt(match[2]);
                };
                return parseTime(a.time) - parseTime(b.time);
            });
        }

        // Only push if it has real events OR if we want to show every single day
        // To keep the list manageable, let's show all for now as per previous logic
        completeList.push({ day, events });
    }

    // Filter to show only days with explicit events or key milestones to avoid clutter?
    // The previous implementation showed everything. Let's keep it but maybe only show days explicitly from AI + gaps filled sparsely.
    // Actually, sticking to the exact previous logic for stability.
    return completeList;
  }, [selectedCrop, user.language]);

  // Linearize events to handle sequential logic easily
  const flatEvents = useMemo(() => {
      const flat: {day: number, eventIndex: number}[] = [];
      dailySchedule.forEach(d => {
          d.events.forEach((_, idx) => {
              flat.push({ day: d.day, eventIndex: idx });
          });
      });
      return flat;
  }, [dailySchedule]);

  const handleSelectCrop = (crop: CropRecommendation | ActiveCropCycle) => {
    setSelectedCrop(crop);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedCrop(null);
  };

  const handleStartCycle = () => {
      if (!selectedCrop) return;
      
      const isAlreadyActive = user.activeCrops?.some(c => c.cropName === selectedCrop.cropName);
      if (isAlreadyActive) {
          alert("You already have an active cycle for this crop!");
          return;
      }

      const newActiveCycle: ActiveCropCycle = {
          ...selectedCrop,
          id: Date.now().toString(),
          startDate: new Date().toISOString(),
          progress: [] 
      };
      
      const updatedActiveCrops = [newActiveCycle, ...(user.activeCrops || [])];
      
      try {
          const updatedUser = authService.updateUser(user.phone, {
              activeCrops: updatedActiveCrops
          });
          onUpdateUser(updatedUser);
          
          setSelectedCrop(null);
          setViewMode('list');
          
          window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (error) {
          console.error("Failed to start cycle", error);
          alert("Failed to start cycle.");
      }
  };

  const handleDeleteCycle = (e: React.MouseEvent | null, cycleId: string) => {
      if (e) e.stopPropagation();
      
      if (window.confirm("Are you sure you want to remove this crop from your active list? This action cannot be undone.")) {
          const updatedActiveCrops = (user.activeCrops || []).filter(c => c.id !== cycleId);
          
          try {
              const updatedUser = authService.updateUser(user.phone, {
                  activeCrops: updatedActiveCrops
              });
              onUpdateUser(updatedUser);
              
              if (viewMode === 'detail' && selectedCrop && 'id' in selectedCrop && (selectedCrop as ActiveCropCycle).id === cycleId) {
                  handleBack();
              }
          } catch (error) {
              console.error("Error removing crop:", error);
              alert("Failed to remove crop.");
          }
      }
  };

  const handleToggleTask = (day: number, eventIndex: number) => {
      if (!isActiveCycle || !selectedCrop) return;
      
      const activeCycle = selectedCrop as ActiveCropCycle;
      const currentProgress = activeCycle.progress || [];
      
      // 1. Find where this task is in the chronological order
      const currentFlatIdx = flatEvents.findIndex(e => e.day === day && e.eventIndex === eventIndex);
      if (currentFlatIdx === -1) return;

      // 2. Sequential Logic Check: Ensure previous task is done
      if (currentFlatIdx > 0) {
          const prevEvent = flatEvents[currentFlatIdx - 1];
          const isPrevCompleted = currentProgress.some(p => p.day === prevEvent.day && p.eventIndex === prevEvent.eventIndex);
          if (!isPrevCompleted) {
              // Should be blocked by UI, but good for safety
              alert("Please complete the previous step first.");
              return;
          }
      }
      
      const isCurrentlyCompleted = currentProgress.some(p => p.day === day && p.eventIndex === eventIndex);
      let updatedProgress;

      if (isCurrentlyCompleted) {
          // UNCHECKING:
          // Rule: If checking is removed, ALL subsequent tasks must also be unchecked/removed.
          // Get all events from this index onwards
          const eventsToRemove = flatEvents.slice(currentFlatIdx);
          
          // Filter progress to keep only tasks that are NOT in the removal list
          updatedProgress = currentProgress.filter(p => 
              !eventsToRemove.some(rem => rem.day === p.day && rem.eventIndex === p.eventIndex)
          );
      } else {
          // CHECKING:
          // Add just this task
          updatedProgress = [...currentProgress, { day, eventIndex, completedAt: Date.now() }];
      }

      const updatedCycle = { ...activeCycle, progress: updatedProgress };
      setSelectedCrop(updatedCycle);

      if (user.activeCrops) {
          const updatedActiveCrops = user.activeCrops.map(c => c.id === activeCycle.id ? updatedCycle : c);
          const updatedUser = authService.updateUser(user.phone, { activeCrops: updatedActiveCrops });
          onUpdateUser(updatedUser);
      }
  };

  const getActivityIcon = (activity: string) => {
      const lower = activity.toLowerCase();
      if (lower.includes('water') || lower.includes('irrigate')) return <Droplets size={18} className="text-blue-500" />;
      if (lower.includes('harvest') || lower.includes('cut')) return <Scissors size={18} className="text-amber-600" />;
      if (lower.includes('fertilizer') || lower.includes('spray') || lower.includes('urea') || lower.includes('dap')) return <Zap size={18} className="text-purple-500" />;
      if (lower.includes('observation') || lower.includes('check') || lower.includes('routine')) return <Eye size={18} className="text-stone-400" />;
      if (lower.includes('plough') || lower.includes('sow') || lower.includes('seed')) return <Sprout size={18} className="text-green-600" />;
      return <Sprout size={18} className="text-green-500" />;
  };

  const activeCycleData = isActiveCycle ? (selectedCrop as ActiveCropCycle) : null;
  
  const totalTasks = dailySchedule.reduce((acc, day) => acc + day.events.length, 0);
  const completedTasks = activeCycleData?.progress?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900 pb-24 md:pb-0 relative">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                <span className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400"><Sprout size={24} /></span>
                {t.recommendations}
            </h2>
            <p className="text-stone-500 dark:text-stone-400 mt-1 ml-12 text-sm md:text-base">
                AI-powered precision farming plan based on your soil, weather, and crop history.
            </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col justify-center items-center text-center">
                 <div className={`mb-2 p-2 rounded-full ${weather?.isRainy ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                    {weather?.isRainy ? <CloudRain size={20} /> : <Sun size={20} />}
                 </div>
                 <div className="font-bold text-stone-800 dark:text-stone-100 text-lg">{weather ? `${Math.round(weather.temperature)}°C` : '--'}</div>
                 <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">{weather?.condition || 'Loading...'}</div>
            </div>

            <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col justify-center items-center text-center">
                 <div className="mb-2 p-2 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                    <Layers size={20} />
                 </div>
                 <div className="font-bold text-stone-800 dark:text-stone-100 text-lg capitalize">{user.farmDetails?.soilType || 'Unknown'}</div>
                 <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Soil Type</div>
            </div>

             <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col justify-center items-center text-center">
                 <div className={`mb-2 p-2 rounded-full ${user.soilHealthCard ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'}`}>
                    {user.soilHealthCard ? <FileCheck size={20} /> : <AlertCircle size={20} />}
                 </div>
                 <div className="font-bold text-stone-800 dark:text-stone-100 text-lg">{user.soilHealthCard ? 'Uploaded' : 'Missing'}</div>
                 <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Soil Health Card</div>
            </div>

             <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm flex flex-col justify-center items-center text-center">
                 <div className="mb-2 p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400">
                    <Droplets size={20} />
                 </div>
                 <div className="font-bold text-stone-800 dark:text-stone-100 text-lg">{weather ? `${weather.humidity}%` : '--'}</div>
                 <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Humidity</div>
            </div>
        </div>

        {viewMode === 'list' ? (
            <>
                {user.activeCrops && user.activeCrops.length > 0 && (
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
                        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                            <PlayCircle size={20} className="text-green-600 dark:text-green-400" /> My Active Crops
                        </h3>
                        <div className="space-y-4">
                            {user.activeCrops.map((activeCrop) => {
                                const total = activeCrop.durationDays || 90;
                                const done = activeCrop.progress?.length || 0; 
                                const estimatedTasks = Math.floor(total * 1.5);
                                const percent = Math.min(100, Math.round((done / estimatedTasks) * 100));

                                return (
                                    <div 
                                        key={activeCrop.id}
                                        onClick={() => handleSelectCrop(activeCrop)}
                                        className="bg-white dark:bg-stone-800 rounded-2xl p-5 border-l-4 border-l-green-500 border-y border-r border-stone-200 dark:border-stone-700 shadow-sm cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xl font-bold text-stone-800 dark:text-stone-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                                                {activeCrop.cropName}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-100 dark:border-green-800 flex items-center gap-1">
                                                    <RefreshCw size={10} className="animate-spin-slow" /> In Progress
                                                </span>
                                                <button 
                                                    onClick={(e) => handleDeleteCycle(e, activeCrop.id)}
                                                    className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors z-10"
                                                    title="Stop Tracking"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400 mb-4">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} /> Started: {new Date(activeCrop.startDate).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1 font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-lg">
                                                <Clock size={12} /> Duration: {activeCrop.durationDays || '100-120'} {t.days}
                                            </span>
                                        </div>
                                        <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-2 overflow-hidden mb-2">
                                            <div 
                                                className="bg-green-500 h-full rounded-full transition-all duration-1000" 
                                                style={{width: `${percent}%`}} 
                                            ></div>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-xs text-stone-400 font-medium">{done} tasks completed</span>
                                            <span className="text-xs font-bold text-green-600 dark:text-green-400 group-hover:underline flex items-center gap-1">
                                                View Timeline <ArrowRight size={12} />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {user.activeCrops && user.activeCrops.length > 0 && recommendations.length > 0 && (
                     <div className="h-px bg-stone-200 dark:bg-stone-700 my-8"></div>
                )}

                <div>
                     <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                             <Sprout size={20} className="text-stone-400" /> New Recommendations
                         </h3>
                         {recommendations.length > 0 && (
                            <button 
                                onClick={() => handleGenerate(true)}
                                className="text-xs font-bold text-green-700 dark:text-green-400 flex items-center gap-1 hover:bg-green-50 dark:hover:bg-green-900/30 px-2 py-1 rounded-lg transition-colors"
                            >
                                <RefreshCw size={12} /> Regenerate
                            </button>
                         )}
                     </div>

                    {recommendations.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 text-center shadow-sm">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-6 animate-pulse">
                                <Sprout size={40} />
                            </div>
                            <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">Plan Your Next Crop</h3>
                            <p className="text-stone-500 dark:text-stone-400 max-w-md mb-8">
                                Get personalized crop recommendations and a day-by-day schedule optimized for your farm's unique conditions.
                            </p>
                            <button 
                                onClick={() => handleGenerate(true)}
                                className="px-8 py-4 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-xl font-bold shadow-xl shadow-stone-200 dark:shadow-none hover:bg-stone-800 dark:hover:bg-stone-200 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <Sprout size={18} /> {t.getRecommendations}
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={48} className="text-green-600 animate-spin mb-4" />
                            <p className="text-stone-500 dark:text-stone-400 font-bold animate-pulse">{t.generatingPlan}</p>
                        </div>
                    )}

                    {recommendations.length > 0 && !loading && (
                        <div className="space-y-4">
                            {recommendations.map((crop, idx) => (
                                <div 
                                    key={idx}
                                    onClick={() => handleSelectCrop(crop)}
                                    className="bg-white dark:bg-stone-800 rounded-2xl p-5 border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-stone-50 dark:bg-stone-700 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                                    
                                    <div className="relative z-10 flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                                                    {crop.cropName}
                                                </h3>
                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">
                                                    {crop.suitabilityScore}% Match
                                                </span>
                                            </div>
                                            <p className="text-stone-500 dark:text-stone-400 text-xs line-clamp-2 max-w-md mb-3">
                                                {crop.reason}
                                            </p>
                                             <div className="flex items-center gap-4 text-xs font-bold text-stone-500 dark:text-stone-400">
                                                <span className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-800">
                                                    <Clock size={14} /> Duration: {crop.durationDays || '100-120'} {t.days}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-stone-100 dark:bg-stone-700 p-2 rounded-full text-stone-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                                            <ArrowRight size={20} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
                <button 
                    onClick={handleBack}
                    className="mb-4 text-sm font-bold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 transition-colors"
                >
                    <ArrowRight size={16} className="rotate-180" /> Back to List
                </button>

                {selectedCrop && (
                    <div className="bg-white dark:bg-stone-800 rounded-3xl overflow-hidden shadow-xl shadow-stone-200/50 dark:shadow-none border border-stone-200 dark:border-stone-700">
                        <div className="bg-stone-900 dark:bg-stone-950 text-white p-6 md:p-8 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Sprout size={140} />
                             </div>
                             <div className="relative z-10">
                                 <div className="flex items-center justify-between mb-2">
                                     <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-bold">{selectedCrop.cropName}</h2>
                                        {isActiveCycle ? (
                                            <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full border border-green-400 animate-pulse">
                                                Live Cycle
                                            </span>
                                        ) : (
                                            <span className="bg-stone-700 dark:bg-stone-800 text-white text-xs font-bold px-3 py-1 rounded-full border border-stone-600">
                                                Preview
                                            </span>
                                        )}
                                     </div>
                                     {isActiveCycle && (
                                        <button 
                                            onClick={(e) => handleDeleteCycle(e, (selectedCrop as ActiveCropCycle).id)}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-200 hover:text-red-100 border border-red-500/20 rounded-xl transition-all"
                                            title="Stop & Remove Cycle"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                     )}
                                 </div>

                                 <p className="text-stone-300 text-sm max-w-2xl leading-relaxed mb-4">
                                     {selectedCrop.reason}
                                 </p>
                                 
                                 <div className="flex items-center gap-4 text-sm font-medium text-stone-200 mb-6">
                                     <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                        <Clock size={16} /> 
                                        <span>Duration: {selectedCrop.durationDays || '100-120'} {t.days}</span>
                                     </div>
                                 </div>
                                 
                                 {isActiveCycle && (
                                     <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 max-w-md">
                                         <div className="flex justify-between items-end mb-2">
                                             <div>
                                                 <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Cycle Progress</p>
                                                 <p className="text-xl font-bold">{progressPercent}% Complete</p>
                                             </div>
                                             <div className="text-right">
                                                 <p className="text-xs font-bold text-green-400">{completedTasks} / {totalTasks} Tasks</p>
                                             </div>
                                         </div>
                                         <div className="w-full bg-black/20 rounded-full h-2">
                                             <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{width: `${progressPercent}%`}}></div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </div>

                        <div className="p-0 md:p-8 bg-stone-50/50 dark:bg-stone-900/50">
                            <div className="p-6 pb-2">
                                <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                                    <ListChecks className="text-green-600 dark:text-green-400" size={20} /> Daily Crop Schedule
                                </h3>
                                <p className="text-xs text-stone-400 mt-1">
                                    {isActiveCycle ? "Check off tasks in order to track progress. Previous steps must be completed first." : "Review the plan below. Start the cycle to track progress."}
                                </p>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {dailySchedule.map(({ day, events }) => (
                                    <div key={day} className="relative pl-6 border-l-2 border-stone-200 dark:border-stone-700 last:border-0 pb-6">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-stone-800 shadow-sm z-10"></div>
                                        
                                        <h4 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3 uppercase tracking-wider">
                                            {t.days} {day}
                                        </h4>
                                        
                                        <div className="space-y-3">
                                            {events.map((event, idx) => {
                                                const isCompleted = activeCycleData?.progress?.some(p => p.day === day && p.eventIndex === idx);
                                                
                                                // Calculate if this item is disabled (sequential logic)
                                                let isDisabled = false;
                                                if (isActiveCycle) {
                                                    // Find position in flat list
                                                    const currentFlatIdx = flatEvents.findIndex(e => e.day === day && e.eventIndex === idx);
                                                    if (currentFlatIdx > 0) {
                                                        const prevEvent = flatEvents[currentFlatIdx - 1];
                                                        const isPrevCompleted = activeCycleData?.progress?.some(p => p.day === prevEvent.day && p.eventIndex === prevEvent.eventIndex);
                                                        isDisabled = !isPrevCompleted;
                                                    }
                                                }

                                                return (
                                                    <div 
                                                        key={idx} 
                                                        onClick={() => !isDisabled && handleToggleTask(day, idx)}
                                                        className={`p-4 rounded-xl border transition-all flex gap-4 items-start group relative
                                                            ${isActiveCycle 
                                                                ? (isCompleted 
                                                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-60' 
                                                                    : (isDisabled 
                                                                        ? 'bg-stone-100 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700 opacity-50 cursor-not-allowed grayscale' 
                                                                        : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:border-green-300 hover:shadow-md cursor-pointer')) 
                                                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700'}
                                                        `}
                                                    >
                                                        {/* Locked Overlay for Disabled Items */}
                                                        {isActiveCycle && isDisabled && (
                                                            <div className="absolute top-2 right-2 text-stone-400">
                                                                <Lock size={12} />
                                                            </div>
                                                        )}

                                                        {isActiveCycle && (
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                                                                ${isCompleted 
                                                                    ? 'bg-green-500 border-green-500 text-white' 
                                                                    : (isDisabled 
                                                                        ? 'border-stone-300 dark:border-stone-600 bg-stone-200 dark:bg-stone-700' 
                                                                        : 'border-stone-300 dark:border-stone-600 group-hover:border-green-400')}
                                                            `}>
                                                                {isCompleted && <CheckCircle size={14} strokeWidth={3} />}
                                                            </div>
                                                        )}

                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {event.time && (
                                                                    <span className="text-[10px] font-bold text-stone-400 bg-stone-100 dark:bg-stone-700 px-1.5 py-0.5 rounded">
                                                                        {event.time}
                                                                    </span>
                                                                )}
                                                                <span className={`text-xs font-bold uppercase tracking-wider ${isCompleted ? 'text-stone-500 line-through' : 'text-green-700 dark:text-green-400'}`}>
                                                                    {event.stage || 'General'}
                                                                </span>
                                                            </div>
                                                            <h5 className={`font-bold text-stone-800 dark:text-stone-100 mb-1 ${isCompleted ? 'line-through text-stone-500' : ''}`}>
                                                                {event.activity}
                                                            </h5>
                                                            <p className={`text-sm text-stone-600 dark:text-stone-300 leading-relaxed ${isCompleted ? 'line-through text-stone-400' : ''}`}>
                                                                {event.description}
                                                            </p>
                                                        </div>

                                                        {!isActiveCycle && (
                                                            <div className="p-2 bg-stone-50 dark:bg-stone-700 rounded-lg text-stone-400 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                                {getActivityIcon(event.activity)}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!isActiveCycle && (
                            <div className="p-4 md:p-6 bg-white dark:bg-stone-800 border-t border-stone-100 dark:border-stone-700 flex justify-between items-center sticky bottom-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                                <div>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider mb-1">Ready to start?</p>
                                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Add to your active crops</p>
                                </div>
                                <button 
                                    onClick={handleStartCycle}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all flex items-center gap-2 active:scale-95"
                                >
                                    <PlayCircle size={20} /> Start This Crop Cycle
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default Recommendations;
