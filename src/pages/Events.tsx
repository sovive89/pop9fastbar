import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { events } from '@/data/mockData';
import { MapPin, Calendar, ChevronRight, User, Search, SlidersHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import FilterSheet, { FilterState } from '@/components/FilterSheet';

const Events = () => {
  const navigate = useNavigate();
  const { cart } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  // Extract unique locations and categories
  const locations = useMemo(() => 
    [...new Set(events.map(e => e.location))],
    []
  );

  const categories = useMemo(() => 
    ['Eletrônica', 'Jazz', 'Sertanejo', 'Rock', 'Pop', 'Funk'],
    []
  );

  const maxPrice = useMemo(() => 
    Math.max(...events.filter(e => e.type === 'event').map(e => e.price), 200),
    []
  );

  const [filters, setFilters] = useState<FilterState>({
    location: null,
    dateFrom: null,
    dateTo: null,
    priceRange: [0, maxPrice],
    category: null,
  });

  const cartItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const activeFiltersCount = [
    filters.location,
    filters.dateFrom,
    filters.dateTo,
    filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
    filters.category,
  ].filter(Boolean).length;

  const filteredEvents = events.filter(e => {
    if (e.type !== 'event') return false;
    
    // Search query
    const matchesSearch = 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Location filter
    if (filters.location && e.location !== filters.location) return false;

    // Date filters
    if (filters.dateFrom && e.date) {
      const eventDate = new Date(e.date);
      if (eventDate < filters.dateFrom) return false;
    }
    if (filters.dateTo && e.date) {
      const eventDate = new Date(e.date);
      if (eventDate > filters.dateTo) return false;
    }

    // Price filter
    if (e.price < filters.priceRange[0] || e.price > filters.priceRange[1]) return false;

    return true;
  });

  const filteredEstablishments = events.filter(e => 
    e.type === 'establishment' && 
    (e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     e.location.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!filters.location || e.location === filters.location)
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header 
        showCart 
        rightContent={
          <button 
            onClick={() => navigate('/perfil')}
            className="group"
          >
            <Avatar className="w-9 h-9 border-2 border-primary/30 group-hover:border-primary transition-colors">
              <AvatarFallback className="bg-primary/20 text-primary">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Search and Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar eventos, locais..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-secondary/50 border-border/50 rounded-xl focus:border-primary/50"
            />
          </div>
          <Button 
            variant="glass" 
            size="icon" 
            className="h-12 w-12 rounded-xl border-border/50 hover:border-primary/50 relative"
            onClick={() => setFilterOpen(true)}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Sheet */}
        <FilterSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          filters={filters}
          onFiltersChange={setFilters}
          locations={locations}
          categories={categories}
          maxPrice={maxPrice}
        />

        {/* Section: Events */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Eventos</h2>
            <Button variant="ghost" size="sm" className="text-primary">
              Ver todos <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid gap-4">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event, index) => (
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
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhum evento encontrado para "{searchQuery}"
              </p>
            )}
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
            {filteredEstablishments.length > 0 ? (
              filteredEstablishments.map((establishment, index) => (
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
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8 col-span-2">
                Nenhum estabelecimento encontrado para "{searchQuery}"
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Events;
