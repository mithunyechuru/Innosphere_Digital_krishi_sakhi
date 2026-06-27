
import React, { useState, useRef, useEffect } from 'react';
import { Language, Message } from '../types';
import { TRANSLATIONS } from '../constants';
import { sendChatMessage } from '../services/geminiService';
import { Send, Mic, Bot, Loader2, User, Sparkles, X, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface KrishiSakhiProps {
  language: Language;
  onClose?: () => void;
}

const KrishiSakhi: React.FC<KrishiSakhiProps> = ({ language, onClose }) => {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: t.welcome + "! " + t.typeMessage, sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Focus input on mount for desktop
  useEffect(() => {
    if (window.innerWidth > 768) {
        inputRef.current?.focus();
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    // Construct new history immediately to avoid stale state in async call
    const newHistory = [...messages, userMsg];

    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // Pass the updated history, not the stale 'messages' state
    const responseText = await sendChatMessage(userMsg.text, newHistory, language);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: responseText,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

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

  const handleMicClick = () => {
    // Allow user to stop manually by clicking again
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
      
      recognition.lang = getSpeechLang(language);
      recognition.continuous = true; // Enable continuous listening
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event: any) => {
        let newTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            newTranscript += event.results[i][0].transcript;
          }
        }
        
        if (newTranscript) {
            setInput(prev => {
                const trimmed = prev.trim();
                return trimmed ? `${trimmed} ${newTranscript}` : newTranscript;
            });
        }
      };
      
      recognition.onerror = (event: any) => {
         console.error("Speech recognition error", event.error);
         setIsListening(false);
         recognitionRef.current = null;
      };

      recognition.start();
    } else {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-stone-50 dark:bg-stone-900 relative pb-0">
      {/* Header */}
      <div className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] z-10 flex-shrink-0 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center transition-colors bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <Bot size={24} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">{t.chat}</h2>
                <div className="flex items-center gap-2">
                    <p className="text-xs font-medium flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> 
                        Online AI Assistant
                    </p>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {onClose && (
                <button onClick={onClose} className="p-2 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors">
                    <X size={24} />
                </button>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth" ref={scrollRef}>
          <div className="max-w-4xl mx-auto w-full flex flex-col space-y-6 pb-4">
              <div className="flex justify-center">
                  <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
              </div>

              {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.sender === 'user' ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900' : 'bg-white dark:bg-stone-700 text-green-600 dark:text-green-400 border border-stone-100 dark:border-stone-600'}`}>
                      {msg.sender === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                  </div>
                  
                  <div className={`max-w-[80%] md:max-w-[70%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`p-4 rounded-2xl shadow-sm relative text-sm md:text-base leading-relaxed ${
                          msg.sender === 'user' 
                              ? 'bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-900 rounded-tr-none' 
                              : 'bg-white dark:bg-stone-700 border border-stone-100 dark:border-stone-600 text-stone-800 dark:text-stone-100 rounded-tl-none'
                      }`}>
                          <ReactMarkdown 
                              components={{
                                  p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                                  strong: ({node, ...props}) => <span className={`font-bold ${msg.sender === 'user' ? 'text-white dark:text-stone-900' : 'text-green-700 dark:text-green-400'}`} {...props} />,
                                  ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              }}
                          >
                              {msg.text}
                          </ReactMarkdown>
                      </div>
                      <span className="text-[10px] text-stone-400 mt-1 px-1 font-medium">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                  </div>
              </div>
              ))}
              
              {isLoading && (
                  <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-stone-700 text-green-600 dark:text-green-400 border border-stone-100 dark:border-stone-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Loader2 size={14} className="animate-spin" />
                      </div>
                      <div className="bg-white dark:bg-stone-700 border border-stone-100 dark:border-stone-600 p-4 rounded-2xl rounded-tl-none shadow-sm">
                          <div className="flex gap-1">
                              <div className="w-2 h-2 bg-stone-300 dark:bg-stone-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-stone-300 dark:bg-stone-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-stone-300 dark:bg-stone-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 flex-shrink-0 pb-safe md:pb-6">
          <div className="max-w-4xl mx-auto w-full flex gap-2 md:gap-3 items-end">
              <button 
                  onClick={handleMicClick}
                  className={`p-3 rounded-full transition-all flex-shrink-0 mb-1 ${isListening ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse ring-2 ring-red-100 dark:ring-red-900' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'}`}
              >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <div className="flex-1 bg-stone-100 dark:bg-stone-700 rounded-[1.5rem] px-4 py-3 focus-within:bg-white dark:focus-within:bg-stone-800 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 border border-transparent transition-all shadow-inner flex items-center">
                  <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder={isListening ? "Listening... Click mic to stop" : t.typeMessage}
                      className="flex-1 bg-transparent outline-none text-stone-800 dark:text-stone-100 placeholder-stone-400 max-h-32 overflow-y-auto"
                  />
              </div>
              <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="p-3 bg-green-600 rounded-full text-white shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-1"
              >
                  <Send size={20} />
              </button>
          </div>
      </div>
    </div>
  );
};

export default KrishiSakhi;
