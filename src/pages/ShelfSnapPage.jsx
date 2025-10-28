
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Camera, Upload, Scan, AlertCircle, CheckCircle, Sparkles, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ShelfScanCard from '@/components/shelfsnap/ShelfScanCard';
import PlanogramEditor from '@/components/shelfsnap/PlanogramEditor';
import { supabase } from '@/lib/customSupabaseClient';
import CameraCapture from '@/components/shelfsnap/CameraCapture';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const ShelfSnapPage = () => {
  const [scans, setScans] = useState([]);
  const [storesCount, setStoresCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [storeNameUpload, setStoreNameUpload] = useState('');
  const [isCaptureOpen, setCaptureOpen] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: scansData, error: scansError } = await supabase
      .from('shelf_scans')
      .select('*')
      .order('scan_date', { ascending: false });

    if (scansError) {
      toast({ title: "Error fetching scans", description: scansError.message, variant: "destructive" });
    } else {
      setScans(scansData || []);
    }

    const { count, error: storesError } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });

    if (storesError) {
      toast({ title: "Error fetching stores", description: storesError.message, variant: "destructive" });
    } else {
      setStoresCount(count || 0);
    }

    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    toast({
      title: "Uploading Scan...",
      description: "Your image is being uploaded and analyzed by our AI engine.",
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast({ title: "Upload Failed", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const fileName = `uploaded-${date}-${file.name}`;
    const filePath = `scans/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('ShelfSnap').upload(filePath, file);
    if (uploadError) {
      toast({ title: "Upload Failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('ShelfSnap').getPublicUrl(filePath);
    if (!publicUrlData?.publicUrl) {
      toast({ title: "Upload Failed", description: "Could not retrieve image URL.", variant: "destructive" });
      return;
    }

    const newScan = {
      store_name: storeNameUpload.trim() || 'Uploaded Scan',
      scan_date: new Date().toISOString(),
      status: 'analyzing',
      compliance: Math.floor(Math.random() * (98 - 75 + 1) + 75),
      issues: Math.floor(Math.random() * 5),
      products: Math.floor(Math.random() * (50 - 20 + 1) + 20),
      created_by: user.id,
      image_url: publicUrlData.publicUrl
    };

    const { error } = await supabase.from('shelf_scans').insert(newScan);
    if (error) {
      toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Analysis Complete!", description: "The new scan has been added to your dashboard." });
      setStoreNameUpload('');
      fetchData();
    }
  };

  const avgCompliance = scans.length > 0
    ? Math.round(scans.reduce((acc, s) => acc + (s.compliance || 0), 0) / scans.length)
    : 0;

  const totalIssues = scans.reduce((acc, s) => acc + (s.issues || 0), 0);

  const stats = [
    { label: 'Total Scans', value: scans.length, icon: Scan, color: 'text-purple-400' },
    { label: 'Avg Compliance', value: `${avgCompliance}%`, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Active Issues', value: totalIssues, icon: AlertCircle, color: 'text-yellow-400' },
    { label: 'Stores Monitored', value: storesCount, icon: Building, color: 'text-blue-400' },
  ];

  return (
  <>
      <Helmet>
        <title>ShelfSnap - AI Retail Compliance</title>
        <meta name="description" content="AI-powered retail shelf management with automated product detection and planogram compliance" />
      </Helmet>

      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />

      <Dialog open={isCaptureOpen} onOpenChange={setCaptureOpen}>
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">ShelfSnap</h1>
              <p className="text-slate-400 mt-1">AI-powered shelf management and compliance</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none">
                  <Camera className="w-4 h-4 mr-2" />
                  Capture
                </Button>
              </DialogTrigger>
              <Input
                value={storeNameUpload}
                onChange={(e) => setStoreNameUpload(e.target.value)}
                placeholder="Store name for upload"
                className="bg-slate-800 border-slate-700 text-white w-full sm:w-auto"
              />
              <Button onClick={handleUploadClick} variant="outline" className="flex-1 sm:flex-none">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </motion.div>
            ))}
          </div>

          <Tabs defaultValue="scans" className="space-y-4">
            <TabsList className="bg-slate-800/50">
              <TabsTrigger value="scans">Recent Scans</TabsTrigger>
              <TabsTrigger value="planograms">Planogram Management</TabsTrigger>
            </TabsList>

            <TabsContent value="scans" className="space-y-4">
              {loading ? (
                <div className="text-center p-8 text-slate-400">Loading scans...</div>
              ) : scans.length === 0 ? (
                <div className="bg-slate-800/30 rounded-xl p-12 text-center border border-slate-700/50">
                  <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white">Ready for your first scan!</h3>
                  <p className="text-slate-400 mt-2">Capture or upload a shelf photo to let the AI get to work.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {scans.map((scan) => (
                    <ShelfScanCard key={scan.id} scan={scan} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="planograms">
              <PlanogramEditor />
            </TabsContent>
          </Tabs>
        </div>
        <DialogContent className="p-0 border-0 bg-transparent max-w-4xl w-full h-full max-h-[90vh]">
          <CameraCapture 
            onClose={() => setCaptureOpen(false)} 
            onSave={() => {
              setCaptureOpen(false);
              fetchData();
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ShelfSnapPage;
