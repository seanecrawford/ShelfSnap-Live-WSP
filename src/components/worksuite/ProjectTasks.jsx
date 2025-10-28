
import React, { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import KanbanColumn from '@/components/worksuite/KanbanColumn';
import CreateTaskDialog from '@/components/worksuite/CreateTaskDialog';

const ProjectTasks = ({ projectId }) => {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: columnsData, error: columnsError } = await supabase
      .from('kanban_columns')
      .select('*')
      .eq('project_id', projectId)
      .order('position');

    if (columnsError) {
      toast({ title: "Error fetching columns", description: columnsError.message, variant: "destructive" });
    } else if (columnsData.length === 0) {
      const defaultCols = ['To Do', 'In Progress', 'Done'].map((title, i) => ({ project_id: projectId, title, position: i }));
      const { data: newCols, error: newColsError } = await supabase.from('kanban_columns').insert(defaultCols).select();
      if (newColsError) toast({ title: "Error creating columns", description: newColsError.message, variant: "destructive" });
      else setColumns(newCols || []);
    } else {
      setColumns(columnsData);
    }
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('kanban_tasks')
      .select('*')
      .eq('project_id', projectId);

    if (tasksError) {
      toast({ title: "Error fetching tasks", description: tasksError.message, variant: "destructive" });
    } else {
      const groupedTasks = (tasksData || []).reduce((acc, task) => {
        const columnId = task.column_id;
        if (!acc[columnId]) acc[columnId] = [];
        acc[columnId].push(task);
        return acc;
      }, {});
      setTasks(groupedTasks);
    }
    
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (taskData) => {
    const { data, error } = await supabase.from('kanban_tasks').insert([{ ...taskData, project_id: projectId, column_id: activeColumnId }]).select();
    if (error) {
      toast({ title: "Error creating task", description: error.message, variant: "destructive" });
    } else {
      const newTask = data[0];
      setTasks(prev => ({
        ...prev,
        [activeColumnId]: [...(prev[activeColumnId] || []), newTask]
      }));
      toast({ title: "Task created!", description: `${newTask.title} added.` });
    }
    setActiveColumnId(null);
  };
  
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
  
    const activeTask = columns.flatMap(col => tasks[col.id] || []).find(t => t.id === active.id);
    if (!activeTask) return;
  
    const newColumnId = over.id.startsWith('column-') ? over.id.replace('column-', '') : tasks[Object.keys(tasks).find(key => (tasks[key] || []).some(t => t.id === over.id))]?.find(t => t.id === over.id)?.column_id;
  
    if (!newColumnId || activeTask.column_id === newColumnId) return;
  
    setTasks(prevTasks => {
      const newTasks = { ...prevTasks };
      const sourceColumn = (newTasks[activeTask.column_id] || []).filter(t => t.id !== active.id);
      const destColumn = [...(newTasks[newColumnId] || []), { ...activeTask, column_id: newColumnId }];
      newTasks[activeTask.column_id] = sourceColumn;
      newTasks[newColumnId] = destColumn;
      return newTasks;
    });
  
    const { error } = await supabase.from('kanban_tasks').update({ column_id: newColumnId }).eq('id', active.id);
  
    if (error) {
      toast({ title: 'Error updating task', description: error.message, variant: 'destructive' });
      fetchData();
    }
  };

  if (loading) return <div className="text-center text-white p-8">Loading tasks...</div>;

  return (
    <div className="space-y-6">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={columns.map(c => `column-${c.id}`)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {columns.map(column => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasks[column.id] || []}
                onAddTask={() => {
                  setActiveColumnId(column.id);
                  setShowCreateTask(true);
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
};

export default ProjectTasks;
