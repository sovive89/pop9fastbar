import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ExternalLink, Link as LinkIcon, Plus, Trash2, 
  Globe, Smartphone, MessageSquare, CreditCard,
  Instagram, Facebook, Twitter, Search
} from 'lucide-react';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface QuickLink {
  id: string;
  label: string;
  url: string;
  category: string;
  icon: string;
}

const QuickLinksPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();

  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // New Link Form
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('Geral');

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    // Em um cenário real, buscaria de uma tabela 'quick_links'
    // Por enquanto, usaremos dados mockados baseados no que o usuário pediu
    const mockLinks: QuickLink[] = [
      { id: '1', label: 'Painel Maquininha', url: 'https://mercadopago.com.br', category: 'Pagamentos', icon: 'credit-card' },
      { id: '2', label: 'Instagram do Bar', url: 'https://instagram.com/pop9bar', category: 'Social', icon: 'instagram' },
      { id: '3', label: 'WhatsApp Suporte', url: 'https://wa.me/5511999999999', category: 'Suporte', icon: 'message-square' },
      { id: '4', label: 'Fornecedor Ambev', url: 'https://bees.com.br', category: 'Fornecedores', icon: 'globe' },
      { id: '5', label: 'QR Code Abertura', url: `${window.location.origin}/abrir`, category: 'Sistema', icon: 'smartphone' },
    ];
    setLinks(mockLinks);
    setLoading(false);
  };

  const addLink = () => {
    if (!newLabel || !newUrl) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const newLink: QuickLink = {
      id: Date.now().toString(),
      label: newLabel,
      url: newUrl.startsWith('http') ? newUrl : `https://${newUrl}`,
      category: newCategory,
      icon: 'link',
    };
    setLinks([newLink, ...links]);
    setNewLabel('');
    setNewUrl('');
    toast({ title: 'Link adicionado com sucesso!' });
  };

  const deleteLink = (id: string) => {
    setLinks(links.filter(l => l.id !== id));
    toast({ title: 'Link removido' });
  };

  const filteredLinks = links.filter(l => 
    l.label.toLowerCase().includes(search.toLowerCase()) || 
    l.category.toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'credit-card': return <CreditCard className="w-5 h-5" />;
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'message-square': return <MessageSquare className="w-5 h-5" />;
      case 'globe': return <Globe className="w-5 h-5" />;
      case 'smartphone': return <Smartphone className="w-5 h-5" />;
      default: return <LinkIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <ManagerSidebarTrigger />
          <div>
            <h1 className="text-2xl font-black tracking-tighter italic">LINKS RÁPIDOS</h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Acessos Externos & Atalhos</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-8">
        {/* Add Link Card */}
        {role === 'admin' && (
          <Card className="bg-[#1A1A1A] border-white/10 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-white/[0.02] border-b border-white/5">
              <CardTitle className="text-lg font-black italic flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF8A00]" /> ADICIONAR NOVO LINK
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Título</label>
                  <Input 
                    placeholder="Ex: Painel Maquininha" 
                    value={newLabel} 
                    onChange={e => setNewLabel(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 rounded-xl text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">URL</label>
                  <Input 
                    placeholder="Ex: google.com" 
                    value={newUrl} 
                    onChange={e => setNewUrl(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 rounded-xl text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Categoria</label>
                  <select 
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 h-12 rounded-xl text-white px-4 text-sm focus:ring-1 ring-[#FF8A00] outline-none appearance-none"
                  >
                    <option value="Geral">Geral</option>
                    <option value="Pagamentos">Pagamentos</option>
                    <option value="Social">Social</option>
                    <option value="Fornecedores">Fornecedores</option>
                    <option value="Sistema">Sistema</option>
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-white/[0.02] border-t border-white/5 p-4">
              <Button onClick={addLink} className="bg-[#FF8A00] text-black font-black rounded-xl px-8 h-12 gap-2 shadow-lg shadow-[#FF8A00]/10">
                SALVAR LINK
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Search & List */}
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <Input 
              placeholder="Buscar link ou categoria..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 h-12 pl-12 rounded-2xl text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLinks.map(link => (
              <Card key={link.id} className="bg-[#1A1A1A] border-white/5 hover:border-[#FF8A00]/30 transition-all group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-[#FF8A00] group-hover:bg-[#FF8A00]/10 transition-colors">
                      {getIcon(link.icon)}
                    </div>
                    <div>
                      <Badge variant="outline" className="bg-white/5 border-white/10 text-[9px] text-white/40 mb-1">
                        {link.category.toUpperCase()}
                      </Badge>
                      <h4 className="font-bold text-white text-lg">{link.label}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => window.open(link.url, '_blank')}
                      className="text-white/40 hover:text-[#FF8A00] hover:bg-[#FF8A00]/10 rounded-xl"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </Button>
                    {role === 'admin' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteLink(link.id)}
                        className="text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredLinks.length === 0 && (
            <div className="text-center py-20">
              <LinkIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40 font-bold">Nenhum link encontrado</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QuickLinksPage;
