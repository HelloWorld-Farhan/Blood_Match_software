import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UploadCloud, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Trash2, 
  Check, 
  AlertCircle, 
  Camera, 
  Maximize2,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../services/api';

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  userEmail?: string;
  userName?: string;
  onAvatarUpdated?: (newUrl: string | null) => void;
}

export function AvatarUploadModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userEmail,
  userName = 'Clinician',
  onAvatarUpdated
}: AvatarUploadModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOverZone, setIsDragOverZone] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedImage(null);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setErrorMessage(null);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleFile = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setSelectedImage(result);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverZone(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Mouse / Touch Drag to Reposition (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedImage) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const rotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetFit = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Requirement 1: Compress on hidden canvas (max 800x800px, WebP at 0.88 quality, under 500KB)
  const generateOptimizedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = previewImageRef.current;
      if (!img) {
        reject(new Error('Preview image is not loaded'));
        return;
      }

      const canvas = document.createElement('canvas');
      const targetSize = 800;
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context could not be initialized'));
        return;
      }

      // Fill background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetSize, targetSize);

      ctx.save();
      // Move to center of target canvas
      ctx.translate(targetSize / 2, targetSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Scale pan relative to target canvas size
      const previewBoxSize = 280; // Size of display preview box
      const scaleFactor = targetSize / previewBoxSize;
      ctx.translate(pan.x * scaleFactor, pan.y * scaleFactor);

      // Draw image keeping aspect ratio
      const naturalAspect = img.naturalWidth / img.naturalHeight;
      let drawW = targetSize;
      let drawH = targetSize;

      if (naturalAspect >= 1) {
        drawH = targetSize / naturalAspect;
      } else {
        drawW = targetSize * naturalAspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas compression to WebP failed'));
          }
        },
        'image/webp',
        0.88
      );
    });
  };

  // Requirement 2: Upload to Cloudflare R2 & Dispatch Global Event
  const handleApplyAndSave = async () => {
    if (!selectedImage) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const blob = await generateOptimizedBlob();
      const email = userEmail || sessionStorage.getItem('bloodmatch_user_email') || 'clinician@bloodmatch.io';

      const formData = new FormData();
      formData.append('file', blob, 'avatar.webp');
      formData.append('user_email', email);

      const res = await apiClient.post('/api/v1/auth/avatar', formData, {
        headers: {
          // fetch will automatically set multipart/form-data boundary when Content-Type is omitted
        }
      });

      setIsUploading(false);

      if (!res.ok) {
        setErrorMessage(res.error || 'Failed to upload avatar to Cloudflare R2.');
        return;
      }

      // Requirement 4: Append timestamp query parameter for cache-busting
      const rawUrl = res.data?.photoUrl || '';
      const photoUrl = rawUrl.startsWith('data:') ? rawUrl : `${rawUrl}?v=${Date.now()}`;

      // Persist across local client storage
      localStorage.setItem('bloodmatch_user_avatar', photoUrl);
      sessionStorage.setItem('bloodmatch_user_avatar', photoUrl);

      // Requirement 3: Global Event Dispatch
      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { photoUrl } }));
      window.dispatchEvent(new Event('bloodmatch_profile_updated'));

      if (onAvatarUpdated) {
        onAvatarUpdated(photoUrl);
      }

      onClose();
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err?.message || 'Avatar synchronization connection error.');
    }
  };

  // Requirement 4: Deletion & Remote Reset
  const handleRemovePicture = async () => {
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const email = userEmail || sessionStorage.getItem('bloodmatch_user_email') || '';
      const endpoint = email ? `/api/v1/auth/avatar?user_email=${encodeURIComponent(email)}` : '/api/v1/auth/avatar';
      const res = await apiClient.delete(endpoint);

      setIsUploading(false);

      if (!res.ok) {
        setErrorMessage(res.error || 'Failed to delete avatar from cloud.');
        return;
      }

      localStorage.removeItem('bloodmatch_user_avatar');
      sessionStorage.removeItem('bloodmatch_user_avatar');

      window.dispatchEvent(new CustomEvent('user_avatar_updated', { detail: { photoUrl: null } }));
      window.dispatchEvent(new Event('bloodmatch_profile_updated'));

      if (onAvatarUpdated) {
        onAvatarUpdated(null);
      }

      onClose();
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err?.message || 'Failed to remove avatar.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-white rounded-3xl border border-[#D9C7C2] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9C7C2]/70 bg-[#F5F1EF]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7A0C17] to-[#D72638] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1D20] tracking-tight">
                Profile Avatar & Practitioner Portrait
              </h3>
              <p className="text-[11px] text-[#5A626A]">
                Synchronized across Cloudflare R2 & Clinical Terminals
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 border border-[#D9C7C2] text-slate-500 hover:text-[#D72638] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#D72638] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!selectedImage ? (
            /* Upload Drop Zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOverZone(true); }}
              onDragLeave={() => setIsDragOverZone(false)}
              onDrop={onDrop}
              className={`p-8 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragOverZone 
                  ? 'border-[#D72638] bg-red-50/50 scale-[0.99]' 
                  : 'border-[#D9C7C2] hover:border-[#D72638]/60 bg-[#F5F1EF]/40 hover:bg-[#F5F1EF]'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#7A0C17]/10 border border-[#D72638]/20 text-[#D72638] flex items-center justify-center mb-3 shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-[#1A1D20] mb-1">
                Drag & Drop Profile Picture Here
              </h4>
              <p className="text-xs text-[#5A626A] max-w-xs mb-3 leading-relaxed">
                Supports JPG, PNG, or WEBP under 10MB. Whole-image mode preserves all edges without clipping.
              </p>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-[#D72638] border border-[#D9C7C2] text-xs font-bold shadow-2xs transition-colors"
              >
                Browse Local Storage
              </button>
            </div>
          ) : (
            /* Whole-Image Interactive Canvas & Crop Zone */
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                {/* 1:1 Square & Circular Guide Container (280x280px) */}
                <div 
                  className="relative w-[280px] h-[280px] rounded-2xl bg-slate-900 border-2 border-[#D72638] overflow-hidden flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Circular Mask Outline Guide */}
                  <div className="absolute inset-0 pointer-events-none rounded-full border-2 border-white/40 border-dashed z-20 m-2" />
                  
                  {/* Grid Alignment Reticle */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-20">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>

                  {/* Transformed Image ("Whole Image Mode") */}
                  <img
                    ref={previewImageRef}
                    src={selectedImage}
                    alt="Preview"
                    draggable={false}
                    className="max-w-none transition-transform duration-75 object-contain"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg) translate(${pan.x}px, ${pan.y}px)`,
                      maxHeight: '100%',
                      maxWidth: '100%'
                    }}
                  />
                </div>

                <p className="text-[11px] text-[#5A626A] mt-2 font-medium">
                  Drag with mouse to center • Whole-image canvas fits entire image without edge clipping
                </p>
              </div>

              {/* Interactive Controls: Zoom & Rotate */}
              <div className="p-3.5 rounded-2xl bg-[#F5F1EF] border border-[#D9C7C2] space-y-3">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-500 shrink-0" />
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-[#D72638] cursor-pointer"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs font-mono font-bold text-[#1A1D20] w-12 text-right">
                    {zoom.toFixed(2)}x
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#D9C7C2]/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={rotate90}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#D9C7C2] text-xs font-bold text-[#1A1D20] flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#D72638]" />
                      <span>Rotate 90°</span>
                    </button>

                    <button
                      type="button"
                      onClick={resetFit}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-[#D9C7C2] text-xs font-semibold text-slate-600 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fit</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-[#D72638] hover:underline cursor-pointer"
                  >
                    Select Different File
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-[#D9C7C2]/70 bg-[#F5F1EF]/40 flex flex-wrap items-center justify-between gap-3">
          <div>
            {currentAvatarUrl && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleRemovePicture}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Picture</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-[#D9C7C2] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {selectedImage && (
              <button
                type="button"
                disabled={isUploading}
                onClick={handleApplyAndSave}
                className="px-5 py-2 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold shadow-md shadow-[#D72638]/25 hover:shadow-[#D72638]/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isUploading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Synchronizing with R2...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply & Save Picture</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
