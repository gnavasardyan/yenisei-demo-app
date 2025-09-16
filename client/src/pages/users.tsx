import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UserCard from "@/components/UserCard";
import UserForm from "@/components/UserForm";
import TaskTable from "@/components/TaskTable";
import { usersApi, tasksApi } from "@/lib/api";
import type { UserWithStats, TaskWithUser } from "@/lib/types";
import { Plus } from "lucide-react";

export default function Users() {
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStats | undefined>();
  const [viewingUserTasks, setViewingUserTasks] = useState<UserWithStats | undefined>();
  const [userTasksOpen, setUserTasksOpen] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/"],
    queryFn: usersApi.getAll,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks/"],
    queryFn: tasksApi.getAll,
  });

  // Calculate user stats
  const usersWithStats: UserWithStats[] = users.map(user => {
    const userTasks = tasks.filter(task => task.user_id === user.id);
    return {
      ...user,
      taskStats: {
        total: userTasks.length,
        completed: userTasks.filter(task => task.status === "done").length,
        inProgress: userTasks.filter(task => task.status === "assigned").length,
      }
    };
  });

  const handleEditUser = (user: UserWithStats) => {
    setEditingUser(user);
    setUserFormOpen(true);
  };

  const handleViewTasks = (user: UserWithStats) => {
    setViewingUserTasks(user);
    setUserTasksOpen(true);
  };

  const handleCloseForm = () => {
    setUserFormOpen(false);
    setEditingUser(undefined);
  };

  const handleCloseTasksView = () => {
    setUserTasksOpen(false);
    setViewingUserTasks(undefined);
  };

  // Get tasks for the selected user
  const userTasks = viewingUserTasks 
    ? tasks.filter(task => task.user_id === viewingUserTasks.id)
    : [];

  if (usersLoading || tasksLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Управление пользователями</h2>
          <p className="text-muted-foreground">Создавайте и управляйте пользователями системы</p>
        </div>
        <Button 
          onClick={() => setUserFormOpen(true)}
          data-testid="add-user-button"
        >
          <Plus className="mr-2 h-4 w-4" />
          Добавить пользователя
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usersWithStats.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Нет пользователей для отображения
          </div>
        ) : (
          usersWithStats.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onEditUser={handleEditUser}
              onViewTasks={handleViewTasks}
            />
          ))
        )}
      </div>

      {/* User Form Dialog */}
      <UserForm
        open={userFormOpen}
        onOpenChange={handleCloseForm}
        user={editingUser}
      />

      {/* User Tasks Dialog */}
      <Dialog open={userTasksOpen} onOpenChange={handleCloseTasksView}>
        <DialogContent className="max-w-6xl max-h-[90vh]" data-testid="user-tasks-dialog">
          <DialogHeader>
            <DialogTitle>
              Задачи пользователя: {viewingUserTasks?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            {userTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                У этого пользователя нет задач
              </div>
            ) : (
              <div className="space-y-4">
                {userTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-border rounded-lg hover:bg-muted/25 transition-colors"
                    data-testid={`user-task-${task.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{task.name}</h4>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2 text-xs">
                          <span className={`px-2 py-1 rounded-sm font-medium ${
                            task.status === "created" ? "bg-destructive/10 text-destructive" :
                            task.status === "assigned" ? "bg-warning/10 text-warning" :
                            "bg-success/10 text-success"
                          }`}>
                            {task.status === "created" ? "Создана" :
                             task.status === "assigned" ? "Назначена" : "Выполнена"}
                          </span>
                          <span className="text-muted-foreground">
                            {task.created_at ? new Date(task.created_at).toLocaleDateString("ru-RU") : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
