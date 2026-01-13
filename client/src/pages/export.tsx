import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { exportToPDF } from "@/lib/pdf-export";
import { gregorianToHijri, toArabicNumerals } from "@/lib/hijri-utils";
import { gregorianMonthNames, hijriMonthNames } from "@shared/schema";
import type { PDFExportOptions, Event } from "@shared/schema";
import {
  FileDown,
  Loader2,
  Search,
  ArrowRight,
  CalendarDays,
  Filter,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
  RefreshCw,
  Trash2,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SortField = "date" | "title";
type SortOrder = "asc" | "desc";
type FilterType = "all" | "annual" | "oneTime";

export default function ExportPage() {
  const { events, hijriOverrides, settings } = useCalendarStore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const [options, setOptions] = useState<PDFExportOptions>({
    dateRange: {
      start: today.toISOString().split("T")[0],
      end: nextYear.toISOString().split("T")[0],
    },
    displayType: "both",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    const startDate = new Date(options.dateRange.start);
    const endDate = new Date(options.dateRange.end);
    result = result.filter((event) => {
      const eventDate = new Date(event.gregorianDate);
      return eventDate >= startDate && eventDate <= endDate;
    });

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          (event.description && event.description.toLowerCase().includes(query))
      );
    }

    if (filterType === "annual") {
      result = result.filter((event) => event.isAnnual);
    } else if (filterType === "oneTime") {
      result = result.filter((event) => !event.isAnnual);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.gregorianDate).getTime() - new Date(b.gregorianDate).getTime();
      } else if (sortField === "title") {
        comparison = a.title.localeCompare(b.title, "ar");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [events, options.dateRange, searchQuery, sortField, sortOrder, filterType]);

  const eventsToExport = useMemo(() => {
    if (selectedEvents.size === 0) {
      return filteredAndSortedEvents;
    }
    return filteredAndSortedEvents.filter((event) => selectedEvents.has(event.id));
  }, [filteredAndSortedEvents, selectedEvents]);

  const toggleEventSelection = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const selectAll = () => {
    setSelectedEvents(new Set(filteredAndSortedEvents.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedEvents(new Set());
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setSortField("date");
    setSortOrder("asc");
    setSelectedEvents(new Set());
  };

  const formatEventDate = (event: Event) => {
    const date = new Date(event.gregorianDate);
    const hijri = gregorianToHijri(date, hijriOverrides);
    
    const gregStr = `${toArabicNumerals(date.getDate(), settings.numeralSystem)} ${gregorianMonthNames[date.getMonth()]} ${toArabicNumerals(date.getFullYear(), settings.numeralSystem)}`;
    const hijriStr = `${toArabicNumerals(hijri.day, settings.numeralSystem)} ${hijriMonthNames[hijri.month - 1]} ${toArabicNumerals(hijri.year, settings.numeralSystem)}`;
    
    return { gregStr, hijriStr };
  };

  const handleExport = async () => {
    if (eventsToExport.length === 0) {
      toast({
        title: "لا توجد مناسبات",
        description: "لا توجد مناسبات للتصدير في الفترة المحددة",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportToPDF(eventsToExport, options, hijriOverrides);
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${eventsToExport.length} مناسبة إلى ملف PDF`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "فشل التصدير",
        description: "حدث خطأ أثناء تصدير الملف. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background" data-testid="export-page">
      <header className="flex items-center justify-between p-4 border-b bg-card/50">
        <Button variant="ghost" asChild data-testid="button-back-home">
          <Link href="/" className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            العودة للتقويم
          </Link>
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <FileDown className="h-5 w-5" />
          تصدير المناسبات
        </h1>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          <Card className="lg:col-span-2 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex flex-row-reverse items-center justify-between gap-4 flex-wrap">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  قائمة المناسبات
                  <Badge variant="secondary" data-testid="badge-events-count">
                    {filteredAndSortedEvents.length} مناسبة
                  </Badge>
                </CardTitle>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث في المناسبات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9 w-48"
                      data-testid="input-search-events"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <div className="px-6 pb-3 flex flex-wrap items-center gap-3 border-b">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterType} onValueChange={(v: FilterType) => setFilterType(v)}>
                  <SelectTrigger className="w-32" data-testid="select-filter-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="annual">سنوية فقط</SelectItem>
                    <SelectItem value="oneTime">مرة واحدة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                {sortOrder === "asc" ? (
                  <SortAsc className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <SortDesc className="h-4 w-4 text-muted-foreground" />
                )}
                <Select value={sortField} onValueChange={(v: SortField) => setSortField(v)}>
                  <SelectTrigger className="w-28" data-testid="select-sort-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">التاريخ</SelectItem>
                    <SelectItem value="title">العنوان</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  data-testid="button-toggle-sort-order"
                >
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  <CheckSquare className="h-4 w-4 ml-1" />
                  تحديد الكل
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll} data-testid="button-deselect-all">
                  <Square className="h-4 w-4 ml-1" />
                  إلغاء التحديد
                </Button>
                <Button variant="ghost" size="sm" onClick={resetFilters} data-testid="button-reset-filters">
                  <RefreshCw className="h-4 w-4 ml-1" />
                  إعادة ضبط
                </Button>
              </div>
            </div>

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full">
                {filteredAndSortedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground" data-testid="empty-events-message">
                    <Calendar className="h-12 w-12 mb-3 opacity-50" />
                    <p className="text-lg">لا توجد مناسبات</p>
                    <p className="text-sm">جرب تغيير الفلاتر أو الفترة الزمنية</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredAndSortedEvents.map((event) => {
                      const { gregStr, hijriStr } = formatEventDate(event);
                      const isSelected = selectedEvents.has(event.id);
                      
                      return (
                        <div
                          key={event.id}
                          className={`flex items-start gap-4 p-4 hover-elevate cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                          onClick={() => toggleEventSelection(event.id)}
                          data-testid={`event-row-${event.id}`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleEventSelection(event.id)}
                            data-testid={`checkbox-event-${event.id}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-medium text-foreground" data-testid={`text-event-title-${event.id}`}>
                                {event.title}
                              </h3>
                              {event.isAnnual && (
                                <Badge variant="outline" className="text-xs">
                                  سنوي
                                </Badge>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="text-left text-sm space-y-1 shrink-0">
                            <div className="text-foreground">{gregStr}</div>
                            {settings.hijriEnabled && (
                              <div className="text-muted-foreground text-xs">{hijriStr}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                خيارات التصدير
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">من تاريخ</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={options.dateRange.start}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        dateRange: { ...options.dateRange, start: e.target.value },
                      })
                    }
                    data-testid="input-export-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">إلى تاريخ</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={options.dateRange.end}
                    onChange={(e) =>
                      setOptions({
                        ...options,
                        dateRange: { ...options.dateRange, end: e.target.value },
                      })
                    }
                    data-testid="input-export-end-date"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>نوع التاريخ في الملف</Label>
                <RadioGroup
                  value={options.displayType}
                  onValueChange={(value: "gregorian" | "hijri" | "both") =>
                    setOptions({ ...options, displayType: value })
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <RadioGroupItem value="gregorian" id="gregorian" data-testid="radio-export-gregorian" />
                    <Label htmlFor="gregorian" className="font-normal cursor-pointer">
                      التاريخ الميلادي فقط
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <RadioGroupItem value="hijri" id="hijri" data-testid="radio-export-hijri" />
                    <Label htmlFor="hijri" className="font-normal cursor-pointer">
                      التاريخ الهجري فقط
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <RadioGroupItem value="both" id="both" data-testid="radio-export-both" />
                    <Label htmlFor="both" className="font-normal cursor-pointer">
                      كلا التاريخين
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المناسبات المعروضة:</span>
                  <span className="font-medium">{filteredAndSortedEvents.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المناسبات المحددة:</span>
                  <span className="font-medium">
                    {selectedEvents.size === 0 ? "الكل" : selectedEvents.size}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">سيتم التصدير:</span>
                  <span className="font-medium text-primary">{eventsToExport.length}</span>
                </div>
              </div>

              <div className="mt-auto">
                <Button
                  onClick={handleExport}
                  disabled={isExporting || eventsToExport.length === 0}
                  className="w-full gap-2"
                  size="lg"
                  data-testid="button-export-pdf"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      جاري التصدير...
                    </>
                  ) : (
                    <>
                      <FileDown className="h-5 w-5" />
                      تصدير إلى PDF
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
