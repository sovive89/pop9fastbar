import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALERT_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGYcBh+P0NvdqFwTABqG0NnhsWQYABaC0djhsWQYABaC0djktG8kCBN/y9XfrmAXAhN/y9XiqmMdERV/y9XiqmMdERV/y9XiqmMdERV/y9XiqmMdEQ==';

/**
 * Hook that subscribes to realtime changes on menu_items
 * and shows toast notifications when stock hits the alert threshold.
 * Use on any authenticated staff page.
 */
export function useStockAlerts(enabled = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new Audio(ALERT_SOUND_URL);
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('stock-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          const item = payload.new as {
            id: string;
            name: string;
            stock_quantity: number;
            stock_alert_threshold: number;
          };

          const stock = item.stock_quantity ?? -1;
          const threshold = item.stock_alert_threshold ?? 5;

          // Skip unlimited stock
          if (stock === -1) return;

          // Only alert when crossing threshold or hitting zero
          const old = payload.old as { stock_quantity?: number };
          const prevStock = old?.stock_quantity ?? -1;
          if (prevStock === -1) return;

          const wasAbove = prevStock > threshold;
          const isAtOrBelow = stock <= threshold;
          const isZero = stock === 0;
          const wasNotZero = prevStock > 0;

          // Avoid duplicate notifications for same item
          const alertKey = `${item.id}-${isZero ? 'out' : 'low'}`;

          if (isZero && wasNotZero && !notifiedRef.current.has(alertKey)) {
            notifiedRef.current.add(alertKey);
            playSound();
            toast.error(`🚨 ${item.name} — ESGOTADO!`, {
              description: 'Item foi desativado automaticamente.',
              duration: 10000,
            });
            // Clear after 60s to allow re-notification
            setTimeout(() => notifiedRef.current.delete(alertKey), 60000);
          } else if (wasAbove && isAtOrBelow && !isZero && !notifiedRef.current.has(alertKey)) {
            notifiedRef.current.add(alertKey);
            playSound();
            toast.warning(`⚠️ ${item.name} — Estoque baixo!`, {
              description: `Apenas ${stock} unidade(s) restante(s). Alerta: ${threshold}`,
              duration: 8000,
            });
            setTimeout(() => notifiedRef.current.delete(alertKey), 60000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, playSound]);
}
