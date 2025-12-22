import { useEffect, useState } from 'react';
import nightpassLogo from '@/assets/nightpass-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<'logo' | 'fadeOut'>('logo');

  useEffect(() => {
    const logoTimer = setTimeout(() => {
      setPhase('fadeOut');
    }, 2000);

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
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Radial gradient pulse */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.12) 0%, transparent 60%)',
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(38 92% 50% / 0.15) 0%, transparent 50%)',
            animationDelay: '0.5s',
          }}
        />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(38 92% 50%) 1px, transparent 1px),
              linear-gradient(90deg, hsl(38 92% 50%) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Logo */}
      <div className="relative flex flex-col items-center">
        <div 
          className="relative animate-[scale-in_0.8s_ease-out_forwards]"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          <img 
            src={nightpassLogo} 
            alt="NightPass" 
            className="w-72 h-auto object-contain animate-glow-pulse"
            style={{ mixBlendMode: 'lighten' }}
          />
        </div>

        {/* Progress bar */}
        <div 
          className="mt-10 w-40 h-0.5 bg-border/30 rounded-full overflow-hidden animate-[fade-in_0.5s_ease-out_forwards]"
          style={{ animationDelay: '0.8s', opacity: 0 }}
        >
          <div 
            className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary"
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
