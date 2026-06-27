
import React, { useEffect, useState, useRef } from 'react';
import { Language, UserProfile, WeatherData, AppNotification, CropPrice, ViewState, ActiveCropCycle, TimelineEvent } from '../types';
import { TRANSLATIONS, SOIL_DATA, MOCK_CROPS } from '../constants';
import { fetchWeather } from '../services/weatherService';
import { fetchMandiPrices, detectStateFromAddress } from '../services/mandiService';
import { CloudRain, Sun, Droplets, Bug, AlertTriangle, CheckCircle, Wind, Calendar, Bell, X, TrendingUp, TrendingDown, Minus, ArrowRight, Activity, Sprout, Clock, AlertCircle, Moon, HelpCircle } from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  language: Language;
  onProfileClick: () => void;
  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  setView: (view: ViewState) => void;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  onStartTour?: () => void;
}

const StatusCard = ({ title, status, icon: Icon, value, subValue, t }: any) => {
    let bgClass = "bg-white dark:bg-stone-800";
    let iconBgClass = "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    let statusTextClass = "text-green-700 dark:text-green-400";
    let statusText = t.safe;
    let StatusIcon = CheckCircle;

    if (status === 'warning') {
      iconBgClass = "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
      statusTextClass = "text-amber-700 dark:text-amber-400";
      statusText = t.alert;
      StatusIcon = AlertTriangle;
    } else if (status === 'alert') {
      iconBgClass = "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400";
      statusTextClass = "text-red-700 dark:text-red-400";
      statusText = t.actionRequired;
      StatusIcon = AlertTriangle;
    }

    return (
      <div className={`${bgClass} p-5 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-all duration-300 group relative overflow-hidden`}>
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-xl ${iconBgClass} transition-colors`}>
             <Icon size={22} strokeWidth={2.5} />
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${status === 'good' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : status === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
            <StatusIcon size={12} />
            <span>{statusText}</span>
          </div>
        </div>
        <h3 className="text-stone-500 dark:text-stone-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-xl font-bold text-stone-800 dark:text-stone-100">{value}</p>
        {subValue && <p className="text-xs text-stone-400 mt-1 font-medium">{subValue}</p>}
      </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ user, language, onProfileClick, notifications, addNotification, setView, onLogout, onUpdateUser, isDarkMode, toggleTheme, onStartTour }) => {
  const t = TRANSLATIONS[language];
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecastView, setForecastView] = useState<'hourly' | 'daily'>('hourly');
  
  const [showNotifications, setShowNotifications] = useState(false);
  const hasSentWeatherNotification = useRef(false);

  const [marketPrices, setMarketPrices] = useState<CropPrice[]>([]);
  const [itemsToShow, setItemsToShow] = useState(3);

  useEffect(() => {
    const calculateItemsToShow = () => {
        const width = window.innerWidth;
        if (width >= 1536) setItemsToShow(5);
        else if (width >= 1280) setItemsToShow(4);
        else if (width >= 1024) setItemsToShow(3);
        else if (width >= 768) setItemsToShow(2);
        else setItemsToShow(1);
    };

    calculateItemsToShow();
    window.addEventListener('resize', calculateItemsToShow);
    return () => window.removeEventListener('resize', calculateItemsToShow);
  }, []);

  useEffect(() => {
    fetchWeather(user.location.lat, user.location.lng).then(setWeather);

    const getMarketData = async () => {
        const address = user.farmDetails?.location.address || user.location.city || "";
        const state = detectStateFromAddress(address); 
        const prices = await fetchMandiPrices(state || "");
        
        if (prices.length > 0) {
            setMarketPrices(prices); 
        } else {
            setMarketPrices(MOCK_CROPS);
        }
    };
    getMarketData();
  }, [user.location]);
  
  useEffect(() => {
    if (weather && weather.daily && weather.daily.length > 0 && !hasSentWeatherNotification.current) {
        const todayForecast = weather.daily[0];
        hasSentWeatherNotification.current = true;

        const weatherNotification: AppNotification = {
            id: 'daily-weather-report',
            title: "Morning Weather Report",
            time: "Today, 05:00 AM",
            isUnread: true,
            content: (
                <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${weather.isRainy ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                            {weather.isRainy ? <CloudRain size={28} /> : <Sun size={28} />}
                        </div>
                        <div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-stone-800">{Math.round(todayForecast.maxTemp)}°</span>
                                <span className="text-lg text-stone-400 font-bold mb-1">/ {Math.round(todayForecast.minTemp)}°</span>
                            </div>
                            <p className="text-sm font-medium text-stone-500">{todayForecast.condition}</p>
                        </div>
                    </div>
                    <div className="text-xs text-stone-400 text-center pt-1 italic">
                        "Good morning! Plan your farm activities accordingly."
                    </div>
                </div>
            )
        };
        addNotification(weatherNotification);
    }
  }, [weather, addNotification]);

  const soilStatus = user.soilHealthCard ? 'good' : 'alert';
  const pestStatus = weather?.humidity && weather.humidity > 80 ? 'warning' : 'good';
  const weatherStatus = weather?.isRainy ? 'warning' : 'good';

  const activeCrops = user.activeCrops || [];
  const hasSoilCard = !!user.soilHealthCard;
  const showLiveMonitoring = hasSoilCard && activeCrops.length > 0;

  const getCropStatus = (crop: ActiveCropCycle) => {
      const startDate = new Date(crop.startDate);
      const today = new Date();
      const diffTime = today.getTime() - startDate.getTime();
      const dayNumber = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      const totalDays = crop.durationDays || 120;
      const progress = Math.min(100, Math.round((dayNumber / totalDays) * 100));
      
      let currentStage = "Germination"; 
      const sortedEvents = [...(crop.timeline || [])].sort((a, b) => a.day - b.day);
      
      for (const event of sortedEvents) {
          if (event.day <= dayNumber && event.stage) {
              currentStage = event.stage;
          }
      }
      
      const nextTask = sortedEvents.find(e => e.day >= dayNumber);
      
      return { dayNumber, totalDays, progress, currentStage, nextTask };
  };

  const getComplianceStatus = (crop: ActiveCropCycle, currentDay: number) => {
      const daysMap = new Map<number, number>();
      
      (crop.timeline || []).forEach(event => {
          const start = event.day;
          const end = event.endDay || event.day;
          for (let d = start; d <= end; d++) {
              daysMap.set(d, (daysMap.get(d) || 0) + 1);
          }
      });

      for (let d = 1; d <= currentDay; d++) {
          const expectedCount = daysMap.get(d) || 0;
          if (expectedCount === 0) continue;
          const completedForDay = (crop.progress || []).filter(p => p.day === d).length;
          if (completedForDay < expectedCount) return 'red';
      }
      return 'green';
  };

  return (
    <div className="h-full overflow-y-auto bg-stone-50/50 dark:bg-stone-900 pb-24 md:pb-0 relative">
      <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-40 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-stone-800 dark:text-stone-100">{t.dashboard}</h1>
                <p className="text-stone-500 dark:text-stone-400 text-xs md:text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
             
             <div className="flex items-center gap-3">
                 <button onClick={() => setView('profile')} className="md:hidden w-9 h-9 rounded-full overflow-hidden border border-stone-200 dark:border-stone-600 shadow-sm active:scale-95 transition-transform">
                    <img src={`https://ui-avatars.com/api/?name=${user.name}&background=166534&color=fff`} alt="Profile" className="w-full h-full object-cover" />
                 </button>

                 {onStartTour && (
                    <button onClick={onStartTour} className="p-2.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-all" title="Take a Tour">
                        <HelpCircle size={22} />
                    </button>
                 )}

                 {toggleTheme && (
                    <button onClick={toggleTheme} className={`p-2.5 rounded-full transition-all duration-200 ${isDarkMode ? 'bg-stone-700 text-yellow-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                        {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
                    </button>
                 )}

                 <div className="relative">
                    <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2.5 rounded-full transition-all duration-200 relative ${showNotifications ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400'}`}>
                        <Bell size={22} />
                        {notifications.length > 0 && <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-white dark:border-stone-800 rounded-full"></span>}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                            <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                <div className="p-4 border-b border-stone-100 dark:border-stone-700 flex justify-between items-center bg-stone-50/50 dark:bg-stone-700/30">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-stone-800 dark:text-stone-100">Notifications</h3>
                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">{notifications.length} New</span>
                                    </div>
                                    <button onClick={() => setShowNotifications(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length > 0 ? (
                                        notifications.map((notif) => (
                                            <div key={notif.id} className="p-4 border-b border-stone-50 dark:border-stone-700 hover:bg-stone-50/50 dark:hover:bg-stone-700/50 transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-[10px] text-stone-400 font-medium bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full">{notif.time}</span>
                                                </div>
                                                <div className="text-stone-600 dark:text-stone-400">{notif.content}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-stone-400 flex flex-col items-center gap-2">
                                            <Bell size={24} className="opacity-20" />
                                            <span className="text-sm">No new notifications</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                 </div>
             </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">{t.welcome}, {user.name}!</h2>
            <p className="text-stone-500 dark:text-stone-400">Here's what's happening on your farm today.</p>
        </div>

        {showLiveMonitoring && (
            <div className="mb-4 animate-in slide-in-from-top-5 duration-500">
                <div className="flex items-center gap-2 mb-4">
                     <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                        <Activity size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">Live Crop Monitoring</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCrops.map((crop) => {
                        const status = getCropStatus(crop);
                        const compliance = getComplianceStatus(crop, status.dayNumber);
                        
                        return (
                            <div key={crop.id} className="bg-white dark:bg-stone-800 rounded-3xl p-6 border border-green-200 dark:border-green-800/50 shadow-sm relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 dark:bg-green-900/20 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                                 <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-xl font-bold text-stone-800 dark:text-stone-100">{crop.cropName}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                 <p className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                                    <Sprout size={14} /> {status.currentStage}
                                                 </p>
                                                 <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${compliance === 'green' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'}`}>
                                                     {compliance === 'green' ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
                                                     {compliance === 'green' ? 'On Track' : 'Attention'}
                                                 </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-bold text-stone-800 dark:text-stone-100">Day {status.dayNumber}</span>
                                            <span className="text-xs text-stone-400 block font-medium">of {status.totalDays}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full bg-stone-100 dark:bg-stone-700 rounded-full h-2.5 mb-5 overflow-hidden">
                                        <div className="bg-green-500 h-full rounded-full transition-all duration-1000 relative" style={{width: `${status.progress}%`}}>
                                             <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                        </div>
                                    </div>

                                    <div className="bg-stone-50 dark:bg-stone-700/50 rounded-xl p-3 border border-stone-100 dark:border-stone-700 flex gap-3 items-center">
                                        <div className={`p-2 rounded-full flex-shrink-0 ${status.nextTask ? 'bg-white dark:bg-stone-600 text-green-600 dark:text-green-400 shadow-sm' : 'bg-stone-200 dark:bg-stone-600 text-stone-400'}`}>
                                            <Clock size={18} />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider truncate">
                                                {status.nextTask?.day === status.dayNumber ? "Today's Task" : "Next Task"}
                                            </p>
                                            <p className="text-sm font-bold text-stone-700 dark:text-stone-200 truncate">
                                                {status.nextTask ? status.nextTask.activity : "No upcoming tasks"}
                                            </p>
                                        </div>
                                    </div>
                                    
                                     <button onClick={() => setView('recommendations')} className="mt-4 w-full py-2.5 text-xs font-bold text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl border border-transparent hover:border-green-100 dark:hover:border-green-800 transition-colors flex items-center justify-center gap-1">
                                        View Detailed Timeline <ArrowRight size={14} />
                                     </button>
                                 </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        <div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">
                Farm Health
                <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700"></span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatusCard title={t.weather} status={weatherStatus} icon={weather?.isRainy ? CloudRain : Sun} value={weather ? `${weather.temperature}°C` : "--"} subValue={weather ? `${weather.condition}` : "Loading..."} t={t} />
                <StatusCard title={t.soilHealth} status={soilStatus} icon={Droplets} value={user.soilHealthCard ? `pH: ${SOIL_DATA.pH}` : "No Report"} subValue={user.soilHealthCard ? "Analysis Ready" : "Upload Card"} t={t} />
                <StatusCard title={t.pestRisk} status={pestStatus} icon={Bug} value={weather ? `Humidity: ${weather.humidity}%` : "--"} subValue={pestStatus === 'good' ? "Low Risk" : "High Risk"} t={t} />
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800 shadow-sm" title="Earn points by using organic fertilizers and saving water">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-xl bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-400 shadow-sm">
                            <Droplets size={22} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">Gold Tier</span>
                    </div>
                    <h3 className="text-blue-900/60 dark:text-blue-200/60 text-sm font-bold mb-1">{t.sustainability}</h3>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">750</span>
                        <span className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1.5">/ 1000 pts</span>
                    </div>
                    <div className="w-full bg-white dark:bg-stone-700 rounded-full h-2 overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{width: '75%'}}></div>
                    </div>
                </div>
            </div>
        </div>

        {weather && (weather.hourly?.length > 0 || weather.daily?.length > 0) && (
            <div className="bg-white dark:bg-stone-800 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-100 dark:border-stone-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">Weather Forecast</h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{forecastView === 'hourly' ? "Next 24 Hours" : "Next 7 Days"} • {user.location.city}</p>
                     </div>
                     <div className="bg-stone-100 dark:bg-stone-700 p-1 rounded-xl flex">
                        <button onClick={() => setForecastView('hourly')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${forecastView === 'hourly' ? 'bg-white dark:bg-stone-600 text-green-700 dark:text-green-400 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}>24 Hours</button>
                        <button onClick={() => setForecastView('daily')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${forecastView === 'daily' ? 'bg-white dark:bg-stone-600 text-green-700 dark:text-green-400 shadow-sm' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}>7 Days</button>
                     </div>
                </div>
                
                <div className="p-6 bg-stone-50/30 dark:bg-stone-900/30">
                    {forecastView === 'hourly' ? (
                        <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar snap-x">
                            {weather.hourly.map((hour, idx) => (
                                <div key={idx} className="min-w-[120px] snap-start bg-white dark:bg-stone-700/50 p-4 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm flex flex-col items-center justify-center gap-2 group hover:border-green-200 dark:hover:border-green-800 transition-colors">
                                    <span className="text-xs font-bold text-stone-400">{new Date(hour.time).toLocaleTimeString([], { hour: 'numeric', hour12: true })}</span>
                                    <div className="text-2xl font-bold text-stone-800 dark:text-stone-100">{Math.round(hour.temperature)}°</div>
                                    <div className="flex flex-col items-center gap-1">
                                         <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full"><CloudRain size={10} /> {hour.precipitationProbability}%</div>
                                         <div className="flex items-center gap-1 text-[10px] font-medium text-stone-400"><Wind size={10} /> {hour.windSpeed} km/h</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {weather.daily.map((day, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white dark:bg-stone-700/50 p-4 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-stone-50 dark:bg-stone-600 flex items-center justify-center text-stone-500 dark:text-stone-300">{day.precipitationProbability > 50 ? <CloudRain size={24} className="text-blue-500" /> : <Sun size={24} className="text-amber-500" />}</div>
                                        <div>
                                            <p className="font-bold text-stone-800 dark:text-stone-100">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}</p>
                                            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{day.condition}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                         <div className="text-right">
                                            <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full mb-1"><CloudRain size={12} /> {day.precipitationProbability}%</div>
                                         </div>
                                         <div className="text-right min-w-[60px]">
                                            <span className="text-lg font-bold text-stone-800 dark:text-stone-100">{Math.round(day.maxTemp)}°</span>
                                            <span className="text-sm text-stone-400 ml-1">/ {Math.round(day.minTemp)}°</span>
                                         </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
        
        <div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 flex items-center gap-2">{t.market}<span className="h-px flex-1 bg-stone-200 dark:bg-stone-700"></span></h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                 {marketPrices.slice(0, itemsToShow).map((item, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-sm hover:border-green-300 dark:hover:border-green-700 transition-all flex flex-col justify-between h-full group">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{item.market.split(',')[0]}</p>
                                <div className={`flex items-center ${item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-500' : 'text-stone-400'}`}>
                                    {item.trend === 'up' && <TrendingUp size={14} />}
                                    {item.trend === 'down' && <TrendingDown size={14} />}
                                    {item.trend === 'stable' && <Minus size={14} />}
                                </div>
                            </div>
                            <h4 className="font-bold text-stone-800 dark:text-stone-100 mb-1 line-clamp-1" title={item.crop}>{item.crop}</h4>
                            <p className="text-xl font-bold text-stone-900 dark:text-stone-50">₹{item.price}</p>
                        </div>
                        <div className="mt-3 pt-3 border-t border-stone-50 dark:border-stone-700 flex items-center justify-between text-xs text-stone-400">
                             <span className="flex items-center gap-1"><Calendar size={12} /> Today</span>
                             <span className="font-medium text-stone-500 dark:text-stone-400">/ Qt</span>
                        </div>
                    </div>
                 ))}
                 
                 <div onClick={() => setView('mandi')} className="bg-white dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-stone-200 dark:border-stone-700 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-green-500 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group h-full min-h-[140px]">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 mb-3 group-hover:scale-110 transition-transform shadow-sm"><ArrowRight size={24} /></div>
                    <span className="font-bold text-stone-600 dark:text-stone-300 group-hover:text-green-700 dark:group-hover:text-green-400 text-sm">View All Rates</span>
                    <span className="text-xs text-stone-400 mt-1">See full list</span>
                 </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
