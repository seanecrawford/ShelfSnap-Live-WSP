import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, AlertCircle, CheckCircle, Loader2, Package, Grid3x3 } from 'lucide-react';

const ShelfSnapPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [detections, setDetections] = useState([]);
  const [processedDetections, setProcessedDetections] = useState([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    uniqueProducts: 0,
    outOfStock: 0,
    lowStock: 0,
    complianceRate: 0
  });

  const [selectedStore, setSelectedStore] = useState('');
  const [stores] = useState([
    { id: 'store-1', name: 'Store #001 - Downtown' },
    { id: 'store-2', name: 'Store #002 - Mall' },
    { id: 'store-3', name: 'Store #003 - Airport' }
  ]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const DEBUG_MODE = process.env.REACT_APP_DEBUG === 'true';

  // Utility function to calculate Intersection over Union
  const calculateIOU = (box1, box2) => {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    if (x2 < x1 || y2 < y1) return 0;
    
    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;
    
    return intersection / union;
  };

  // Non-Maximum Suppression to remove duplicate detections
  const nonMaximumSuppression = (detections, iouThreshold = 0.5) => {
    if (!detections || detections.length === 0) return [];
    
    // Sort by confidence score
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    const selected = [];
    
    while (sorted.length > 0) {
      const current = sorted.shift();
      selected.push(current);
      
      // Remove overlapping detections
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (calculateIOU(current, sorted[i]) > iouThreshold) {
          sorted.splice(i, 1);
        }
      }
    }
    
    return selected;
  };

  // Process raw detections
  const processDetections = (rawDetections) => {
    // Filter by confidence first
    const confident = rawDetections.filter(d => d.confidence > 0.6);
    
    // Apply NMS to remove duplicates
    const deduplicated = nonMaximumSuppression(confident, 0.4);
    
    // Group by product type for statistics
    const productGroups = {};
    deduplicated.forEach(det => {
      const label = det.label || 'unknown';
      if (!productGroups[label]) {
        productGroups[label] = [];
      }
      productGroups[label].push(det);
    });
    
    // Calculate stats
    const newStats = {
      totalProducts: deduplicated.length,
      uniqueProducts: Object.keys(productGroups).length,
      outOfStock: 0, // This would need planogram comparison
      lowStock: 0, // This would need threshold definition
      complianceRate: 0 // This would need planogram comparison
    };
    
    setStats(newStats);
    setProcessedDetections(deduplicated);
    
    if (DEBUG_MODE) {
      console.log('Raw detections:', rawDetections.length);
      console.log('After confidence filter:', confident.length);
      console.log('After NMS:', deduplicated.length);
      console.log('Product groups:', productGroups);
    }
    
    return deduplicated;
  };

  // FIXED: Proper bounding box drawing with correct coordinate scaling
  const drawBoundingBoxes = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !processedDetections.length) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image first
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Get actual displayed dimensions vs natural dimensions
    const displayWidth = canvas.width;
    const displayHeight = canvas.height;
    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    
    // Calculate scale factors
    const scaleX = displayWidth / naturalWidth;
    const scaleY = displayHeight / naturalHeight;
    
    if (DEBUG_MODE) {
      console.log('Canvas dimensions:', displayWidth, displayHeight);
      console.log('Image natural dimensions:', naturalWidth, naturalHeight);
      console.log('Scale factors:', scaleX, scaleY);
    }
    
    // Draw each detection box
    processedDetections.forEach((detection, index) => {
      // Scale coordinates from model space to canvas space
      // Assuming detection coordinates are in natural image space (0 to naturalWidth/Height)
      const scaledBox = {
        x: detection.x * scaleX,
        y: detection.y * scaleY,
        width: detection.width * scaleX,
        height: detection.height * scaleY
      };
      
      // Choose color based on confidence
      const confidence = detection.confidence || 0.5;
      if (confidence > 0.8) {
        ctx.strokeStyle = '#00ff00'; // Green for high confidence
      } else if (confidence > 0.6) {
        ctx.strokeStyle = '#ffff00'; // Yellow for medium confidence
      } else {
        ctx.strokeStyle = '#ff9900'; // Orange for low confidence
      }
      
      // Draw bounding box
      ctx.lineWidth = 2;
      ctx.strokeRect(
        scaledBox.x,
        scaledBox.y,
        scaledBox.width,
        scaledBox.height
      );
      
      // Draw semi-transparent fill
      ctx.fillStyle = ctx.strokeStyle + '20'; // Add alpha
      ctx.fillRect(
        scaledBox.x,
        scaledBox.y,
        scaledBox.width,
        scaledBox.height
      );
      
      // Add label with background
      const label = detection.label || 'Product';
      const confidenceText = `${(confidence * 100).toFixed(1)}%`;
      const fullLabel = `${label} (${confidenceText})`;
      
      ctx.font = '12px Arial';
      const textWidth = ctx.measureText(fullLabel).width;
      
      // Background for text
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(
        scaledBox.x,
        scaledBox.y - 18,
        textWidth + 6,
        16
      );
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(
        fullLabel,
        scaledBox.x + 3,
        scaledBox.y - 5
      );
      
      // Add index number for debugging
      if (DEBUG_MODE) {
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(
          `#${index + 1}`,
          scaledBox.x + scaledBox.width - 20,
          scaledBox.y + scaledBox.height - 5
        );
      }
    });
    
    // Draw statistics overlay if in debug mode
    if (DEBUG_MODE) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 200, 80);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = '14px monospace';
      ctx.fillText(`Total Detections: ${processedDetections.length}`, 20, 30);
      ctx.fillText(`Unique Products: ${stats.uniqueProducts}`, 20, 50);
      ctx.fillText(`Scale: ${scaleX.toFixed(2)}x${scaleY.toFixed(2)}`, 20, 70);
    }
  }, [processedDetections, stats, DEBUG_MODE]);

  // Redraw when detections change
  useEffect(() => {
    if (imageUrl && processedDetections.length > 0) {
      drawBoundingBoxes();
    }
  }, [processedDetections, imageUrl, drawBoundingBoxes]);

  // Handle image load
  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image) return;
    
    // Set canvas size to match image aspect ratio
    const maxWidth = 800;
    const maxHeight = 600;
    
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    
    // Scale down if needed
    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = maxWidth;
        height = maxWidth / aspectRatio;
      } else {
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Initial draw
    drawBoundingBoxes();
  };

  // File validation
  const validateFile = (file) => {
    if (!file) {
      throw new Error('No file selected');
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Please upload a JPEG, PNG, or WebP image');
    }
    
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size must be less than 10MB');
    }
    
    return true;
  };

  // Handle file selection
  const handleFileSelect = async (file) => {
    try {
      setError('');
      setSuccess('');
      
      validateFile(file);
      
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      
      // Clear previous detections
      setDetections([]);
      setProcessedDetections([]);
      
    } catch (err) {
      setError(err.message);
      console.error('File selection error:', err);
    }
  };

  // Upload to Supabase
  const uploadToSupabase = async (file) => {
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${selectedStore}/${timestamp}_${sanitizedFileName}`;
    
    const { data, error } = await supabase.storage
      .from('shelf-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('shelf-images')
      .getPublicUrl(filePath);
    
    return { filePath, publicUrl };
  };

  // Analyze image (mock detection for now)
  const analyzeImage = async () => {
    // This is where you'd call your actual ML model
    // For now, returning mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate mock detections based on image dimensions
        const image = imageRef.current;
        if (!image) {
          resolve([]);
          return;
        }
        
        const mockDetections = [];
        const rows = 4;
        const cols = 8;
        const margin = 50;
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Randomly skip some products (empty slots)
            if (Math.random() > 0.85) continue;
            
            // Generate slightly overlapping boxes to test NMS
            const baseX = margin + (col * (image.naturalWidth - 2 * margin) / cols);
            const baseY = margin + (row * (image.naturalHeight - 2 * margin) / rows);
            
            mockDetections.push({
              x: baseX + (Math.random() - 0.5) * 20,
              y: baseY + (Math.random() - 0.5) * 20,
              width: 80 + (Math.random() - 0.5) * 20,
              height: 100 + (Math.random() - 0.5) * 20,
              confidence: 0.5 + Math.random() * 0.5,
              label: `Product_${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
              sku: `SKU${1000 + Math.floor(Math.random() * 9000)}`
            });
            
            // Add duplicate detection 30% of the time (to test NMS)
            if (Math.random() > 0.7) {
              mockDetections.push({
                x: baseX + (Math.random() - 0.5) * 10,
                y: baseY + (Math.random() - 0.5) * 10,
                width: 80 + (Math.random() - 0.5) * 10,
                height: 100 + (Math.random() - 0.5) * 10,
                confidence: 0.5 + Math.random() * 0.3,
                label: `Product_${String.fromCharCode(65 + Math.floor(Math.random() * 5))}`,
                sku: `SKU${1000 + Math.floor(Math.random() * 9000)}`
              });
            }
          }
        }
        
        resolve(mockDetections);
      }, 2000); // Simulate processing time
    });
  };

  // Handle analysis
  const handleAnalyze = async () => {
    if (!imageFile || !selectedStore) {
      setError('Please select an image and store first');
      return;
    }
    
    setLoading(true);
    setAnalyzing(true);
    setError('');
    
    try {
      // Upload image
      const { filePath, publicUrl } = await uploadToSupabase(imageFile);
      
      // Analyze image
      const rawDetections = await analyzeImage();
      setDetections(rawDetections);
      
      // Process detections (NMS, filtering, etc.)
      const processed = processDetections(rawDetections);
      
      // Save to database
      const { data: scanData, error: scanError } = await supabase
        .from('shelf_scans')
        .insert({
          user_id: user.id,
          store_id: selectedStore,
          image_url: publicUrl,
          image_path: filePath,
          detections: processed,
          stats: stats,
          raw_detections: rawDetections,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (scanError) throw scanError;
      
      setSuccess(`Analysis complete! Found ${processed.length} products.`);
      
      // Redirect to results after a short delay
      setTimeout(() => {
        navigate(`/scan-results/${scanData.id}`);
      }, 2000);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze image');
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, []);

  // Clean up drag counter on unmount
  useEffect(() => {
    return () => {
      dragCounter.current = 0;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center">
            <Camera className="mr-2" />
            Shelf Snap Analysis
          </h1>
          
          {/* Store Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Store
            </label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select a store --</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>
          
          {/* Upload Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            
            {!imageUrl ? (
              <div>
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg mb-2">
                  Drag and drop your shelf image here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-500 mt-4">
                  Supported formats: JPEG, PNG, WebP (max 10MB)
                </p>
              </div>
            ) : (
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="max-w-full mx-auto border border-gray-300 rounded"
                />
                <img
                  ref={imageRef}
                  src={imageUrl}
                  onLoad={handleImageLoad}
                  className="hidden"
                  alt="Shelf"
                />
                <button
                  onClick={() => {
                    setImageUrl(null);
                    setImageFile(null);
                    setDetections([]);
                    setProcessedDetections([]);
                  }}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Choose Different Image
                </button>
              </div>
            )}
          </div>
          
          {/* Statistics */}
          {processedDetections.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <Package className="h-8 w-8 text-blue-600 mb-2" />
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-sm text-gray-600">Total Products</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <Grid3x3 className="h-8 w-8 text-green-600 mb-2" />
                <p className="text-2xl font-bold">{stats.uniqueProducts}</p>
                <p className="text-sm text-gray-600">Unique SKUs</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600 mb-2" />
                <p className="text-2xl font-bold">{stats.lowStock}</p>
                <p className="text-sm text-gray-600">Low Stock</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <AlertCircle className="h-8 w-8 text-red-600 mb-2" />
                <p className="text-2xl font-bold">{stats.outOfStock}</p>
                <p className="text-sm text-gray-600">Out of Stock</p>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          {imageUrl && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleAnalyze}
                disabled={loading || !selectedStore}
                className={`px-6 py-3 rounded-md text-white font-medium transition-colors flex items-center ${
                  loading || !selectedStore
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Analyze Shelf
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                {error}
              </p>
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                {success}
              </p>
            </div>
          )}
          
          {/* Debug Info */}
          {DEBUG_MODE && detections.length > 0 && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md">
              <h3 className="font-bold mb-2">Debug Information</h3>
              <p>Raw Detections: {detections.length}</p>
              <p>Processed Detections: {processedDetections.length}</p>
              <p>Removed Duplicates: {detections.length - processedDetections.length}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-600">View Detection Data</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(processedDetections, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShelfSnapPage;
