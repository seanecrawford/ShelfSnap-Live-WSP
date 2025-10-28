
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProjectCard from '@/components/worksuite/ProjectCard';
import CreateProjectDialog from '@/components/worksuite/CreateProjectDialog';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash } from 'lucide-react';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$0';
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const WorkSuitePage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error fetching projects", description: error.message, variant: "destructive" });
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (projectData) => {
    const { data, error } = await supabase.from('projects').insert([{...projectData, budget: 9000000, manager: 'Test User'}]).select(); // Dummy data
    if (error) {
      toast({ title: "Error creating project", description: error.message, variant: "destructive" });
    } else {
      setProjects(prev => [data[0], ...prev]);
      toast({
        title: "Project created! 🎉",
        description: `${projectData.name} has been added to your workspace`,
      });
    }
  };
  
  const statusColors = {
    'Archived': 'bg-slate-700',
    'Completed': 'bg-green-500',
    'Planning': 'bg-blue-500',
  }

  return (
    <>
      <Helmet>
        <title>Project Management - Sprig Work Suite Pro</title>
        <meta name="description" content="Oversee and manage all your projects from a unified dashboard." />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Project Management</h1>
            <p className="text-slate-400 mt-1">Oversee and manage all your projects from a unified dashboard.</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-bold text-white mb-2">Projects Overview</h2>
            <div className="text-slate-400 text-sm space-y-1 mb-6">
              <p><span className="font-bold text-slate-200">How To Use This Page:</span> View all projects in the table below. Use the filters to narrow down your search.</p>
              <p>Click anywhere on a project row to select it. This will enable other tabs (Tasks, Budget, etc.) to show details for that project.</p>
            </div>
            {loading ? (
              <div className="text-center p-8 text-slate-400">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-400">No projects yet. Create your first project to get started!</p>
              </div>
            ) : (
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id} className="hover:bg-slate-700/30 cursor-pointer">
                      <TableCell className="font-medium text-white">{project.name}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[project.status] || 'bg-slate-600'} text-white`}>{project.status}</Badge>
                      </TableCell>
                       <TableCell>{project.priority || 'Medium'}</TableCell>
                      <TableCell>{project.start_date || 'N/A'}</TableCell>
                      <TableCell>{project.due_date || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(project.budget)}</TableCell>
                      <TableCell>{project.manager || 'N/A'}</TableCell>
                      <TableCell className="flex gap-2">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"><Edit className="w-4 h-4"/></Button>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500"><Trash className="w-4 h-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </div>

        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onCreateProject={handleCreateProject}
        />
      </div>
    </>
  );
};

export default WorkSuitePage;
