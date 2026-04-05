import { useState, useEffect } from 'react';
import {
  Camera, Bluetooth, Usb, Volume2, VolumeX,
  Settings, Zap, CheckCircle2, RotateCcw, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

export interface ScannerSettings {
  inputMode: 'camera' | 'external' | 'both';
  cameraFacing: 'environment' | 'user';
  autoConfirm: boolean;
  autoDeductStock: boolean;
  playSound: boolean;
  soundType: 'beep' | 'success' | 'cash';
  vibrate: boolean;
  externalPrefix: string;
  externalSuffix: string;
  scanCooldownMs: number;
}

const DEFAULT_SETTINGS: ScannerSettings = {
  inputMode: 'both',
  cameraFacing: 'environment',
  autoConfirm: true,
  autoDeductStock: true,
  playSound: true,
  soundType: 'beep',
  vibrate: true,
  externalPrefix: '',
  externalSuffix: '\n',
  scanCooldownMs: 1500,
};

const STORAGE_KEY = 'pop9_scanner_settings';

export const loadScannerSettings = (): ScannerSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
};

export const saveScannerSettings = (settings: ScannerSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

interface ScannerConfigProps {
  compact?: boolean;
}

const ScannerConfig = ({ compact = false }: ScannerConfigProps) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ScannerSettings>(loadScannerSettings);

  const update = <K extends keyof ScannerSettings>(key: K, value: ScannerSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveScannerSettings(settings);
    toast({ title: 'Configurações do scanner salvas!' });
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    saveScannerSettings(DEFAULT_SETTINGS);
    toast({ title: 'Configurações restauradas ao padrão' });
  };

  const testSound = () => {
    if (!settings.playSound) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = settings.soundType === 'beep' ? 800 : settings.soundType === 'success' ? 1200 : 600;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    if (settings.vibrate && navigator.vibrate) navigator.vibrate(100);
  };

  return (
    <div className={`space-y-6 ${compact ? '' : 'max-w-3xl'}`}>
      {/* Modo de Entrada */}
      <Card className="bg-[#1A1A1A] border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#FF8A00]" /> Modo de Entrada
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'camera', label: 'Câmera', icon: Camera, desc: 'Usar câmera do dispositivo' },
              { value: 'external', label: 'Leitor Externo', icon: Usb, desc: 'USB / Bluetooth' },
              { value: 'both', label: 'Ambos', icon: Zap, desc: 'Câmera + Leitor' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => update('inputMode', opt.value)}
                className={`p-4 rounded-xl border transition-all text-center ${
                  settings.inputMode === opt.value
                    ? 'bg-[#FF8A00]/10 border-[#FF8A00]/30 text-[#FF8A00]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                <opt.icon className="w-6 h-6 mx-auto mb-2" />
                <p className="text-xs font-bold">{opt.label}</p>
                <p className="text-[9px] text-white/30 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuração de Câmera */}
      {(settings.inputMode === 'camera' || settings.inputMode === 'both') && (
        <Card className="bg-[#1A1A1A] border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#FF8A00]" /> Câmera
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Câmera Padrão</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => update('cameraFacing', 'environment')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    settings.cameraFacing === 'environment'
                      ? 'bg-[#FF8A00]/10 border-[#FF8A00]/30 text-[#FF8A00]'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}
                >
                  📷 Traseira
                </button>
                <button
                  onClick={() => update('cameraFacing', 'user')}
                  className={`p-3 rounded-xl border text-sm font-bold transition-all ${
                    settings.cameraFacing === 'user'
                      ? 'bg-[#FF8A00]/10 border-[#FF8A00]/30 text-[#FF8A00]'
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}
                >
                  🤳 Frontal
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuração de Leitor Externo */}
      {(settings.inputMode === 'external' || settings.inputMode === 'both') && (
        <Card className="bg-[#1A1A1A] border-white/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bluetooth className="w-4 h-4 text-[#FF8A00]" /> Leitor Externo (USB / Bluetooth)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-xs text-white/60 mb-3">
                Leitores USB/Bluetooth funcionam em modo <strong className="text-[#FF8A00]">keyboard wedge</strong> — 
                o código é digitado automaticamente como texto. O sistema detecta a entrada rápida e processa o token.
              </p>
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                Plug & Play — Sem configuração adicional
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Prefixo (opcional)</label>
                <Input
                  placeholder="Ex: STX"
                  value={settings.externalPrefix}
                  onChange={e => update('externalPrefix', e.target.value)}
                  className="bg-white/5 border-white/10 h-10 rounded-xl text-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Sufixo / Terminador</label>
                <select
                  value={settings.externalSuffix}
                  onChange={e => update('externalSuffix', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 h-10 rounded-xl text-white text-sm px-3"
                >
                  <option value={'\n'}>Enter (\\n)</option>
                  <option value={'\t'}>Tab (\\t)</option>
                  <option value="">Nenhum</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Cooldown entre leituras (ms)</label>
              <Input
                type="number"
                min={500}
                max={5000}
                step={100}
                value={settings.scanCooldownMs}
                onChange={e => update('scanCooldownMs', parseInt(e.target.value) || 1500)}
                className="bg-white/5 border-white/10 h-10 rounded-xl text-white text-sm w-32"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comportamento após Leitura */}
      <Card className="bg-[#1A1A1A] border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#FF8A00]" /> Ação após Leitura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Confirmar entrega automaticamente</p>
              <p className="text-[10px] text-white/40">Marca o item como entregue ao bipar o token</p>
            </div>
            <Switch checked={settings.autoConfirm} onCheckedChange={v => update('autoConfirm', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Descontar estoque automaticamente</p>
              <p className="text-[10px] text-white/40">Reduz o estoque do produto ao confirmar entrega</p>
            </div>
            <Switch checked={settings.autoDeductStock} onCheckedChange={v => update('autoDeductStock', v)} />
          </div>

          <div className="h-px bg-white/5" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.playSound ? <Volume2 className="w-4 h-4 text-[#FF8A00]" /> : <VolumeX className="w-4 h-4 text-white/30" />}
              <div>
                <p className="text-sm font-bold text-white">Som de confirmação</p>
                <p className="text-[10px] text-white/40">Emite um som ao bipar com sucesso</p>
              </div>
            </div>
            <Switch checked={settings.playSound} onCheckedChange={v => update('playSound', v)} />
          </div>

          {settings.playSound && (
            <div className="ml-7 flex items-center gap-2">
              {(['beep', 'success', 'cash'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => update('soundType', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    settings.soundType === s
                      ? 'bg-[#FF8A00]/15 text-[#FF8A00] border border-[#FF8A00]/30'
                      : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  {s === 'beep' ? '🔔 Beep' : s === 'success' ? '✅ Sucesso' : '💰 Caixa'}
                </button>
              ))}
              <Button variant="ghost" size="sm" onClick={testSound} className="text-[#FF8A00] text-xs ml-2">
                Testar
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Vibrar</p>
              <p className="text-[10px] text-white/40">Vibra o dispositivo ao confirmar (mobile)</p>
            </div>
            <Switch checked={settings.vibrate} onCheckedChange={v => update('vibrate', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Cancelamento & Reversão */}
      <Card className="bg-[#1A1A1A] border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#FF8A00]" /> Cancelamento & Reversão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
            <p className="text-xs text-white/60">
              Após confirmar a entrega de um item, o gestor pode <strong className="text-white">cancelar e reverter</strong> 
              a operação diretamente na comanda do cliente:
            </p>
            <ul className="text-xs text-white/50 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A00] mt-0.5">•</span>
                <span>O status do item volta para <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[9px] py-0 h-4">pendente</Badge></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A00] mt-0.5">•</span>
                <span>O estoque é restaurado automaticamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#FF8A00] mt-0.5">•</span>
                <span>Os valores da comanda são recalculados em tempo real</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} className="bg-[#FF8A00] text-black font-bold rounded-xl gap-2 flex-1">
          <Save className="w-4 h-4" /> Salvar Configurações
        </Button>
        <Button onClick={handleReset} variant="outline" className="bg-white/5 border-white/10 text-white/60 hover:text-white rounded-xl gap-2">
          <RotateCcw className="w-4 h-4" /> Restaurar Padrão
        </Button>
      </div>
    </div>
  );
};

export default ScannerConfig;
