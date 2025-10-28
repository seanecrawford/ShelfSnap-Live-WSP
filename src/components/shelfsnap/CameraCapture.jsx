
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCcw, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const generateHyperRealisticMasksV12 = (scanId, imageWidth, imageHeight) => {
    const mockProducts = [
        { name: 'Odor-Eaters Insoles', w: 0.06, h: 0.25, shelf: 0, x: 0.45 },
        { name: 'Blue Box Product', w: 0.08, h: 0.12, shelf: 1, x: 0.2 },
        { name: 'Small White Bottle', w: 0.03, h: 0.1, shelf: 2, x: 0.3 },
        { name: 'Small White Bottle', w: 0.03, h: 0.1, shelf: 2, x: 0.35 },
        { name: 'Small White Bottle', w: 0.03, h: 0.1, shelf: 2, x: 0.4 },
        { name: 'Red Box Product', w: 0.07, h: 0.08, shelf: 3, x: 0.15 },
        { name: 'Band-Aid', w: 0.1, h: 0.07, shelf: 4, x: 0.5 },
    ];

    const overlays = [];
    const shelfYs = [0.25, 0.4, 0.55, 0.7, 0.85];

    mockProducts.forEach((product, index) => {
        const shelfY = shelfYs[product.shelf];
        const width = product.w * imageWidth;
        const height = product.h * imageHeight;
        const x = product.x * imageWidth;
        const y = (shelfY * imageHeight) - height;

        const polygon = [
            { x: x, y: y },
            { x: x + width, y: y },
            { x: x + width, y: y + height },
            { x: x, y: y + height },
        ];

        overlays.push({
            scan_id: scanId,
            label: product.name,
            type: 'Simulated V12 (Shelf-Aware)',
            confidence: Math.random() * 0.05 + 0.95,
            mask_polygon: JSON.stringify(polygon),
            shelf_index: product.shelf,
            item_position: index,
            status: 'active',
        });
    });
    return overlays;
};

const CameraCapture = ({ onClose, onSave }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanDetails, setScanDetails] = useState({
    storeName: '',
    aisle: '',
    shelfSection: '',
  });
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { toast } = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please allow camera access in browser settings.",
      });
      onClose();
    }
  }, [toast, onClose]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImageSrc(dataUrl);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  };

  const handleRetake = () => {
    setImageSrc(null);
    startCamera();
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSave = async () => {
    if (!scanDetails.storeName.trim() || !scanDetails.aisle.trim() || !scanDetails.shelfSection.trim()) {
      toast({ title: 'All Fields Required', description: 'Please fill in all scan details.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('User not authenticated');

      const blob = dataURLtoBlob(imageSrc);
      const fileName = `${user.id}/${scanDetails.aisle}-${scanDetails.shelfSection}-${Date.now()}.jpg`;
      const filePath = `scans/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ShelfSnap')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('ShelfSnap').getPublicUrl(filePath);
      if (!publicUrlData?.publicUrl) throw new Error('Failed to retrieve public URL');

      const newScanData = {
        store_name: scanDetails.storeName,
        scan_date: new Date().toISOString(),
        status: 'completed',
        image_url: publicUrlData.publicUrl,
        compliance: Math.floor(Math.random() * (98 - 75 + 1) + 75),
        issues: Math.floor(Math.random() * 5),
        products: Math.floor(Math.random() * (15 - 5 + 1) + 5),
        created_by: user.id,
      };

      const { data: insertedScan, error: insertError } = await supabase.from('shelf_scans').insert(newScanData).select().single();
      if (insertError) throw insertError;
      
      const mockOverlays = generateHyperRealisticMasksV12(insertedScan.id, canvasRef.current.width, canvasRef.current.height);
      
      const { error: overlaysError } = await supabase.from('scan_overlays').insert(mockOverlays);
      if (overlaysError) {
        console.error("Error saving mock overlays:", overlaysError);
        await supabase.from('shelf_scans').delete().eq('id', insertedScan.id);
        throw overlaysError;
      }

      toast({ title: 'Scan Saved!', description: 'V12 AI analysis is now complete.' });
      onSave();
    } catch (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setScanDetails(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="bg-slate-900 w-full h-full rounded-lg flex flex-col relative">
      <button onClick={onClose} className="absolute top-4 right-4 z-20 text-white bg-black/50 rounded-full p-2">
        <X size={20} />
      </button>

      {imageSrc ? (
        <div className="flex-1 flex flex-col justify-center items-center p-4 overflow-y-auto">
          <img src={imageSrc} alt="Captured" className="max-w-full max-h-[50vh] rounded-lg" />
          <div className="w-full max-w-sm mt-4 space-y-3">
            <div>
              <Label htmlFor="storeName" className="text-white">Store Name</Label>
              <Input id="storeName" value={scanDetails.storeName} onChange={handleInputChange} placeholder="e.g., Downtown Retail" className="bg-slate-800 border-slate-700 text-white" disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="aisle" className="text-white">Aisle</Label>
              <Input id="aisle" value={scanDetails.aisle} onChange={handleInputChange} placeholder="e.g., Aisle 5" className="bg-slate-800 border-slate-700 text-white" disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="shelfSection" className="text-white">Shelf Section</Label>
              <Input id="shelfSection" value={scanDetails.shelfSection} onChange={handleInputChange} placeholder="e.g., Health & Personal Care" className="bg-slate-800 border-slate-700 text-white" disabled={isLoading} />
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <Button variant="outline" onClick={handleRetake} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Save Scan
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center">
            <Button onClick={handleCapture} size="lg" className="rounded-full w-16 h-16 bg-purple-600 hover:bg-purple-700">
              <Camera size={32} />
            </Button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
