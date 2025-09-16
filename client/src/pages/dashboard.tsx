import { useQuery } from "@tanstack/react-query";
import StatsCard from "@/components/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi, tasksApi, usersApi } from "@/lib/api";
import type { TaskWithUser, UserWithStats } from "@/lib/types";
import { 
  ClipboardList, 
  Users, 
  CheckCircle, 
  Clock, 
  Paperclip 
} from "lucide-react";

const statusConfig = {
  created: { label: "Создана", color: "bg-destructive/10 text-destructive" },
  assigned: { label: "Назначена", color: "bg-warning/10 text-warning" },
  done: { label: "Выполнена", color: "bg-success/10 text-success" },
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: dashboardApi.getStats,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks/"],
    queryFn: tasksApi.getAll,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users/"],
    queryFn: usersApi.getAll,
  });

  // Get recent tasks (last 5)
  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
    .slice(0, 5);

  // Get users with task stats
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
  }).slice(0, 5);

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Всего задач"
          value={stats?.totalTasks || 0}
          icon={ClipboardList}
          trend={{ value: "+12%", label: "с прошлого месяца" }}
        />
        <StatsCard
          title="Активных пользователей"
          value={stats?.activeUsers || 0}
          icon={Users}
          trend={{ value: "+2", label: "новых пользователя" }}
        />
        <StatsCard
          title="Выполнено"
          value={stats?.completedTasks || 0}
          icon={CheckCircle}
          valueColor="text-success"
        />
        <StatsCard
          title="В работе"
          value={stats?.inProgressTasks || 0}
          icon={Clock}
          valueColor="text-warning"
        />
      </div>

      {/* Recent Tasks and Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <Card data-testid="recent-tasks-card">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Последние задачи</CardTitle>
              <Button variant="link" size="sm" data-testid="show-all-tasks">
                Показать все
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {tasksLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Нет задач для отображения
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                  data-testid={`recent-task-${task.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1" data-testid={`task-name-${task.id}`}>
                        {task.name}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2" data-testid={`task-description-${task.id}`}>
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-xs">
                        <Badge className={statusConfig[task.status].color}>
                          {statusConfig[task.status].label}
                        </Badge>
                        <span className="text-muted-foreground">
                          {task.created_at ? new Date(task.created_at).toLocaleDateString("ru-RU") : "—"}
                        </span>
                      </div>
                    </div>
                    {task.user && (
                      <div className="ml-4">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {task.user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Active Users */}
        <Card data-testid="active-users-card">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Активные пользователи</CardTitle>
              <Button variant="link" size="sm" data-testid="manage-users">
                Управление
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : usersWithStats.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Нет пользователей для отображения
              </div>
            ) : (
              usersWithStats.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
                  data-testid={`active-user-${user.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium" data-testid={`user-name-${user.id}`}>
                          {user.username}
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid={`user-email-${user.id}`}>
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium" data-testid={`user-task-count-${user.id}`}>
                        {user.taskStats.total} задач
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.taskStats.completed} выполнено
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
