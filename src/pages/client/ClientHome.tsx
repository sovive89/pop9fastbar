import { Link } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';

const ClientHome = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <UtensilsCrossed className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Área do Cliente</h1>
        <p className="text-sm text-muted-foreground">
          Use o link recebido da equipe para abrir sua comanda digital.
        </p>
        <Link to="/" className="text-sm text-primary hover:underline">
          Ir para login da equipe
        </Link>
      </div>
    </div>
  );
};

export default ClientHome;
