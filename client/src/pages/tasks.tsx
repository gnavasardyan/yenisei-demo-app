import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TaskTable from "@/components/TaskTable";
import TaskForm from "@/components/TaskForm";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import { tasksApi, usersApi } from "@/lib/api";
import type { TaskWithUser } from "@/lib/types";
import { Plus } from "lucide-react";

export default function Tasks() {
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithUser | undefined>();
  const [assigningTask, setAssigningTask] = useState<TaskWithUser | undefined>();
  const [viewingTask, setViewingTask] = useState<TaskWithUser | undefined>();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks/"],
    queryFn: tasksApi.getAll,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/"],
    queryFn: usersApi.getAll,
  });

  const handleEditTask = (task: TaskWithUser) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleAssignTask = (task: TaskWithUser) => {
    setAssigningTask(task);
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleViewTask = (task: TaskWithUser) => {
    setViewingTask(task);
    setTaskDetailsOpen(true);
  };

  const handleEditFromDetails = (task: TaskWithUser) => {
    setEditingTask(task);
    setTaskFormOpen(true);
  };

  const handleCloseForm = () => {
    setTaskFormOpen(false);
    setEditingTask(undefined);
    setAssigningTask(undefined);
  };

  const handleCloseDetails = () => {
    setTaskDetailsOpen(false);
    setViewingTask(undefined);
  };

  if (tasksLoading || usersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Управление задачами</h2>
          <p className="text-muted-foreground">Создавайте, редактируйте и управляйте задачами</p>
        </div>
        <Button 
          onClick={() => setTaskFormOpen(true)}
          data-testid="add-task-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить задачу
        </Button>
      </div>

      <TaskTable 
        tasks={tasks}
        users={users}
        onEditTask={handleEditTask}
        onAssignTask={handleAssignTask}
        onViewTask={handleViewTask}
      />

      <TaskForm
        open={taskFormOpen}
        onOpenChange={handleCloseForm}
        task={editingTask}
        users={users}
      />

      <TaskDetailsModal
        open={taskDetailsOpen}
        onOpenChange={handleCloseDetails}
        task={viewingTask || null}
        onEditTask={handleEditFromDetails}
      />
    </div>
  );
}
