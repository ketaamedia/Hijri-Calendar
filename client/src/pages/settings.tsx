import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="settings-page">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex flex-row-reverse items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back-home">
            <Link href="/">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-foreground" data-testid="text-page-title">الإعدادات</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto">
        <SettingsPanel />
      </main>
    </div>
  );
}
