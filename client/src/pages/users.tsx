import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Plus, Pencil, Trash2, UserCheck, UserX, Loader2 } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

const createUserSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  displayName: z.string().optional(),
  description: z.string().optional(),
  role: z.enum(["admin", "user"]),
  isActive: z.boolean(),
  canCreateEvents: z.boolean(),
  canEditEvents: z.boolean(),
  canDeleteEvents: z.boolean(),
});

const editUserSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").optional().or(z.literal("")),
  displayName: z.string().optional(),
  description: z.string().optional(),
  role: z.enum(["admin", "user"]),
  isActive: z.boolean(),
  canCreateEvents: z.boolean(),
  canEditEvents: z.boolean(),
  canDeleteEvents: z.boolean(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export default function UsersPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithoutPassword | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithoutPassword | null>(null);

  const { data: users, isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const res = await apiRequest("POST", "/api/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "تم إنشاء المستخدم",
        description: "تم إنشاء المستخدم بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء المستخدم",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditUserFormData }) => {
      const submitData = { ...data };
      if (!submitData.password) {
        delete (submitData as any).password;
      }
      const res = await apiRequest("PUT", `/api/users/${id}`, submitData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({
        title: "تم تحديث المستخدم",
        description: "تم تحديث بيانات المستخدم بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث المستخدم",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeletingUser(null);
      toast({
        title: "تم حذف المستخدم",
        description: "تم حذف المستخدم بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف المستخدم",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      description: "",
      role: "user",
      isActive: true,
      canCreateEvents: false,
      canEditEvents: false,
      canDeleteEvents: false,
    },
  });

  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
      description: "",
      role: "user",
      isActive: true,
      canCreateEvents: false,
      canEditEvents: false,
      canDeleteEvents: false,
    },
  });

  const handleOpenCreate = () => {
    createForm.reset({
      username: "",
      password: "",
      displayName: "",
      description: "",
      role: "user",
      isActive: true,
      canCreateEvents: false,
      canEditEvents: false,
      canDeleteEvents: false,
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (user: UserWithoutPassword) => {
    editForm.reset({
      username: user.username,
      password: "",
      displayName: user.displayName || "",
      description: user.description || "",
      role: user.role,
      isActive: user.isActive,
      canCreateEvents: user.canCreateEvents,
      canEditEvents: user.canEditEvents,
      canDeleteEvents: user.canDeleteEvents,
    });
    setEditingUser(user);
  };

  const onCreateSubmit = (data: CreateUserFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: EditUserFormData) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser.id);
    }
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "مدير" : "مستخدم";
  };

  const getPermissionsDisplay = (user: UserWithoutPassword) => {
    const permissions: string[] = [];
    if (user.canCreateEvents) permissions.push("إنشاء");
    if (user.canEditEvents) permissions.push("تعديل");
    if (user.canDeleteEvents) permissions.push("حذف");
    return permissions.length > 0 ? permissions.join("، ") : "لا يوجد";
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="users-page">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-row-reverse items-center justify-between gap-4">
          <div className="flex flex-row-reverse items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back-home">
              <Link href="/">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-page-title">
              إدارة المستخدمين
            </h1>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2" data-testid="button-add-user">
            <Plus className="h-4 w-4" />
            إضافة مستخدم
          </Button>
        </div>
      </header>

      <main className="p-6">
        <Card data-testid="users-card">
          <CardHeader>
            <CardTitle data-testid="text-users-title">قائمة المستخدمين</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4" data-testid="users-loading">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <Table data-testid="users-table">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم المعروض</TableHead>
                    <TableHead className="text-right">اسم المستخدم</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">الصلاحيات</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell data-testid={`text-displayname-${user.id}`}>
                        {user.displayName || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-username-${user.id}`}>
                        {user.username}
                      </TableCell>
                      <TableCell data-testid={`text-role-${user.id}`}>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-permissions-${user.id}`}>
                        {getPermissionsDisplay(user)}
                      </TableCell>
                      <TableCell data-testid={`status-active-${user.id}`}>
                        {user.isActive ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            <UserCheck className="h-3 w-3 ml-1" />
                            نشط
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <UserX className="h-3 w-3 ml-1" />
                            غير نشط
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingUser(user)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-users">
                لا يوجد مستخدمين
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl" data-testid="dialog-create-user">
          <DialogHeader className="text-right">
            <DialogTitle data-testid="text-dialog-title">إضافة مستخدم جديد</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              قم بإدخال بيانات المستخدم الجديد
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور *</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم المعروض</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-displayname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الدور</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="اختر الدور" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">مستخدم</SelectItem>
                          <SelectItem value="admin">مدير</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-3 border rounded-lg p-4">
                <Label className="text-sm font-medium">الصلاحيات</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-isactive"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">الحساب نشط</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="canCreateEvents"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-cancreate"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">إنشاء المناسبات</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="canEditEvents"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-canedit"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">تعديل المناسبات</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="canDeleteEvents"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-candelete"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">حذف المناسبات</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create">
                  {createMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إنشاء
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl" dir="rtl" data-testid="dialog-edit-user">
          <DialogHeader className="text-right">
            <DialogTitle data-testid="text-edit-dialog-title">تعديل المستخدم</DialogTitle>
            <DialogDescription data-testid="text-edit-dialog-description">
              قم بتعديل بيانات المستخدم
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم المستخدم *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور (اتركها فارغة للإبقاء على الحالية)</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} data-testid="input-edit-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم المعروض</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-displayname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الدور</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-role">
                            <SelectValue placeholder="اختر الدور" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">مستخدم</SelectItem>
                          <SelectItem value="admin">مدير</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-3 border rounded-lg p-4">
                <Label className="text-sm font-medium">الصلاحيات</Label>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-edit-isactive"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">الحساب نشط</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="canCreateEvents"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-edit-cancreate"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">إنشاء المناسبات</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="canEditEvents"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-edit-canedit"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">تعديل المناسبات</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="canDeleteEvents"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-edit-candelete"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">حذف المناسبات</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  data-testid="button-cancel-edit"
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent dir="rtl" data-testid="dialog-delete-user">
          <AlertDialogHeader className="text-right">
            <AlertDialogTitle data-testid="text-delete-title">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              هل أنت متأكد من حذف المستخدم "{deletingUser?.displayName || deletingUser?.username}"؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
