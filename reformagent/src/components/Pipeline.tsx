import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Cpu, 
  Search, 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  RefreshCw,
  X,
  FileUp,
  Database,
  ShieldCheck,
  Activity,
  Download
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Progress } from '@/src/components/ui/progress';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { PipelineStep, ProcessedDocument } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface PipelineProps {
  onComplete: (doc: ProcessedDocument) => void;
  onCancel: () => void;
}

export default function Pipeline({ onComplete, onCancel }: PipelineProps) {
  const [step, setStep] = useState<PipelineStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvBlob, setCsvBlob] = useState<Blob | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev: string[]) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setSelectedFile(file);
      setStep('extract');
      addLog(`File "${file.name}" ready for processing.`);
    }
  };

  const runExtraction = async () => {
    if (!selectedFile) {
      addLog("Error: No file selected.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    addLog("Connecting to local n8n instance via tunnel...");
    addLog("POSTing PDF to /webhook/extract-reforms...");
    
    try {
      const formData = new FormData();
      formData.append('data', selectedFile);

      const response = await fetch('https://curvy-apes-switch.loca.lt/webhook/extract-reforms', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`n8n Webhook failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      setCsvBlob(blob);
      addLog("n8n: CSV data generated successfully.");
      setProgress(100);
      setStep('results');
    } catch (error) {
      addLog(`Error during n8n extraction: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCsv = () => {
    if (!csvBlob) return;
    const url = window.URL.createObjectURL(csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reforms_${fileName.replace('.pdf', '')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    addLog("CSV download initiated.");
  };

  const handleComplete = () => {
    if (!csvBlob) return;
    const newDoc: ProcessedDocument = {
      id: Math.random().toString(36).substr(2, 9),
      name: fileName,
      processedAt: new Date().toLocaleString(),
      proposalCount: 0,
      csvBlob: csvBlob
    };
    onComplete(newDoc);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Extraction Pipeline</h2>
            <p className="text-muted-foreground text-sm">Automated extraction via n8n workflow.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card className="border-dashed border-2 bg-muted/20">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <FileUp className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Upload Policy Document</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                      Upload a PDF document to extract reform proposals.
                    </p>
                    <div className="flex gap-4">
                      <Input 
                        type="file" 
                        className="hidden" 
                        id="file-upload" 
                        onChange={handleFileUpload}
                        accept=".pdf"
                      />
                      <Button asChild>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          Select PDF
                        </label>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'extract' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Phase 1: Extraction
                      </CardTitle>
                      {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                    <CardDescription>
                      Extracting actionable recommendations from {fileName} via n8n.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                    
                    {!isProcessing && (
                      <div className="flex justify-center pt-4">
                        <Button onClick={runExtraction}>
                          Start Extraction
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'results' && (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <ShieldCheck className="w-6 h-6" />
                      Extraction Complete
                    </CardTitle>
                    <CardDescription>
                      Successfully processed {fileName}. The CSV is ready for download.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-8 flex flex-col items-center justify-center border rounded-lg bg-background/50">
                      <FileText className="w-12 h-12 text-primary mb-4" />
                      <p className="text-sm font-medium">{fileName.replace('.pdf', '')}.csv</p>
                      <p className="text-xs text-muted-foreground mt-1">Ready to export</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setStep('upload')}>Process Another</Button>
                    {csvBlob && (
                      <Button variant="secondary" onClick={downloadCsv}>
                        <Download className="w-4 h-4 mr-2" /> Download CSV
                      </Button>
                    )}
                    <Button onClick={handleComplete}>Finish & Save</Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <Card className="h-full bg-muted/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Workflow Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full">
                <div className="space-y-2">
                  {logs.length === 0 && <p className="text-xs text-muted-foreground italic">Waiting for workflow to start...</p>}
                  {logs.map((log, i) => (
                    <div key={i} className="text-[10px] font-mono border-l-2 border-primary/20 pl-2 py-1">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
