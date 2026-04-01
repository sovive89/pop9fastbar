import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import pop9Logo from '@/assets/pop9-logo.png';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center px-6 text-white">
      <div className="text-center space-y-6">
        <img src={pop9Logo} alt="POP9 BAR" className="w-24 h-auto mx-auto object-contain" style={{ mixBlendMode: 'lighten', filter: 'drop-shadow(0 0 15px hsl(38 92% 50% / 0.3))' }} />
        <h1 className="text-6xl font-black text-[#FF8A00]">404</h1>
        <p className="text-lg text-white/60">Página não encontrada</p>
        <Link to="/" className="inline-block px-6 py-3 rounded-2xl bg-[#FF8A00] text-black font-bold hover:bg-[#FF8A00]/90 transition-all">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
