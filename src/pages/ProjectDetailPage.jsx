
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ChevronLeft, LayoutGrid, FileText, History } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProjectTasks from '@/components/worksuite/ProjectTasks';
import ProjectFiles from '@/components/worksuite/ProjectFiles';

const ProjectDetailPage = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProject = useCallback(async () => {
    setLoading(true);
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      toast({ title: "Error fetching project", description: projectError.message, variant: "destructive" });
    } else {
      setProject(projectData);
    }
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const ActivityView = () => (
    <div className="text-center py-16 text-slate-400">
      <History className="mx-auto w-12 h-12 mb-4" />
      <h3 className="text-lg font-semibold text-white">Activity Feed Coming Soon</h3>
      <p>Track all project changes and updates here.</p>
    </div>
  );

  if (loading) return <div className="text-center text-white">Loading project...</div>;
  if (!project) return <div className="text-center text-red-400">Project not found.</div>;

  return (
    <>
      <Helmet>
        <title>{project.name} - Sprig Work Suite Pro</title>
        <meta name="description" content={`Details for project: ${project.name}`} />
      </Helmet>
      <div className="space-y-6">
        <div>
          <Link to="/work-suite" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <p className="text-slate-400 mt-1">{project.description}</p>
        </div>
        
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList className="bg-slate-800/50">
            <TabsTrigger value="tasks"><LayoutGrid className="w-4 h-4 mr-2" />Tasks</TabsTrigger>
            <TabsTrigger value="files"><FileText className="w-4 h-4 mr-2" />Files</TabsTrigger>
            <TabsTrigger value="activity"><History className="w-4 h-4 mr-2" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <ProjectTasks projectId={projectId} />
          </TabsContent>
          <TabsContent value="files">
             <ProjectFiles projectId={projectId} />
          </TabsContent>
          <TabsContent value="activity">
            <ActivityView />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ProjectDetailPage;
