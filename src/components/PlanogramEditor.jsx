// components/PlanogramEditor.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Grid3x3,
  Package,
  AlertTriangle,
  CheckCircle,
  Save,
  Download,
  Upload,
  Trash2,
  Edit2,
  Move,
  Copy,
  Layers,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Settings,
  Info,
  Lock,
  Unlock,
  RefreshCw,
  Loader2
} from 'lucide-react';

const PlanogramEditor = ({ storeId, shelfId, initialPlanogram = null, scanData = null }) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Editor settings
  const GRID_SIZE = 20; // pixels
  const SLOT_WIDTH = 60; // pixels
  const SLOT_HEIGHT = 80; // pixels
  const SHELF_LEVELS = 5; // number of shelf levels
  const SLOTS_PER_LEVEL = 12; // slots per shelf level
  
  // Editor state
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showDiscrepancies, setShowDiscrepancies] = useState(true);
  const [editMode, setEditMode] = useState('move'); // 'move', 'add', 'delete', 'resize'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Planogram data
  const [planogram, setPlanogram] = useState({
    id: null,
    name: 'New Planogram',
    storeId: storeId,
    shelfId: shelfId,
    width: SLOTS_PER_LEVEL * SLOT_WIDTH,
    height: SHELF_LEVELS * SLOT_HEIGHT,
    products: [],
    shelves: [],
    metadata: {
      gridSize: GRID_SIZE,
      slotWidth: SLOT_WIDTH,
      slotHeight: SLOT_HEIGHT,
      created: new Date().toISOString(),
      lastModified: new Date().toISOString()
    }
  });
  
  // Detected products from scan
  const [detectedProducts, setDetectedProducts] = useState([]);
  
  // Discrepancies between planogram and detected
  const [discrepancies, setDiscrepancies] = useState([]);
  
  // Product library
  const [productLibrary, setProductLibrary] = useState([]);
  
  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Initialize planogram
  useEffect(() => {
    if (initialPlanogram) {
      setPlanogram(initialPlanogram);
    } else {
      // Initialize with empty shelf structure
      const shelves = [];
      for (let level = 0; level < SHELF_LEVELS; level++) {
        shelves.push({
          id: `shelf-${level}`,
          level: level,
          y: level * SLOT_HEIGHT,
          height: SLOT_HEIGHT,
          slots: SLOTS_PER_LEVEL
        });
      }
      setPlanogram(prev => ({ ...prev, shelves }));
    }
    
    // Load product library
    loadProductLibrary();
    
    // Process scan data if available
    if (scanData && scanData.detections) {
      processDetectedProducts(scanData.detections);
    }
  }, [initialPlanogram, scanData]);
  
  // Load product library from database
  const loadProductLibrary = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      setProductLibrary(data || []);
    } catch (err) {
      console.error('Failed to load product library:', err);
    }
  };
  
  // Process detected products from scan
  const processDetectedProducts = (detections) => {
    const processed = detections.map(detection => ({
      ...detection,
      planogramX: Math.round(detection.x / SLOT_WIDTH) * SLOT_WIDTH,
      planogramY: Math.round(detection.y / SLOT_HEIGHT) * SLOT_HEIGHT,
      matched: false // Will be set to true if matches planogram
    }));
    
    setDetectedProducts(processed);
    
    // Calculate discrepancies after a delay to ensure planogram is loaded
    setTimeout(() => {
      calculateDiscrepancies(processed);
    }, 100);
  };
  
  // Calculate discrepancies between planogram and detected products
  const calculateDiscrepancies = useCallback((detected = detectedProducts) => {
    const newDiscrepancies = [];
    const planogramProducts = [...planogram.products];
    const detectedCopy = [...detected];
    
    // Mark matched products
    planogramProducts.forEach(planProduct => {
      const matchIndex = detectedCopy.findIndex(det => {
        // Check if SKU matches and position is close
        const skuMatch = det.sku === planProduct.sku || det.label === planProduct.name;
        const positionMatch = 
          Math.abs(det.planogramX - planProduct.x) < SLOT_WIDTH &&
          Math.abs(det.planogramY - planProduct.y) < SLOT_HEIGHT;
        
        return skuMatch && positionMatch;
      });
      
      if (matchIndex !== -1) {
        // Product found in correct position
        detectedCopy[matchIndex].matched = true;
        planProduct.matched = true;
        
        // Check quantity mismatch
        if (detectedCopy[matchIndex].quantity !== planProduct.quantity) {
          newDiscrepancies.push({
            type: 'quantity_mismatch',
            product: planProduct,
            detected: detectedCopy[matchIndex].quantity,
            expected: planProduct.quantity,
            severity: 'medium'
          });
        }
      } else {
        // Product missing or in wrong position
        const detectedElsewhere = detectedCopy.find(det => 
          det.sku === planProduct.sku || det.label === planProduct.name
        );
        
        if (detectedElsewhere) {
          newDiscrepancies.push({
            type: 'wrong_position',
            product: planProduct,
            detectedPosition: {
              x: detectedElsewhere.planogramX,
              y: detectedElsewhere.planogramY
            },
            expectedPosition: {
              x: planProduct.x,
              y: planProduct.y
            },
            severity: 'medium'
          });
          detectedElsewhere.matched = true;
        } else {
          newDiscrepancies.push({
            type: 'missing',
            product: planProduct,
            severity: 'high'
          });
        }
      }
    });
    
    // Check for unexpected products
    detectedCopy.forEach(det => {
      if (!det.matched) {
        newDiscrepancies.push({
          type: 'unexpected',
          product: {
            sku: det.sku,
            name: det.label,
            x: det.planogramX,
            y: det.planogramY
          },
          severity: 'low'
        });
      }
    });
    
    // Calculate compliance score
    const totalExpected = planogramProducts.length;
    const correctlyPlaced = planogramProducts.filter(p => p.matched).length;
    const complianceScore = totalExpected > 0 
      ? ((correctlyPlaced / totalExpected) * 100).toFixed(1)
      : 100;
    
    setDiscrepancies(newDiscrepancies);
    
    // Update planogram with compliance score
    setPlanogram(prev => ({
      ...prev,
      complianceScore,
      lastChecked: new Date().toISOString()
    }));
    
    return newDiscrepancies;
  }, [planogram.products, detectedProducts]);
  
  // Snap position to grid
  const snapToGridPosition = (value) => {
    if (!snapToGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  };
  
  // Snap to slot position
  const snapToSlot = (x, y) => {
    const slotX = Math.round(x / SLOT_WIDTH) * SLOT_WIDTH;
    const slotY = Math.round(y / SLOT_HEIGHT) * SLOT_HEIGHT;
    
    // Ensure within bounds
    const boundedX = Math.max(0, Math.min(slotX, planogram.width - SLOT_WIDTH));
    const boundedY = Math.max(0, Math.min(slotY, planogram.height - SLOT_HEIGHT));
    
    return { x: boundedX, y: boundedY };
  };
  
  // Add product to planogram
  const addProduct = (product, position) => {
    const snappedPos = snapToSlot(position.x, position.y);
    
    // Check if slot is already occupied
    const occupied = planogram.products.some(p => 
      p.x === snappedPos.x && p.y === snappedPos.y
    );
    
    if (occupied) {
      setError('This slot is already occupied');
      return;
    }
    
    const newProduct = {
      id: `product-${Date.now()}`,
      ...product,
      x: snappedPos.x,
      y: snappedPos.y,
      width: SLOT_WIDTH,
      height: SLOT_HEIGHT,
      quantity: 1
    };
    
    setPlanogram(prev => ({
      ...prev,
      products: [...prev.products, newProduct],
      lastModified: new Date().toISOString()
    }));
    
    addToHistory();
  };
  
  // Remove product from planogram
  const removeProduct = (productId) => {
    setPlanogram(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId),
      lastModified: new Date().toISOString()
    }));
    
    addToHistory();
  };
  
  // Move product
  const moveProduct = (productId, newPosition) => {
    const snappedPos = snapToSlot(newPosition.x, newPosition.y);
    
    // Check if new position is occupied by another product
    const occupied = planogram.products.some(p => 
      p.id !== productId && p.x === snappedPos.x && p.y === snappedPos.y
    );
    
    if (occupied) {
      setError('Target slot is already occupied');
      return false;
    }
    
    setPlanogram(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === productId
          ? { ...p, x: snappedPos.x, y: snappedPos.y }
          : p
      ),
      lastModified: new Date().toISOString()
    }));
    
    addToHistory();
    return true;
  };
  
  // Update product properties
  const updateProduct = (productId, updates) => {
    setPlanogram(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === productId ? { ...p, ...updates } : p
      ),
      lastModified: new Date().toISOString()
    }));
    
    addToHistory();
  };
  
  // History management
  const addToHistory = () => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(planogram)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };
  
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setPlanogram(history[historyIndex - 1]);
    }
  };
  
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setPlanogram(history[historyIndex + 1]);
    }
  };
  
  // Draw planogram on canvas
  const drawPlanogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = planogram.width * zoom;
    const height = planogram.height * zoom;
    
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Apply zoom
    ctx.scale(zoom, zoom);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, planogram.width, planogram.height);
    
    // Draw grid if enabled
    if (gridVisible) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      
      for (let x = 0; x <= planogram.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, planogram.height);
        ctx.stroke();
      }
      
      for (let y = 0; y <= planogram.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(planogram.width, y);
        ctx.stroke();
      }
    }
    
    // Draw shelf levels
    planogram.shelves?.forEach(shelf => {
      // Shelf background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, shelf.y, planogram.width, shelf.height);
      
      // Shelf border
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, shelf.y, planogram.width, shelf.height);
      
      // Shelf label
      if (showLabels) {
        ctx.fillStyle = '#374151';
        ctx.font = '12px Arial';
        ctx.fillText(`Level ${shelf.level + 1}`, 5, shelf.y + 15);
      }
      
      // Draw slot dividers
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = 0.5;
      for (let i = 1; i < shelf.slots; i++) {
        const x = i * SLOT_WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, shelf.y);
        ctx.lineTo(x, shelf.y + shelf.height);
        ctx.stroke();
      }
    });
    
    // Draw detected products (if showing discrepancies)
    if (showDiscrepancies && detectedProducts.length > 0) {
      detectedProducts.forEach(detected => {
        if (!detected.matched) {
          // Draw unmatched detected products in red
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.fillRect(detected.planogramX, detected.planogramY, SLOT_WIDTH, SLOT_HEIGHT);
          
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(detected.planogramX, detected.planogramY, SLOT_WIDTH, SLOT_HEIGHT);
          ctx.setLineDash([]);
        }
      });
    }
    
    // Draw planogram products
    planogram.products.forEach(product => {
      const isSelected = selectedProduct?.id === product.id;
      
      // Find if this product has a discrepancy
      const discrepancy = discrepancies.find(d => 
        d.product?.id === product.id || d.product?.sku === product.sku
      );
      
      // Product fill color based on status
      if (discrepancy) {
        switch (discrepancy.type) {
          case 'missing':
            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'; // Red
            break;
          case 'wrong_position':
            ctx.fillStyle = 'rgba(245, 158, 11, 0.5)'; // Orange
            break;
          case 'quantity_mismatch':
            ctx.fillStyle = 'rgba(251, 191, 36, 0.5)'; // Yellow
            break;
          default:
            ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; // Blue
        }
      } else if (product.matched) {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.5)'; // Green
      } else {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; // Blue
      }
      
      ctx.fillRect(product.x, product.y, product.width, product.height);
      
      // Product border
      ctx.strokeStyle = isSelected ? '#2563eb' : '#6b7280';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(product.x, product.y, product.width, product.height);
      
      // Product label
      if (showLabels) {
        ctx.fillStyle = '#111827';
        ctx.font = '10px Arial';
        
        // Product name
        const maxWidth = product.width - 4;
        const name = product.name || product.sku || 'Product';
        let displayName = name;
        
        // Truncate if too long
        if (ctx.measureText(displayName).width > maxWidth) {
          while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 0) {
            displayName = displayName.slice(0, -1);
          }
          displayName += '...';
        }
        
        ctx.fillText(displayName, product.x + 2, product.y + 12);
        
        // Quantity
        if (product.quantity > 1) {
          ctx.font = 'bold 10px Arial';
          ctx.fillText(`x${product.quantity}`, product.x + 2, product.y + 24);
        }
        
        // SKU
        ctx.font = '8px Arial';
        ctx.fillStyle = '#6b7280';
        ctx.fillText(product.sku || '', product.x + 2, product.y + product.height - 4);
      }
      
      // Discrepancy indicator
      if (discrepancy && showDiscrepancies) {
        // Draw warning icon
        ctx.fillStyle = discrepancy.severity === 'high' ? '#ef4444' 
          : discrepancy.severity === 'medium' ? '#f59e0b'
          : '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(product.x + product.width - 15, product.y + 5);
        ctx.lineTo(product.x + product.width - 5, product.y + 5);
        ctx.lineTo(product.x + product.width - 10, product.y + 15);
        ctx.closePath();
        ctx.fill();
      }
    });
    
    // Draw selection handles if product is selected
    if (selectedProduct && editMode === 'move') {
      const product = planogram.products.find(p => p.id === selectedProduct.id);
      if (product) {
        ctx.fillStyle = '#2563eb';
        const handleSize = 6;
        
        // Corner handles
        ctx.fillRect(product.x - handleSize/2, product.y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(product.x + product.width - handleSize/2, product.y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(product.x - handleSize/2, product.y + product.height - handleSize/2, handleSize, handleSize);
        ctx.fillRect(product.x + product.width - handleSize/2, product.y + product.height - handleSize/2, handleSize, handleSize);
      }
    }
    
    // Draw drag preview
    if (isDragging && selectedProduct) {
      const product = planogram.products.find(p => p.id === selectedProduct.id);
      if (product) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        const dragX = product.x + dragOffset.x;
        const dragY = product.y + dragOffset.y;
        const snappedPos = snapToSlot(dragX, dragY);
        
        ctx.fillRect(snappedPos.x, snappedPos.y, product.width, product.height);
        ctx.strokeRect(snappedPos.x, snappedPos.y, product.width, product.height);
        ctx.setLineDash([]);
      }
    }
    
  }, [planogram, zoom, gridVisible, showLabels, showDiscrepancies, detectedProducts, discrepancies, selectedProduct, editMode, isDragging, dragOffset]);
  
  // Redraw when state changes
  useEffect(() => {
    drawPlanogram();
  }, [drawPlanogram]);
  
  // Recalculate discrepancies when needed
  useEffect(() => {
    if (detectedProducts.length > 0) {
      calculateDiscrepancies();
    }
  }, [planogram.products, calculateDiscrepancies]);
  
  // Mouse event handlers
  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    // Find clicked product
    const clickedProduct = planogram.products.find(p =>
      x >= p.x && x <= p.x + p.width &&
      y >= p.y && y <= p.y + p.height
    );
    
    if (clickedProduct) {
      setSelectedProduct(clickedProduct);
      
      if (editMode === 'delete') {
        removeProduct(clickedProduct.id);
      } else if (editMode === 'move') {
        setIsDragging(true);
        setDragStart({ x, y });
        setDragOffset({ x: 0, y: 0 });
      }
    } else {
      setSelectedProduct(null);
      
      if (editMode === 'add') {
        // Open product selector
        // For demo, add a dummy product
        addProduct({
          sku: `SKU${Math.floor(Math.random() * 10000)}`,
          name: 'New Product',
          category: 'General'
        }, { x, y });
      }
    }
  };
  
  const handleCanvasMouseMove = (e) => {
    if (!isDragging || !selectedProduct) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    setDragOffset({
      x: x - dragStart.x,
      y: y - dragStart.y
    });
    
    drawPlanogram();
  };
  
  const handleCanvasMouseUp = (e) => {
    if (!isDragging || !selectedProduct) return;
    
    const product = planogram.products.find(p => p.id === selectedProduct.id);
    if (product) {
      const newX = product.x + dragOffset.x;
      const newY = product.y + dragOffset.y;
      
      moveProduct(selectedProduct.id, { x: newX, y: newY });
    }
    
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  };
  
  // Save planogram
  const savePlanogram = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const planogramData = {
        ...planogram,
        user_id: user.id,
        store_id: storeId,
        shelf_id: shelfId,
        compliance_score: planogram.complianceScore || 0,
        last_modified: new Date().toISOString()
      };
      
      if (planogram.id) {
        // Update existing
        const { error } = await supabase
          .from('planograms')
          .update(planogramData)
          .eq('id', planogram.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('planograms')
          .insert(planogramData)
          .select()
          .single();
        
        if (error) throw error;
        
        setPlanogram(prev => ({ ...prev, id: data.id }));
      }
      
      setSuccess('Planogram saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to save planogram');
    } finally {
      setSaving(false);
    }
  };
  
  // Export planogram as image
  const exportAsImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `planogram-${planogram.id || 'new'}-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };
  
  // Export planogram as JSON
  const exportAsJSON = () => {
    const dataStr = JSON.stringify(planogram, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.download = `planogram-${planogram.id || 'new'}-${Date.now()}.json`;
    link.href = dataUri;
    link.click();
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
          case 's':
            e.preventDefault();
            savePlanogram();
            break;
          case 'g':
            e.preventDefault();
            setGridVisible(prev => !prev);
            break;
          default:
            break;
        }
      } else if (e.key === 'Delete' && selectedProduct) {
        removeProduct(selectedProduct.id);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct]);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planogram Editor</h2>
          <p className="text-sm text-gray-600 mt-1">
            {planogram.name} • {planogram.products.length} products
            {planogram.complianceScore && (
              <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                planogram.complianceScore >= 80 ? 'bg-green-100 text-green-800'
                : planogram.complianceScore >= 60 ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
              }`}>
                {planogram.complianceScore}% Compliance
              </span>
            )}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={savePlanogram}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Save
          </button>
          
          <button
            onClick={exportAsImage}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Image
          </button>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded">
        {/* Edit Mode Buttons */}
        <div className="flex bg-white rounded border">
          <button
            onClick={() => setEditMode('move')}
            className={`px-3 py-2 flex items-center ${
              editMode === 'move' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            title="Move"
          >
            <Move className="h-5 w-5" />
          </button>
          <button
            onClick={() => setEditMode('add')}
            className={`px-3 py-2 flex items-center ${
              editMode === 'add' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            title="Add Product"
          >
            <Package className="h-5 w-5" />
          </button>
          <button
            onClick={() => setEditMode('delete')}
            className={`px-3 py-2 flex items-center ${
              editMode === 'delete' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
        
        <div className="border-l pl-2" />
        
        {/* View Options */}
        <button
          onClick={() => setGridVisible(!gridVisible)}
          className={`px-3 py-2 rounded flex items-center ${
            gridVisible ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Toggle Grid"
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`px-3 py-2 rounded flex items-center ${
            snapToGrid ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Snap to Grid"
        >
          {snapToGrid ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
        </button>
        
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-2 rounded flex items-center ${
            showLabels ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Toggle Labels"
        >
          {showLabels ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </button>
        
        <button
          onClick={() => setShowDiscrepancies(!showDiscrepancies)}
          className={`px-3 py-2 rounded flex items-center ${
            showDiscrepancies ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Toggle Discrepancies"
        >
          <AlertTriangle className="h-5 w-5" />
        </button>
        
        <div className="border-l pl-2" />
        
        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
          className="px-3 py-2 bg-white rounded hover:bg-gray-50"
          title="Zoom Out"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        
        <span className="px-2 text-sm font-medium">{Math.round(zoom * 100)}%</span>
        
        <button
          onClick={() => setZoom(Math.min(2, zoom + 0.1))}
          className="px-3 py-2 bg-white rounded hover:bg-gray-50"
          title="Zoom In"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => setZoom(1)}
          className="px-3 py-2 bg-white rounded hover:bg-gray-50"
          title="Reset Zoom"
        >
          <Maximize2 className="h-5 w-5" />
        </button>
        
        <div className="border-l pl-2" />
        
        {/* History Controls */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="px-3 py-2 bg-white rounded hover:bg-gray-50 disabled:opacity-50"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="px-3 py-2 bg-white rounded hover:bg-gray-50 disabled:opacity-50"
          title="Redo (Ctrl+Y)"
        >
          Redo
        </button>
      </div>
      
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="border border-gray-300 rounded overflow-auto bg-gray-100"
        style={{ maxHeight: '600px' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          className="cursor-crosshair"
          style={{ 
            cursor: editMode === 'move' ? 'move' 
              : editMode === 'delete' ? 'not-allowed'
              : editMode === 'add' ? 'cell'
              : 'default'
          }}
        />
      </div>
      
      {/* Discrepancies Panel */}
      {discrepancies.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800 mb-2 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Discrepancies Detected ({discrepancies.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {discrepancies.map((disc, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    disc.severity === 'high' ? 'bg-red-500'
                    : disc.severity === 'medium' ? 'bg-yellow-500'
                    : 'bg-blue-500'
                  }`} />
                  <span className="text-gray-700">
                    {disc.type === 'missing' && `${disc.product.name || disc.product.sku} is missing`}
                    {disc.type === 'wrong_position' && `${disc.product.name || disc.product.sku} is in wrong position`}
                    {disc.type === 'quantity_mismatch' && `${disc.product.name || disc.product.sku}: ${disc.detected} found, ${disc.expected} expected`}
                    {disc.type === 'unexpected' && `Unexpected product: ${disc.product.name || disc.product.sku}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected Product Info */}
      {selectedProduct && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">Selected Product</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <span className="ml-2 font-medium">{selectedProduct.name}</span>
            </div>
            <div>
              <span className="text-gray-600">SKU:</span>
              <span className="ml-2 font-medium">{selectedProduct.sku}</span>
            </div>
            <div>
              <span className="text-gray-600">Position:</span>
              <span className="ml-2 font-medium">({selectedProduct.x}, {selectedProduct.y})</span>
            </div>
            <div>
              <span className="text-gray-600">Quantity:</span>
              <input
                type="number"
                min="1"
                value={selectedProduct.quantity || 1}
                onChange={(e) => updateProduct(selectedProduct.id, { quantity: parseInt(e.target.value) })}
                className="ml-2 w-16 px-2 py-1 border rounded"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Messages */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}
    </div>
  );
};

export default PlanogramEditor;
