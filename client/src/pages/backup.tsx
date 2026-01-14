import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  exportToExcel,
  parseExcelFile,
  exportBackupToJSON,
  parseBackupFile,
  parseCSVFile,
} from "@/lib/excel-export";
import {
  ArrowRight,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  Database,
  Trash2,
  AlertTriangle,
  Loader2,
  Cloud,
  Plus,
  Clock,
  User,
  HardDrive,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Backup {
  id: number;
  name: string;
  objectPath: string;
  fileSize: number;
  createdBy: number | null;
  isAutomatic: boolean;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function BackupPage() {
  const { events, hijriOverrides, settings, importEvents, restoreBackup, clearAllData } = useCalendarStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"excel" | "csv" | "json" | "backup">("excel");

  const isAdmin = user?.role === "admin";

  const { data: backups, isLoading: backupsLoading } = useQuery<Backup[]>({
    queryKey: ["/api/backups"],
    enabled: isAdmin,
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/backups/create", { isAutomatic: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({
        title: "تم إنشاء النسخة الاحتياطية",
        description: "تم حفظ النسخة الاحتياطية في التخزين السحابي",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إنشاء النسخة الاحتياطية",
        description: error.message || "حدث خطأ أثناء إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/backups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backups"] });
      toast({
        title: "تم حذف النسخة الاحتياطية",
        description: "تم حذف النسخة الاحتياطية بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل حذف النسخة الاحتياطية",
        description: error.message || "حدث خطأ أثناء حذف النسخة الاحتياطية",
        variant: "destructive",
      });
    },
  });

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      const res = await apiRequest("GET", `/api/backups/${backup.id}/download`);
      const data = await res.json();
      window.open(data.downloadUrl, '_blank');
    } catch (error) {
      toast({
        title: "فشل تحميل النسخة الاحتياطية",
        description: "حدث خطأ أثناء تحميل النسخة الاحتياطية",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    try {
      exportToExcel(events, hijriOverrides, settings.numeralSystem);
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${events.length} مناسبة إلى ملف Excel`,
      });
    } catch (error) {
      toast({
        title: "فشل التصدير",
        description: "حدث خطأ أثناء تصدير الملف",
        variant: "destructive",
      });
    }
  };

  const handleExportBackup = () => {
    try {
      exportBackupToJSON(events, hijriOverrides, settings);
      toast({
        title: "تم إنشاء النسخة الاحتياطية",
        description: "تم حفظ جميع البيانات في ملف JSON",
      });
    } catch (error) {
      toast({
        title: "فشل إنشاء النسخة الاحتياطية",
        description: "حدث خطأ أثناء إنشاء الملف",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (type: "excel" | "csv" | "json" | "backup") => {
    setImportType(type);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      if (importType === "backup") {
        const data = await parseBackupFile(file);
        await restoreBackup(data);
        toast({
          title: "تم استعادة النسخة الاحتياطية",
          description: `تم استعادة ${data.events.length} مناسبة`,
        });
      } else {
        let parsedEvents;
        if (importType === "excel") {
          parsedEvents = await parseExcelFile(file);
        } else if (importType === "csv") {
          parsedEvents = await parseCSVFile(file);
        } else {
          const text = await file.text();
          const data = JSON.parse(text);
          parsedEvents = Array.isArray(data) ? data : data.events || [];
        }

        const count = await importEvents(parsedEvents);
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تم استيراد ${count} مناسبة جديدة`,
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "فشل الاستيراد",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء قراءة الملف",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      toast({
        title: "تم حذف البيانات",
        description: "تم حذف جميع المناسبات",
      });
    } catch (error) {
      toast({
        title: "فشل الحذف",
        description: "حدث خطأ أثناء حذف البيانات",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-testid="backup-page">
      <header className="flex items-center justify-between p-3 md:p-4 border-b bg-card/50">
        <Button variant="ghost" size="sm" asChild data-testid="button-back-home">
          <Link href="/" className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            <span className="hidden sm:inline">العودة للتقويم</span>
          </Link>
        </Button>
        <h1 className="text-base md:text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Database className="h-4 w-4 md:h-5 md:w-5" />
          النسخ الاحتياطي والاستيراد
        </h1>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.json"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file-upload"
      />

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {isAdmin && (
            <Card data-testid="card-cloud-backups">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
                      النسخ الاحتياطية السحابية
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => createBackupMutation.mutate()}
                    disabled={createBackupMutation.isPending}
                    className="gap-2"
                    data-testid="button-create-cloud-backup"
                  >
                    {createBackupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    إنشاء نسخة احتياطية
                  </Button>
                </div>
                <CardDescription>
                  النسخ الاحتياطية المحفوظة في التخزين السحابي
                </CardDescription>
              </CardHeader>
              <CardContent>
                {backupsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : backups && backups.length > 0 ? (
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-3 rounded-md border bg-card hover-elevate"
                        data-testid={`backup-item-${backup.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">{backup.name}</span>
                            <Badge variant={backup.isAutomatic ? "secondary" : "default"}>
                              {backup.isAutomatic ? "نسخة تلقائية" : "نسخة يدوية"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(backup.createdAt), "PPpp", { locale: ar })}
                            </span>
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatFileSize(backup.fileSize)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadBackup(backup)}
                            data-testid={`button-download-backup-${backup.id}`}
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline mr-1">تحميل</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                data-testid={`button-delete-backup-${backup.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline mr-1">حذف</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف النسخة الاحتياطية؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم حذف هذه النسخة الاحتياطية نهائياً. لا يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-row-reverse gap-2">
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteBackupMutation.mutate(backup.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Cloud className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>لا توجد نسخ احتياطية سحابية</p>
                    <p className="text-sm">اضغط على "إنشاء نسخة احتياطية" لإنشاء نسخة جديدة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="card-export">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  التصدير
                </CardTitle>
                <CardDescription>
                  تصدير المناسبات إلى ملفات خارجية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  data-testid="button-export-excel"
                >
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <div className="text-right flex-1">
                    <div className="font-medium">تصدير Excel</div>
                    <div className="text-xs text-muted-foreground">ملف جدول بيانات يدعم العربية</div>
                  </div>
                </Button>

                <Button
                  onClick={handleExportBackup}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  data-testid="button-export-backup"
                >
                  <FileJson className="h-5 w-5 text-blue-600" />
                  <div className="text-right flex-1">
                    <div className="font-medium">نسخة احتياطية كاملة</div>
                    <div className="text-xs text-muted-foreground">جميع البيانات والإعدادات</div>
                  </div>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start gap-3"
                >
                  <Link href="/export" data-testid="button-export-pdf">
                    <FileText className="h-5 w-5 text-red-600" />
                    <div className="text-right flex-1">
                      <div className="font-medium">تصدير PDF</div>
                      <div className="text-xs text-muted-foreground">مع خيارات متقدمة</div>
                    </div>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-import">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  الاستيراد
                </CardTitle>
                <CardDescription>
                  استيراد المناسبات من ملفات خارجية
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => handleFileSelect("excel")}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  disabled={isImporting}
                  data-testid="button-import-excel"
                >
                  {isImporting && importType === "excel" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  )}
                  <div className="text-right flex-1">
                    <div className="font-medium">استيراد Excel</div>
                    <div className="text-xs text-muted-foreground">ملفات .xlsx, .xls</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleFileSelect("csv")}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  disabled={isImporting}
                  data-testid="button-import-csv"
                >
                  {isImporting && importType === "csv" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileText className="h-5 w-5 text-orange-600" />
                  )}
                  <div className="text-right flex-1">
                    <div className="font-medium">استيراد CSV</div>
                    <div className="text-xs text-muted-foreground">ملفات نصية مفصولة بفواصل</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleFileSelect("json")}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  disabled={isImporting}
                  data-testid="button-import-json"
                >
                  {isImporting && importType === "json" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <FileJson className="h-5 w-5 text-yellow-600" />
                  )}
                  <div className="text-right flex-1">
                    <div className="font-medium">استيراد JSON</div>
                    <div className="text-xs text-muted-foreground">ملفات بيانات منظمة</div>
                  </div>
                </Button>

                <Button
                  onClick={() => handleFileSelect("backup")}
                  variant="outline"
                  className="w-full justify-start gap-3"
                  disabled={isImporting}
                  data-testid="button-restore-backup"
                >
                  {isImporting && importType === "backup" ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Database className="h-5 w-5 text-purple-600" />
                  )}
                  <div className="text-right flex-1">
                    <div className="font-medium">استعادة نسخة احتياطية</div>
                    <div className="text-xs text-muted-foreground">يستبدل جميع البيانات الحالية</div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-destructive/50" data-testid="card-danger">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                منطقة الخطر
              </CardTitle>
              <CardDescription>
                إجراءات لا يمكن التراجع عنها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" data-testid="button-clear-data">
                    <Trash2 className="h-4 w-4" />
                    حذف جميع المناسبات
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      سيتم حذف جميع المناسبات نهائياً. لا يمكن التراجع عن هذا الإجراء.
                      ننصح بإنشاء نسخة احتياطية قبل المتابعة.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel data-testid="button-cancel-clear">إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearData}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-clear"
                    >
                      حذف نهائياً
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
