import { useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usersApi } from "@/lib/api";
import type { User } from "@/lib/types";

const userSchema = z.object({
  username: z.string().min(1, "Имя пользователя обязательно"),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

export default function UserForm({ open, onOpenChange, user }: UserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
    },
  });

  // Обновляем форму когда user меняется
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
      });
    } else {
      form.reset({
        username: "",
      });
    }
  }, [user, form]);

  const createUserMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/"] });
      toast({
        title: "Успех",
        description: "Пользователь успешно создан",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('Create user error:', error);
      let errorMessage = "Не удалось создать пользователя";
      
      // Check for validation errors (422)
      if (error?.response?.status === 422) {
        try {
          const body = JSON.parse(error.response.body);
          if (body?.detail) {
            errorMessage = "Ошибка валидации данных. Проверьте правильность заполнения полей.";
          }
        } catch (e) {
          errorMessage = "Проверьте правильность введенных данных";
        }
      }
      
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserFormData }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/"] });
      toast({
        title: "Успех",
        description: "Пользователь успешно обновлен",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Update user error:', error);
      let errorMessage = "Не удалось обновить пользователя";
      
      // Check for validation errors (422)
      if (error?.response?.status === 422) {
        try {
          const body = JSON.parse(error.response.body);
          if (body?.detail) {
            errorMessage = "Ошибка валидации данных. Проверьте правильность заполнения полей.";
          }
        } catch (e) {
          errorMessage = "Проверьте правильность введенных данных";
        }
      }
      
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormData) => {
    if (user) {
      updateUserMutation.mutate({ id: user.id, data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const isLoading = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="user-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {user ? "Редактировать пользователя" : "Создать пользователя"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя пользователя *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Введите имя пользователя"
                      {...field}
                      data-testid="user-username-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="cancel-user-button"
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="save-user-button"
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
