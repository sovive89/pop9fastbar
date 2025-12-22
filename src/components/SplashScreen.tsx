import { useEffect, useState } from 'react';
import nightpassLogo from '@/assets/nightpass-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'fadeOut'>('logo');

  useEffect(() => {
    // Logo animation phase
    const logoTimer = setTimeout(() => {
      setPhase('fadeOut');
    }, 2000);

    // Complete and unmount
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        phase === 'fadeOut' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.15) 0%, transparent 70%)',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.2) 0%, transparent 60%)',
            animationDelay: '0.3s',
          }}
        />
      </div>

      {/* Logo container with animations */}
      <div className="relative flex flex-col items-center">
        {/* Logo with scale and fade animation */}
        <div 
          className="relative animate-[scale-in_0.8s_ease-out_forwards]"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          <img 
            src={nightpassLogo} 
            alt="NightPass Logo" 
            className="w-64 h-auto object-contain"
            style={{ 
              mixBlendMode: 'lighten',
              filter: 'drop-shadow(0 0 30px hsl(38 92% 50% / 0.5)) drop-shadow(0 0 60px hsl(38 92% 50% / 0.3))'
            }}
          />
        </div>

        {/* Loading bar */}
        <div 
          className="mt-8 w-48 h-1 bg-muted/30 rounded-full overflow-hidden animate-[fade-in_0.5s_ease-out_forwards]"
          style={{ animationDelay: '0.8s', opacity: 0 }}
        >
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            style={{
              animation: 'loading 1.5s ease-in-out forwards',
              animationDelay: '0.9s',
              width: '0%',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;