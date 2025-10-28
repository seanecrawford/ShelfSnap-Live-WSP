
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Grid, Plus, Save, Package, Search, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const ProductManager = ({ onSelectProduct }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      toast({ title: "Error fetching products", description: error.message, variant: "destructive" });
    } else {
      setProducts(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="bg-slate-800 p-4 rounded-lg">
      <h4 className="text-lg font-semibold text-white mb-4">Product Library</h4>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {loading && <p className="text-slate-400">Loading products...</p>}
        {products.map(product => (
          <div key={product.id} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">{product.name}</p>
                <p className="text-xs text-slate-400">SKU: {product.sku}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => onSelectProduct(product)}>Add to Shelf</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanogramEditor = () => {
  const { toast } = useToast();
  const [planograms, setPlanograms] = useState([]);
  const [selectedPlanogram, setSelectedPlanogram] = useState(null);
  const [shelfItems, setShelfItems] = useState([]);

  const fetchPlanograms = useCallback(async () => {
    const { data, error } = await supabase.from('planograms').select('*');
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else setPlanograms(data);
  }, [toast]);

  useEffect(() => {
    fetchPlanograms();
  }, [fetchPlanograms]);

  const handleSelectProduct = (product) => {
    toast({ title: `Added ${product.name} to shelf!` });
    // This is a placeholder for drag-and-drop functionality
    setShelfItems(prev => [...prev, product]);
  };

  const handleCreatePlanogram = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const facings = formData.get('facings');
    
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('planograms').insert({ name, facings, created_by: user.id }).select().single();
    
    if (error) {
      toast({ title: "Error creating planogram", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Planogram Created!", description: `"${name}" is ready to be designed.` });
      setPlanograms(prev => [...prev, data]);
      document.getElementById('close-dialog-btn')?.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Planogram Management</h3>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              New Planogram
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Planogram</DialogTitle>
              <DialogDescription>Define the basic details for your new shelf layout.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlanogram} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-slate-300">Planogram Name</Label>
                <Input id="name" name="name" placeholder="e.g., 'Main Beverage Aisle'" className="bg-slate-800" required />
              </div>
              <div>
                <Label htmlFor="facings" className="text-slate-300">Number of Facings/Shelves</Label>
                <Input id="facings" name="facings" type="number" placeholder="e.g., 5" className="bg-slate-800" required />
              </div>
              <div className="flex justify-end gap-2">
                 <DialogTrigger asChild>
                    <Button type="button" variant="ghost" id="close-dialog-btn">Cancel</Button>
                 </DialogTrigger>
                 <Button type="submit">Create & Edit</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Planogram List */}
        <div className="md:col-span-1 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
          <h4 className="text-lg font-semibold text-white mb-4">Saved Planograms</h4>
          <div className="space-y-2">
            {planograms.map(p => (
              <div key={p.id} onClick={() => setSelectedPlanogram(p)} className={ `p-3 rounded-lg cursor-pointer transition-colors ${selectedPlanogram?.id === p.id ? 'bg-purple-600/30' : 'hover:bg-slate-700/50'}`}>
                <p className="font-medium text-white">{p.name}</p>
                <p className="text-sm text-slate-400">{p.facings} shelves</p>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="md:col-span-2">
          {selectedPlanogram ? (
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-3 lg:col-span-2 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 min-h-[400px]">
                <h4 className="text-lg font-semibold text-white mb-4">{selectedPlanogram.name}</h4>
                <div className="bg-slate-900/50 rounded-lg p-4 h-full">
                  <p className="text-slate-400 text-center mt-16">Drag & drop products here to build your planogram. <br/> (Full visual editor coming soon)</p>
                  <div className="mt-4 space-y-2">
                    {shelfItems.map((item, i) => <div key={i} className="bg-slate-700 p-2 rounded text-white">{item.name}</div>)}
                  </div>
                </div>
              </div>
              <div className="col-span-3 lg:col-span-1">
                <ProductManager onSelectProduct={handleSelectProduct} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-700/50 h-full min-h-[400px]">
              <div className="text-center">
                <Grid className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Select a planogram to start editing <br/> or create a new one.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanogramEditor;
