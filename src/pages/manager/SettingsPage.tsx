import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Settings, Key, Printer, Link as LinkIcon,
  Copy, Eye, EyeOff, Plus, Trash2, Save, AlertCircle, CheckCircle2,
  QrCode
} from 'lucide-react';
import ScannerConfig from '@/components/ScannerConfig';
import { ManagerSidebarTrigger } from '@/components/ManagerSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  created_at: string;
  last_used: string | null;
}

interface PrinterConfig {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  type: 'thermal' | 'network';
  status: 'active' | 'inactive';
}

interface QuickLink {
  id: string;
  label: string;
  url: string;
  icon: string;
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();

  const [activeTab, setActiveTab] = useState<'apis' | 'printers' | 'links' | 'scanner'>('apis');
  const [loading, setLoading] = useState(false);

  // APIs
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newApiName, setNewApiName] = useState('');
  const [newApiService, setNewApiService] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Printers
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterIp, setNewPrinterIp] = useState('');
  const [newPrinterPort, setNewPrinterPort] = useState('9100');
  const [newPrinterType, setNewPrinterType] = useState<'thermal' | 'network'>('thermal');

  // Links
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/gestor');
      return;
    }
    loadSettings();
  }, [role, navigate]);

  const loadSettings = async () => {
    setLoading(true);
    // Simular carregamento de dados (em produção, viria do banco)
    setApiKeys([
      { id: '1', name: 'Mercado Pago', key: 'sk_live_xxxxx...', service: 'payment', created_at: '2024-01-15', last_used: '2024-03-30' },
    ]);
    setPrinters([
      { id: '1', name: 'Balcão', ip_address: '192.168.1.100', port: 9100, type: 'thermal', status: 'active' },
    ]);
    setQuickLinks([
      { id: '1', label: 'QR Code Abertura', url: 'https://seu-app.vercel.app/abrir', icon: 'qrcode' },
      { id: '2', label: 'WhatsApp Suporte', url: 'https://wa.me/5511999999999', icon: 'whatsapp' },
    ]);
    setLoading(false);
  };

  const addApiKey = async () => {
    if (!newApiName || !newApiService || !newApiKey) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const newKey: ApiKey = {
      id: Date.now().toString(),
      name: newApiName,
      key: newApiKey,
      service: newApiService,
      created_at: new Date().toISOString(),
      last_used: null,
    };
    setApiKeys([...apiKeys, newKey]);
    setNewApiName('');
    setNewApiService('');
    setNewApiKey('');
    toast({ title: 'API adicionada com sucesso!' });
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== id));
    toast({ title: 'API removida' });
  };

  const addPrinter = async () => {
    if (!newPrinterName || !newPrinterIp) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const newPrinter: PrinterConfig = {
      id: Date.now().toString(),
      name: newPrinterName,
      ip_address: newPrinterIp,
      port: parseInt(newPrinterPort),
      type: newPrinterType,
      status: 'inactive',
    };
    setPrinters([...printers, newPrinter]);
    setNewPrinterName('');
    setNewPrinterIp('');
    setNewPrinterPort('9100');
    toast({ title: 'Impressora configurada!' });
  };

  const testPrinter = async (id: string) => {
    toast({ title: 'Enviando teste para impressora...', description: 'Verifique se o papel foi impresso.' });
  };

  const deletePrinter = (id: string) => {
    setPrinters(printers.filter(p => p.id !== id));
    toast({ title: 'Impressora removida' });
  };

  const addQuickLink = () => {
    if (!newLinkLabel || !newLinkUrl) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const newLink: QuickLink = {
      id: Date.now().toString(),
      label: newLinkLabel,
      url: newLinkUrl,
      icon: 'link',
    };
    setQuickLinks([...quickLinks, newLink]);
    setNewLinkLabel('');
    setNewLinkUrl('');
    toast({ title: 'Link adicionado com sucesso!' });
  };

  const deleteQuickLink = (id: string) => {
    setQuickLinks(quickLinks.filter(l => l.id !== id));
    toast({ title: 'Link removido' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#141414] sticky top-0 z-50 px-6 py-4 flex items-center gap-4">
        <ManagerSidebarTrigger />
        <div>
          <h1 className="text-2xl font-black tracking-tighter">CONFIGURAÇÕES</h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">APIs, Impressoras, Scanner & Links</p>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('apis')}
            className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'apis'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" /> APIs
          </button>
          <button
            onClick={() => setActiveTab('printers')}
            className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'printers'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4 inline mr-2" /> Impressoras
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`px-6 py-3 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'links'
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <LinkIcon className="w-4 h-4 inline mr-2" /> Links
          </button>
        </div>

        {/* APIs Tab */}
        {activeTab === 'apis' && (
          <div className="space-y-6">
            <Card className="bg-[#1A1A1A] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Adicionar Nova API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Nome (ex: Mercado Pago)" value={newApiName} onChange={e => setNewApiName(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                  <Input placeholder="Serviço (ex: payment, crm)" value={newApiService} onChange={e => setNewApiService(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                  <Input placeholder="Chave API" type={showApiKey ? 'text' : 'password'} value={newApiKey} onChange={e => setNewApiKey(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={addApiKey} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
                  <Plus className="w-4 h-4" /> Adicionar API
                </Button>
              </CardFooter>
            </Card>

            {apiKeys.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">APIs Configuradas</h3>
                {apiKeys.map(api => (
                  <Card key={api.id} className="bg-[#1A1A1A] border-white/10">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-lg font-bold text-white">{api.name}</h4>
                            <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] text-white/60">
                              {api.service.toUpperCase()}
                            </Badge>
                            {api.last_used && (
                              <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-[10px] text-green-400">
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg">
                            <code className="text-xs text-white/60 flex-1 truncate">{api.key}</code>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(api.key)} className="text-white/60 hover:text-white">
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-[10px] text-white/40 mt-2">Criada em {new Date(api.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => deleteApiKey(api.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Printers Tab */}
        {activeTab === 'printers' && (
          <div className="space-y-6">
            <Card className="bg-[#1A1A1A] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Adicionar Impressora Térmica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Input placeholder="Nome (ex: Balcão)" value={newPrinterName} onChange={e => setNewPrinterName(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                  <Input placeholder="IP (ex: 192.168.1.100)" value={newPrinterIp} onChange={e => setNewPrinterIp(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                  <Input placeholder="Porta" type="number" value={newPrinterPort} onChange={e => setNewPrinterPort(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                  <select value={newPrinterType} onChange={e => setNewPrinterType(e.target.value as 'thermal' | 'network')} className="bg-white/5 border border-white/10 h-12 rounded-xl text-white px-3">
                    <option value="thermal">Térmica</option>
                    <option value="network">Rede</option>
                  </select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={addPrinter} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Impressora
                </Button>
              </CardFooter>
            </Card>

            {printers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Impressoras Configuradas</h3>
                {printers.map(printer => (
                  <Card key={printer.id} className="bg-[#1A1A1A] border-white/10">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-lg font-bold text-white">{printer.name}</h4>
                            <Badge variant="outline" className={`text-[10px] ${
                              printer.status === 'active'
                                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                            }`}>
                              {printer.status === 'active' ? 'ATIVA' : 'INATIVA'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-white/40 text-[10px] uppercase tracking-widest">IP</p>
                              <p className="text-white font-bold">{printer.ip_address}:{printer.port}</p>
                            </div>
                            <div>
                              <p className="text-white/40 text-[10px] uppercase tracking-widest">Tipo</p>
                              <p className="text-white font-bold capitalize">{printer.type}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => testPrinter(printer.id)} className="bg-white/5 border-white/10 text-white rounded-lg">
                            Testar
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePrinter(printer.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Links Tab */}
        {activeTab === 'links' && (
          <div className="space-y-6">
            <Card className="bg-[#1A1A1A] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Adicionar Link Rápido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input placeholder="Rótulo (ex: QR Code)" value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white" />
                  <Input placeholder="URL completa" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-white col-span-2" />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={addQuickLink} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Link
                </Button>
              </CardFooter>
            </Card>

            {quickLinks.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Links Configurados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickLinks.map(link => (
                    <Card key={link.id} className="bg-[#1A1A1A] border-white/10">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-white mb-2">{link.label}</h4>
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[#FF8A00] text-sm truncate hover:underline">
                              {link.url}
                            </a>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteQuickLink(link.id)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsPage;
