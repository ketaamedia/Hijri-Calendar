import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useCalendarStore } from "@/hooks/use-calendar-store";
import type { Event, InsertEvent, EventColor, FileDb } from "@shared/schema";
import { hijriMonthNames, eventColorSchema } from "@shared/schema";
import { gregorianToHijri, hijriToGregorian, getCurrentHijriYear, toArabicNumerals } from "@/lib/hijri-utils";
import { useEffect } from "react";
import { ColorPicker } from "./ColorPicker";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().optional(),
  dateType: z.enum(["gregorian", "hijri"]),
  gregorianDate: z.string().min(1, "التاريخ مطلوب"),
  hijriYear: z.number(),
  hijriMonth: z.number(),
  hijriDay: z.number(),
  isAnnual: z.boolean(),
  color: eventColorSchema,
  fileId: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  event?: Event;
  onSubmit: (data: InsertEvent) => void;
  onCancel: () => void;
}

export function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const { selectedDate, settings, hijriOverrides } = useCalendarStore();
  
  const { data: files = [] } = useQuery<FileDb[]>({
    queryKey: ['/api/files'],
  });
  
  const defaultDate = selectedDate || new Date();
  const defaultHijri = gregorianToHijri(defaultDate, hijriOverrides);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: event
      ? {
          title: event.title,
          description: event.description || "",
          dateType: event.dateType,
          gregorianDate: event.gregorianDate,
          hijriYear: event.hijriYear,
          hijriMonth: event.hijriMonth,
          hijriDay: event.hijriDay,
          isAnnual: event.isAnnual,
          color: event.color || "primary",
          fileId: event.fileId,
        }
      : {
          title: "",
          description: "",
          dateType: "gregorian" as const,
          gregorianDate: defaultDate.toISOString().split("T")[0],
          hijriYear: defaultHijri.year,
          hijriMonth: defaultHijri.month,
          hijriDay: defaultHijri.day,
          isAnnual: false,
          color: "primary" as EventColor,
          fileId: undefined,
        },
  });

  const dateType = form.watch("dateType");
  const gregorianDate = form.watch("gregorianDate");
  const hijriYear = form.watch("hijriYear");
  const hijriMonth = form.watch("hijriMonth");
  const hijriDay = form.watch("hijriDay");

  useEffect(() => {
    if (dateType === "gregorian" && gregorianDate) {
      const date = new Date(gregorianDate);
      const hijri = gregorianToHijri(date, hijriOverrides);
      form.setValue("hijriYear", hijri.year);
      form.setValue("hijriMonth", hijri.month);
      form.setValue("hijriDay", hijri.day);
    }
  }, [gregorianDate, dateType, form, hijriOverrides]);

  useEffect(() => {
    if (dateType === "hijri") {
      const date = hijriToGregorian({ year: hijriYear, month: hijriMonth, day: hijriDay }, hijriOverrides);
      form.setValue("gregorianDate", date.toISOString().split("T")[0]);
    }
  }, [hijriYear, hijriMonth, hijriDay, dateType, form, hijriOverrides]);

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  const currentHijriYear = getCurrentHijriYear();
  const hijriYears = Array.from({ length: 20 }, (_, i) => currentHijriYear - 5 + i);
  const hijriDays = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" data-testid="form-event">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>عنوان المناسبة</FormLabel>
              <FormControl>
                <Input
                  placeholder="أدخل عنوان المناسبة"
                  {...field}
                  data-testid="input-event-title"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الوصف (اختياري)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="أدخل وصف المناسبة"
                  className="resize-none"
                  {...field}
                  data-testid="input-event-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اللون</FormLabel>
              <FormControl>
                <ColorPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dateType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع التاريخ</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-date-type">
                    <SelectValue placeholder="اختر نوع التاريخ" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="gregorian" data-testid="option-date-gregorian">ميلادي</SelectItem>
                  {settings.hijriEnabled && (
                    <SelectItem value="hijri" data-testid="option-date-hijri">هجري</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {dateType === "gregorian" ? (
          <FormField
            control={form.control}
            name="gregorianDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>التاريخ الميلادي</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    data-testid="input-gregorian-date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="hijriDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اليوم</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-hijri-day">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hijriDays.map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {toArabicNumerals(day)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hijriMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الشهر</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-hijri-month">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hijriMonthNames.map((name, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hijriYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السنة</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-hijri-year">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hijriYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {toArabicNumerals(year)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="fileId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الملف (اختياري)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v))}
                value={field.value?.toString() || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-file">
                    <SelectValue placeholder="اختر الملف" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none" data-testid="option-no-file">بدون ملف</SelectItem>
                  {files.map((file) => (
                    <SelectItem key={file.id} value={file.id.toString()} data-testid={`option-file-${file.id}`}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                اختر ملفاً لربط المناسبة به أو اتركه بدون ملف لتكون مناسبة عامة
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isAnnual"
          render={({ field }) => (
            <FormItem className="flex flex-row-reverse items-start space-x-3 space-x-reverse space-y-0 rounded-md border border-border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-annual"
                />
              </FormControl>
              <div className="space-y-1 leading-none text-right flex-1">
                <FormLabel>تكرار سنوي</FormLabel>
                <FormDescription>
                  تفعيل هذا الخيار لإظهار المناسبة في نفس التاريخ كل سنة
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-row-reverse gap-3 pt-4">
          <Button type="submit" className="flex-1" data-testid="button-save-event">
            حفظ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
            data-testid="button-cancel-event"
          >
            إلغاء
          </Button>
        </div>
      </form>
    </Form>
  );
}
