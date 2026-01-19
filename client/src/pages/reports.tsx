import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  Users,
  TrendingUp,
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { amiriFontBase64 } from "@/lib/amiri-font";

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface AnalyticsSummary {
  totalEvents: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalFiles: number;
  totalUsers: number;
  eventsThisMonth: number;
  eventsLastMonth: number;
  taskCompletionRate: number;
}

interface EventsByMonth {
  month: string;
  count: number;
}

interface TasksByStatus {
  status: string;
  count: number;
}

interface EventsByFile {
  fileName: string;
  count: number;
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

function toArabicNumeral(num: number): string {
  const arabicNumerals = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(num)
    .split("")
    .map((d) => (/\d/.test(d) ? arabicNumerals[parseInt(d)] : d))
    .join("");
}

export default function ReportsPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: eventsByMonth, isLoading: eventsMonthLoading } = useQuery<EventsByMonth[]>({
    queryKey: ["/api/analytics/events-by-month"],
  });

  const { data: tasksByStatus, isLoading: tasksStatusLoading } = useQuery<TasksByStatus[]>({
    queryKey: ["/api/analytics/tasks-by-status"],
  });

  const { data: eventsByFile, isLoading: eventsFileLoading } = useQuery<EventsByFile[]>({
    queryKey: ["/api/analytics/events-by-file"],
  });

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    try {
      if (amiriFontBase64 && amiriFontBase64.length > 100) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        doc.setFont("Amiri");
      }
    } catch (error) {
      console.error("Failed to add Arabic font:", error);
    }

    doc.setFontSize(24);
    doc.setTextColor(34, 139, 34);
    const title = "التقارير والإحصائيات";
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (210 - titleWidth) / 2, 25);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    const dateText = `تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (210 - dateWidth) / 2, 35);

    if (summary) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("ملخص الإحصائيات", 195, 50, { align: "right" });

      const summaryData = [
        ["إجمالي الأحداث", toArabicNumeral(summary.totalEvents)],
        ["إجمالي المهام", toArabicNumeral(summary.totalTasks)],
        ["المهام المكتملة", toArabicNumeral(summary.completedTasks)],
        ["المهام المعلقة", toArabicNumeral(summary.pendingTasks)],
        ["إجمالي الملفات", toArabicNumeral(summary.totalFiles)],
        ["إجمالي المستخدمين", toArabicNumeral(summary.totalUsers)],
        ["نسبة الإنجاز", `${toArabicNumeral(summary.taskCompletionRate)}%`],
      ];

      doc.autoTable({
        startY: 55,
        head: [["البيان", "القيمة"]],
        body: summaryData,
        theme: "striped",
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: 255,
          halign: "right",
          font: "Amiri",
          fontSize: 11,
        },
        bodyStyles: {
          halign: "right",
          font: "Amiri",
          fontSize: 10,
        },
        margin: { right: 15, left: 15 },
      });
    }

    if (eventsByMonth && eventsByMonth.length > 0) {
      const startY = doc.lastAutoTable?.finalY + 15 || 120;
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("الأحداث حسب الشهر", 195, startY, { align: "right" });

      const monthData = eventsByMonth.map((item) => [
        item.month,
        toArabicNumeral(item.count),
      ]);

      doc.autoTable({
        startY: startY + 5,
        head: [["الشهر", "عدد الأحداث"]],
        body: monthData,
        theme: "striped",
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: 255,
          halign: "right",
          font: "Amiri",
          fontSize: 11,
        },
        bodyStyles: {
          halign: "right",
          font: "Amiri",
          fontSize: 10,
        },
        margin: { right: 15, left: 15 },
      });
    }

    if (tasksByStatus && tasksByStatus.length > 0) {
      const startY = doc.lastAutoTable?.finalY + 15 || 200;
      
      if (startY > 250) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("المهام حسب الحالة", 195, 25, { align: "right" });
        
        const statusData = tasksByStatus.map((item) => [
          item.status,
          toArabicNumeral(item.count),
        ]);

        doc.autoTable({
          startY: 30,
          head: [["الحالة", "العدد"]],
          body: statusData,
          theme: "striped",
          headStyles: {
            fillColor: [245, 158, 11],
            textColor: 255,
            halign: "right",
            font: "Amiri",
            fontSize: 11,
          },
          bodyStyles: {
            halign: "right",
            font: "Amiri",
            fontSize: 10,
          },
          margin: { right: 15, left: 15 },
        });
      } else {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("المهام حسب الحالة", 195, startY, { align: "right" });

        const statusData = tasksByStatus.map((item) => [
          item.status,
          toArabicNumeral(item.count),
        ]);

        doc.autoTable({
          startY: startY + 5,
          head: [["الحالة", "العدد"]],
          body: statusData,
          theme: "striped",
          headStyles: {
            fillColor: [245, 158, 11],
            textColor: 255,
            halign: "right",
            font: "Amiri",
            fontSize: 11,
          },
          bodyStyles: {
            halign: "right",
            font: "Amiri",
            fontSize: 10,
          },
          margin: { right: 15, left: 15 },
        });
      }
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
    }

    doc.save(`تقرير_احصائيات_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="p-6 space-y-6" dir="rtl" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            التقارير والإحصائيات
          </h1>
          <p className="text-muted-foreground">عرض إحصائيات شاملة عن النظام</p>
        </div>
        <Button onClick={handleExportPDF} className="gap-2" data-testid="button-export-pdf">
          <Download className="h-4 w-4" />
          تصدير كـ PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-events">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الأحداث
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-events">
                {toArabicNumeral(summary?.totalEvents || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-tasks">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المهام
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-tasks">
                {toArabicNumeral(summary?.totalTasks || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-completed-tasks">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              المهام المكتملة
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="value-completed-tasks">
                {toArabicNumeral(summary?.completedTasks || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-pending-tasks">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              المهام المعلقة
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-orange-600" data-testid="value-pending-tasks">
                {toArabicNumeral(summary?.pendingTasks || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-files">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الملفات
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-files">
                {toArabicNumeral(summary?.totalFiles || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي المستخدمين
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="value-total-users">
                {toArabicNumeral(summary?.totalUsers || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              نسبة الإنجاز
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-primary" data-testid="value-completion-rate">
                {toArabicNumeral(summary?.taskCompletionRate || 0)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-events-comparison">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              أحداث هذا الشهر
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div data-testid="value-events-comparison">
                <div className="text-2xl font-bold">
                  {toArabicNumeral(summary?.eventsThisMonth || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  الشهر الماضي: {toArabicNumeral(summary?.eventsLastMonth || 0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-events-by-month">
          <CardHeader>
            <CardTitle>الأحداث حسب الشهر</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsMonthLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : eventsByMonth && eventsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eventsByMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [toArabicNumeral(value), "عدد الأحداث"]}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                لا توجد بيانات
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-tasks-by-status">
          <CardHeader>
            <CardTitle>المهام حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksStatusLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : tasksByStatus && tasksByStatus.some(t => t.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tasksByStatus.filter(t => t.count > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${toArabicNumeral(count)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="status"
                  >
                    {tasksByStatus.filter(t => t.count > 0).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [toArabicNumeral(value), "العدد"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                لا توجد مهام
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-events-by-file">
          <CardHeader>
            <CardTitle>الأحداث حسب الملف (أعلى ١٠)</CardTitle>
          </CardHeader>
          <CardContent>
            {eventsFileLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : eventsByFile && eventsByFile.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={eventsByFile} 
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="fileName" 
                    type="category"
                    tick={{ fontSize: 12 }}
                    width={90}
                  />
                  <Tooltip 
                    formatter={(value: number) => [toArabicNumeral(value), "عدد الأحداث"]}
                    labelFormatter={(label) => label}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                لا توجد أحداث مرتبطة بملفات
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
