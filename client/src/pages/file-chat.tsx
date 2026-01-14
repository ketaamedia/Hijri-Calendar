import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowRight, Send, Loader2, MessageCircle, Trash2 } from "lucide-react";
import type { FileDb, MessageDb } from "@shared/schema";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface MessageUser {
  id: number;
  username: string;
  displayName: string | null;
}

interface MessageWithUser extends MessageDb {
  user: MessageUser;
}

export default function FileChatPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { fileId } = useParams<{ fileId: string }>();
  const [, setLocation] = useLocation();
  const [messageContent, setMessageContent] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: file, isLoading: isFileLoading } = useQuery<FileDb>({
    queryKey: ["/api/files", fileId],
    enabled: !!fileId,
  });

  const { data: messages, isLoading: isMessagesLoading } = useQuery<MessageWithUser[]>({
    queryKey: ["/api/files", fileId, "messages"],
    enabled: !!fileId,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/files/${fileId}/messages`, { content });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", fileId, "messages"] });
      setMessageContent("");
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال الرسالة",
        variant: "destructive",
      });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      await apiRequest("DELETE", `/api/messages/${messageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", fileId, "messages"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الرسالة بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف الرسالة",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (messageContent.trim()) {
      sendMessageMutation.mutate(messageContent.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (date: Date) => {
    return format(new Date(date), "d MMM yyyy, h:mm a", { locale: ar });
  };

  const reversedMessages = messages ? [...messages].reverse() : [];

  if (isFileLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-4" data-testid="loading-file-chat">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center" data-testid="file-not-found">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">الملف غير موجود أو ليس لديك صلاحية الوصول</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/my-files")}
              data-testid="button-back-to-files"
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة إلى ملفاتي
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="file-chat-page">
      <header className="flex items-center gap-4 p-4 border-b bg-background">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/my-files")}
          data-testid="button-back"
        >
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold" data-testid="text-file-name">
              المحادثة - {file.name}
            </h1>
            {file.description && (
              <p className="text-sm text-muted-foreground">{file.description}</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {isMessagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-16 w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reversedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg" data-testid="text-no-messages">
                    لا توجد رسائل
                  </p>
                  <p className="text-muted-foreground text-sm mt-2">
                    ابدأ المحادثة بإرسال رسالة
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reversedMessages.map((message) => {
                    const isOwnMessage = message.userId === user?.id;
                    const displayName = message.user.displayName || message.user.username;
                    return (
                      <div
                        key={message.id}
                        className={`flex items-start gap-3 group ${
                          isOwnMessage ? "flex-row-reverse" : ""
                        }`}
                        data-testid={`message-${message.id}`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex flex-col max-w-[70%] ${
                            isOwnMessage ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(message.createdAt)}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                          {isOwnMessage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                              onClick={() => deleteMessageMutation.mutate(message.id)}
                              disabled={deleteMessageMutation.isPending}
                              data-testid={`button-delete-message-${message.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="أرسل رسالة..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="resize-none min-h-[48px] max-h-32"
                  rows={1}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  data-testid="button-send"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="mr-2">إرسال</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
