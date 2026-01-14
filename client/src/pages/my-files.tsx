import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowRight,
  Users,
  Calendar,
  UserPlus,
  Trash2,
  Loader2,
  FolderOpen,
  X,
  MessageCircle,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import type { FileDb, FileMembershipDb, FileRole, User, EventDb } from "@shared/schema";
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

interface ManagedFile extends FileDb {
  membership: FileMembershipDb;
  memberCount: number;
  eventCount: number;
}

const addMemberSchema = z.object({
  userId: z.string().min(1, "اختر مستخدم"),
  role: z.enum(["manager", "deputy", "member"]),
});

type AddMemberFormData = z.infer<typeof addMemberSchema>;

export default function MyFilesPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<ManagedFile | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [deletingMembership, setDeletingMembership] = useState<FileMembershipWithUser | null>(null);

  const { data: myFiles, isLoading } = useQuery<ManagedFile[]>({
    queryKey: ["/api/my-files"],
  });

  const { data: users } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
    enabled: !!selectedFile,
  });

  const { data: fileMemberships, isLoading: isMembershipsLoading } = useQuery<FileMembershipWithUser[]>({
    queryKey: ["/api/files", selectedFile?.id, "memberships"],
    enabled: !!selectedFile,
  });

  const { data: fileEvents, isLoading: isEventsLoading } = useQuery<EventDb[]>({
    queryKey: ["/api/files", selectedFile?.id, "events"],
    enabled: !!selectedFile,
  });

  const addMemberForm = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      userId: "",
      role: "member",
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: AddMemberFormData) => {
      const res = await apiRequest("POST", "/api/memberships", {
        userId: parseInt(data.userId, 10),
        fileId: selectedFile?.id,
        role: data.role,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", selectedFile?.id, "memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-files"] });
      setAddingMember(false);
      addMemberForm.reset();
      toast({
        title: "تمت الإضافة",
        description: "تم إضافة العضو بنجاح",
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

  const deleteMembershipMutation = useMutation({
    mutationFn: async (membershipId: number) => {
      await apiRequest("DELETE", `/api/memberships/${membershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", selectedFile?.id, "memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-files"] });
      setDeletingMembership(null);
      toast({
        title: "تم الحذف",
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

  const onAddMemberSubmit = (data: AddMemberFormData) => {
    addMemberMutation.mutate(data);
  };

  const handleDeleteMembership = () => {
    if (deletingMembership) {
      deleteMembershipMutation.mutate(deletingMembership.id);
    }
  };

  const existingMemberIds = fileMemberships?.map(m => m.userId) || [];
  const availableUsers = users?.filter(u => !existingMemberIds.includes(u.id)) || [];

  const getRoleBadgeVariant = (role: FileRole) => {
    switch (role) {
      case "manager":
        return "default";
      case "deputy":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto" data-testid="loading-my-files">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-40" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (selectedFile) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" data-testid="file-detail-view">
        <header className="flex items-center gap-4 justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFile(null)}
              data-testid="button-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-file-name">{selectedFile.name}</h1>
              {selectedFile.description && (
                <p className="text-sm text-muted-foreground">{selectedFile.description}</p>
              )}
            </div>
          </div>
          <Badge variant={getRoleBadgeVariant(selectedFile.membership.role as FileRole)}>
            {fileRoleNames[selectedFile.membership.role as FileRole]}
          </Badge>
        </header>

        <div className="flex-1 overflow-hidden p-4">
          <Tabs defaultValue="members" className="h-full flex flex-col" dir="rtl">
            <TabsList className="w-fit">
              <TabsTrigger value="members" data-testid="tab-members">
                <Users className="h-4 w-4 ml-2" />
                الأعضاء
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                <Calendar className="h-4 w-4 ml-2" />
                الأحداث
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-lg">أعضاء الملف</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setAddingMember(true)}
                    data-testid="button-add-member"
                  >
                    <UserPlus className="h-4 w-4 ml-2" />
                    إضافة عضو
                  </Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  {isMembershipsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">العضو</TableHead>
                            <TableHead className="text-right">الدور</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fileMemberships?.map((membership) => (
                            <TableRow key={membership.id} data-testid={`row-member-${membership.id}`}>
                              <TableCell className="font-medium">
                                {membership.user.displayName || membership.user.username}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(membership.role as FileRole)}>
                                  {fileRoleNames[membership.role as FileRole]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingMembership(membership)}
                                  data-testid={`button-delete-member-${membership.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {fileMemberships?.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                لا يوجد أعضاء في هذا الملف
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="flex-1 overflow-hidden mt-4">
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">الأحداث المرتبطة بالملف</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  {isEventsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12" />
                      ))}
                    </div>
                  ) : (
                    <ScrollArea className="h-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">العنوان</TableHead>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">سنوي</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fileEvents?.map((event) => (
                            <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                              <TableCell className="font-medium">{event.title}</TableCell>
                              <TableCell>{event.gregorianDate}</TableCell>
                              <TableCell>
                                <Badge variant={event.isAnnual ? "default" : "outline"}>
                                  {event.isAnnual ? "نعم" : "لا"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {fileEvents?.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">
                                لا توجد أحداث مرتبطة بهذا الملف
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Dialog open={addingMember} onOpenChange={setAddingMember}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة عضو جديد</DialogTitle>
              <DialogDescription>
                اختر المستخدم والدور لإضافته إلى الملف
              </DialogDescription>
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
                          <SelectTrigger data-testid="select-user">
                            <SelectValue placeholder="اختر مستخدم" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableUsers.map((user) => (
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
                          <SelectTrigger data-testid="select-role">
                            <SelectValue />
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
                    onClick={() => setAddingMember(false)}
                    data-testid="button-cancel-add-member"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={addMemberMutation.isPending}
                    data-testid="button-submit-add-member"
                  >
                    {addMemberMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    )}
                    إضافة
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingMembership} onOpenChange={() => setDeletingMembership(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف العضو</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف "{deletingMembership?.user.displayName || deletingMembership?.user.username}" من الملف؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel data-testid="button-cancel-delete-member">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteMembership}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-member"
              >
                {deleteMembershipMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                )}
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto" data-testid="my-files-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">ملفاتي</h1>
        </div>

        {myFiles?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">لا توجد ملفات أنت مسؤول عنها</p>
              <p className="text-muted-foreground text-sm mt-2">
                سيظهر هنا الملفات التي أنت مسؤول عنها أو نائب للمسؤول
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myFiles?.map((file) => (
              <Card
                key={file.id}
                className="cursor-pointer hover-elevate transition-colors"
                onClick={() => setSelectedFile(file)}
                data-testid={`card-file-${file.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{file.name}</CardTitle>
                    <Badge variant={getRoleBadgeVariant(file.membership.role as FileRole)}>
                      {fileRoleNames[file.membership.role as FileRole]}
                    </Badge>
                  </div>
                  {file.description && (
                    <CardDescription className="line-clamp-2">{file.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span data-testid={`text-member-count-${file.id}`}>{file.memberCount} أعضاء</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span data-testid={`text-event-count-${file.id}`}>{file.eventCount} أحداث</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/documents/${file.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-documents-${file.id}`}
                        >
                          <FileText className="h-4 w-4 ml-2" />
                          المستندات
                        </Button>
                      </Link>
                      <Link
                        href={`/file-chat/${file.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-chat-${file.id}`}
                        >
                          <MessageCircle className="h-4 w-4 ml-2" />
                          المحادثة
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
