import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Mail, Calendar, ListTodo, Save, Loader2 } from "lucide-react";

interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  eventReminders: boolean;
  taskNotifications: boolean;
  email: string | null;
  reminderDaysBefore: number;
}

const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  eventReminders: z.boolean(),
  taskNotifications: z.boolean(),
  email: z.string().email("عنوان البريد الإلكتروني غير صالح").optional().or(z.literal("")),
  reminderDaysBefore: z.number().min(1).max(7),
});

type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>;

export default function NotificationSettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<NotificationSettings>({
    queryKey: ["/api/settings/notifications"],
  });

  const form = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      inAppNotifications: true,
      eventReminders: true,
      taskNotifications: true,
      email: "",
      reminderDaysBefore: 1,
    },
    values: settings ? {
      emailNotifications: settings.emailNotifications,
      inAppNotifications: settings.inAppNotifications,
      eventReminders: settings.eventReminders,
      taskNotifications: settings.taskNotifications,
      email: settings.email || "",
      reminderDaysBefore: settings.reminderDaysBefore,
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: NotificationSettingsFormData) => {
      const response = await apiRequest("PATCH", "/api/settings/notifications", {
        ...data,
        email: data.email || null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/notifications"] });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الإشعارات بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ إعدادات الإشعارات",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationSettingsFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-notification-settings">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6" dir="rtl" data-testid="notification-settings-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
          إعدادات الإشعارات
        </h1>
        <p className="text-muted-foreground mt-1">
          قم بتخصيص تفضيلات الإشعارات الخاصة بك
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card data-testid="card-notification-types">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                أنواع الإشعارات
              </CardTitle>
              <CardDescription>
                اختر أنواع الإشعارات التي تريد تلقيها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="emailNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        إشعارات البريد الإلكتروني
                      </FormLabel>
                      <FormDescription>
                        تلقي الإشعارات عبر البريد الإلكتروني
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-email-notifications"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inAppNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        إشعارات التطبيق
                      </FormLabel>
                      <FormDescription>
                        تلقي الإشعارات داخل التطبيق
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-in-app-notifications"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventReminders"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        تذكيرات الأحداث
                      </FormLabel>
                      <FormDescription>
                        تلقي تذكيرات قبل الأحداث المجدولة
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-event-reminders"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taskNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-2">
                        <ListTodo className="h-4 w-4" />
                        إشعارات المهام
                      </FormLabel>
                      <FormDescription>
                        تلقي إشعارات عند تعيين مهام جديدة أو تحديثها
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-task-notifications"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card data-testid="card-email-settings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                إعدادات البريد الإلكتروني
              </CardTitle>
              <CardDescription>
                قم بإعداد بريدك الإلكتروني لتلقي الإشعارات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        {...field}
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormDescription>
                      سيتم إرسال الإشعارات إلى هذا البريد الإلكتروني
                    </FormDescription>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reminderDaysBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التذكير قبل (أيام)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-reminder-days">
                          <SelectValue placeholder="اختر عدد الأيام" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            {day === 1 ? "يوم واحد" : `${day} أيام`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      عدد الأيام قبل الحدث لإرسال التذكير
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            حفظ الإعدادات
          </Button>
        </form>
      </Form>
    </div>
  );
}
