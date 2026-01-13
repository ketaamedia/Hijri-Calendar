import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { useToast } from "@/hooks/use-toast";
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

export default function BackupPage() {
  const { events, hijriOverrides, settings, importEvents, restoreBackup, clearAllData } = useCalendarStore();
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"excel" | "csv" | "json" | "backup">("excel");

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
        <div className="max-w-4xl mx-auto grid gap-4 md:grid-cols-2">
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

          <Card className="md:col-span-2 border-destructive/50" data-testid="card-danger">
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
