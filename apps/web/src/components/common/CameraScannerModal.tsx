'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { ModalPortal } from '@/components/common/ModalPortal';
import { Camera, X, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
}

function playBeepSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Ignore audio context errors
  }
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan QR Code / Barcode with Camera',
}: CameraScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const elementId = 'camera-qr-barcode-scanner';

    const startScanner = async () => {
      setErrorMsg(null);
      setCameraReady(false);

      try {
        // Clear previous instance if exists
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
          } catch (e) {
            // ignore
          }
          scannerRef.current = null;
        }

        const html5Qrcode = new Html5Qrcode(elementId);
        scannerRef.current = html5Qrcode;

        const config: Html5QrcodeCameraScanConfig = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        await html5Qrcode.start(
          { facingMode },
          config,
          (decodedText) => {
            if (!isMounted) return;
            playBeepSound();
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            setLastScanned(decodedText);
            onScan(decodedText);
          },
          () => {
            // Ignore frame scan failures
          }
        );

        if (isMounted) {
          setCameraReady(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera Scanner Error:', err);
        if (err?.name === 'NotAllowedError' || err?.toString().includes('Permission')) {
          setErrorMsg('Camera permission denied. Please allow camera access in browser settings.');
        } else if (err?.name === 'NotFoundError') {
          setErrorMsg('No camera device found on this device.');
        } else {
          setErrorMsg(err?.message || 'Could not start camera scanner. Please check permissions.');
        }
      }
    };

    // Small delay to ensure modal DOM element is rendered
    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {}).finally(() => {
          scannerRef.current = null;
        });
      }
    };
  }, [isOpen, facingMode, onScan]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[250] flex items-center justify-center p-4 overflow-y-auto font-sans"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shadow-inner">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">{title}</h3>
                <p className="text-[11px] text-slate-400">Position QR code or Barcode inside square</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner Viewport */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden min-h-[280px] flex flex-col items-center justify-center">
            {errorMsg ? (
              <div className="p-6 text-center text-xs space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-rose-300 font-medium">{errorMsg}</p>
                <button
                  type="button"
                  onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Switch Camera
                </button>
              </div>
            ) : (
              <>
                <div id="camera-qr-barcode-scanner" className="w-full max-w-[320px] aspect-square rounded-xl overflow-hidden" />
                {!cameraReady && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                    <p>Initializing device camera...</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Last Scanned Result Notification */}
          {lastScanned && (
            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-400">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="truncate font-mono font-bold">Scanned: {lastScanned}</span>
              </div>
              <span className="text-[10px] uppercase font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300">
                Added
              </span>
            </div>
          )}

          {/* Actions & Switch Camera */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              {facingMode === 'environment' ? 'Switch to Front Cam' : 'Switch to Back Cam'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
            >
              Done Scanning
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
