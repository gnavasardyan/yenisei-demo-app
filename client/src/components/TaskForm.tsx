import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { tasksApi } from "@/lib/api";
import type { TaskWithUser, User } from "@/lib/types";
import { ObjectUploader } from "@/components/ObjectUploader";
import { CloudUpload } from "lucide-react";

const taskSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  status: z.enum(["created", "assigned", "done"]).default("created"),
  user_id: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithUser;
  users: User[];
}

export default function TaskForm({ open, onOpenChange, task, users }: TaskFormProps) {
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Фильтруем пользователей на основе роли
  const availableUsers = useMemo(() => {
    if (!currentUser || !users.length) return [];
    
    // Администраторы могут назначать на любого пользователя
    if (currentUser.role === 'admin') {
      return users;
    }
    
    // Обычные пользователи могут назначать только на себя
    return users.filter(user => user.id === currentUser.id || user.username === currentUser.username);
  }, [users, currentUser]);

  // Проверяем может ли пользователь редактировать статус задачи
  const canEditStatus = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (!task) return true; // новая задача
    
    // Ищем совпадение пользователя как на главной странице  
    const userMatch = users.find(u => 
      u.username === currentUser.username || 
      u.id === currentUser.id
    );
    
    const canEdit = (
      task.user_id === currentUser.id || 
      task.user_id === currentUser.username ||
      (userMatch && task.user_id === userMatch.id)
    );
    
    
    return canEdit;
  }, [currentUser, task, users]);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "created",
      user_id: "unassigned",
    },
  });

  // Обновляем форму когда task меняется
  useEffect(() => {
    if (task) {
      form.reset({
        name: task.name || "",
        description: task.description || "",
        status: task.status || "created",
        user_id: task.user_id || "unassigned",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        status: "created",
        user_id: "unassigned",
      });
      setPendingFiles([]);
    }
  }, [task, form]);

  const createTaskMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: async (newTask) => {
      console.log("Task created successfully:", newTask);
      console.log("Pending files to upload:", pendingFiles);
      
      // Загрузить файлы если есть
      if (pendingFiles.length > 0) {
        // API возвращает объект с task внутри, где находится _id вместо id  
        const task = (newTask as any).task || newTask;
        const taskId = task.id || task._id;
        console.log("Task object:", task, "taskId:", taskId);
        console.log(`Starting upload of ${pendingFiles.length} files for task ID: ${taskId}`);
        setUploading(true);
        try {
          for (const file of pendingFiles) {
            console.log(`Uploading file: ${file.name}`);
            await tasksApi.uploadAttachment(taskId, file);
            console.log(`Successfully uploaded: ${file.name}`);
          }
          setPendingFiles([]);
        } catch (error) {
          console.error("File upload error:", error);
          toast({
            title: "Ошибка загрузки файлов",
            description: "Файлы не удалось загрузить: " + (error as Error).message,
            variant: "destructive",
          });
        } finally {
          setUploading(false);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
      toast({
        title: "Успех",
        description: "Задача успешно создана",
      });
      onOpenChange(false);
      form.reset();
      setPendingFiles([]);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать задачу",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormData> }) =>
      tasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
      toast({
        title: "Успех",
        description: "Задача успешно обновлена",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить задачу",
        variant: "destructive",
      });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      tasksApi.uploadAttachment(taskId, file),
    onSuccess: () => {
      toast({
        title: "Успех",
        description: "Файл успешно загружен",
      });
      setUploading(false);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить файл",
        variant: "destructive",
      });
      setUploading(false);
    },
  });

  const onSubmit = (data: TaskFormData) => {
    // Handle unassigned user_id
    const taskData = {
      ...data,
      user_id: data.user_id === "unassigned" ? undefined : data.user_id
    };
    
    if (task) {
      updateTaskMutation.mutate({ id: task.id, data: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!task || files.length === 0) return;

    setUploading(true);
    for (const file of files) {
      uploadAttachmentMutation.mutate({ taskId: task.id, file });
    }
  };

  const handleLocalFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      if (task) {
        // Для существующих задач загружаем сразу
        handleFileUpload(fileArray);
      } else {
        // Для новых задач сохраняем до создания
        setPendingFiles(prev => [...prev, ...fileArray]);
        toast({
          title: "Файлы готовы",
          description: `${fileArray.length} файл(ов) будет загружено после создания задачи`,
        });
      }
    }
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="task-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {task ? "Редактировать задачу" : "Создать задачу"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название задачи *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Введите название задачи"
                      {...field}
                      data-testid="task-name-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Введите описание задачи"
                      rows={4}
                      {...field}
                      data-testid="task-description-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!canEditStatus}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="task-status-select">
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="created">Создана</SelectItem>
                        <SelectItem value="assigned">Назначена</SelectItem>
                        <SelectItem value="done">Выполнена</SelectItem>
                      </SelectContent>
                    </Select>
                    {!canEditStatus && (
                      <p className="text-xs text-muted-foreground">
                        Только назначенный исполнитель может изменять статус задачи
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Исполнитель</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="task-user-select">
                          <SelectValue placeholder="Выберите исполнителя" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Не назначен</SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormLabel>Вложения</FormLabel>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-2">
                  {task ? "Перетащите файлы сюда или" : "Файлы будут загружены после создания задачи"}
                </p>
                <input
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={handleLocalFileUpload}
                  className="hidden"
                  id="file-upload"
                  data-testid="file-upload-input"
                />
                <label
                  htmlFor="file-upload"
                  className="text-primary hover:underline cursor-pointer inline-block"
                  data-testid="file-upload-button"
                >
                  выберите файлы
                </label>
                {uploading && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Загрузка файлов...
                  </div>
                )}
                
                {/* Показать ожидающие файлы для новых задач */}
                {!task && pendingFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Готовы к загрузке:</p>
                    {pendingFiles.map((file, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                        data-testid={`pending-file-${index}`}
                      >
                        <span className="truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePendingFile(index)}
                          data-testid={`remove-pending-file-${index}`}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="cancel-task-button"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading || uploading}
                data-testid="save-task-button"
              >
                {isLoading ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
