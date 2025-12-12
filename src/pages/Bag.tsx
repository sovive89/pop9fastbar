import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, OrderStatus } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Trash2, 
  ShoppingBag, 
  QrCode, 
  X, 
  Minus, 
  Plus,
  Send,
  Clock,
  CheckCircle2,
  Package
} from 'lucide-react';
import QRCodeComponent from '@/components/QRCode';
import { toast } from 'sonner';

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Aguardando envio',
  sent_to_bar: 'Enviado ao bar',
  ready: 'Pronto para retirar',
  delivered: 'Entregue',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  sent_to_bar: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ready: 'bg-green-500/20 text-green-400 border-green-500/30',
  delivered: 'bg-muted text-muted-foreground border-border',
};

const Bag = () => {
  const navigate = useNavigate();
  const { cart, purchasedItems, updateCartQuantity, removeFromCart, updateItemStatus } = useApp();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [qrType, setQrType] = useState<'order' | 'delivery'>('order');

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const selectedPurchase = purchasedItems.find(i => i.purchaseId === selectedItem);

  const handleShowOrderQR = (purchaseId: string) => {
    setQrType('order');
    setSelectedItem(purchaseId);
  };

  const handleShowDeliveryQR = (purchaseId: string) => {
    setQrType('delivery');
    setSelectedItem(purchaseId);
  };

  const handleSendToBar = () => {
    if (!selectedItem) return;
    updateItemStatus(selectedItem, 'sent_to_bar');
    toast.success('Pedido enviado ao bar!');
    setSelectedItem(null);
    
    // Simulate bar preparing the order
    setTimeout(() => {
      updateItemStatus(selectedItem, 'ready');
      toast.success('Seu pedido está pronto para retirada!');
    }, 3000);
  };

  const handleConfirmDelivery = () => {
    if (!selectedItem) return;
    updateItemStatus(selectedItem, 'delivered');
    toast.success('Entrega confirmada! Aproveite!');
    setSelectedItem(null);
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'sent_to_bar': return <Send className="w-4 h-4" />;
      case 'ready': return <Package className="w-4 h-4" />;
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />;
    }
  };

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
            <p className="text-sm text-muted-foreground">Carrinho e pedidos</p>
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
            Meus Pedidos
          </h2>

          {purchasedItems.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum pedido ainda</p>
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
                  className={`glass rounded-xl p-4 transition-all duration-300 animate-slide-up ${
                    item.status === 'delivered' ? 'opacity-60' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      <p className="text-sm text-primary font-medium">R$ {item.price.toFixed(2)}</p>
                      
                      {/* Status badge */}
                      <div className={`inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-full text-xs border ${statusColors[item.status]}`}>
                        {getStatusIcon(item.status)}
                        {statusLabels[item.status]}
                      </div>
                    </div>

                    {/* Action buttons based on status */}
                    <div className="flex flex-col gap-2">
                      {item.status === 'pending' && (
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={() => handleShowOrderQR(item.purchaseId)}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Enviar
                        </Button>
                      )}
                      
                      {item.status === 'sent_to_bar' && (
                        <div className="flex items-center gap-2 text-blue-400">
                          <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                          <span className="text-xs">Preparando...</span>
                        </div>
                      )}
                      
                      {item.status === 'ready' && (
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={() => handleShowDeliveryQR(item.purchaseId)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Package className="w-4 h-4 mr-1" />
                          Retirar
                        </Button>
                      )}
                      
                      {item.status === 'delivered' && (
                        <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Legend */}
        {purchasedItems.length > 0 && (
          <div className="mt-8 glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Como funciona:</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
                  <Send className="w-3 h-3 text-blue-400" />
                </div>
                <span><strong>QR de Pedido:</strong> Bar escaneia para receber seu pedido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                  <Package className="w-3 h-3 text-green-400" />
                </div>
                <span><strong>QR de Entrega:</strong> Confirma retirada e dá baixa no estoque</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {selectedItem && selectedPurchase && (
        <div 
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="glass rounded-3xl p-6 max-w-sm w-full animate-scale-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Button 
              variant="ghost" 
              size="icon"
              className="absolute top-4 right-4 z-10"
              onClick={() => setSelectedItem(null)}
            >
              <X className="w-5 h-5" />
            </Button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                qrType === 'order' ? 'bg-blue-500/20' : 'bg-green-500/20'
              }`}>
                {qrType === 'order' ? (
                  <Send className="w-8 h-8 text-blue-400 animate-pulse" />
                ) : (
                  <Package className="w-8 h-8 text-green-400 animate-pulse" />
                )}
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-1">
                {qrType === 'order' ? 'Enviar Pedido' : 'Confirmar Entrega'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {qrType === 'order' 
                  ? 'Apresente ao bar para enviar seu pedido' 
                  : 'Bar escaneia para confirmar a entrega'}
              </p>
            </div>

            {/* QR Code */}
            <QRCodeComponent 
              value={`${qrType}-${selectedItem}`} 
              itemName={selectedPurchase.name}
              itemPrice={selectedPurchase.price}
              type={qrType}
            />

            {/* Instructions */}
            <div className="mt-6 p-4 bg-secondary/50 rounded-xl">
              <p className="text-xs text-muted-foreground text-center">
                {qrType === 'order'
                  ? 'O bar irá escanear este código para receber e preparar seu pedido'
                  : 'Ao escanear, o item será dado baixa no estoque e marcado como entregue'}
              </p>
            </div>

            {/* Action Button */}
            <Button 
              variant={qrType === 'order' ? 'default' : 'default'}
              size="full" 
              className={`mt-4 ${qrType === 'order' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
              onClick={qrType === 'order' ? handleSendToBar : handleConfirmDelivery}
            >
              {qrType === 'order' ? (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Simular Leitura do Bar
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Entrega
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bag;
