import { useMemo } from 'react';
import { CheckCircle2, Send, Package } from 'lucide-react';

interface QRCodeProps {
  value: string;
  size?: number;
  itemName?: string;
  itemPrice?: number;
  type: 'order' | 'delivery';
}

const QRCode = ({ value, size = 180, itemName, itemPrice, type }: QRCodeProps) => {
  const pattern = useMemo(() => {
    const grid: boolean[][] = [];
    const gridSize = 25;
    
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        if (i < 7 && j < 7) grid[i][j] = true;
        else if (i < 7 && j >= gridSize - 7) grid[i][j] = true;
        else if (i >= gridSize - 7 && j < 7) grid[i][j] = true;
        else {
          const hash = (value.charCodeAt((i + j) % value.length) * (i + 1) * (j + 1)) % 100;
          grid[i][j] = hash > 45;
        }
      }
    }

    for (let i = 1; i < 6; i++) {
      for (let j = 1; j < 6; j++) {
        if (i > 1 && i < 5 && j > 1 && j < 5) {
          grid[i][j] = true;
        } else if (i === 1 || i === 5 || j === 1 || j === 5) {
          grid[i][j] = false;
        }
      }
    }

    for (let i = 1; i < 6; i++) {
      for (let j = gridSize - 6; j < gridSize - 1; j++) {
        if (i > 1 && i < 5 && j > gridSize - 6 && j < gridSize - 2) {
          grid[i][j] = true;
        } else if (i === 1 || i === 5 || j === gridSize - 6 || j === gridSize - 2) {
          grid[i][j] = false;
        }
      }
    }

    for (let i = gridSize - 6; i < gridSize - 1; i++) {
      for (let j = 1; j < 6; j++) {
        if (i > gridSize - 6 && i < gridSize - 2 && j > 1 && j < 5) {
          grid[i][j] = true;
        } else if (i === gridSize - 6 || i === gridSize - 2 || j === 1 || j === 5) {
          grid[i][j] = false;
        }
      }
    }

    return grid;
  }, [value]);

  const cellSize = size / 25;
  
  const isOrder = type === 'order';
  const bgColor = isOrder ? 'from-blue-500 to-cyan-500' : 'from-primary to-accent';
  const iconBg = isOrder ? 'bg-blue-500' : 'bg-primary';

  return (
    <div className="flex flex-col items-center">
      {/* Type badge */}
      <div className={`mb-3 px-4 py-1.5 rounded-full bg-gradient-to-r ${bgColor} text-primary-foreground text-xs font-semibold uppercase tracking-wider flex items-center gap-2`}>
        {isOrder ? (
          <>
            <Send className="w-3 h-3" />
            QR de Pedido
          </>
        ) : (
          <>
            <Package className="w-3 h-3" />
            QR de Entrega
          </>
        )}
      </div>

      {/* Item info */}
      {itemName && (
        <div className="mb-3 text-center">
          <p className="text-base font-semibold text-foreground">{itemName}</p>
          {itemPrice && (
            <p className={`font-bold ${isOrder ? 'text-blue-400' : 'text-primary'}`}>
              R$ {itemPrice.toFixed(2)}
            </p>
          )}
        </div>
      )}
      
      {/* QR Code */}
      <div 
        className={`bg-foreground rounded-2xl p-3 relative ${
          isOrder 
            ? 'shadow-[0_0_30px_hsl(200_100%_50%_/_0.3)]' 
            : 'shadow-[0_0_30px_hsl(38_92%_50%_/_0.3)]'
        }`}
        style={{ width: size + 24, height: size + 24 }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {pattern.map((row, i) =>
            row.map((cell, j) =>
              cell ? (
                <rect
                  key={`${i}-${j}`}
                  x={j * cellSize}
                  y={i * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="hsl(0 0% 4%)"
                />
              ) : null
            )
          )}
        </svg>
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center shadow-lg`}>
            {isOrder ? (
              <Send className="w-5 h-5 text-white" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className={`mt-3 flex items-center gap-2 text-xs ${isOrder ? 'text-blue-400' : 'text-green-400'}`}>
        {isOrder ? (
          <>
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>Aguardando leitura do bar</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3" />
            <span>Pronto para retirada</span>
          </>
        )}
      </div>

      {/* Code display */}
      <div className="mt-2 px-3 py-1.5 bg-secondary rounded-lg">
        <p className="text-[10px] font-mono text-muted-foreground tracking-wider">
          {value.slice(0, 6).toUpperCase()}...{value.slice(-4).toUpperCase()}
        </p>
      </div>
    </div>
  );
};

export default QRCode;
