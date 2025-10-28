
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, X, Undo, Trash2, Package, Sparkles, PanelRightOpen, PanelRightClose, Layers, Plus, MousePointerSquare } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc', '#f472b6', '#e879f9'];
const getProductColor = (label) => colors[label.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length];

const getPolygonBoundingBox = (polygon) => {
    if (!polygon || polygon.length === 0) return { x: 0, y: 0, width: 0, height: 0, cx: 0, cy: 0 };
    const xCoords = polygon.map(p => p.x);
    const yCoords = polygon.map(p => p.y);
    const minX = Math.min(...xCoords);
    const minY = Math.min(...yCoords);
    const maxX = Math.max(...xCoords);
    const maxY = Math.max(...yCoords);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: (minX + maxX)/2, cy: (minY + maxY)/2 };
};

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
    const shelfYs = [0.25, 0.4, 0.55, 0.7, 0.85]; // More realistic shelf Y positions

    mockProducts.forEach((product, index) => {
        const shelfY = shelfYs[product.shelf];
        const width = product.w * imageWidth;
        const height = product.h * imageHeight;
        
        const x = product.x * imageWidth;
        const y = (shelfY * imageHeight) - height;

        // V12 generates clean rectangular bounding boxes
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
            confidence: Math.random() * 0.05 + 0.95, // High confidence
            mask_polygon: JSON.stringify(polygon),
            shelf_index: product.shelf,
            item_position: index,
            status: 'active',
        });
    });
    return overlays;
};

const SortableOverlayMask = ({ overlay, isSelected, isHighlighted, onSelect, isDragging }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isSorting } = useSortable({ id: overlay.id });
    const polygon = useMemo(() => {
        try { return JSON.parse(overlay.mask_polygon); } catch (e) { return []; }
    }, [overlay.mask_polygon]);

    const style = {
        transition: isDragging || isSorting ? 'none' : transition || 'transform 250ms ease',
        transform: CSS.Translate.toString(transform),
        zIndex: isSelected || isDragging ? 10 : 1,
    };

    const color = getProductColor(overlay.label);

    return (
        <g ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onSelect(overlay.id)}>
             <AnimatePresence>
                {isHighlighted && (
                    <motion.polygon
                        points={polygon.map(p => `${p.x},${p.y}`).join(' ')}
                        initial={{ strokeWidth: 0, opacity: 0 }}
                        animate={{ strokeWidth: 8, opacity: 1 }}
                        exit={{ strokeWidth: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'circOut' }}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none"
                        style={{ stroke: 'rgba(255, 255, 255, 0.8)', fill: 'none' }}
                    />
                )}
            </AnimatePresence>
            <polygon
                points={polygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill={color}
                fillOpacity={isSelected || isHighlighted ? 0.6 : 0.4}
                stroke={isSelected ? '#fff' : color}
                strokeWidth={isSelected ? 3 : 1.5}
                strokeDasharray={overlay.status === 'deleted' ? '5 5' : 'none'}
                className={cn(
                    "cursor-grab active:cursor-grabbing transition-all duration-200",
                    isDragging ? 'opacity-50' : overlay.status === 'deleted' ? 'opacity-10 hover:opacity-30' : 'opacity-80 hover:opacity-100'
                )}
            />
        </g>
    );
};

const RecoveryDropZone = ({ isOver, children }) => {
    const { setNodeRef } = useDroppable({ id: 'recovery-drop-zone' });
    return (
        <div ref={setNodeRef} className={cn("transition-colors", isOver && "bg-red-500/20")}>
            {children}
        </div>
    );
};

const ScanDetailView = ({ scan, onClose }) => {
    const [overlaysById, setOverlaysById] = useState({});
    const [sortedShelfItems, setSortedShelfItems] = useState({});
    const [selectedOverlayId, setSelectedOverlayId] = useState(null);
    const [highlightedLabel, setHighlightedLabel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeTab, setActiveTab] = useState('facings');
    const [digitalTwinMode, setDigitalTwinMode] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const { toast } = useToast();
    const svgContainerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    useEffect(() => {
        const observer = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setContainerSize({ width, height });
            }
        });
        if (svgContainerRef.current) {
            observer.observe(svgContainerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    const svgViewBox = useMemo(() => {
        if (!imageDimensions.width || !imageDimensions.height || !containerSize.width || !containerSize.height) {
            return `0 0 1 1`;
        }
        const imgAspect = imageDimensions.width / imageDimensions.height;
        const containerAspect = containerSize.width / containerSize.height;

        let scale = 1;
        let dx = 0;
        let dy = 0;

        if (imgAspect > containerAspect) {
            scale = containerSize.width / imageDimensions.width;
            dy = (containerSize.height - imageDimensions.height * scale) / 2;
        } else {
            scale = containerSize.height / imageDimensions.height;
            dx = (containerSize.width - imageDimensions.width * scale) / 2;
        }

        return `${-dx/scale} ${-dy/scale} ${containerSize.width/scale} ${containerSize.height/scale}`;
    }, [imageDimensions, containerSize]);


    const processOverlays = useCallback((data) => {
        const byId = (data || []).reduce((acc, o) => ({ ...acc, [o.id]: o }), {});
        const shelves = (data || []).reduce((acc, o) => {
            const shelfKey = `shelf-${o.shelf_index}`;
            if (!acc[shelfKey]) acc[shelfKey] = [];
            if (o.status === 'active') {
                acc[shelfKey].push(o.id);
            }
            return acc;
        }, {});
        
        Object.keys(shelves).forEach(shelfKey => {
            shelves[shelfKey].sort((a,b) => (byId[a].item_position || 0) - (byId[b].item_position || 0));
        });

        setOverlaysById(byId);
        setSortedShelfItems(shelves);
    }, []);

    const fetchOverlays = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('scan_overlays').select('*').eq('scan_id', scan.id);
        if (error) {
            toast({ title: "Error fetching overlays", description: error.message, variant: "destructive" });
        } else {
            processOverlays(data);
        }
        setLoading(false);
    }, [scan.id, toast, processOverlays]);

    const handleReanalyze = async () => {
        setIsAnalyzing(true);
        try {
            const { error: deleteError } = await supabase.from('scan_overlays').delete().eq('scan_id', scan.id);
            if (deleteError) throw deleteError;

            const mockOverlays = generateHyperRealisticMasksV12(scan.id, imageDimensions.width, imageDimensions.height);
            const { data: insertedData, error: insertError } = await supabase.from('scan_overlays').insert(mockOverlays).select();
            if (insertError) throw insertError;
            
            toast({ title: "V12 Analysis Complete!", description: `${insertedData.length} products identified.`});
            await fetchOverlays();
        } catch (error) {
            toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const img = new Image();
        img.src = scan.image_url;
        img.onload = () => {
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            fetchOverlays();
        };
        img.onerror = () => {
             toast({ title: "Error loading image", variant: "destructive" });
             setLoading(false);
        }
    }, [scan.image_url, fetchOverlays, toast]);
    
    const handleToggleStatus = async (overlayId, newStatus) => {
        const { error } = await supabase.from('scan_overlays').update({ status: newStatus }).eq('id', overlayId);

        if(error) {
            toast({title: "Update Failed", description: error.message, variant: "destructive"});
        } else {
            toast({title: `Product ${newStatus === 'deleted' ? 'moved to recovery' : 'restored'}`});
            fetchOverlays();
        }
        setSelectedOverlayId(null);
    };

    const handlePermanentDelete = async (overlayId) => {
        const { error } = await supabase.from('scan_overlays').delete().eq('id', overlayId);
        if (error) {
            toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Product Permanently Deleted" });
            fetchOverlays();
        }
    };

    const handleReset = async () => {
        setLoading(true);
        const { error } = await supabase.from('scan_overlays').delete().eq('scan_id', scan.id);
        if (error) {
            toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
        } else {
            await fetchOverlays();
            toast({ title: "Scan Reset", description: "All product masks have been cleared." });
        }
        setLoading(false);
    };
    
    const handleDragStart = ({ active }) => {
        if (isDrawing) return;
        setActiveDragId(active.id);
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveDragId(null);
        if (!over || isDrawing) return;

        if (over.id === 'recovery-drop-zone') {
            await handleToggleStatus(active.id, 'deleted');
            return;
        }

        if (active.id === over.id) return;

        const findShelfKey = id => Object.keys(sortedShelfItems).find(key => sortedShelfItems[key].includes(id));
        const activeShelfKey = findShelfKey(active.id);
        const overShelfKey = findShelfKey(over.id);

        if (activeShelfKey && overShelfKey && activeShelfKey === overShelfKey) {
            const shelfItems = sortedShelfItems[activeShelfKey];
            const oldIndex = shelfItems.indexOf(active.id);
            const newIndex = shelfItems.indexOf(over.id);
            if (oldIndex === newIndex) return;

            const newItems = arrayMove(shelfItems, oldIndex, newIndex);
            setSortedShelfItems(prev => ({...prev, [activeShelfKey]: newItems}));

            const updates = newItems.map((id, index) => {
                const originalOverlay = overlaysById[id];
                return { ...originalOverlay, item_position: index };
            });

            const { error } = await supabase.from('scan_overlays').upsert(updates);

            if (error) {
                toast({ title: "Layout Save Failed", description: error.message, variant: "destructive" });
                setSortedShelfItems(prev => ({ ...prev, [activeShelfKey]: shelfItems }));
            } else {
                 toast({ title: "Layout Saved!", description: "Product positions have been updated."});
            }
        }
    };
    
    const facings = useMemo(() => Object.values(overlaysById).filter(o => o.status === 'active'), [overlaysById]);
    const deletedItems = useMemo(() => Object.values(overlaysById).filter(o => o.status === 'deleted'), [overlaysById]);
    const activeDragOverlay = useMemo(() => overlaysById[activeDragId], [activeDragId, overlaysById]);

    const shelfYs = useMemo(() => {
        const shelfLevels = [...new Set(Object.values(overlaysById).filter(o => o.status === 'active').map(o => o.shelf_index))];
        return shelfLevels.map(level => {
            const itemsOnShelf = Object.values(overlaysById).filter(o => o.shelf_index === level && o.status === 'active');
            if (itemsOnShelf.length === 0) return 0;
            const yPositions = itemsOnShelf.map(item => getPolygonBoundingBox(JSON.parse(item.mask_polygon)).y);
            const heights = itemsOnShelf.map(item => getPolygonBoundingBox(JSON.parse(item.mask_polygon)).height);
            return yPositions.reduce((sum, y) => sum + y, 0) / yPositions.length + heights.reduce((sum, h) => sum + h, 0) / heights.length;
        }).filter(y => y > 0);
    }, [overlaysById]);


    return (
        <div className="w-full h-full flex flex-col text-white bg-slate-900/80 backdrop-blur-md overflow-hidden rounded-lg">
            <header className="flex items-center justify-between p-2 md:p-4 flex-shrink-0 border-b border-slate-700/50 z-20">
                <h2 className="text-xl md:text-2xl font-bold truncate pr-4">{scan.store_name}</h2>
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => { setIsDrawing(!isDrawing); toast({ title: isDrawing ? "Exited Drawing Mode" : "Drawing Mode Activated", description: "Click and drag on the image to create a new product mask."})}} className={cn(isDrawing && "bg-green-600/20 border-green-500/50 text-green-300")}>
                        <MousePointerSquare className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">New Product</span>
                    </Button>
                     <Button variant="outline" size="sm" onClick={() => setDigitalTwinMode(!digitalTwinMode)} className={cn(digitalTwinMode && "bg-purple-600/20 border-purple-500/50 text-purple-300")}>
                        <Layers className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Digital Twin</span>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300">
                                <Sparkles className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Re-analyze</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Re-run AI Analysis?</AlertDialogTitle><AlertDialogDescription>This will delete all current masks and generate new ones using the latest V12 shelf-aware model. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleReanalyze} className={cn(buttonVariants({ variant: "destructive" }))}>Proceed</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="sm" onClick={handleReset}><Undo className="w-4 h-4 md:mr-2"/> <span className="hidden md:inline">Reset</span></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden">
                        {isSidebarOpen ? <PanelRightClose /> : <PanelRightOpen />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
                </div>
            </header>
            <div className="flex-1 relative overflow-hidden">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <main ref={svgContainerRef} className={cn("absolute inset-0 bg-slate-950/50", isDrawing && "cursor-crosshair")}>
                        {loading ? <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8"/></div> :
                            <svg className="w-full h-full" preserveAspectRatio="xMidYMid meet" viewBox={svgViewBox}>
                                <AnimatePresence>
                                {!digitalTwinMode && (
                                    <motion.image initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} href={scan.image_url} width={imageDimensions.width} height={imageDimensions.height} />
                                )}
                                </AnimatePresence>
                                <AnimatePresence>
                                {digitalTwinMode && (
                                    <motion.g initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                                        <rect width={imageDimensions.width} height={imageDimensions.height} fill="url(#digital-bg)" />
                                        {shelfYs.map((y, i) => (
                                            <g key={i}>
                                                <line x1="0" y1={y} x2={imageDimensions.width} y2={y} stroke="rgba(100, 116, 139, 0.4)" strokeWidth="2" />
                                                <line x1="0" y1={y + 8} x2={imageDimensions.width} y2={y + 8} stroke="rgba(30, 41, 59, 0.5)" strokeWidth="16" />
                                            </g>
                                        ))}
                                    </motion.g>
                                )}
                                </AnimatePresence>
                                <defs>
                                    <radialGradient id="digital-bg" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" style={{stopColor: '#1e293b', stopOpacity: 1}} /><stop offset="100%" style={{stopColor: '#0f172a', stopOpacity: 1}} /></radialGradient>
                                </defs>
                                {!isDrawing && Object.entries(sortedShelfItems).map(([shelfKey, items]) => (
                                    <SortableContext key={shelfKey} items={items}>
                                        {items.map(id => (
                                            <SortableOverlayMask key={id} overlay={overlaysById[id]} isSelected={selectedOverlayId === id} isHighlighted={highlightedLabel === overlaysById[id]?.label} onSelect={setSelectedOverlayId} isDragging={activeDragId === id} />
                                        ))}
                                    </SortableContext>
                                ))}
                                {isAnalyzing && (
                                     <foreignObject x="0" y="0" width={imageDimensions.width} height={imageDimensions.height}>
                                        <div className="w-full h-full flex items-center justify-center bg-black/70">
                                            <div className="text-center"><Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto"/><p className="text-xl font-bold mt-4">V12 Hyper-Realistic Analysis...</p></div>
                                        </div>
                                     </foreignObject>
                                )}
                            </svg>
                        }
                    </main>
                    <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
                        {activeDragOverlay && (() => {
                            const polygon = JSON.parse(activeDragOverlay.mask_polygon);
                            const bbox = getPolygonBoundingBox(polygon);
                            return (
                                <svg className="opacity-75" width={bbox.width} height={bbox.height} >
                                    <polygon points={polygon.map(p => `${p.x - bbox.x},${p.y - bbox.y}`).join(' ')} fill={getProductColor(activeDragOverlay.label)} />
                                </svg>
                            );
                        })()}
                    </DragOverlay>

                     <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.aside 
                                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="flex flex-col bg-slate-900/80 backdrop-blur-sm border-l border-slate-700/50 absolute inset-y-0 right-0 z-10 w-full max-w-sm md:w-96"
                            >
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                                    <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 rounded-none"><TabsTrigger value="facings"><Package className="w-4 h-4 mr-2"/>Facings</TabsTrigger><TabsTrigger value="recovery"><Trash2 className="w-4 h-4 mr-2"/>Recovery</TabsTrigger></TabsList>
                                    <TabsContent value="facings" className="flex-1 overflow-y-auto p-4 space-y-3">
                                        <h3 className="text-lg font-semibold text-white">Detected Products</h3>
                                        {facings.length === 0 ? <p className="text-slate-400 text-sm text-center mt-4">No active products.</p> :
                                        facings.map((facing) => (
                                            <div key={facing.id} className={cn("flex items-center justify-between p-2 rounded-md transition-all cursor-pointer", highlightedLabel === facing.label ? "bg-purple-600/30" : "bg-slate-800 hover:bg-slate-700/50")} onMouseEnter={() => setHighlightedLabel(facing.label)} onMouseLeave={() => setHighlightedLabel(null)}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getProductColor(facing.label) }}></div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-white text-sm font-medium truncate" title={facing.label}>{facing.label}</p>
                                                        <p className="text-xs text-slate-400">{facing.type}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </TabsContent>
                                    <RecoveryDropZone isOver={activeDragId && activeTab === 'recovery'}>
                                        <TabsContent value="recovery" className="flex-1 overflow-y-auto p-4 space-y-2">
                                            <h3 className="text-lg font-semibold text-white">Recovery Bin</h3>
                                            {deletedItems.length === 0 ? <p className="text-slate-400 text-sm text-center mt-4">No items deleted.</p> :
                                                deletedItems.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-800 rounded-md group">
                                                        <span className="text-slate-400 line-through">{item.label}</span>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(item.id, 'active')}><Undo className="w-4 h-4 text-green-400"/></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button size="sm" variant="ghost"><Trash2 className="w-4 h-4 text-red-500"/></Button></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{item.label}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handlePermanentDelete(item.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </TabsContent>
                                    </RecoveryDropZone>
                                </Tabs>
                                {selectedOverlayId && overlaysById[selectedOverlayId]?.status === 'active' && (
                                    <div className="p-4 border-t border-slate-700 bg-slate-800"><h3 className="font-bold text-lg mb-2 truncate">Selected: {overlaysById[selectedOverlayId].label}</h3><Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => handleToggleStatus(selectedOverlayId, 'deleted')}><Trash2 className="w-4 h-4 mr-2"/> Move to Recovery</Button></div>
                                )}
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </DndContext>
            </div>
        </div>
    );
};

export default ScanDetailView;
