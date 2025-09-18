import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { usersApi } from "@/lib/api";
import type { UserWithStats } from "@/lib/types";
import { Edit, Trash2, ClipboardList } from "lucide-react";

interface UserCardProps {
  user: UserWithStats;
  onEditUser: (user: UserWithStats) => void;
  onViewTasks: (user: UserWithStats) => void;
}

export default function UserCard({ user, onEditUser, onViewTasks }: UserCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/"] });
      toast({
        title: "Успех",
        description: "Пользователь успешно удален",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пользователя",
        variant: "destructive",
      });
    },
  });

  const handleDeleteUser = () => {
    if (confirm("Вы уверены, что хотите удалить этого пользователя?")) {
      deleteUserMutation.mutate(user.id);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`user-card-${user.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="text-lg font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg" data-testid={`user-name-${user.id}`}>
                {user.username}
              </h3>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditUser(user)}
              data-testid={`edit-user-${user.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteUser}
              disabled={deleteUserMutation.isPending}
              data-testid={`delete-user-${user.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Всего задач:</span>
            <span className="font-medium" data-testid={`user-total-tasks-${user.id}`}>
              {user.taskStats.total}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Выполнено:</span>
            <span className="font-medium text-success" data-testid={`user-completed-tasks-${user.id}`}>
              {user.taskStats.completed}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">В работе:</span>
            <span className="font-medium text-warning" data-testid={`user-progress-tasks-${user.id}`}>
              {user.taskStats.inProgress}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Создан:</span>
            <span className="font-medium" data-testid={`user-created-date-${user.id}`}>
              {user.created_at ? new Date(user.created_at).toLocaleDateString("ru-RU") : "—"}
            </span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onViewTasks(user)}
            data-testid={`view-user-tasks-${user.id}`}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Просмотреть задачи
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
