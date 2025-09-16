import { useState } from "react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: task?.name || "",
      description: task?.description || "",
      status: task?.status || "created",
      user_id: task?.user_id || "unassigned",
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
      toast({
        title: "Успех",
        description: "Задача успешно создана",
      });
      onOpenChange(false);
      form.reset();
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                        {users.map((user) => (
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

            {/* Временно отключено - загрузка файлов в разработке
            {task && (
              <div>
                <FormLabel>Вложения</FormLabel>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-2">Перетащите файлы сюда или</p>
                  <ObjectUploader
                    maxNumberOfFiles={5}
                    maxFileSize={10485760}
                    onGetUploadParameters={async () => ({
                      method: "PUT" as const,
                      url: `https://qdr.equiron.com/tasks/${task.id}/attachment`,
                    })}
                    onComplete={(result: any) => {
                      if (result.successful.length > 0) {
                        const files = result.successful.map((upload: any) => upload.data as File);
                        handleFileUpload(files);
                      }
                    }}
                    buttonClassName="text-primary hover:underline"
                  >
                    выберите файлы
                  </ObjectUploader>
                </div>
              </div>
            )}
            */}

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
