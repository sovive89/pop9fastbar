import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import nightpassLogo from '@/assets/nightpass-logo.png';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showCart?: boolean;
  showLogo?: boolean;
  rightContent?: React.ReactNode;
}

const Header = ({ 
  title, 
  subtitle, 
  showBack = false, 
  showCart = false, 
  showLogo = true,
  rightContent 
}: HeaderProps) => {
  const navigate = useNavigate();
  const { cart } = useApp();
  
  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        {showBack && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        {showLogo && (
          <img 
            src={nightpassLogo} 
            alt="NightPass" 
            className="h-10 w-auto object-contain brightness-110 cursor-pointer"
            style={{ 
              mixBlendMode: 'lighten',
              filter: 'drop-shadow(0 0 10px hsl(38 92% 50% / 0.3))'
            }}
            onClick={() => navigate('/eventos')}
          />
        )}
        
        {(title || subtitle) && (
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-lg font-display font-bold text-foreground truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        )}
        
        {!title && !subtitle && <div className="flex-1" />}
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightContent}
          
          {showCart && (
            <Button 
              variant="glass" 
              size="icon" 
              onClick={() => navigate('/sacola')}
              className="relative"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                  {cartItemsCount}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;