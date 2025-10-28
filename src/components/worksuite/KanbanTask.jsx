
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const priorityColors = {
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
};

const KanbanTask = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-900/70 p-4 rounded-lg border border-slate-700/50 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start">
        <p className="text-white text-sm font-medium flex-1 pr-2">{task.title}</p>
        <div {...attributes} {...listeners} className="text-slate-500 hover:text-white">
          <GripVertical className="w-4 h-4" />
        </div>
      </div>
      {task.description && <p className="text-slate-400 text-xs mt-2">{task.description}</p>}
      <div className="flex items-center justify-between mt-3">
        {task.priority && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${priorityColors[task.priority.toLowerCase()] || 'bg-slate-700'}`}>
            {task.priority}
          </span>
        )}
        {task.due_date && <span className="text-xs text-slate-400">{new Date(task.due_date).toLocaleDateString()}</span>}
      </div>
    </div>
  );
};

export default KanbanTask;
