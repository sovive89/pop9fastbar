import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { events } from '@/data/mockData';
import { ShoppingCart, MapPin, Calendar, ChevronRight, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const Events = () => {
  const navigate = useNavigate();
  const { cart } = useApp();

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/perfil')}
              className="group"
            >
              <Avatar className="w-10 h-10 border-2 border-primary/30 group-hover:border-primary transition-colors">
                <AvatarFallback className="bg-primary/20 text-primary">
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                Night<span className="text-primary">Pass</span>
              </h1>
              <p className="text-sm text-muted-foreground">Olá, bem-vindo!</p>
            </div>
          </div>
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
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Section: Events */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Eventos</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todos <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid gap-4">
            {events.filter(e => e.type === 'event').map((event, index) => (
              <div
                key={event.id}
                onClick={() => navigate(`/evento/${event.id}`)}
                className="group glass rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                    <img 
                      src={event.image} 
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                        {event.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {event.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-primary font-semibold">
                        R$ {event.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Establishments */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Estabelecimentos</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todos <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {events.filter(e => e.type === 'establishment').map((establishment, index) => (
              <div
                key={establishment.id}
                onClick={() => navigate(`/evento/${establishment.id}`)}
                className="group glass rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={establishment.image} 
                    alt={establishment.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-3">
                  <h3 className="font-display font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {establishment.name}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {establishment.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Events;
