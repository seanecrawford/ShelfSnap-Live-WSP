
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/project/${project.id}`);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={handleCardClick}
      className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{project.name}</h3>
          <p className="text-slate-400 text-sm mt-1">{project.description}</p>
        </div>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
          {project.status}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-400">Progress</span>
            <span className="text-white font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{project.completed_tasks || 0}/{project.tasks || 0} tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{project.team?.length || 0} members</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
