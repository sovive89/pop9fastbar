import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';

interface QRCodeProps {
  value: string;
  size?: number;
  itemName?: string;
  itemPrice?: number;
}

const QRCode = ({ value, size = 200, itemName, itemPrice }: QRCodeProps) => {
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

  return (
    <div className="flex flex-col items-center">
      {/* Item info header */}
      {itemName && (
        <div className="mb-4 text-center">
          <p className="text-lg font-semibold text-foreground">{itemName}</p>
          {itemPrice && (
            <p className="text-primary font-bold">R$ {itemPrice.toFixed(2)}</p>
          )}
        </div>
      )}
      
      {/* QR Code */}
      <div 
        className="bg-foreground rounded-2xl p-4 shadow-[0_0_40px_hsl(38_92%_50%_/_0.3)] relative"
        style={{ width: size + 32, height: size + 32 }}
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
        
        {/* Center logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-lg">
            <span className="text-xl font-display font-bold text-primary-foreground">N</span>
          </div>
        </div>
      </div>

      {/* Confirmation badge */}
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-green-500" />
        <span>Válido para retirada</span>
      </div>

      {/* Code display */}
      <div className="mt-2 px-4 py-2 bg-secondary rounded-lg">
        <p className="text-xs font-mono text-muted-foreground tracking-wider">
          {value.slice(0, 8).toUpperCase()}...{value.slice(-4).toUpperCase()}
        </p>
      </div>
    </div>
  );
};

export default QRCode;
