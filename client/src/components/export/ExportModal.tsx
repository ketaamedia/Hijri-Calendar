import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCalendarStore } from "@/hooks/use-calendar-store";
import { exportToPDF } from "@/lib/pdf-export";
import type { PDFExportOptions } from "@shared/schema";
import { FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { events, hijriOverrides } = useCalendarStore();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [options, setOptions] = useState<PDFExportOptions>({
    dateRange: {
      start: today.toISOString().split("T")[0],
      end: nextMonth.toISOString().split("T")[0],
    },
    displayType: "both",
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(events, options, hijriOverrides);
      toast({
        title: "تم التصدير بنجاح",
        description: "تم تحميل ملف PDF بنجاح",
      });
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-export">
        <DialogHeader>
          <DialogTitle>تصدير إلى PDF</DialogTitle>
          <DialogDescription>
            اختر الفترة الزمنية ونوع التاريخ لتصدير الرزنامة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="flex flex-row-reverse gap-3">
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 gap-2"
            data-testid="button-export-pdf"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري التصدير...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                تصدير PDF
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
            data-testid="button-cancel-export"
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
