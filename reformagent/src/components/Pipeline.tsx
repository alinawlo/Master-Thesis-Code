import React, { useState, useEffect } from 'react';
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
  localFileName: string | null;
  onComplete: (doc: ProcessedDocument) => void;
  onCancel: () => void;
}

export default function Pipeline({ localFileName, onComplete, onCancel }: PipelineProps) {
  const [step, setStep] = useState<PipelineStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvBlob, setCsvBlob] = useState<Blob | null>(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev: string[]) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    if (localFileName) {
      setFileName(localFileName);
      setStep('extract');
      setLogs([`[${new Date().toLocaleTimeString()}] Selected local document "${localFileName}" from retrieved files folder.`]);
    }
  }, [localFileName]);

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
    if (!localFileName && !selectedFile) {
      addLog("Error: No file selected.");
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    
    try {
      let response;
      if (localFileName) {
        addLog("Requesting local server to process local PDF...");
        addLog(`POSTing filename "${localFileName}" to /api/extract-local-pdf...`);
        response = await fetch('/api/extract-local-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileName: localFileName })
        });
      } else {
        addLog("Connecting to local n8n instance via Vite proxy...");
        addLog("POSTing PDF to /webhook/extract-reforms...");
        const formData = new FormData();
        formData.append('data', selectedFile!);
        response = await fetch(`/webhook/extract-reforms?fileName=${encodeURIComponent(selectedFile!.name)}`, {
          method: 'POST',
          body: formData
        });
      }

      if (!response.ok) {
        throw new Error(`n8n extraction failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      setCsvBlob(blob);
      addLog("n8n: CSV data generated successfully.");
      setProgress(100);
      setStep('results');

      // Parse CSV to get proposal count and save it to the local directory
      try {
        const text = await blob.text();
        const lines = text.trim().split('\n');
        const nonHeaderLines = lines.filter(line => line.trim().length > 0);
        const count = nonHeaderLines.length > 1 ? nonHeaderLines.length - 1 : 0;
        setProposalCount(count);
        addLog(`Parsed CSV: Found ${count} proposals.`);

        // Call the custom middleware to save a copy in local csvs/ directory
        addLog("Requesting local server to save a copy under 'csvs/'...");
        const saveResponse = await fetch('/api/save-csv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fileName: `reforms_${(localFileName || selectedFile!.name).replace('.pdf', '')}.csv`,
            content: text
          })
        });

        if (saveResponse.ok) {
          addLog("Success: Saved CSV copy locally under csvs/ folder.");
        } else {
          const errJson = await saveResponse.json();
          addLog(`Warning: Local server failed to save CSV: ${errJson.error}`);
        }
      } catch (innerErr) {
        addLog(`Warning: Failed during CSV analysis or local storage: ${innerErr}`);
      }

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
      proposalCount: proposalCount,
      csvBlob: csvBlob
    };
    onComplete(newDoc);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
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
 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Card className="border-dashed border-2 bg-muted/20">
                  <CardContent className="flex flex-col items-center justify-center py-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <FileUp className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Upload Policy Document</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
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
                        Extraction Phase
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
                className="space-y-4"
              >
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-green-600 text-lg">
                      <ShieldCheck className="w-5 h-5" />
                      Extraction Complete
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Successfully processed {fileName}. The CSV is ready for download.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="p-5 flex flex-col items-center justify-center border border-green-500/20 rounded-lg bg-white shadow-sm text-zinc-900">
                      <div className="text-4xl font-mono font-bold text-green-600 mb-1">
                        {proposalCount}
                      </div>
                      <p className="text-xs font-semibold">
                        {proposalCount === 1 ? 'Proposal Extracted' : 'Proposals Extracted'}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[240px]" title={fileName}>
                        from {fileName}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="py-4 flex justify-end gap-2 flex-wrap">
                    {csvBlob && (
                      <Button variant="secondary" size="sm" onClick={downloadCsv}>
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Download CSV
                      </Button>
                    )}
                    <Button size="sm" onClick={handleComplete}>Finish & Save</Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
 
        <div className="space-y-4">
          <Card className="h-full bg-muted/10">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Workflow Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ScrollArea className="h-[220px] w-full">
                <div className="space-y-2">
                  {logs.length === 0 && <p className="text-xs text-muted-foreground italic">Waiting for workflow to start...</p>}
                  {logs.map((log, i) => (
                    <div key={i} className="text-[10px] font-mono border-l-2 border-primary/20 pl-2 py-0.5 leading-normal">
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
