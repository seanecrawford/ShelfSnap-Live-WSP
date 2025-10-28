
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Scan, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ScanDetailView from '@/components/shelfsnap/ScanDetailView';

const ShelfScanCard = ({ scan }) => {
  const [isDetailViewOpen, setDetailViewOpen] = useState(false);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const complianceColor = scan.compliance > 85 ? 'text-green-400' : 'text-yellow-400';
  const complianceBg = scan.compliance > 85 ? 'bg-green-500/10' : 'bg-yellow-500/10';

  return (
    <Dialog open={isDetailViewOpen} onOpenChange={setDetailViewOpen}>
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3 }}
        className="bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 group"
      >
        <div className="relative">
          <img src={scan.image_url} alt={`Shelf scan at ${scan.store_name}`} className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-4">
            <h3 className="font-bold text-lg text-white">{scan.store_name}</h3>
            <p className="text-sm text-slate-400">{new Date(scan.scan_date).toLocaleDateString()}</p>
          </div>
          <DialogTrigger asChild>
             <button className="absolute top-2 right-2 bg-slate-900/50 p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-5 h-5" />
             </button>
          </DialogTrigger>
        </div>
        <div className="p-4 grid grid-cols-3 gap-2 text-center">
          <div className={`p-2 rounded-lg ${complianceBg}`}>
            <CheckCircle className={`w-5 h-5 mx-auto mb-1 ${complianceColor}`} />
            <p className="text-xs text-slate-300">Compliance</p>
            <p className={`font-bold text-lg ${complianceColor}`}>{scan.compliance}%</p>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <AlertCircle className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
            <p className="text-xs text-slate-300">Issues</p>
            <p className="font-bold text-lg text-yellow-400">{scan.issues}</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Scan className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-xs text-slate-300">Products</p>
            <p className="font-bold text-lg text-blue-400">{scan.products}</p>
          </div>
        </div>
      </motion.div>
       <DialogContent showCloseButton={false} className="p-0 border-0 bg-transparent max-w-full w-full h-full max-h-full sm:max-w-7xl sm:h-[90vh] sm:max-h-[90vh]">
          <ScanDetailView scan={scan} onClose={() => setDetailViewOpen(false)} />
        </DialogContent>
    </Dialog>
  );
};

export default ShelfScanCard;
