import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { taskStatusNames, type TaskStatus, type TaskDb } from "@shared/schema";
import { CheckCircle2, Clock, PlayCircle, XCircle, CalendarDays, ListTodo } from "lucide-react";

type TaskWithEvent = TaskDb & { event: { id: number; title: string } };

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  in_progress: <PlayCircle className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

const statusColors: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400",
};

export default function TasksPage() {
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<TaskWithEvent[]>({
    queryKey: ["/api/my-tasks"],
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: TaskStatus }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-tasks"] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة المهمة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل تحديث حالة المهمة",
        variant: "destructive",
      });
    },
  });

  const groupedTasks: Record<TaskStatus, TaskWithEvent[]> = {
    pending: tasks.filter((t) => t.status === "pending"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    completed: tasks.filter((t) => t.status === "completed"),
    cancelled: tasks.filter((t) => t.status === "cancelled"),
  };

  const handleStatusChange = (taskId: number, status: TaskStatus) => {
    updateTaskMutation.mutate({ taskId, status });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="tasks-loading">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="tasks-page">
      <div className="flex items-center gap-3">
        <ListTodo className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-tasks-title">
          المهام الموكلة إلي
        </h1>
      </div>

      {tasks.length === 0 ? (
        <Card data-testid="card-no-tasks">
          <CardContent className="py-12 text-center">
            <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">لا توجد مهام موكلة إليك حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {(["pending", "in_progress", "completed", "cancelled"] as TaskStatus[]).map((status) => {
            const statusTasks = groupedTasks[status];
            if (statusTasks.length === 0) return null;

            return (
              <div key={status} className="space-y-4" data-testid={`section-tasks-${status}`}>
                <div className="flex items-center gap-2">
                  <span className={`p-1.5 rounded-md ${statusColors[status]}`}>
                    {statusIcons[status]}
                  </span>
                  <h2 className="text-lg font-semibold text-foreground">
                    {taskStatusNames[status]}
                  </h2>
                  <Badge variant="secondary" className="mr-2">
                    {statusTasks.length}
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {statusTasks.map((task) => (
                    <Card key={task.id} className="hover-elevate" data-testid={`card-task-${task.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-medium text-foreground truncate" data-testid={`text-task-title-${task.id}`}>
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                <span data-testid={`text-task-event-${task.id}`}>{task.event.title}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span data-testid={`text-task-due-${task.id}`}>{task.dueDate}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value as TaskStatus)}
                              disabled={updateTaskMutation.isPending}
                            >
                              <SelectTrigger 
                                className="w-36" 
                                data-testid={`select-task-status-${task.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(taskStatusNames) as TaskStatus[]).map((s) => (
                                  <SelectItem key={s} value={s} data-testid={`option-status-${s}`}>
                                    <div className="flex items-center gap-2">
                                      {statusIcons[s]}
                                      <span>{taskStatusNames[s]}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
