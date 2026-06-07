'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowRight, ShoppingBag } from 'lucide-react';
import { useRouter } from '../../lib/routerContext';
import { getOrderPaymentStatus, subscribeToOrderPayment } from '../../lib/services/orderService';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';

type VerificationState = 'verifying' | 'success' | 'failed' | 'cancelled' | 'timeout';

interface PaymentPageProps {
  orderId: string;
  waveUrl?: string;
}

const POLLING_INTERVAL_MS = 3000;  // Vérification toutes les 3 secondes
const TIMEOUT_MS          = 5 * 60 * 1000; // 5 minutes max

export default function PaymentVerificationPage({ orderId, waveUrl }: PaymentPageProps) {
  const router          = useRouter();
  const { clearCart }   = useCart();
  const [state, setState]         = useState<VerificationState>('verifying');
  const [transactionId, setTxId]  = useState<string | null>(null);
  const [dots, setDots]           = useState('');

  const startTimeRef    = useRef(Date.now());
  const pollingRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef     = useRef(false);  // Anti double-callback
  const mountedRef      = useRef(true);

  // Animation des points de chargement
  useEffect(() => {
    if (state !== 'verifying') return;
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [state]);

  const resolve = useCallback((
    newState: VerificationState,
    txId?: string | null
  ) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    if (pollingRef.current) clearTimeout(pollingRef.current);
    if (!mountedRef.current) return;

    setState(newState);
    if (txId) setTxId(txId);

    if (newState === 'success') {
      clearCart();
      toast.success('Paiement effectue avec succes !', {
        // icon: '✅',
        position: 'top-center',
        autoClose: 4000,
        style: { fontWeight: 700 },
      });
      // Redirection vers /orders après 2.5s
      setTimeout(() => {
        if (mountedRef.current) router.push('/orders');
      }, 2500);
    } else if (newState === 'failed') {
      toast.error('Le paiement a echoue. Veuillez reessayer.', {
        // icon: '❌',
        position: 'top-center',
        autoClose: 5000,
      });
    } else if (newState === 'cancelled') {
      toast.warn('Paiement annule.', {
        // icon: '⚠️',
        position: 'top-center',
        autoClose: 4000,
      });
    } else if (newState === 'timeout') {
      toast.warn('Verification expiree. Veuillez verifier vos commandes.', {
        position: 'top-center',
        autoClose: 5000,
      });
    }
  }, [clearCart, router]);

  const checkStatus = useCallback(async () => {
    if (resolvedRef.current || !mountedRef.current) return;

    // Timeout global
    if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
      resolve('timeout');
      return;
    }

    try {
      const result = await getOrderPaymentStatus(orderId);
      if (!result || !mountedRef.current) return;

      const { payment_status, transaction_id } = result;

      if (payment_status === 'paid') {
        resolve('success', transaction_id);
      } else if (payment_status === 'failed') {
        resolve('failed');
      } else if (payment_status === 'cancelled') {
        resolve('cancelled');
      } else {
        // Toujours en attente → replanifier
        pollingRef.current = setTimeout(checkStatus, POLLING_INTERVAL_MS);
      }
    } catch (err) {
      console.error('Erreur polling paiement:', err);
      // Ne pas stopper le polling sur une erreur réseau temporaire
      pollingRef.current = setTimeout(checkStatus, POLLING_INTERVAL_MS);
    }
  }, [orderId, resolve]);

  useEffect(() => {
    mountedRef.current = true;
    resolvedRef.current = false;
    startTimeRef.current = Date.now();

    // ── Souscription Realtime (prioritaire) ──
    const channel = subscribeToOrderPayment(orderId, ({ payment_status, transaction_id }) => {
      if (payment_status === 'paid')      resolve('success', transaction_id);
      else if (payment_status === 'failed')    resolve('failed');
      else if (payment_status === 'cancelled') resolve('cancelled');
    });

    // ── Polling en parallèle (filet de sécurité) ──
    // Premier check immédiat
    checkStatus();

    return () => {
      mountedRef.current = false;
      channel.unsubscribe();
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [orderId, checkStatus, resolve]);

  // ─── Rendu ────────────────────────────────────────────────────────────────

  if (state === 'verifying') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        {/* Cercle animé */}
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-full bg-uvci-purple/10 animate-ping" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-uvci-purple to-uvci-green flex items-center justify-center shadow-xl shadow-uvci-purple/20">
            <Loader2 size={44} className="text-white animate-spin" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">
          Verification du paiement{dots}
        </h2>
        <p className="text-gray-500 max-w-xs leading-relaxed">
          Nous attendons la confirmation de votre paiement Wave. Cette page se met a jour automatiquement.
        </p>

        {/* Barre de progression */}
        <div className="w-64 h-1.5 bg-gray-100 rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-uvci-purple to-uvci-green rounded-full animate-[progress_3s_ease-in-out_infinite]" />
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Ref. commande : <span className="font-mono font-bold">#{orderId.slice(0, 8).toUpperCase()}</span>
        </p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-28 h-28 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-200">
          <CheckCircle2 size={60} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Paiement reussi !</h2>
        <p className="text-gray-500 mb-6 max-w-xs">
          Votre commande a ete confirmee et transmise au restaurant.
        </p>
        {transactionId && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-6">
            <p className="text-xs text-gray-400">ID Transaction</p>
            <p className="font-mono text-sm font-bold text-gray-700">{transactionId}</p>
          </div>
        )}
        <p className="text-sm text-gray-400 animate-pulse">Redirection vers vos commandes...</p>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition"
        >
          <ShoppingBag size={18} /> Voir mes commandes <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (state === 'failed' || state === 'timeout') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-28 h-28 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-red-100">
          <XCircle size={60} className="text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
          {state === 'timeout' ? 'Verification expiree' : 'Paiement echoue'}
        </h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          {state === 'timeout'
            ? 'Nous n\'avons pas pu confirmer votre paiement. Verifiez vos commandes ou reessayez.'
            : 'Le paiement a echoue ou a ete refuse. Votre commande n\'a pas ete transmise au restaurant.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {waveUrl && (
            <a
              href={waveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition"
            >
              <RefreshCw size={18} /> Reessayer avec Wave
            </a>
          )}
          <button
            onClick={() => router.push('/menu')}
            className="flex-1 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
          >
            Retour au menu
          </button>
        </div>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Voir mes commandes
        </button>
      </div>
    );
  }

  if (state === 'cancelled') {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-28 h-28 bg-orange-100 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-100">
          <AlertTriangle size={60} className="text-orange-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Paiement annule</h2>
        <p className="text-gray-500 mb-8 max-w-sm">
          Vous avez annule le paiement. Votre commande n'a pas ete transmise au restaurant. Vous pouvez relancer le paiement depuis votre panier.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {waveUrl && (
            <a
              href={waveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition"
            >
              <RefreshCw size={18} /> Relancer le paiement
            </a>
          )}
          <button
            onClick={() => router.push('/menu')}
            className="flex-1 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
