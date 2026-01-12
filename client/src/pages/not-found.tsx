import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background p-4"
      data-testid="not-found-page"
    >
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">الصفحة غير موجودة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
          <Button asChild className="gap-2">
            <Link href="/" data-testid="link-home">
              <Home className="h-4 w-4" />
              العودة للرئيسية
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
