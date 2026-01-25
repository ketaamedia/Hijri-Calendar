import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CleanupButtonProps {
  onCleanup: () => Promise<number>;
}

export function CleanupButton({ onCleanup }: CleanupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleCleanup = async () => {
    setIsLoading(true);
    
    try {
      const count = await onCleanup();
      
      toast({
        title: count > 0 ? 'تم التنظيف بنجاح' : 'لا توجد أحداث مكررة',
        description: count > 0 
          ? `تم حذف ${count} حدث مكرر` 
          : 'جميع الأحداث فريدة',
        variant: count > 0 ? 'default' : 'default',
      });
    } catch (error) {
      toast({
        title: 'فشل التنظيف',
        description: 'حدث خطأ أثناء تنظيف الأحداث المكررة',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleCleanup}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {isLoading ? 'جاري التنظيف...' : 'تنظيف'}
    </Button>
  );
}
