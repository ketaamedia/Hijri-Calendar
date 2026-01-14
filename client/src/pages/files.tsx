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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import type { FileDb, FileMembershipDb, FileRole, User } from "@shared/schema";
import { fileRoleNames } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

interface FileMembershipUser {
  id: number;
  username: string;
  displayName: string | null;
}

interface FileMembershipWithUser extends FileMembershipDb {
  user: FileMembershipUser;
}

const createFileSchema = z.object({
  name: z.string().min(1, "اسم الملف مطلوب"),
  description: z.string().optional(),
});

const editFileSchema = z.object({
  name: z.string().min(1, "اسم الملف مطلوب"),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1, "اختر مستخدم"),
  role: z.enum(["manager", "deputy", "member"]),
});

type CreateFileFormData = z.infer<typeof createFileSchema>;
type EditFileFormData = z.infer<typeof editFileSchema>;
type AddMemberFormData = z.infer<typeof addMemberSchema>;

export default function FilesPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<FileDb | null>(null);
  const [deletingFile, setDeletingFile] = useState<FileDb | null>(null);
  const [expandedFileId, setExpandedFileId] = useState<number | null>(null);
  const [addingMemberToFileId, setAddingMemberToFileId] = useState<number | null>(null);
  const [editingMembership, setEditingMembership] = useState<FileMembershipWithUser | null>(null);
  const [deletingMembership, setDeletingMembership] = useState<FileMembershipWithUser | null>(null);

  const { data: files, isLoading } = useQuery<FileDb[]>({
    queryKey: ["/api/files"],
  });

  const { data: users } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateFileFormData) => {
      const res = await apiRequest("POST", "/api/files", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "تم إنشاء الملف",
        description: "تم إنشاء الملف بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء الملف",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EditFileFormData }) => {
      const res = await apiRequest("PUT", `/api/files/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setEditingFile(null);
      toast({
        title: "تم تحديث الملف",
        description: "تم تحديث بيانات الملف بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الملف",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/files/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setDeletingFile(null);
      toast({
        title: "تم حذف الملف",
        description: "تم حذف الملف بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف الملف",
        variant: "destructive",
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ fileId, data }: { fileId: number; data: AddMemberFormData }) => {
      const res = await apiRequest("POST", "/api/memberships", {
        userId: parseInt(data.userId, 10),
        fileId,
        role: data.role,
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", variables.fileId, "memberships"] });
      setAddingMemberToFileId(null);
      toast({
        title: "تمت إضافة العضو",
        description: "تمت إضافة العضو بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إضافة العضو",
        variant: "destructive",
      });
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: async ({ id, role, fileId }: { id: number; role: FileRole; fileId: number }) => {
      const res = await apiRequest("PUT", `/api/memberships/${id}`, { role });
      return { result: await res.json(), fileId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", data.fileId, "memberships"] });
      setEditingMembership(null);
      toast({
        title: "تم تحديث الدور",
        description: "تم تحديث دور العضو بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الدور",
        variant: "destructive",
      });
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: async ({ id, fileId }: { id: number; fileId: number }) => {
      await apiRequest("DELETE", `/api/memberships/${id}`);
      return { fileId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", data.fileId, "memberships"] });
      setDeletingMembership(null);
      toast({
        title: "تم حذف العضو",
        description: "تم حذف العضو من الملف بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف العضو",
        variant: "destructive",
      });
    },
  });

  const createForm = useForm<CreateFileFormData>({
    resolver: zodResolver(createFileSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editForm = useForm<EditFileFormData>({
    resolver: zodResolver(editFileSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const addMemberForm = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: "",
      role: "member",
    },
  });

  const handleOpenCreate = () => {
    createForm.reset({
      name: "",
      description: "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (file: FileDb) => {
    editForm.reset({
      name: file.name,
      description: file.description || "",
    });
    setEditingFile(file);
  };

  const handleOpenAddMember = (fileId: number) => {
    addMemberForm.reset({
      userId: "",
      role: "member",
    });
    setAddingMemberToFileId(fileId);
  };

  const onCreateSubmit = (data: CreateFileFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: EditFileFormData) => {
    if (editingFile) {
      updateMutation.mutate({ id: editingFile.id, data });
    }
  };

  const handleDelete = () => {
    if (deletingFile) {
      deleteMutation.mutate(deletingFile.id);
    }
  };

  const onAddMemberSubmit = (data: AddMemberFormData) => {
    if (addingMemberToFileId) {
      addMemberMutation.mutate({ fileId: addingMemberToFileId, data });
    }
  };

  const handleUpdateMemberRole = (membership: FileMembershipWithUser, newRole: FileRole) => {
    updateMembershipMutation.mutate({
      id: membership.id,
      role: newRole,
      fileId: membership.fileId,
    });
  };

  const handleDeleteMembership = () => {
    if (deletingMembership) {
      deleteMembershipMutation.mutate({
        id: deletingMembership.id,
        fileId: deletingMembership.fileId,
      });
    }
  };

  const toggleExpand = (fileId: number) => {
    setExpandedFileId(expandedFileId === fileId ? null : fileId);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl" data-testid="files-page">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-row-reverse items-center justify-between gap-4">
          <div className="flex flex-row-reverse items-center gap-4">
            <Button variant="ghost" size="icon" asChild data-testid="button-back-home">
              <Link href="/">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold text-foreground" data-testid="text-page-title">
              إدارة الملفات
            </h1>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2" data-testid="button-add-file">
            <Plus className="h-4 w-4" />
            إضافة ملف
          </Button>
        </div>
      </header>

      <main className="p-6">
        <Card data-testid="files-card">
          <CardHeader>
            <CardTitle data-testid="text-files-title">قائمة الملفات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4" data-testid="files-loading">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : files && files.length > 0 ? (
              <div className="space-y-4" data-testid="files-list">
                {files.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isExpanded={expandedFileId === file.id}
                    onToggleExpand={() => toggleExpand(file.id)}
                    onEdit={() => handleOpenEdit(file)}
                    onDelete={() => setDeletingFile(file)}
                    onAddMember={() => handleOpenAddMember(file.id)}
                    onEditMembership={(m) => setEditingMembership(m)}
                    onDeleteMembership={(m) => setDeletingMembership(m)}
                    onUpdateMemberRole={handleUpdateMemberRole}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground" data-testid="files-empty">
                لا يوجد ملفات
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-create-title">إضافة ملف جديد</DialogTitle>
            <DialogDescription>أدخل بيانات الملف الجديد</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الملف</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-file-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-file-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إضافة
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-edit-title">تعديل الملف</DialogTitle>
            <DialogDescription>تعديل بيانات الملف</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الملف</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-file-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-file-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingFile(null)}
                  data-testid="button-cancel-edit"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingFile} onOpenChange={() => setDeletingFile(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="dialog-delete-title">حذف الملف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الملف "{deletingFile?.name}"؟ سيتم حذف جميع العضويات المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!addingMemberToFileId} onOpenChange={() => setAddingMemberToFileId(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-add-member-title">إضافة عضو</DialogTitle>
            <DialogDescription>اختر المستخدم والدور</DialogDescription>
          </DialogHeader>
          <Form {...addMemberForm}>
            <form onSubmit={addMemberForm.handleSubmit(onAddMemberSubmit)} className="space-y-4">
              <FormField
                control={addMemberForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المستخدم</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-member-user">
                          <SelectValue placeholder="اختر مستخدم" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.displayName || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addMemberForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدور</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-member-role">
                          <SelectValue placeholder="اختر الدور" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manager">{fileRoleNames.manager}</SelectItem>
                        <SelectItem value="deputy">{fileRoleNames.deputy}</SelectItem>
                        <SelectItem value="member">{fileRoleNames.member}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddingMemberToFileId(null)}
                  data-testid="button-cancel-add-member"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  data-testid="button-submit-add-member"
                >
                  {addMemberMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إضافة
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMembership} onOpenChange={() => setEditingMembership(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle data-testid="dialog-edit-membership-title">تعديل دور العضو</DialogTitle>
            <DialogDescription>
              تعديل دور {editingMembership?.user?.displayName || editingMembership?.user?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">الدور</label>
              <Select
                value={editingMembership?.role}
                onValueChange={(value: FileRole) => {
                  if (editingMembership) {
                    handleUpdateMemberRole(editingMembership, value);
                  }
                }}
              >
                <SelectTrigger data-testid="select-edit-member-role">
                  <SelectValue placeholder="اختر الدور" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">{fileRoleNames.manager}</SelectItem>
                  <SelectItem value="deputy">{fileRoleNames.deputy}</SelectItem>
                  <SelectItem value="member">{fileRoleNames.member}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingMembership(null)}
                data-testid="button-close-edit-membership"
              >
                إغلاق
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingMembership} onOpenChange={() => setDeletingMembership(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="dialog-delete-membership-title">حذف العضو</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العضو "{deletingMembership?.user?.displayName || deletingMembership?.user?.username}" من هذا الملف؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete-membership">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMembership}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-membership"
            >
              {deleteMembershipMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FileRow({
  file,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddMember,
  onEditMembership,
  onDeleteMembership,
  onUpdateMemberRole,
}: {
  file: FileDb;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddMember: () => void;
  onEditMembership: (m: FileMembershipWithUser) => void;
  onDeleteMembership: (m: FileMembershipWithUser) => void;
  onUpdateMemberRole: (m: FileMembershipWithUser, role: FileRole) => void;
}) {
  const { data: memberships, isLoading: isMembershipsLoading } = useQuery<FileMembershipWithUser[]>({
    queryKey: ["/api/files", file.id, "memberships"],
    queryFn: async () => {
      const res = await fetch(`/api/files/${file.id}/memberships`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch memberships");
      return res.json();
    },
    enabled: isExpanded,
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div
        className="border rounded-lg p-4"
        data-testid={`file-row-${file.id}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium" data-testid={`text-file-name-${file.id}`}>
              {file.name}
            </h3>
            {file.description && (
              <p className="text-sm text-muted-foreground" data-testid={`text-file-description-${file.id}`}>
                {file.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-toggle-members-${file.id}`}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              data-testid={`button-edit-file-${file.id}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              data-testid={`button-delete-file-${file.id}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <CollapsibleContent className="mt-4">
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                الأعضاء
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={onAddMember}
                className="gap-2"
                data-testid={`button-add-member-${file.id}`}
              >
                <UserPlus className="h-4 w-4" />
                إضافة عضو
              </Button>
            </div>
            {isMembershipsLoading ? (
              <div className="space-y-2" data-testid={`members-loading-${file.id}`}>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : memberships && memberships.length > 0 ? (
              <Table data-testid={`members-table-${file.id}`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership) => (
                    <TableRow key={membership.id} data-testid={`row-member-${membership.id}`}>
                      <TableCell data-testid={`text-member-name-${membership.id}`}>
                        {membership.user.displayName || membership.user.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-member-role-${membership.id}`}>
                          {fileRoleNames[membership.role as FileRole]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEditMembership(membership)}
                            data-testid={`button-edit-member-${membership.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDeleteMembership(membership)}
                            data-testid={`button-delete-member-${membership.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground" data-testid={`members-empty-${file.id}`}>
                لا يوجد أعضاء في هذا الملف
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
