import { Check, Copy, Send, QrCode } from 'lucide-react';
import { useState, useEffect } from 'react';

const iconMap = {
  copy: Copy,
  check: Check,
  send: Send,
  receive: QrCode,
};

function AnimatedConfirmation({ 
  isVisible, 
  type = 'check', 
  message = 'Success!',
  duration = 2000,
  onComplete 
}) {
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  const IconComponent = iconMap[type] || Check;

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      // Trigger animation after a brief delay
      setTimeout(() => setAnimate(true), 50);
      
      // Hide after duration
      const timer = setTimeout(() => {
        setAnimate(false);
        setTimeout(() => {
          setShow(false);
          onComplete?.();
        }, 200);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onComplete]);

  if (!show) return null;

  return (
    <div className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
      animate ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
    }`}>
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-3">
          {/* Animated Icon */}
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center transition-all duration-500 ${
            animate ? 'scale-100 rotate-0' : 'scale-75 rotate-45'
          }`}>
            <IconComponent size={24} className="text-white" />
          </div>
          
          {/* Message */}
          <p className="text-white font-medium text-center">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default AnimatedConfirmation; 