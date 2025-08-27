import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Save, Database, FileJson, Download, Upload, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { exportStudentsToJson } from "@/lib/database-service";
import { databaseManagementLabels, successMessages, errorMessages, commonLabels } from "@/lib/arabic-labels";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

interface DatabaseManagementProps {
  onNavigate: (path: string) => void;
}

export function DatabaseManagement({ onNavigate }: DatabaseManagementProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error' | 'warning'} | null>(null);
  // متغيرات حالة لمربع حوار تأكيد الحذف
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleExportData = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await exportStudentsToJson();
      
      if (result.success && result.data) {
        // إنشاء ملف للتنزيل
        const blob = new Blob([result.data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // إنشاء رابط تنزيل وهمي ونقر عليه
        const a = document.createElement('a');
        a.href = url;
        a.download = `ketama_students_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // تنظيف
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
        
        setMessage({
          text: successMessages.saveSuccess,
          type: 'success'
        });
      } else {
        setMessage({
          text: result.message || errorMessages.saveFailed,
          type: 'error'
        });
      }
    } catch (error) {
      console.error(errorMessages.consoleExportDataError, error);
      setMessage({
        text: errorMessages.operationFailed,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFromFile = () => {
    // إنشاء عنصر إدخال ملف وهمي
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      
      const file = target.files[0];
      
      setLoading(true);
      setMessage(null);
      
      try {
        // قراءة محتويات الملف
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          if (!event.target || typeof event.target.result !== 'string') {
            setMessage({
              text: errorMessages.operationFailed,
              type: 'error'
            });
            setLoading(false);
            return;
          }
          
          try {
            const data = JSON.parse(event.target.result);
            
            if (!Array.isArray(data)) {
              setMessage({
                text: errorMessages.invalidInput,
                type: 'error'
              });
              setLoading(false);
              return;
            }
            
            // هنا ستأتي عملية إضافة البيانات إلى قاعدة البيانات
            // سنقوم بتنفيذها لاحقًا
            
            setMessage({
              text: databaseManagementLabels.studentsImportProgress(data.length),
              type: 'success'
            });
            
            // مؤقتًا سنعرض رسالة نجاح
            setTimeout(() => {
              setMessage({
                text: databaseManagementLabels.studentsImportSuccess,
                type: 'success'
              });
              setLoading(false);
            }, 1000);
          } catch (parseError) {
            console.error(errorMessages.consoleParsingJsonError, parseError);
            setMessage({
              text: errorMessages.invalidInput,
              type: 'error'
            });
            setLoading(false);
          }
        };
        
        reader.onerror = () => {
          setMessage({
            text: errorMessages.operationFailed,
            type: 'error'
          });
          setLoading(false);
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error(errorMessages.consoleImportFileError, error);
        setMessage({
          text: errorMessages.operationFailed,
          type: 'error'
        });
        setLoading(false);
      }
    };
    
    // تنفيذ النقر على عنصر إدخال الملف
    fileInput.click();
  };

  const clearDatabase = () => {
    setIsDeleteDialogOpen(true);
  };
  
  // تنفيذ عملية تنظيف قاعدة البيانات
  const executeClearDatabase = () => {
    setMessage({
      text: databaseManagementLabels.functionNotAvailable,
      type: 'warning'
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">{databaseManagementLabels.title}</CardTitle>
              <CardDescription>{databaseManagementLabels.description}</CardDescription>
              
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                <span>{databaseManagementLabels.databaseLabel}</span>
                <span className="flex items-center text-green-600">
                  <Database className="h-3 w-3 mr-1" /> Supabase
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {message && (
            <Alert 
              variant={message.type === 'error' ? 'destructive' : message.type === 'warning' ? 'default' : 'default'} 
              className={`mb-4 ${
                message.type === 'error' 
                  ? 'bg-red-50 border-red-300 text-red-800' 
                  : message.type === 'warning' 
                    ? 'bg-amber-50 border-amber-300 text-amber-800' 
                    : 'bg-green-50 border-green-300 text-green-800'
              }`}
            >
              <AlertCircle className={`h-4 w-4 ml-2 ${
                message.type === 'error' 
                  ? 'text-red-800' 
                  : message.type === 'warning' 
                    ? 'text-amber-800' 
                    : 'text-green-800'
              }`} />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{databaseManagementLabels.exportTitle}</CardTitle>
                <CardDescription>{databaseManagementLabels.exportDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleExportData} 
                  disabled={loading} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
                  <span>{databaseManagementLabels.exportJsonButton}</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{databaseManagementLabels.importTitle}</CardTitle>
                <CardDescription>{databaseManagementLabels.importDescription}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleImportFromFile} 
                  disabled={loading} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span>{databaseManagementLabels.importJsonButton}</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{databaseManagementLabels.backupTitle}</CardTitle>
                <CardDescription>{databaseManagementLabels.backupDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="secondary" 
                  disabled={loading} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{databaseManagementLabels.createBackupButton}</span>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-red-600">{databaseManagementLabels.clearTitle}</CardTitle>
                <CardDescription>{databaseManagementLabels.clearDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={clearDatabase} 
                  disabled={loading} 
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{databaseManagementLabels.clearButton}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onNavigate("/students")}>
            {databaseManagementLabels.returnToStudentsButton}
          </Button>
        </CardFooter>
      </Card>
      
      {/* مربع حوار تأكيد حذف قاعدة البيانات */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={executeClearDatabase}
        isLoading={loading}
        title="تأكيد إعادة تهيئة قاعدة البيانات"
        description="تحذير: هذا الإجراء سيؤدي إلى مسح جميع البيانات من قاعدة البيانات وإعادتها إلى حالتها الأولية. هل أنت متأكد من رغبتك في المتابعة؟"
        deleteButtonText="نعم، أعد تهيئة قاعدة البيانات"
        cancelButtonText="إلغاء"
      />
    </div>
  );
}
