import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export interface FilterState {
  location: string | null;
  dateFrom: Date | null;
  dateTo: Date | null;
  priceRange: [number, number];
  category: string | null;
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  locations: string[];
  categories: string[];
  maxPrice: number;
}

const FilterSheet = ({ 
  open, 
  onOpenChange, 
  filters, 
  onFiltersChange,
  locations,
  categories,
  maxPrice
}: FilterSheetProps) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters: FilterState = {
      location: null,
      dateFrom: null,
      dateTo: null,
      priceRange: [0, maxPrice],
      category: null,
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFiltersCount = [
    localFilters.location,
    localFilters.dateFrom,
    localFilters.dateTo,
    localFilters.priceRange[0] > 0 || localFilters.priceRange[1] < maxPrice,
    localFilters.category,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl font-display">Filtros</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pb-24">
          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Localidade</h3>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => (
                <Button
                  key={loc}
                  variant={localFilters.location === loc ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalFilters(prev => ({
                    ...prev,
                    location: prev.location === loc ? null : loc
                  }))}
                  className="rounded-full"
                >
                  {loc}
                  {localFilters.location === loc && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Data</h3>
            <div className="flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal rounded-xl h-12",
                      !localFilters.dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateFrom ? (
                      format(localFilters.dateFrom, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Data início</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[60]" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateFrom || undefined}
                    onSelect={(date) => setLocalFilters(prev => ({ ...prev, dateFrom: date || null }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal rounded-xl h-12",
                      !localFilters.dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateTo ? (
                      format(localFilters.dateTo, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Data fim</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[60]" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateTo || undefined}
                    onSelect={(date) => setLocalFilters(prev => ({ ...prev, dateTo: date || null }))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Faixa de Preço
            </h3>
            <div className="px-2">
              <Slider
                value={localFilters.priceRange}
                onValueChange={(value) => setLocalFilters(prev => ({
                  ...prev,
                  priceRange: value as [number, number]
                }))}
                max={maxPrice}
                min={0}
                step={10}
                className="mb-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>R$ {localFilters.priceRange[0]}</span>
                <span>R$ {localFilters.priceRange[1]}</span>
              </div>
            </div>
          </div>

          {/* Category */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Categoria</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={localFilters.category === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLocalFilters(prev => ({
                    ...prev,
                    category: prev.category === cat ? null : cat
                  }))}
                  className="rounded-full"
                >
                  {cat}
                  {localFilters.category === cat && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t border-border">
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={handleClear}
              className="flex-1 h-12 rounded-xl"
            >
              Limpar {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
            <Button 
              onClick={handleApply}
              className="flex-1 h-12 rounded-xl"
            >
              Aplicar Filtros
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FilterSheet;
