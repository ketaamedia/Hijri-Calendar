import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EventForm } from "./EventForm";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Event, InsertEvent, TaskDb, TaskStatus, User, AttachmentDb } from "@shared/schema";
import { taskStatusNames } from "@shared/schema";
import { CalendarDays, Plus, Trash2, ListTodo, CheckCircle2, Clock, PlayCircle, XCircle, User as UserIcon, Paperclip, Download, FileText } from "lucide-react";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  in_progress: <PlayCircle className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelled: <XCircle className="h-3.5 w-3.5" />,
};

const statusColors: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
};

export function EventModal({ open, onOpenChange, event }: EventModalProps) {
  const { addEvent, updateEvent } = useCalendarStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const eventId = event?.id ? parseInt(event.id, 10) : null;

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskDb[]>({
    queryKey: ["/api/events", eventId, "tasks"],
    queryFn: async () => {
      if (!eventId) return [];
      const res = await fetch(`/api/events/${eventId}/tasks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!eventId && open,
  });

  const { data: attachments = [], isLoading: attachmentsLoading } = useQuery<AttachmentDb[]>({
    queryKey: ["/api/events", eventId, "attachments"],
    queryFn: async () => {
      if (!eventId) return [];
      const res = await fetch(`/api/events/${eventId}/attachments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return res.json();
    },
    enabled: !!eventId && open,
  });

  const { data: users = [] } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === "admin" && !!eventId && open,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; assignedTo?: number | null; dueDate?: string | null }) => {
      return await apiRequest("POST", `/api/events/${eventId}/tasks`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      toast({
        title: "تمت الإضافة",
        description: "تمت إضافة المهمة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل إضافة المهمة",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: TaskStatus }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف المهمة بنجاح",
      });
    },
  });

  const createAttachmentMutation = useMutation({
    mutationFn: async (data: { fileName: string; objectPath: string; fileSize: number; contentType: string }) => {
      return await apiRequest("POST", `/api/events/${eventId}/attachments`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "attachments"] });
      toast({
        title: "تم الرفع",
        description: "تم رفع المرفق بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل حفظ معلومات المرفق",
        variant: "destructive",
      });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      return await apiRequest("DELETE", `/api/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "attachments"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف المرفق بنجاح",
      });
    },
  });

  const handleSubmit = async (data: InsertEvent) => {
    if (event) {
      await updateEvent({ ...data, id: event.id });
    } else {
      const id = crypto.randomUUID();
      await addEvent({ ...data, id });
    }
    onOpenChange(false);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      assignedTo: newTaskAssignee ? parseInt(newTaskAssignee, 10) : null,
      dueDate: newTaskDueDate || null,
    });
  };

  const isEditMode = !!event;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-event">
        <DialogHeader>
          <DialogTitle>
            {event ? "تعديل المناسبة" : "إضافة مناسبة جديدة"}
          </DialogTitle>
        </DialogHeader>

        {isEditMode ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="gap-2" data-testid="tab-event-details">
                <CalendarDays className="h-4 w-4" />
                تفاصيل المناسبة
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2" data-testid="tab-event-tasks">
                <ListTodo className="h-4 w-4" />
                المهام
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="mr-1">
                    {tasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2" data-testid="tab-event-attachments">
                <Paperclip className="h-4 w-4" />
                المرفقات
                {attachments.length > 0 && (
                  <Badge variant="secondary" className="mr-1">
                    {attachments.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <EventForm
                event={event}
                onSubmit={handleSubmit}
                onCancel={() => onOpenChange(false)}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-4 space-y-4">
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm text-foreground">إضافة مهمة جديدة</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">عنوان المهمة *</Label>
                    <Input
                      id="task-title"
                      placeholder="أدخل عنوان المهمة"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      data-testid="input-task-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-description">الوصف</Label>
                    <Textarea
                      id="task-description"
                      placeholder="وصف المهمة (اختياري)"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      className="resize-none"
                      rows={2}
                      data-testid="input-task-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {user?.role === "admin" && (
                      <div className="space-y-2">
                        <Label htmlFor="task-assignee">تعيين إلى</Label>
                        <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                          <SelectTrigger id="task-assignee" data-testid="select-task-assignee">
                            <SelectValue placeholder="اختر مستخدم" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">غير معين</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.displayName || u.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="task-due-date">تاريخ الاستحقاق</Label>
                      <Input
                        id="task-due-date"
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        data-testid="input-task-due-date"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                    className="w-full gap-2"
                    data-testid="button-add-task"
                  >
                    <Plus className="h-4 w-4" />
                    إضافة المهمة
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground">المهام الحالية</h4>
                {tasksLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>لا توجد مهام لهذه المناسبة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 flex items-start justify-between gap-3"
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-medium text-sm truncate">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {task.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {task.dueDate}
                              </span>
                            )}
                            {task.assignedTo && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                {users.find((u) => u.id === task.assignedTo)?.displayName ||
                                  users.find((u) => u.id === task.assignedTo)?.username ||
                                  "مستخدم"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={task.status}
                            onValueChange={(value) =>
                              updateTaskMutation.mutate({ taskId: task.id, status: value as TaskStatus })
                            }
                          >
                            <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-task-status-${task.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(taskStatusNames) as TaskStatus[]).map((s) => (
                                <SelectItem key={s} value={s}>
                                  <div className="flex items-center gap-1.5">
                                    {statusIcons[s]}
                                    <span>{taskStatusNames[s]}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteTaskMutation.mutate(task.id)}
                            data-testid={`button-delete-task-${task.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="mt-4 space-y-4">
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="font-medium text-sm text-foreground">رفع مرفق جديد</h4>
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={52428800}
                  onGetUploadParameters={async (file) => {
                    const response = await fetch("/api/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        name: file.name,
                        size: file.size,
                        contentType: file.type,
                      }),
                    });
                    const data = await response.json();
                    (file as any).objectPath = data.objectPath;
                    return {
                      method: "PUT" as const,
                      url: data.uploadURL,
                    };
                  }}
                  onComplete={(result) => {
                    result.successful?.forEach((file) => {
                      createAttachmentMutation.mutate({
                        fileName: file.name || "unknown",
                        objectPath: (file as any).objectPath || "",
                        fileSize: file.size || 0,
                        contentType: file.type || "application/octet-stream",
                      });
                    });
                  }}
                  buttonClassName="w-full"
                >
                  <Plus className="h-4 w-4 ml-2" />
                  اختيار ملفات للرفع
                </ObjectUploader>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-foreground">المرفقات الحالية</h4>
                {attachmentsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="text-no-attachments">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>لا توجد مرفقات لهذه المناسبة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="border rounded-lg p-3 flex items-center justify-between gap-3"
                        data-testid={`attachment-item-${attachment.id}`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{attachment.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {(attachment.fileSize / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a
                              href={attachment.objectPath}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid={`button-download-attachment-${attachment.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteAttachmentMutation.mutate(attachment.id)}
                            data-testid={`button-delete-attachment-${attachment.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <EventForm
            event={event}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
