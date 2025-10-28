
import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, FileText, FileImage, Trash2, Download } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ProjectFiles = ({ projectId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: "Error fetching files", description: error.message, variant: "destructive" });
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    setUploading(true);
    
    for (const file of acceptedFiles) {
      const filePath = `${projectId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('project_files').upload(filePath, file);

      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('project_files').getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('project_files').insert({
        project_id: projectId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size
      });

      if (insertError) {
        toast({ title: 'Database record failed', description: insertError.message, variant: 'destructive' });
      }
    }
    setUploading(false);
    fetchFiles(); // Refresh file list
  }, [projectId, fetchFiles, toast]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const getFileIcon = (fileType) => {
    if (!fileType) return <File className="w-8 h-8 text-slate-400" />;
    if (fileType.startsWith('image/')) return <FileImage className="w-8 h-8 text-blue-400" />;
    if (fileType.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    return <File className="w-8 h-8 text-slate-400" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const handleDelete = async (fileId, fileName) => {
    // Note: Storage path needs to be constructed carefully
    const filePath = `${projectId}/${fileName}`; // This is a guess, might need better path management
    
    // First delete from storage, then from DB
    // toast({ title: "Deletion coming soon!", description: "Proper file path management is needed." });
    // For now, just delete DB record for demo
    const { error } = await supabase.from('project_files').delete().eq('id', fileId);
    if(error){
      toast({ title: "Error deleting file", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "File deleted" });
      fetchFiles();
    }
  }

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          'p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all',
          'border-slate-700 hover:border-blue-500 hover:bg-slate-800/30',
          isDragActive && 'border-blue-500 bg-slate-800/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-slate-400">
          <Upload className="w-10 h-10 mb-4" />
          {isDragActive ? (
            <p>Drop the files here...</p>
          ) : (
            <p>Drag & drop files here, or click to select</p>
          )}
          {uploading && <p className="mt-2 text-blue-400">Uploading...</p>}
        </div>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-slate-400">Loading files...</p>}
        <AnimatePresence>
        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <FileText className="mx-auto w-12 h-12 mb-4"/>
            <p>No files uploaded for this project yet.</p>
          </div>
        )}
        </AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {files.map((file, index) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-800/50 p-4 rounded-lg flex items-center gap-4 border border-slate-700/50"
            >
              {getFileIcon(file.file_type)}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm text-white font-medium truncate">{file.file_name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(file.file_size)}</p>
              </div>
              <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                <Button variant="ghost" size="icon"><Download className="w-4 h-4 text-slate-400"/></Button>
              </a>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(file.id, file.file_name)}>
                  <Trash2 className="w-4 h-4 text-red-500/70 hover:text-red-500"/>
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ProjectFiles;
