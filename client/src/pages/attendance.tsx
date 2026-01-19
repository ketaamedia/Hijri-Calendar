import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Save, FileDown, Users, Check, X, Clock, AlertCircle } from "lucide-react";
import { attendanceStatusNames, type AttendanceStatus, type EventDb, type FileDb } from "@shared/schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { amiriFontBase64 } from "@/lib/amiri-font";

interface AttendanceRecord {
  userId: number;
  status: AttendanceStatus;
  notes: string;
}

interface FileMembershipWithUser {
  id: number;
  userId: number;
  fileId: number;
  role: string;
  user: {
    id: number;
    username: string;
    displayName: string | null;
  };
}

interface ExistingAttendance {
  id: number;
  eventId: number;
  userId: number;
  status: AttendanceStatus;
  notes: string | null;
  markedAt: string;
  markedBy: number | null;
  user: {
    id: number;
    username: string;
    displayName: string | null;
  };
}

interface AttendanceStats {
  present: number;
  absent: number;
  excused: number;
  late: number;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<number, AttendanceRecord>>({});

  const { data: events = [], isLoading: eventsLoading } = useQuery<EventDb[]>({
    queryKey: ["/api/events"],
  });

  const { data: myFiles = [] } = useQuery<(FileDb & { membership: { role: string } })[]>({
    queryKey: ["/api/my-files"],
    enabled: user?.role !== "admin",
  });

  const { data: allFiles = [] } = useQuery<FileDb[]>({
    queryKey: ["/api/files"],
    enabled: user?.role === "admin",
  });

  const files = user?.role === "admin" ? allFiles : myFiles;

  const filteredEvents = useMemo(() => {
    if (user?.role === "admin") {
      return events.filter(e => e.fileId);
    }
    const managedFileIds = myFiles.map(f => f.id);
    return events.filter(e => e.fileId && managedFileIds.includes(e.fileId));
  }, [events, myFiles, user?.role]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(e => String(e.id) === selectedEventId);
  }, [selectedEventId, events]);

  const { data: fileMembers = [], isLoading: membersLoading } = useQuery<FileMembershipWithUser[]>({
    queryKey: ["/api/files", selectedEvent?.fileId, "memberships"],
    enabled: !!selectedEvent?.fileId,
  });

  const { data: existingAttendance = [], isLoading: attendanceLoading } = useQuery<ExistingAttendance[]>({
    queryKey: ["/api/events", selectedEventId, "attendance"],
    enabled: !!selectedEventId,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AttendanceStats>({
    queryKey: ["/api/events", selectedEventId, "attendance", "stats"],
    enabled: !!selectedEventId,
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (records: { userId: number; status: AttendanceStatus; notes?: string | null }[]) => {
      return apiRequest("POST", `/api/events/${selectedEventId}/attendance`, records);
    },
    onSuccess: () => {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ الحضور بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", selectedEventId, "attendance", "stats"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الحضور",
        variant: "destructive",
      });
    },
  });

  useMemo(() => {
    if (existingAttendance.length > 0) {
      const records: Record<number, AttendanceRecord> = {};
      existingAttendance.forEach(a => {
        records[a.userId] = {
          userId: a.userId,
          status: a.status,
          notes: a.notes || "",
        };
      });
      setAttendanceRecords(records);
    } else if (fileMembers.length > 0 && existingAttendance.length === 0) {
      const records: Record<number, AttendanceRecord> = {};
      fileMembers.forEach(m => {
        records[m.userId] = {
          userId: m.userId,
          status: "present",
          notes: "",
        };
      });
      setAttendanceRecords(records);
    }
  }, [existingAttendance, fileMembers]);

  const handleStatusChange = (userId: number, status: AttendanceStatus) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userId,
        status,
      },
    }));
  };

  const handleNotesChange = (userId: number, notes: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        userId,
        notes,
      },
    }));
  };

  const handleSave = () => {
    const records = Object.values(attendanceRecords).map(r => ({
      userId: r.userId,
      status: r.status,
      notes: r.notes || null,
    }));
    saveAttendanceMutation.mutate(records);
  };

  const handleExportPDF = () => {
    if (!selectedEvent) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    try {
      if (amiriFontBase64 && amiriFontBase64.length > 100) {
        doc.addFileToVFS("Amiri-Regular.ttf", amiriFontBase64);
        doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
        doc.setFont("Amiri");
      }
    } catch (error) {
      console.error("Failed to add Arabic font:", error);
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.text("دفتر الحضور", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.text(`الحدث: ${selectedEvent.title}`, pageWidth - 15, 35, { align: "right" });
    doc.text(`التاريخ: ${selectedEvent.gregorianDate}`, pageWidth - 15, 45, { align: "right" });
    
    if (stats) {
      doc.setFontSize(12);
      doc.text(
        `حاضر: ${stats.present} | غائب: ${stats.absent} | معذور: ${stats.excused} | متأخر: ${stats.late}`,
        pageWidth / 2,
        55,
        { align: "center" }
      );
    }

    const tableData = fileMembers.map(member => {
      const record = attendanceRecords[member.userId];
      return [
        record?.notes || "",
        attendanceStatusNames[record?.status || "present"],
        member.user.displayName || member.user.username,
      ];
    });

    autoTable(doc, {
      head: [["ملاحظات", "الحالة", "الاسم"]],
      body: tableData,
      startY: 65,
      styles: {
        font: "Amiri",
        halign: "right",
        fontSize: 12,
      },
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: 255,
        halign: "right",
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 60 },
      },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
    }

    doc.save(`attendance-${selectedEvent.title}-${selectedEvent.gregorianDate}.pdf`);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const variants: Record<AttendanceStatus, { className: string; icon: React.ReactNode }> = {
      present: { className: "bg-green-500/10 text-green-600 border-green-500/20", icon: <Check className="h-3 w-3" /> },
      absent: { className: "bg-red-500/10 text-red-600 border-red-500/20", icon: <X className="h-3 w-3" /> },
      excused: { className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: <AlertCircle className="h-3 w-3" /> },
      late: { className: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: <Clock className="h-3 w-3" /> },
    };
    return variants[status];
  };

  const isLoading = eventsLoading || membersLoading || attendanceLoading;

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl" data-testid="attendance-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">دفتر الحضور</h1>
            <p className="text-muted-foreground text-sm">تسجيل وإدارة حضور أعضاء الملفات للأحداث</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            اختر الحدث
          </CardTitle>
          <CardDescription>اختر الحدث لتسجيل الحضور</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-event">
              <SelectValue placeholder="اختر الحدث..." />
            </SelectTrigger>
            <SelectContent>
              {filteredEvents.map(event => (
                <SelectItem key={event.id} value={String(event.id)} data-testid={`event-option-${event.id}`}>
                  {event.title} - {event.gregorianDate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filteredEvents.length === 0 && !eventsLoading && (
            <p className="text-muted-foreground text-sm mt-2">
              لا توجد أحداث مرتبطة بملفات يمكنك إدارتها
            </p>
          )}
        </CardContent>
      </Card>

      {selectedEventId && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsLoading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-8 w-16 mb-2" />
                      <Skeleton className="h-4 w-12" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600" data-testid="stat-present">{stats?.present || 0}</p>
                        <p className="text-xs text-muted-foreground">حاضر</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <X className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600" data-testid="stat-absent">{stats?.absent || 0}</p>
                        <p className="text-xs text-muted-foreground">غائب</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600" data-testid="stat-excused">{stats?.excused || 0}</p>
                        <p className="text-xs text-muted-foreground">معذور</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600" data-testid="stat-late">{stats?.late || 0}</p>
                        <p className="text-xs text-muted-foreground">متأخر</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle>تسجيل الحضور</CardTitle>
                  <CardDescription>
                    {selectedEvent && `${selectedEvent.title} - ${selectedEvent.gregorianDate}`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={fileMembers.length === 0}
                    data-testid="button-export-pdf"
                  >
                    <FileDown className="h-4 w-4 ml-2" />
                    تصدير PDF
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveAttendanceMutation.isPending || fileMembers.length === 0}
                    data-testid="button-save-attendance"
                  >
                    <Save className="h-4 w-4 ml-2" />
                    {saveAttendanceMutation.isPending ? "جاري الحفظ..." : "حفظ الحضور"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-40" />
                      <Skeleton className="h-10 flex-1" />
                    </div>
                  ))}
                </div>
              ) : fileMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>لا يوجد أعضاء في الملف المرتبط بهذا الحدث</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاسم</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fileMembers.map(member => {
                        const record = attendanceRecords[member.userId] || { status: "present", notes: "" };
                        const statusStyle = getStatusBadge(record.status);
                        
                        return (
                          <TableRow key={member.userId} data-testid={`attendance-row-${member.userId}`}>
                            <TableCell className="font-medium">
                              {member.user.displayName || member.user.username}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={record.status}
                                onValueChange={(value) => handleStatusChange(member.userId, value as AttendanceStatus)}
                              >
                                <SelectTrigger className="w-32" data-testid={`status-select-${member.userId}`}>
                                  <SelectValue>
                                    <Badge variant="outline" className={`${statusStyle.className} gap-1`}>
                                      {statusStyle.icon}
                                      {attendanceStatusNames[record.status]}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(attendanceStatusNames) as AttendanceStatus[]).map(status => {
                                    const style = getStatusBadge(status);
                                    return (
                                      <SelectItem key={status} value={status}>
                                        <div className="flex items-center gap-2">
                                          {style.icon}
                                          {attendanceStatusNames[status]}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="ملاحظات..."
                                value={record.notes}
                                onChange={(e) => handleNotesChange(member.userId, e.target.value)}
                                className="max-w-xs"
                                data-testid={`notes-input-${member.userId}`}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
