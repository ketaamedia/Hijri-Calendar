import { useState, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  ArrowRight,
  FileText,
  Download,
  Trash2,
  Loader2,
  Upload,
  FolderOpen,
} from "lucide-react";
import { Link } from "wouter";
import type { FileDb, DocumentDb, FileMembershipDb } from "@shared/schema";

interface DocumentWithUploader extends DocumentDb {
  uploader: { id: number; username: string; displayName: string | null } | null;
}

const uploadDocumentSchema = z.object({
  name: z.string().min(1, "اسم المستند مطلوب"),
  description: z.string().optional(),
});

type UploadDocumentFormData = z.infer<typeof uploadDocumentSchema>;

export default function DocumentLibraryPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<DocumentWithUploader | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    objectPath: string;
    fileSize: number;
    contentType: string;
    fileName: string;
  } | null>(null);
  const pendingUploadRef = useRef<{
    objectPath: string;
    fileSize: number;
    contentType: string;
    fileName: string;
  } | null>(null);

  const numericFileId = parseInt(fileId || "0", 10);

  const { data: file, isLoading: isFileLoading } = useQuery<FileDb>({
    queryKey: ["/api/files", numericFileId],
    enabled: !!numericFileId,
  });

  const { data: documents, isLoading: isDocumentsLoading } = useQuery<DocumentWithUploader[]>({
    queryKey: ["/api/files", numericFileId, "documents"],
    enabled: !!numericFileId,
  });

  const { data: membership } = useQuery<FileMembershipDb>({
    queryKey: ["/api/membership", numericFileId],
    queryFn: async () => {
      if (!user) return null;
      const res = await fetch(`/api/users/${user.id}/memberships`);
      const memberships = await res.json();
      return memberships.find((m: FileMembershipDb) => m.fileId === numericFileId) || null;
    },
    enabled: !!numericFileId && !!user,
  });

  const canManage = user?.role === "admin" || 
    membership?.role === "manager" || 
    membership?.role === "deputy";

  const uploadForm = useForm<UploadDocumentFormData>({
    resolver: zodResolver(uploadDocumentSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: UploadDocumentFormData & { objectPath: string; fileSize: number; contentType: string }) => {
      const res = await apiRequest("POST", `/api/files/${numericFileId}/documents`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", numericFileId, "documents"] });
      setShowUploadDialog(false);
      setPendingUpload(null);
      uploadForm.reset();
      toast({
        title: "تم الرفع",
        description: "تم رفع المستند بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في رفع المستند",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", numericFileId, "documents"] });
      setDeletingDocument(null);
      toast({
        title: "تم الحذف",
        description: "تم حذف المستند بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف المستند",
        variant: "destructive",
      });
    },
  });

  const onUploadFormSubmit = (data: UploadDocumentFormData) => {
    if (!pendingUpload) {
      toast({
        title: "خطأ",
        description: "يرجى رفع ملف أولاً",
        variant: "destructive",
      });
      return;
    }

    createDocumentMutation.mutate({
      ...data,
      objectPath: pendingUpload.objectPath,
      fileSize: pendingUpload.fileSize,
      contentType: pendingUpload.contentType,
    });
  };

  const getUploadParameters = useCallback(
    async (file: any): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const data = await response.json();
      
      pendingUploadRef.current = {
        objectPath: data.objectPath,
        fileSize: file.size,
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
      };
      
      return {
        method: "PUT",
        url: data.uploadURL,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      };
    },
    []
  );

  const handleUploadComplete = useCallback((result: any) => {
    if (result.successful && result.successful.length > 0 && pendingUploadRef.current) {
      const uploadData = pendingUploadRef.current;
      setPendingUpload(uploadData);
      uploadForm.setValue("name", uploadData.fileName);
    }
  }, [uploadForm]);

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
  };

  const formatDate = (date: Date | string | null): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isFileLoading) {
    return (
      <div className="flex-1 p-6 overflow-auto" data-testid="loading-documents">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-60" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 p-6 overflow-auto" data-testid="file-not-found">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">الملف غير موجود</p>
              <Link href="/my-files">
                <Button variant="outline" className="mt-4">
                  <ArrowRight className="h-4 w-4 ml-2" />
                  العودة للملفات
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="document-library-page">
      <header className="flex items-center gap-4 justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Link href="/my-files">
            <Button
              variant="ghost"
              size="icon"
              data-testid="button-back"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <FileText className="h-6 w-6 text-primary" />
              مكتبة المستندات - {file.name}
            </h1>
            {file.description && (
              <p className="text-sm text-muted-foreground">{file.description}</p>
            )}
          </div>
        </div>
        {canManage && (
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={52428800}
            onGetUploadParameters={getUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName=""
          >
            <Upload className="h-4 w-4 ml-2" />
            رفع مستند
          </ObjectUploader>
        )}
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">المستندات</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {isDocumentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : documents?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">لا توجد مستندات</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {canManage ? "اضغط على زر رفع مستند لإضافة مستندات جديدة" : "لا توجد مستندات في هذا الملف بعد"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">اسم المستند</TableHead>
                      <TableHead className="text-right">الوصف</TableHead>
                      <TableHead className="text-right">الحجم</TableHead>
                      <TableHead className="text-right">تاريخ الرفع</TableHead>
                      <TableHead className="text-right">رفع بواسطة</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents?.map((doc) => (
                      <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {doc.description || "-"}
                        </TableCell>
                        <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                        <TableCell>{formatDate(doc.createdAt)}</TableCell>
                        <TableCell>
                          {doc.uploader?.displayName || doc.uploader?.username || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                              data-testid={`button-download-${doc.id}`}
                            >
                              <a
                                href={`/api/objects/download?path=${encodeURIComponent(doc.objectPath)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingDocument(doc)}
                                data-testid={`button-delete-${doc.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showUploadDialog || !!pendingUpload} onOpenChange={(open) => {
        if (!open) {
          setShowUploadDialog(false);
          setPendingUpload(null);
          uploadForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>رفع مستند جديد</DialogTitle>
            <DialogDescription>
              أدخل معلومات المستند
            </DialogDescription>
          </DialogHeader>
          <Form {...uploadForm}>
            <form onSubmit={uploadForm.handleSubmit(onUploadFormSubmit)} className="space-y-4">
              <FormField
                control={uploadForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستند</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-document-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={uploadForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوصف (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-document-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setPendingUpload(null);
                    uploadForm.reset();
                  }}
                  data-testid="button-cancel-upload"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createDocumentMutation.isPending || !pendingUpload}
                  data-testid="button-submit-upload"
                >
                  {createDocumentMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  )}
                  حفظ
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingDocument} onOpenChange={() => setDeletingDocument(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستند</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف المستند "{deletingDocument?.name}"؟
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="button-cancel-delete">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingDocument && deleteDocumentMutation.mutate(deletingDocument.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteDocumentMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
