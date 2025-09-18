import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Home, 
  ClipboardList, 
  Users, 
  Menu, 
  Bell, 
  User as UserIcon,
  LogOut,
  Settings,
  Shield,
  X
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Роль-ориентированная навигация
  const navigation = [
    { name: "Главная", href: "/", icon: Home },
    { name: "Задачи", href: "/tasks", icon: ClipboardList },
    ...(user?.role === 'admin' ? [{ name: "Пользователи", href: "/users", icon: Users }] : []),
  ];

  const pageConfig: Record<string, { title: string; subtitle: string }> = {
    "/": { title: "Главная", subtitle: "Обзор задач и пользователей" },
    "/tasks": { title: "Задачи", subtitle: "Управление задачами" },
    "/users": { title: "Пользователи", subtitle: "Управление пользователями" },
  };

  const currentPage = pageConfig[location] || { title: "Страница не найдена", subtitle: "" };

  const handleLogout = () => {
    // Очищаем кэш React Query
    queryClient.clear();
    
    // Выходим из системы
    logout();
    
    // Показываем уведомление
    toast({
      title: "Успех",
      description: "Вы успешно вышли из системы",
    });
    
    // Перенаправляем на страницу входа
    setLocation("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-card border-r border-border w-64 min-h-screen fixed md:relative z-30 md:z-auto transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <ClipboardList className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Трекер Задач</h1>
              <p className="text-sm text-muted-foreground">v1.0.0</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start space-x-3",
                        isActive && "bg-accent text-accent-foreground"
                      )}
                      data-testid={`nav-${item.href.replace('/', '') || 'home'}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
                data-testid="mobile-menu-button"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-semibold" data-testid="page-title">
                  {currentPage.title}
                </h2>
                <p className="text-sm text-muted-foreground" data-testid="page-subtitle">
                  {currentPage.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" data-testid="notifications-button">
                <Bell className="h-5 w-5" />
              </Button>
              
              {user ? (
                /* User dropdown для авторизованного пользователя */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center space-x-2" data-testid="user-menu-button">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden md:inline text-sm">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.username}</p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                          {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem disabled className="cursor-not-allowed">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Настройки</span>
                    </DropdownMenuItem>
                    
                    {user.role === 'admin' && (
                      <DropdownMenuItem disabled className="cursor-not-allowed">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Админ панель</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="logout-button">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Выйти</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* Кнопка входа для неавторизованного пользователя */
                <Link href="/login">
                  <Button variant="outline" size="sm" data-testid="link-login">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Войти
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6 overflow-y-auto h-full pb-20">
          {children}
        </div>
      </main>
    </div>
  );
}
