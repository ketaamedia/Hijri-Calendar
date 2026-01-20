import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function PrayerTimes() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const prayerTimesUrl = `https://almanar.com.lb/static/calendars/${currentYear}/baalbek-${currentMonth}.pdf`;

  const monthNames = [
    "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
    "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"
  ];

  return (
    <div className="flex flex-col h-full p-4 md:p-6 space-y-6 bg-background" data-testid="prayer-times-page">
      <div className="flex flex-row-reverse items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">مواقيت الصلاة - بعلبك</h1>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة للرئيسية
          </Button>
        </Link>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-primary/20 bg-card">
        <CardHeader className="flex flex-row-reverse items-center justify-between border-b pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 flex-row-reverse">
            <FileText className="h-5 w-5 text-primary" />
            مواقيت شهر {monthNames[currentMonth - 1]} {currentYear}
          </CardTitle>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={prayerTimesUrl} download target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" />
              تحميل الملف
            </a>
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden bg-muted/10">
          <iframe
            src={`${prayerTimesUrl}#toolbar=0&navpanes=0&scrollbar=0`}
            className="w-full h-full border-none hidden sm:block"
            title="مواقيت الصلاة"
          />
          <div className="sm:hidden flex flex-col items-center justify-center p-8 text-center space-y-4 h-full">
            <div className="bg-primary/10 p-4 rounded-full">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">عرض مواقيت الصلاة</p>
              <p className="text-sm text-muted-foreground px-4">
                المتصفح قد يمنع عرض الملف مباشرة. يمكنك فتح الملف أو تحميله للاطلاع على المواقيت.
              </p>
            </div>
            <Button asChild className="gap-2">
              <a href={prayerTimesUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
                فتح أو تحميل الملف
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="text-center text-xs text-muted-foreground p-2">
        المصدر: قناة المنار - المواقيت حسب مدينة بعلبك
      </div>
    </div>
  );
}
