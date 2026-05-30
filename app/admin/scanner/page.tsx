'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from '../../../lib/routerContext';
import { verifyQRToken, confirmPickup } from '../../../lib/services/qrService';
import { Card3D } from '../../../components/ui/Card3D';
import { Button3D } from '../../../components/ui/Button3D';
import type { Order } from '../../../types/index';
import { Camera, CheckCircle, XCircle, ArrowLeft, Loader2, ScanLine, QrCode } from 'lucide-react';
import { toast } from 'react-toastify';

type ScanState = 'idle' | 'scanning' | 'found' | 'invalid' | 'confirming' | 'done';

export default function QRScannerPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<ScanState>('idle');
  const [order, setOrder]  = useState<Order | null>(null);
  const [manualToken, setManual] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (profile?.role !== 'admin') {
    return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl mb-4">🔒</p>
      <p className="font-bold text-gray-700">Accès réservé aux administrateurs</p>
    </div>;
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setState('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Importer jsQR dynamiquement
      const { default: jsQR } = await import('https://esm.sh/jsqr@1.4.0' as any);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      let scanning = true;

      const scan = () => {
        if (!scanning || !videoRef.current) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          canvas.width  = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(img.data, img.width, img.height);
          if (code?.data) {
            scanning = false;
            stopCamera();
            handleToken(code.data);
            return;
          }
        }
        requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch {
      setState('idle');
      toast.error('Impossible d\'accéder à la caméra');
    }
  };

  useEffect(() => () => stopCamera(), []);

  const handleToken = async (token: string) => {
    setState('scanning');
    try {
      const found = await verifyQRToken(token);
      if (!found) { setState('invalid'); return; }
      if (found.qr_used) { setState('invalid'); toast.warning('Ce QR a déjà été utilisé'); return; }
      if (!['ready', 'paid', 'preparing'].includes(found.status)) {
        setState('invalid'); toast.warning(`Statut invalide : ${found.status}`); return;
      }
      setOrder(found);
      setState('found');
    } catch {
      setState('invalid');
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    setState('confirming');
    try {
      await confirmPickup(order.id);
      setState('done');
      toast.success('Retrait confirmé !');
    } catch (e: any) {
      toast.error(e.message);
      setState('found');
    }
  };

  const reset = () => { setState('idle'); setOrder(null); setManual(''); };

  const STATUS_LABELS: Record<string, string> = {
    pending_payment: 'En attente de paiement', paid: 'Payée', preparing: 'En préparation',
    ready: 'Prête ✅', completed: 'Récupérée', pending: 'En attente',
  };

  return (
    <div className="container mx-auto px-4 pt-6 pb-20 max-w-md">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/admin')} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-uvci-purple transition"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><QrCode size={24} className="text-uvci-purple" /> Scanner QR</h1>
      </div>

      {/* IDLE */}
      {state === 'idle' && (
        <Card3D className="p-6 space-y-4">
          <div className="text-center">
            <div className="w-20 h-20 bg-uvci-purple/10 rounded-3xl flex items-center justify-center mx-auto mb-4"><ScanLine size={40} className="text-uvci-purple" /></div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Scanner le QR de retrait</h2>
            <p className="text-sm text-gray-500">Scannez le QR présenté par le client ou entrez le token manuellement.</p>
          </div>
          <Button3D variant="primary" fullWidth onClick={startCamera}><Camera size={18} className="mr-2" /> Activer la caméra</Button3D>
          <div className="relative flex items-center gap-2"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">ou</span><div className="flex-1 h-px bg-gray-200" /></div>
          <div className="flex gap-2">
            <input value={manualToken} onChange={e => setManual(e.target.value)} placeholder="Token UUID..." className="flex-1 p-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-uvci-purple" />
            <button onClick={() => handleToken(manualToken.trim())} disabled={!manualToken} className="px-4 py-2.5 bg-uvci-purple text-white font-bold rounded-xl text-sm disabled:opacity-40">OK</button>
          </div>
        </Card3D>
      )}

      {/* SCANNING */}
      {state === 'scanning' && (
        <Card3D className="p-4 space-y-4">
          <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white/80 rounded-2xl" />
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center text-white text-xs font-medium">Pointez vers le QR code</div>
          </div>
          <Button3D variant="ghost" fullWidth onClick={() => { stopCamera(); setState('idle'); }}>Annuler</Button3D>
        </Card3D>
      )}

      {/* INVALID */}
      {state === 'invalid' && (
        <Card3D className="p-8 text-center">
          <XCircle size={56} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">QR invalide</h2>
          <p className="text-sm text-gray-500 mb-6">Ce QR n'est pas valide ou la commande n'est pas prête.</p>
          <Button3D variant="primary" fullWidth onClick={reset}>Réessayer</Button3D>
        </Card3D>
      )}

      {/* FOUND */}
      {state === 'found' && order && (
        <Card3D className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle size={28} className="text-uvci-green" />
            <div><p className="font-extrabold text-gray-800">Commande trouvée</p><p className="text-xs text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</p></div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {order.order_items?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm"><span className="text-gray-700 font-medium">{item.quantity}× {item.menu_items?.name}</span><span className="text-gray-500">{((item.price_at_order ?? 0) * item.quantity).toLocaleString()} F</span></div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-uvci-purple"><span>Total</span><span>{order.total_price.toLocaleString()} FCFA</span></div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Statut</span>
            <span className="font-bold text-gray-700">{STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button3D variant="ghost" onClick={reset}>Annuler</Button3D>
            <Button3D variant="primary" onClick={handleConfirm}><CheckCircle size={16} className="mr-1" /> Confirmer</Button3D>
          </div>
        </Card3D>
      )}

      {/* CONFIRMING */}
      {state === 'confirming' && (
        <Card3D className="p-8 text-center"><Loader2 size={40} className="animate-spin text-uvci-purple mx-auto mb-4" /><p className="font-bold text-gray-700">Confirmation en cours…</p></Card3D>
      )}

      {/* DONE */}
      {state === 'done' && (
        <Card3D className="p-8 text-center">
          <CheckCircle size={56} className="text-uvci-green mx-auto mb-4" />
          <h2 className="text-lg font-extrabold text-gray-800 mb-2">Retrait confirmé !</h2>
          <p className="text-sm text-gray-500 mb-6">La commande est marquée comme récupérée.</p>
          <div className="grid grid-cols-2 gap-3">
            <Button3D variant="ghost" onClick={reset}>Nouveau scan</Button3D>
            <Button3D variant="primary" onClick={() => router.push('/admin')}>Dashboard</Button3D>
          </div>
        </Card3D>
      )}
    </div>
  );
}
