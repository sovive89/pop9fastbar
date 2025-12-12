import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, ShoppingBag, QrCode, X, Minus, Plus } from 'lucide-react';
import QRCodeComponent from '@/components/QRCode';

const Bag = () => {
  const navigate = useNavigate();
  const { cart, purchasedItems, updateCartQuantity, removeFromCart, markItemAsUsed } = useApp();
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground">Minha Sacola</h1>
            <p className="text-sm text-muted-foreground">Carrinho e itens comprados</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Cart Section */}
        {cart.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              Carrinho
            </h2>
            
            <div className="space-y-3">
              {cart.map((item) => (
                <div 
                  key={item.id}
                  className="glass rounded-xl p-4 flex items-center gap-4 animate-scale-in"
                >
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{item.name}</h3>
                    <p className="text-sm text-primary font-medium">R$ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-4 mt-4 flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">R$ {cartTotal.toFixed(2)}</span>
            </div>

            <Button 
              variant="gold" 
              size="full" 
              className="mt-4"
              onClick={() => navigate('/eventos')}
            >
              Continuar Comprando
            </Button>
          </section>
        )}

        {/* Purchased Items Section */}
        <section>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Itens Comprados
          </h2>

          {purchasedItems.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum item comprado ainda</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/eventos')}
              >
                Ver Eventos
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {purchasedItems.map((item, index) => (
                <div 
                  key={item.purchaseId}
                  className={`glass rounded-xl p-4 cursor-pointer transition-all duration-300 animate-slide-up ${
                    item.used 
                      ? 'opacity-50 border-border' 
                      : 'hover:border-primary/50 hover:shadow-[0_0_20px_hsl(38_92%_50%_/_0.2)]'
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => !item.used && setSelectedQR(item.purchaseId)}
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      <p className="text-sm text-primary font-medium mt-1">R$ {item.price.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      {item.used ? (
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                          Utilizado
                        </span>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center">
                          <QrCode className="w-6 h-6 text-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* QR Code Modal */}
      {selectedQR && (
        <div 
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedQR(null)}
        >
        <div 
          className="glass rounded-3xl p-6 max-w-sm w-full animate-scale-in relative"
          onClick={(e) => e.stopPropagation()}
        >
          <Button 
            variant="ghost" 
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={() => setSelectedQR(null)}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Header with delivery confirmation */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground mb-1">
              Confirmação de Entrega
            </h2>
            <p className="text-sm text-muted-foreground">
              Apresente ao bar para retirar seu pedido
            </p>
          </div>

          {/* QR Code with item info */}
          {(() => {
            const item = purchasedItems.find(i => i.purchaseId === selectedQR);
            return (
              <QRCodeComponent 
                value={selectedQR} 
                itemName={item?.name}
                itemPrice={item?.price}
              />
            );
          })()}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-secondary/50 rounded-xl">
            <p className="text-xs text-muted-foreground text-center">
              O bar irá escanear este código para confirmar a entrega e dar baixa no seu pedido
            </p>
          </div>

            <Button 
              variant="destructive" 
              size="full" 
              className="mt-6"
              onClick={() => {
                markItemAsUsed(selectedQR);
                setSelectedQR(null);
              }}
            >
              Marcar como Utilizado
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bag;
