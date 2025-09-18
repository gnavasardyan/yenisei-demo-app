import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { tasksApi, usersApi } from "@/lib/api";
import type { TaskWithUser, Comment } from "@/lib/types";
import { 
  Calendar, 
  User, 
  FileText, 
  Paperclip, 
  Edit, 
  Trash2, 
  CloudUpload,
  MessageSquare,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface TaskDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithUser | null;
  onEditTask?: (task: TaskWithUser) => void;
}

const statusConfig = {
  created: { label: "Создана", color: "bg-destructive/10 text-destructive" },
  assigned: { label: "Назначена", color: "bg-warning/10 text-warning" },
  done: { label: "Выполнена", color: "bg-success/10 text-success" },
};

export default function TaskDetailsModal({ 
  open, 
  onOpenChange, 
  task, 
  onEditTask 
}: TaskDetailsModalProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Проверяем, есть ли вложения у задачи
  const hasAttachments = (() => {
    if (!task || !task.attachments) {
      console.log('No task or attachments:', { task: !!task, attachments: task?.attachments });
      return false;
    }
    try {
      const parsed = typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments;
      const hasFiles = parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
      console.log('Checking attachments:', { 
        taskId: task.id, 
        attachments: task.attachments, 
        parsed, 
        hasFiles 
      });
      return hasFiles;
    } catch (e) {
      console.warn('Failed to parse attachments for hasAttachments:', e, task.attachments);
      return false;
    }
  })();

  // Загружаем задачу с вложением, если есть вложения
  const { data: taskWithAttachment, isLoading: loadingAttachment } = useQuery({
    queryKey: ["/api/tasks/with-attachment", task?.id],
    queryFn: () => {
      console.log('Fetching task with attachment:', { taskId: task?.id, hasAttachments });
      return task ? tasksApi.getWithAttachment(task.id) : null;
    },
    enabled: !!task && hasAttachments && open,
  });

  // Загружаем данные пользователя, если у задачи есть user_id
  const { data: taskUserResponse, isLoading: loadingUser, error: userError } = useQuery({
    queryKey: ["/api/users/", task?.user_id],
    queryFn: () => {
      return task?.user_id ? usersApi.getById(task.user_id) : null;
    },
    enabled: !!task?.user_id && open && !task.user, // Загружаем только если пользователь не загружен
  });

  // Извлекаем пользователя из ответа API (может быть вложенным)
  const taskUser = taskUserResponse?.user || taskUserResponse;

  const deleteTaskMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
      toast({
        title: "Успех",
        description: "Задача успешно удалена",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить задачу",
        variant: "destructive",
      });
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) =>
      tasksApi.uploadAttachment(taskId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
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

  const addCommentMutation = useMutation({
    mutationFn: ({ taskId, comment }: { taskId: string; comment: string }) =>
      tasksApi.addComment(taskId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/"] });
      toast({
        title: "Успех",
        description: "Комментарий успешно добавлен",
      });
      setNewComment("");
      setAddingComment(false);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить комментарий",
        variant: "destructive",
      });
      setAddingComment(false);
    },
  });

  const handleDeleteTask = () => {
    if (!task) return;
    if (confirm("Вы уверены, что хотите удалить эту задачу?")) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && task) {
      setUploading(true);
      Array.from(files).forEach(file => {
        uploadAttachmentMutation.mutate({ taskId: task.id, file });
      });
    }
  };

  const handleAddComment = () => {
    if (!task || !newComment.trim()) return;
    setAddingComment(true);
    addCommentMutation.mutate({ taskId: task.id, comment: newComment.trim() });
  };

  if (!task) return null;

  // Вспомогательная функция для безопасного парсинга attachments
  const parseAttachments = (attachments: any) => {
    if (!attachments) return {};
    if (typeof attachments === 'object' && !Array.isArray(attachments)) {
      return attachments; // Уже объект
    }
    if (typeof attachments === 'string') {
      try {
        return JSON.parse(attachments);
      } catch (e) {
        console.warn('Failed to parse attachments JSON:', e, attachments);
        return {};
      }
    }
    return {};
  };

  const attachments = (() => {
    try {
      if (!task.attachments) return [];
      const parsed = typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments;
      // API возвращает объект с файлами, а не массив
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed).map(([name, details]: [string, any]) => ({
          name,
          ...details
        }));
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed to parse attachments JSON:", task.attachments);
      return [];
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="task-details-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{task.name}</DialogTitle>
          <div className="flex items-center space-x-2 mt-4">
            {onEditTask && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEditTask(task);
                  onOpenChange(false);
                }}
                data-testid="edit-task-details"
              >
                <Edit className="h-4 w-4 mr-1" />
                Редактировать
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Status and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Статус</span>
                </div>
                <Badge className={`mt-2 ${statusConfig[task.status as keyof typeof statusConfig]?.color || ''}`}>
                  {statusConfig[task.status as keyof typeof statusConfig]?.label || task.status}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Исполнитель</span>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  {loadingUser ? (
                    <span className="text-sm text-muted-foreground">Загрузка...</span>
                  ) : (task.user || taskUser) ? (
                    <>
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {(task.user?.username || taskUser?.username || 'У').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{task.user?.username || taskUser?.username}</span>
                    </>
                  ) : task.user_id ? (
                    <span className="text-sm text-muted-foreground">Пользователь #{task.user_id}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Не назначен</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Создана</span>
                </div>
                <p className="mt-2 text-sm">
                  {task.created_at ? format(new Date(task.created_at), "dd MMMM yyyy, HH:mm", { locale: ru }) : "Неизвестно"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Описание</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {task.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Описание не указано
                </p>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Paperclip className="h-5 w-5" />
                <span>Вложения</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="attachment-upload"
                  data-testid="attachment-upload-input"
                />
                <label
                  htmlFor="attachment-upload"
                  className="cursor-pointer"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    data-testid="add-attachment-button"
                    asChild
                  >
                    <span>
                      <CloudUpload className="h-4 w-4 mr-1" />
                      {uploading ? "Загрузка..." : "Добавить файл"}
                    </span>
                  </Button>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {attachments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.map((attachment: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      data-testid={`attachment-${index}`}
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name || `Файл ${index + 1}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : "Размер неизвестен"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Приложение
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Paperclip className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Нет прикрепленных файлов
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Используйте кнопку "Добавить файл" чтобы прикрепить документы
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Отображение содержимого вложения */}
          {taskWithAttachment && taskWithAttachment.attachment && selectedAttachment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Просмотр вложения: {taskWithAttachment.attachment.filename}</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedAttachment(null)}
                    data-testid="close-attachment-view"
                  >
                    Закрыть
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {taskWithAttachment.attachment.content_base64 && (
                  <div className="flex flex-col items-center space-y-4">
                    {/* Отображаем изображение, если это изображение */}
                    {(() => {
                      const parsedAttachments = parseAttachments(taskWithAttachment.task.attachments);
                      const attachment = parsedAttachments[taskWithAttachment.attachment.filename];
                      return attachment?.content_type?.startsWith('image/') && (
                        <img 
                          src={`data:${attachment.content_type};base64,${taskWithAttachment.attachment.content_base64}`}
                          alt={taskWithAttachment.attachment.filename}
                          className="max-w-full max-h-96 object-contain rounded-lg border"
                          data-testid="attachment-image"
                        />
                      );
                    })()}
                    
                    {/* Информация о файле */}
                    {(() => {
                      const parsedAttachments = parseAttachments(taskWithAttachment.task.attachments);
                      const attachment = parsedAttachments[taskWithAttachment.attachment.filename];
                      return (
                        <div className="text-sm text-muted-foreground text-center">
                          <p>Размер: {attachment?.length ? 
                            Math.round(attachment.length / 1024) + ' KB' : 
                            'Неизвестен'}
                          </p>
                          <p>Тип: {attachment?.content_type || 'Неизвестен'}</p>
                        </div>
                      );
                    })()}
                    
                    {/* Кнопка скачивания */}
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const content = taskWithAttachment.attachment.content_base64;
                        const parsedAttachments = parseAttachments(taskWithAttachment.task.attachments);
                        const contentType = parsedAttachments[taskWithAttachment.attachment.filename]?.content_type || 'application/octet-stream';
                        const byteCharacters = atob(content);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: contentType });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = taskWithAttachment.attachment.filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="download-attachment-content"
                    >
                      Скачать файл
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Автоматическое отображение содержимого вложения (если есть только одно) */}
          {taskWithAttachment && taskWithAttachment.attachment && attachments.length === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Содержимое вложения: {taskWithAttachment.attachment.filename}</CardTitle>
              </CardHeader>
              <CardContent>
                {taskWithAttachment.attachment.content_base64 && (
                  <div className="flex flex-col items-center space-y-4">
                    {(() => {
                      const parsedAttachments = parseAttachments(taskWithAttachment.task.attachments);
                      const attachment = parsedAttachments[taskWithAttachment.attachment.filename];
                      return attachment?.content_type?.startsWith('image/') && (
                        <img 
                          src={`data:${attachment.content_type};base64,${taskWithAttachment.attachment.content_base64}`}
                          alt={taskWithAttachment.attachment.filename}
                          className="max-w-full max-h-96 object-contain rounded-lg border"
                          data-testid="attachment-image-auto"
                        />
                      );
                    })()}
                    
                    {(() => {
                      const parsedAttachments = parseAttachments(taskWithAttachment.task.attachments);
                      const attachment = parsedAttachments[taskWithAttachment.attachment.filename];
                      return (
                        <div className="text-sm text-muted-foreground text-center">
                          <p>Размер: {attachment?.length ? 
                            Math.round(attachment.length / 1024) + ' KB' : 
                            'Неизвестен'}
                          </p>
                          <p>Тип: {attachment?.content_type || 'Неизвестен'}</p>
                        </div>
                      );
                    })()}
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const content = taskWithAttachment.attachment.content_base64;
                        const parsedAttachments = parseAttachments(taskWithAttachment.task.attachments);
                        const contentType = parsedAttachments[taskWithAttachment.attachment.filename]?.content_type || 'application/octet-stream';
                        const byteCharacters = atob(content);
                        const byteNumbers = new Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) {
                          byteNumbers[i] = byteCharacters.charCodeAt(i);
                        }
                        const byteArray = new Uint8Array(byteNumbers);
                        const blob = new Blob([byteArray], { type: contentType });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = taskWithAttachment.attachment.filename;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      data-testid="download-attachment-auto"
                    >
                      Скачать файл
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Комментарии */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Комментарии</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Отображение существующих комментариев */}
              {task.comments && task.comments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {task.comments.map((comment, index) => (
                    <div
                      key={index}
                      className="flex space-x-3 p-3 border rounded-lg"
                      data-testid={`comment-${index}`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {comment.author ? comment.author.charAt(0).toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {comment.created_at ? format(new Date(comment.created_at), "dd.MM.yyyy HH:mm", { locale: ru }) : ""}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 mb-6">
                  <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Комментариев пока нет
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Добавьте первый комментарий ниже
                  </p>
                </div>
              )}

              {/* Форма добавления комментария */}
              <div className="border-t pt-4">
                <div className="flex space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {currentUser?.username?.charAt(0).toUpperCase() || 'У'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Добавить комментарий..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      disabled={addingComment}
                      data-testid="comment-input"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={addingComment || !newComment.trim()}
                        data-testid="add-comment-button"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {addingComment ? "Добавление..." : "Добавить комментарий"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Кнопка удаления внизу */}
          <div className="flex justify-end pt-4">
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={deleteTaskMutation.isPending}
              data-testid="delete-task-bottom"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteTaskMutation.isPending ? 'Удаление...' : 'Удалить задачу'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}