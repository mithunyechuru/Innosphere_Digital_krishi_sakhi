
import React, { useState, useRef, useEffect } from 'react';
import { AppNotification, Language, UserProfile, Appointment, PestReport } from '../types';
import { TRANSLATIONS } from '../constants';
import { analyzePlantImage } from '../services/geminiService';
import { authService } from '../services/authService';
import { Camera, Upload, RefreshCw, AlertTriangle, FileText, ChevronRight, Image as ImageIcon, Sprout, Search, Stethoscope, Calendar, Clock, X, Check, LogOut, Video, Trash2, Edit, Save, FileCheck, Volume2, StopCircle, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface PestDoctorProps {
  language: Language;
  addNotification: (notification: AppNotification) => void;
  user: UserProfile;
  onLogout: () => void;
  onProfileClick: () => void;
  onUpdateUser: (user: UserProfile) => void;
}

const PestDoctor: React.FC<PestDoctorProps> = ({ language, addNotification, user, onLogout, onProfileClick, onUpdateUser }) => {
  const t = TRANSLATIONS[language];
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cropName, setCropName] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ref to keep utterance alive to prevent garbage collection cutting off speech
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Saved Reports State
  const [savedReports, setSavedReports] = useState<PestReport[]>(user.pestReports || []);
  const [selectedReport, setSelectedReport] = useState<PestReport | null>(null);

  // Appointment State - Sync with user profile
  const [appointment, setAppointment] = useState<Appointment | null>(
      (user.appointments && user.appointments.length > 0) ? user.appointments[0] : null
  );

  // Sync state when user prop changes (e.g. on mount or update)
  useEffect(() => {
      setAppointment((user.appointments && user.appointments.length > 0) ? user.appointments[0] : null);
      setSavedReports(user.pestReports || []);
  }, [user.appointments, user.pestReports]);
  
  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
        window.speechSynthesis.cancel();
    };
  }, []);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImage(base64);
        setResult(null); // Reset previous result
        setIsSaved(false); // Reset save state
        window.speechSynthesis.cancel(); // Stop any previous speech
        setIsSpeaking(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    setIsSaved(false);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    
    // Extract mime type and base64 data correctly
    const mimeType = image.split(';')[0].split(':')[1];
    const base64Data = image.split(',')[1];

    const diagnosis = await analyzePlantImage(base64Data, mimeType, language, cropName);
    setResult(diagnosis);
    setIsAnalyzing(false);
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setCropName('');
    setIsSaved(false);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReadAloud = (textToRead: string | null) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!textToRead) return;

    // 1. Force load voices
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
    
    // 3. Language Mapping for Speech Synthesis
    const langMap: Record<Language, string> = {
      [Language.ENGLISH]: 'en-IN', // Prefer Indian English
      [Language.HINDI]: 'hi-IN',
      [Language.MARATHI]: 'mr-IN',
      [Language.TELUGU]: 'te-IN',
      [Language.TAMIL]: 'ta-IN',
      [Language.KANNADA]: 'kn-IN',
      [Language.MALAYALAM]: 'ml-IN'
    };
    
    const targetLang = langMap[language] || 'en-US';
    utterance.lang = targetLang;
    utterance.rate = 0.9; // Slightly slower for clarity

    // 4. Robust Voice Selection
    const baseLang = targetLang.split('-')[0];

    const voice = availableVoices.find(v => v.lang === targetLang) || 
                  availableVoices.find(v => v.lang.replace('_', '-') === targetLang) ||
                  availableVoices.find(v => v.lang.startsWith(baseLang)) ||
                  // Fallback for Marathi -> Hindi
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

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleDownloadPDF = (report: PestReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>${report.cropName} - Pest Report</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px; margin-bottom: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 0.9em; color: #555; }
            .image-container { text-align: center; margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 12px; }
            img { max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .content { white-space: pre-wrap; font-size: 14px; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
            @media print {
              body { padding: 0; }
              .image-container { background: none; }
              img { box-shadow: none; border: 1px solid #ddd; }
            }
          </style>
        </head>
        <body>
          <h1>${report.cropName} - Diagnosis Report</h1>
          
          <div class="header">
            <div>
                <strong>Date:</strong> ${new Date(report.timestamp).toLocaleString('en-IN')}<br>
                <strong>Generated by:</strong> InnoSphere Digital Kheti
            </div>
            <div style="text-align: right;">
                <strong>Status:</strong> Analysis Complete
            </div>
          </div>

          <div class="image-container">
            <img src="${report.image}" alt="${report.cropName}" />
          </div>

          <div class="content">
            ${report.diagnosis}
          </div>

          <div class="footer">
            <p>This report was generated by AI. Please consult an agricultural expert before applying heavy chemical treatments.</p>
            <p>InnoSphere - Your Digital Kheti Companion</p>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 500); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleSaveReport = () => {
      if (!result || !image || isSaved) return;

      const newReport: PestReport = {
          id: Date.now().toString(),
          cropName: cropName || "Unknown Crop",
          diagnosis: result,
          image: image,
          timestamp: Date.now()
      };

      const updatedReports = [newReport, ...savedReports];
      
      try {
          const updatedUser = authService.updateUser(user.phone, {
              pestReports: updatedReports
          });
          onUpdateUser(updatedUser);
          setIsSaved(true);
          
          // Notification
          addNotification({
              id: Date.now().toString(),
              title: t.reportSaved,
              time: "Just Now",
              isUnread: true,
              content: <p className="text-xs text-stone-500">Analysis for {cropName || "Crop"} saved.</p>
          });

          // Optional: Scroll to reports section
          setTimeout(() => {
            const reportsSection = document.getElementById('saved-reports-section');
            if (reportsSection) {
                reportsSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 300);

      } catch (error) {
          console.error("Failed to save report", error);
          alert("Failed to save report.");
      }
  };

  const formatTimestamp = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
      });
  };

  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        days.push({
            date: d,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: d.getDate(),
            fullDate: d
        });
    }
    return days;
  };

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
  ];

  // Helper to check if a time slot is in the past for today
  const isSlotDisabled = (dayIndex: number | null, timeStr: string) => {
      if (dayIndex !== 0) return false; // Only check for today (index 0)
      
      const now = new Date();
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      
      return slotTime < now;
  };

  const handleConfirmAppointment = () => {
      if (selectedDate === null || !selectedTime) return;

      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + selectedDate);
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

      // Create new appointment object
      const newAppointment: Appointment = {
          id: Date.now().toString(),
          date: dateStr,
          time: selectedTime,
          status: 'Pending',
          timestamp: dateObj.getTime()
      };

      // Persist to User Profile FIRST
      try {
          const updatedUser = authService.updateUser(user.phone, {
              appointments: [newAppointment] // Replacing list for single appointment logic
          });
          onUpdateUser(updatedUser);
      } catch (error) {
          console.error("Failed to save appointment", error);
          alert("Failed to save appointment. Please try again.");
          return;
      }

      // Create Notification Content
      const notificationContent = (
          <div className="mt-1">
              <p className="text-xs text-stone-500">
                  Request sent to Agri Expert for <strong>{dateStr}</strong> at <strong>{selectedTime}</strong>.
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-md w-fit">
                  <Clock size={10} /> Status: Pending Confirmation
              </div>
          </div>
      );

      const notification: AppNotification = {
          id: Date.now().toString(),
          title: isRescheduling ? "Appointment Rescheduled" : "Appointment Request Sent",
          time: "Just now",
          isUnread: true,
          content: notificationContent
      };

      addNotification(notification);
      
      // Show Success Modal
      alert(`Appointment Request Sent\nRequest sent to Agri Expert for ${dateStr} at ${selectedTime}.\nStatus: Pending Confirmation`);

      setIsBookingOpen(false);
      setIsRescheduling(false);
      setSelectedDate(null);
      setSelectedTime(null);
  };

  const handleWithdraw = () => {
      if (confirm("Are you sure you want to withdraw this appointment?")) {
          // Update DB
          try {
              const updatedUser = authService.updateUser(user.phone, {
                  appointments: []
              });
              onUpdateUser(updatedUser);
          } catch (error) {
              console.error("Failed to withdraw appointment", error);
          }
      }
  };

  const handleReschedule = () => {
      setIsRescheduling(true);
      setIsBookingOpen(true);
  };

  const closeReportModal = () => {
      setSelectedReport(null);
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900 pb-24 md:pb-0 relative">
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                    <span className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400"><Camera size={24} /></span>
                    {t.scan}
                </h2>
                <p className="text-stone-500 dark:text-stone-400 mt-1 ml-12 text-sm md:text-base">AI-powered disease detection and remedies.</p>
            </div>
        </div>

        {!image ? (
            <div className="space-y-6">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group cursor-pointer flex flex-col items-center justify-center border-3 border-dashed border-stone-300 dark:border-stone-700 rounded-3xl bg-white dark:bg-stone-800 p-12 transition-all hover:border-green-500 dark:hover:border-green-600 hover:bg-green-50/30 dark:hover:bg-green-900/10 min-h-[300px] relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-stone-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="w-24 h-24 bg-stone-100 dark:bg-stone-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner group-hover:bg-white dark:group-hover:bg-stone-600 group-hover:shadow-xl">
                        <Camera size={48} className="text-stone-400 dark:text-stone-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2 z-10">{t.uploadImage}</h3>
                    <p className="text-stone-500 dark:text-stone-400 text-center mb-8 max-w-md z-10">
                        Click to capture or upload a photo of the affected crop. Ensure good lighting.
                    </p>
                    
                    <button className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-8 py-3 rounded-full font-bold shadow-lg group-hover:bg-green-600 dark:group-hover:bg-green-500 group-hover:text-white transition-colors flex items-center gap-2 z-10">
                        <Upload size={18} /> Upload Photo
                    </button>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment" // Opens camera on mobile
                        className="hidden"
                        onChange={handleImageUpload}
                    />
                </div>

                {/* Expert Consultation Section */}
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-4 px-1">Expert Consultation</h3>
                    
                    {appointment ? (
                        // Booked Appointment Card
                        <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 border border-green-200 dark:border-green-800/50 shadow-sm relative overflow-hidden animate-in slide-in-from-bottom-2">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-bl-full z-0"></div>
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <Video size={28} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100">Upcoming Appointment</h4>
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                {appointment.status}
                                            </span>
                                        </div>
                                        <p className="text-stone-500 dark:text-stone-400 text-sm">
                                            Agri Expert Consultation on <strong>{appointment.date}</strong> at <strong>{appointment.time}</strong>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 w-full md:w-auto">
                                    <button 
                                        onClick={handleReschedule}
                                        className="flex-1 md:flex-none px-4 py-2.5 border border-stone-200 dark:border-stone-700 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 text-stone-600 dark:text-stone-300 hover:text-green-700 dark:hover:text-green-400 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit size={16} /> Change
                                    </button>
                                    <button 
                                        onClick={handleWithdraw}
                                        className="flex-1 md:flex-none px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Withdraw
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // "Book Now" CTA Card
                        <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 md:p-8 border border-stone-200 dark:border-stone-700 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 dark:bg-green-900/20 rounded-full -mr-20 -mt-20 z-0"></div>
                             
                             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                 <div className="flex items-start gap-4">
                                     <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-700 dark:text-green-400 shadow-sm flex-shrink-0">
                                         <Stethoscope size={32} />
                                     </div>
                                     <div>
                                         <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">Connect with Agriculture Expert</h3>
                                         <p className="text-stone-500 dark:text-stone-400 text-sm max-w-md leading-relaxed">
                                             Complex issue? Our verified agronomists can provide detailed video consultation and personalized treatment plans for your farm.
                                         </p>
                                     </div>
                                 </div>
                                 <button 
                                    onClick={() => setIsBookingOpen(true)}
                                    className="w-full md:w-auto px-8 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
                                 >
                                     <Calendar size={18} /> Book an Appointment
                                 </button>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex flex-col lg:flex-row gap-8 mb-8">
                {/* Image Preview & Input Section */}
                <div className="w-full lg:w-1/2 flex flex-col gap-4">
                    <div className="relative rounded-3xl overflow-hidden shadow-xl border border-stone-200 dark:border-stone-700 bg-black aspect-[4/3] group">
                        <img src={image} alt="Uploaded" className="w-full h-full object-contain" />
                        <div className="absolute top-4 right-4 z-10">
                             <button 
                                onClick={reset}
                                className="bg-black/50 text-white px-4 py-2 rounded-full font-bold hover:bg-black/70 transition-colors flex items-center gap-2 backdrop-blur-sm text-sm"
                            >
                                <RefreshCw size={14} /> Retake
                            </button>
                        </div>
                    </div>
                    
                    {/* Crop Name Input */}
                    {!isAnalyzing && !result && (
                        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                            <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2 ml-1">
                                {t.enterCropName}
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Sprout className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                                    <input
                                        type="text"
                                        value={cropName}
                                        onChange={(e) => setCropName(e.target.value)}
                                        placeholder="e.g., Tomato, Cotton..."
                                        className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:focus:ring-green-800 outline-none text-stone-800 dark:text-stone-100 placeholder-stone-400"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleAnalyzeClick}
                                className="w-full mt-4 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <Search size={20} />
                                {t.analyze}
                            </button>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm flex items-center gap-3 animate-pulse">
                             <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                             <span className="text-sm font-bold text-stone-600 dark:text-stone-300">Analyzing image patterns...</span>
                        </div>
                    )}
                </div>

                {/* Results Section */}
                <div className="w-full lg:w-1/2">
                    {isAnalyzing ? (
                         <div className="h-full min-h-[300px] bg-white dark:bg-stone-800 rounded-3xl border border-stone-100 dark:border-stone-700 p-8 flex flex-col items-center justify-center text-center">
                             <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 relative">
                                 <div className="absolute inset-0 border-4 border-green-100 dark:border-green-800 rounded-full animate-ping opacity-75"></div>
                                 <ImageIcon size={32} className="text-green-600 dark:text-green-400 animate-pulse" />
                             </div>
                             <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">{t.analyzing}</h3>
                             <p className="text-stone-500 dark:text-stone-400 max-w-xs">
                                Our AI is checking {cropName ? `your ${cropName}` : 'the plant'} for diseases, pests, and nutritional deficiencies.
                             </p>
                         </div>
                    ) : result ? (
                        <div className="bg-white dark:bg-stone-800 rounded-3xl shadow-xl shadow-stone-200/50 dark:shadow-none border border-stone-100 dark:border-stone-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold">{t.diagnosis} Report</h3>
                                            {cropName && (
                                                <p className="text-green-100 text-sm opacity-90">
                                                    For: {cropName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleReadAloud(result)}
                                        className={`p-2 rounded-full backdrop-blur-sm transition-all ${isSpeaking ? 'bg-white text-green-700 animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'}`}
                                        title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                                    >
                                        {isSpeaking ? <StopCircle size={24} /> : <Volume2 size={24} />}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 md:p-8">
                                <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                     <ReactMarkdown 
                                        components={{
                                            p: ({node, ...props}) => <p className="mb-4 text-stone-600 dark:text-stone-300" {...props} />,
                                            strong: ({node, ...props}) => <span className="font-bold text-stone-900 dark:text-stone-100" {...props} />,
                                            ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-4 space-y-1" {...props} />,
                                            ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-4 space-y-1" {...props} />,
                                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                        }}
                                     >
                                        {result}
                                     </ReactMarkdown>
                                </div>
                                
                                <div className="mt-8 pt-6 border-t border-stone-100 dark:border-stone-700 flex flex-col gap-3">
                                    <div className="flex gap-3">
                                        <button 
                                            onClick={handleSaveReport}
                                            disabled={isSaved}
                                            className={`flex-1 py-3 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isSaved ? 'bg-green-600 cursor-default' : 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-700 dark:hover:bg-stone-600 shadow-stone-200 dark:shadow-none'}`}
                                        >
                                            {isSaved ? <Check size={18} /> : <Save size={18} />} 
                                            {isSaved ? "Saved" : t.saveReport}
                                        </button>
                                        <button onClick={reset} className="px-6 py-3 border-2 border-stone-100 dark:border-stone-700 rounded-xl font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 hover:border-stone-200 dark:hover:border-stone-600 transition-all flex items-center justify-center gap-2">
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-xl flex gap-3 mt-2">
                                        <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={20} />
                                        <p className="text-xs text-amber-800 dark:text-amber-300">
                                            <strong>Disclaimer:</strong> AI diagnosis is for reference only. Consult an agricultural expert before applying heavy chemicals.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        )}

        {/* Saved Reports Section (Slide Heading) */}
        {savedReports.length > 0 && (
            <div id="saved-reports-section" className="mt-12 mb-8 animate-in slide-in-from-bottom-8 duration-500">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400">
                        <FileCheck size={20} />
                    </div>
                    <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">{t.savedReports}</h3>
                    <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700 ml-4"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedReports.map((report) => (
                        <div key={report.id} className="bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-all group animate-in zoom-in-95">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 overflow-hidden flex-shrink-0">
                                        <img src={report.image} alt={report.cropName} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-stone-800 dark:text-stone-100">{report.cropName}</h4>
                                        <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                                            <Calendar size={10} /> {formatTimestamp(report.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Short Summary */}
                            <div className="text-sm text-stone-500 dark:text-stone-400 line-clamp-2 mb-4 h-10">
                                {report.diagnosis.replace(/[#*`]/g, '').substring(0, 150)}...
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-stone-50 dark:border-stone-700">
                                <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full uppercase tracking-wider">
                                    {t.savedOn}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => handleDownloadPDF(report)}
                                        className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                                        title="Download PDF"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedReport(report)}
                                        className="text-xs font-bold text-stone-700 dark:text-stone-300 hover:text-green-700 dark:hover:text-green-400 flex items-center gap-1 transition-colors"
                                    >
                                        {t.viewFullContent} <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Full Report Modal */}
        {selectedReport && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={closeReportModal}></div>
                <div className="bg-white dark:bg-stone-800 w-full max-w-2xl h-[85vh] rounded-3xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col shadow-2xl">
                    
                    {/* Modal Header */}
                    <div className="bg-stone-900 dark:bg-stone-950 p-6 text-white flex-shrink-0 flex justify-between items-start">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex-shrink-0">
                                <img src={selectedReport.image} alt={selectedReport.cropName} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold mb-1">{selectedReport.cropName} Report</h3>
                                <div className="flex items-center gap-3">
                                    <p className="text-stone-400 text-xs flex items-center gap-2">
                                        <Clock size={12} /> Saved: {formatTimestamp(selectedReport.timestamp)}
                                    </p>
                                    
                                    {/* Read Aloud Button for Modal */}
                                    <button 
                                        onClick={() => handleReadAloud(selectedReport.diagnosis)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${isSpeaking ? 'bg-green-500 text-white border-green-400 animate-pulse' : 'bg-white/10 text-stone-300 border-white/20 hover:bg-white/20'}`}
                                    >
                                        {isSpeaking ? <StopCircle size={12} /> : <Volume2 size={12} />}
                                        {isSpeaking ? "Stop" : "Listen"}
                                    </button>

                                    {/* Download PDF Button for Modal */}
                                    <button 
                                        onClick={() => handleDownloadPDF(selectedReport)}
                                        className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-colors bg-white/10 text-stone-300 border-white/20 hover:bg-white/20"
                                        title="Download PDF"
                                    >
                                        <Download size={12} /> PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button onClick={closeReportModal} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-stone-50 dark:bg-stone-900">
                        <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-700">
                            <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed">
                                <ReactMarkdown 
                                    components={{
                                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-green-800 dark:text-green-400 mt-4 mb-2 border-b border-green-100 dark:border-green-800 pb-1" {...props} />,
                                        p: ({node, ...props}) => <p className="mb-4 text-stone-600 dark:text-stone-300" {...props} />,
                                        strong: ({node, ...props}) => <span className="font-bold text-stone-900 dark:text-stone-100" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-4 space-y-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-4 space-y-1" {...props} />,
                                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                    }}
                                >
                                    {selectedReport.diagnosis}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 text-center">
                        <button onClick={closeReportModal} className="px-8 py-2.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-xl font-bold text-sm transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Booking Modal */}
        {isBookingOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsBookingOpen(false)}></div>
                <div className="bg-white dark:bg-stone-800 w-full max-w-md rounded-3xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    
                    {/* Modal Header */}
                    <div className="bg-green-700 p-6 text-white flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold mb-1">{isRescheduling ? "Reschedule Appointment" : "Book Appointment"}</h3>
                            <p className="text-green-100 text-xs opacity-90">Select a date and time to consult with an expert.</p>
                        </div>
                        <button onClick={() => setIsBookingOpen(false)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto">
                        
                        {/* Date Selection */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
                                <Calendar size={16} className="text-green-600 dark:text-green-400" /> Select Date
                            </h4>
                            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                {getNextDays().map((day, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedDate(idx);
                                            setSelectedTime(null); // Reset time when date changes
                                        }}
                                        className={`flex flex-col items-center justify-center min-w-[70px] p-3 rounded-xl border transition-all ${
                                            selectedDate === idx 
                                            ? 'bg-green-600 border-green-600 text-white shadow-md' 
                                            : 'bg-white dark:bg-stone-700 border-stone-200 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                                        }`}
                                    >
                                        <span className="text-xs font-medium opacity-80">{day.dayName}</span>
                                        <span className="text-lg font-bold">{day.dayNum}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Selection */}
                        <div className={`transition-all duration-300 ${selectedDate !== null ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                            <h4 className="text-sm font-bold text-stone-800 dark:text-stone-100 mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-green-600 dark:text-green-400" /> Select Time Slot
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {timeSlots.map((time, idx) => {
                                    const disabled = isSlotDisabled(selectedDate, time);
                                    return (
                                        <button
                                            key={idx}
                                            disabled={disabled}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                                                disabled 
                                                ? 'bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600 border-stone-100 dark:border-stone-800 cursor-not-allowed'
                                                : selectedTime === time
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 ring-1 ring-green-300 dark:ring-green-700'
                                                    : 'bg-stone-50 dark:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-100 dark:border-stone-600 hover:bg-white dark:hover:bg-stone-600 hover:border-stone-300 dark:hover:border-stone-500'
                                            }`}
                                        >
                                            {time}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800">
                        <button
                            onClick={handleConfirmAppointment}
                            disabled={selectedDate === null || !selectedTime}
                            className="w-full py-3.5 bg-green-700 hover:bg-green-800 disabled:bg-stone-300 dark:disabled:bg-stone-700 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-green-200/50 dark:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Check size={18} /> {isRescheduling ? "Update Appointment" : "Confirm Appointment"}
                        </button>
                    </div>

                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default PestDoctor;
