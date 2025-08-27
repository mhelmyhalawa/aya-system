import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface SupabaseTestPageProps {
  onNavigate: (path: string) => void;
}

export function SupabaseTestPage({ onNavigate }: SupabaseTestPageProps) {
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [success, setSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    const runTests = async () => {
      setLoading(true);
      setTestResults([]);
      setSuccess(null);
      
      try {
        // إضافة مستمع لرسائل السجل
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        
        const logs: string[] = [];
        
        console.log = (...args) => {
          originalConsoleLog(...args);
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
          setTestResults([...logs]);
        };
        
        console.error = (...args) => {
          originalConsoleError(...args);
          logs.push(`❌ ${args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' ')}`);
          setTestResults([...logs]);
        };
        
        // استيراد ملف الاختبار وتنفيذه
        const { default: testModule } = await import('../supabase-test');
        console.log('تم تنفيذ اختبار Supabase');
        
        // استعادة وظائف السجل الأصلية
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        
        // التحقق من نجاح الاختبار
        const hasErrors = logs.some(log => log.startsWith('❌'));
        setSuccess(!hasErrors);
      } catch (error) {
        console.error('فشل في تنفيذ اختبار Supabase:', error);
        setTestResults(prev => [...prev, `فشل في تنفيذ اختبار Supabase: ${error instanceof Error ? error.message : String(error)}`]);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };
    
    runTests();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">اختبار اتصال Supabase</CardTitle>
          <CardDescription>
            تشخيص مشاكل الاتصال بقاعدة البيانات Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-center text-muted-foreground">
                جاري تنفيذ اختبارات الاتصال...
              </p>
            </div>
          ) : (
            <>
              {success !== null && (
                <Alert className={`mb-4 ${success ? 'bg-green-50 border-green-300 text-green-800' : 'bg-destructive/10 border-destructive text-destructive'}`}>
                  {success ? (
                    <CheckCircle2 className="h-4 w-4 ml-2 text-green-800" />
                  ) : (
                    <AlertCircle className="h-4 w-4 ml-2 text-destructive" />
                  )}
                  <AlertDescription>
                    {success 
                      ? 'تم الاتصال بنجاح بقاعدة البيانات Supabase!' 
                      : 'توجد مشاكل في الاتصال بقاعدة البيانات Supabase. راجع النتائج أدناه.'}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="border rounded-md p-4 bg-muted/50">
                <h3 className="text-lg font-medium mb-2">نتائج الاختبار:</h3>
                <div className="bg-background p-4 rounded-md font-mono text-sm overflow-auto max-h-96 rtl:text-right ltr:text-left">
                  {testResults.map((result, index) => (
                    <div key={index} className={`py-1 ${result.startsWith('❌') ? 'text-destructive' : ''}`}>
                      {result}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between mt-4">
                <Button variant="outline" onClick={() => onNavigate('/')}>
                  العودة للرئيسية
                </Button>
                <Button onClick={() => window.location.reload()}>
                  إعادة الاختبار
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
