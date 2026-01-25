import { useState } from 'react';

interface CleanupButtonProps {
  onCleanup: () => Promise<number>;
}

export function CleanupButton({ onCleanup }: CleanupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const handleCleanup = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const count = await onCleanup();
      setMessage(count > 0 
        ? `تم حذف ${count} حدث مكرر` 
        : 'لا توجد أحداث مكررة'
      );
    } catch (error) {
      setMessage('فشل التنظيف');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleCleanup}
        disabled={isLoading}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
      >
        {isLoading ? 'جاري التنظيف...' : 'حذف الأحداث المكررة'}
      </button>
      {message && (
        <p className="text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}
