import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { tasksApi } from "@/lib/api";
import type { TaskWithUser, User } from "@/lib/types";
import { Edit, UserPlus, Trash2, Paperclip, Eye } from "lucide-react";

interface TaskTableProps {
  tasks: TaskWithUser[];
  users: User[];
  onEditTask: (task: TaskWithUser) => void;
  onAssignTask: (task: TaskWithUser) => void;
  onViewTask: (task: TaskWithUser) => void;
}

const statusConfig = {
  created: { label: "Создана", color: "bg-destructive/10 text-destructive" },
  assigned: { label: "Назначена", color: "bg-warning/10 text-warning" },
  done: { label: "Выполнена", color: "bg-success/10 text-success" },
};

export default function TaskTable({ tasks, users, onEditTask, onAssignTask, onViewTask }: TaskTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
      toast({
        title: "Успех",
        description: "Задача успешно удалена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить задачу",
        variant: "destructive",
      });
    },
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = (task.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    
    // Улучшенная логика сопоставления пользователей
    let matchesUser = userFilter === "all";
    if (!matchesUser && userFilter !== "all") {
      // Ищем пользователя в списке для получения его ID и username
      const selectedUser = users.find(u => u.id === userFilter);
      matchesUser = Boolean(
        task.user_id === userFilter || 
        (selectedUser && task.user_id === selectedUser.username)
      );
    }
    
    return matchesSearch && matchesStatus && matchesUser;
  });

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Вы уверены, что хотите удалить эту задачу?")) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                type="text"
                placeholder="Поиск задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-tasks"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="filter-status">
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="created">Создана</SelectItem>
                <SelectItem value="assigned">Назначена</SelectItem>
                <SelectItem value="done">Выполнена</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-48" data-testid="filter-user">
                <SelectValue placeholder="Все пользователи" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Задача</th>
                <th className="text-left p-4 font-semibold">Статус</th>
                <th className="text-left p-4 font-semibold">Исполнитель</th>
                <th className="text-left p-4 font-semibold">Дата создания</th>
                <th className="text-left p-4 font-semibold">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    {tasks.length === 0 ? "Нет задач для отображения" : "Нет задач, соответствующих фильтрам"}
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="border-b border-border hover:bg-muted/25 transition-colors"
                    data-testid={`task-row-${task.id}`}
                  >
                    <td className="p-4">
                      <div>
                        <div 
                          className="font-medium mb-1 cursor-pointer hover:text-primary transition-colors" 
                          data-testid={`task-name-${task.id}`}
                          onClick={() => onViewTask(task)}
                        >
                          {task.name}
                        </div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground" data-testid={`task-description-${task.id}`}>
                            {task.description}
                          </div>
                        )}
                        {(() => {
                          // Проверяем, есть ли фактически вложения
                          if (!task.attachments) return null;
                          try {
                            const parsed = typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments;
                            const hasFiles = parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
                            return hasFiles && (
                              <div className="flex items-center space-x-2 mt-2">
                                <Paperclip className="text-muted-foreground h-3 w-3" />
                                <span className="text-xs text-muted-foreground">Есть вложения</span>
                              </div>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        className={statusConfig[task.status]?.color || "bg-muted/10 text-muted-foreground"}
                        data-testid={`task-status-${task.id}`}
                      >
                        {statusConfig[task.status]?.label || task.status || "Неизвестно"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {(() => {
                        // Найти пользователя по task.user_id
                        const assignedUser = task.user || users.find(u => u.id === task.user_id);
                        return assignedUser ? (
                          <div className="flex items-center space-x-2" data-testid={`task-user-${task.id}`}>
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {assignedUser.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{assignedUser.username}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Не назначен</span>
                        );
                      })()}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground" data-testid={`task-date-${task.id}`}>
                        {task.created_at ? new Date(task.created_at).toLocaleDateString("ru-RU") : "—"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {(() => {
                          // Используем ту же логику сопоставления что и в TaskForm
                          const userMatch = users.find(u => 
                            u.username === currentUser?.username || 
                            u.id === currentUser?.id
                          );
                          
                          const canEdit = !currentUser || 
                                        currentUser.role === 'admin' || 
                                        task.user_id === currentUser.id ||
                                        task.user_id === currentUser.username ||
                                        (userMatch && task.user_id === userMatch.id);
                          
                          if (canEdit) {
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditTask(task)}
                                  data-testid={`edit-task-${task.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onAssignTask(task)}
                                  data-testid={`assign-task-${task.id}`}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTask(task.id)}
                                  disabled={deleteTaskMutation.isPending}
                                  data-testid={`delete-task-${task.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewTask(task)}
                                  data-testid={`view-task-${task.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewTask(task)}
                                  data-testid={`attach-task-${task.id}`}
                                  title="Добавить файл"
                                >
                                  <Paperclip className="h-4 w-4" />
                                </Button>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
