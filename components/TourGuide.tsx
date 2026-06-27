
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Sprout } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface TourStep {
  targetId?: string; // ID of the element to highlight. If undefined, modal is centered.
  titleKey: string;
  descriptionKey: string;
}

interface TourGuideProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
  language: Language;
}

export const TourGuide: React.FC<TourGuideProps> = ({ isOpen, onComplete, onClose, language }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  // Define Tour Steps
  const steps: TourStep[] = [
    {
      titleKey: "tourWelcomeTitle",
      descriptionKey: "tourWelcomeDesc"
    },
    {
      targetId: "nav-item-dashboard",
      titleKey: "tourDashboardTitle",
      descriptionKey: "tourDashboardDesc"
    },
    {
      targetId: "nav-item-pest-doctor",
      titleKey: "tourPestTitle",
      descriptionKey: "tourPestDesc"
    },
    {
      targetId: "nav-item-mandi",
      titleKey: "tourMandiTitle",
      descriptionKey: "tourMandiDesc"
    },
    {
      targetId: "nav-item-soil-health",
      titleKey: "tourSoilTitle",
      descriptionKey: "tourSoilDesc"
    },
    {
      targetId: "nav-item-recommendations",
      titleKey: "tourAdviseTitle",
      descriptionKey: "tourAdviseDesc"
    },
    {
      targetId: "chat-fab",
      titleKey: "tourChatTitle",
      descriptionKey: "tourChatDesc"
    }
  ];

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;
  const t = TRANSLATIONS[language] as any; // Cast to access dynamic keys safely

  // Effect to find the target element position
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (currentStep.targetId) {
        const element = document.getElementById(currentStep.targetId);
        if (element) {
          const rect = element.getBoundingClientRect();
          setTargetRect(rect);
          
          // Ensure element is visible
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setTargetRect(null); // Fallback to center if element not found
        }
      } else {
        setTargetRect(null); // Center modal for steps without target
      }
    };

    // Initial update
    updatePosition();
    
    // Update on resize/scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    // Small timeout to allow DOM layout to settle if view changed
    const timer = setTimeout(updatePosition, 300);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
      clearTimeout(timer);
    };
  }, [currentStepIndex, isOpen, currentStep.targetId]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  // Styles for the spotlight effect
  const spotlightStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.top,
        left: targetRect.left,
        width: targetRect.width,
        height: targetRect.height,
        borderRadius: '12px',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)', // The trick: massive shadow dims everything else
        zIndex: 9998,
        pointerEvents: 'none', // Allow clicking through if needed, but usually we block interaction during tour
        transition: 'all 0.4s ease-in-out'
      }
    : {
        // If no target, dim whole screen
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 9998,
        transition: 'all 0.4s ease-in-out'
      };

  // Determine Popover Position based on target location (Top, Bottom, Left, Right)
  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Center of screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
      };
    }

    // Default: Place near the target. 
    // Logic: If highlighting something at bottom (nav bar), go above. Else go below/right.
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const spaceRight = window.innerWidth - targetRect.right;
    
    // Mobile Bottom Nav check (usually < 80px from bottom)
    if (spaceBelow < 150) {
       // Place above
       return {
         position: 'fixed',
         bottom: window.innerHeight - targetRect.top + 16,
         left: '50%',
         transform: 'translateX(-50%)',
         width: '90%',
         maxWidth: '350px'
       };
    }

    // Desktop sidebar check (usually on left)
    if (targetRect.left < 100 && window.innerWidth > 768) {
        // Place to the right
        return {
            position: 'fixed',
            top: targetRect.top,
            left: targetRect.right + 16,
            width: '300px'
        };
    }

    // Default below
    return {
      position: 'fixed',
      top: targetRect.bottom + 16,
      left: Math.min(window.innerWidth - 320, Math.max(16, targetRect.left)), // Clamp to screen
      width: '90%',
      maxWidth: '320px'
    };
  };

  return createPortal(
    <>
      {/* Spotlight Overlay */}
      <div style={spotlightStyle}></div>

      {/* Tour Card */}
      <div 
        className="bg-white rounded-3xl p-6 shadow-2xl z-[9999] animate-in zoom-in-95 duration-300 border border-stone-200"
        style={getPopoverStyle()}
      >
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                    <Sprout size={16} />
                </div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Step {currentStepIndex + 1} of {steps.length}
                </span>
            </div>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
            </button>
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-2">
           {t[currentStep.titleKey] || currentStep.titleKey}
        </h3>
        <p className="text-stone-600 text-sm leading-relaxed mb-6">
           {t[currentStep.descriptionKey] || currentStep.descriptionKey}
        </p>

        <div className="flex justify-between items-center">
            <button 
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className={`p-2 rounded-full hover:bg-stone-100 transition-colors ${currentStepIndex === 0 ? 'text-stone-300 cursor-not-allowed' : 'text-stone-600'}`}
            >
                <ChevronLeft size={20} />
            </button>
            
            <div className="flex gap-1">
                {steps.map((_, i) => (
                    <div 
                        key={i} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStepIndex ? 'w-4 bg-green-600' : 'w-1.5 bg-stone-200'}`}
                    ></div>
                ))}
            </div>

            <button 
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-stone-300 hover:bg-stone-800 transition-all active:scale-95"
            >
                {isLastStep ? 'Finish' : 'Next'} <ChevronRight size={16} />
            </button>
        </div>
      </div>
    </>,
    document.body
  );
};
