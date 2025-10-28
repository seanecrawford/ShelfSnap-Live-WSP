
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanTask from '@/components/worksuite/KanbanTask';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const KanbanColumn = ({ column, tasks, onAddTask }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `column-${column.id}`, data: { type: 'Column', column } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex flex-col w-80 shrink-0"
    >
      <div className="bg-slate-800/60 rounded-xl flex-1 flex flex-col">
        <div {...listeners} className="p-4 border-b border-slate-700 cursor-grab active:cursor-grabbing">
          <h3 className="font-semibold text-white">{column.title} <span className="text-slate-400 text-sm">({tasks.length})</span></h3>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-3 scrollbar-hide">
          <DndContext collisionDetection={closestCenter}>
            <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasks.map(task => (
                <KanbanTask key={task.id} task={task} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="p-4 border-t border-slate-700">
          <Button variant="ghost" className="w-full justify-start text-slate-400" onClick={onAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Add task
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KanbanColumn;
