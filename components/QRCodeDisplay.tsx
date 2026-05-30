import React, { useEffect, useRef } from 'react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 180 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    import('https://esm.sh/qrcode@1.5.3' as any).then(({ default: QRCode }: any) => {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: '#7D2E8D', light: '#FFFFFF' },
      });
    }).catch(console.error);
  }, [value, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded-xl border-4 border-uvci-purple/10" />
      <p className="text-xs font-mono text-gray-400 select-all">{value.slice(0, 8).toUpperCase()}…</p>
    </div>
  );
};
