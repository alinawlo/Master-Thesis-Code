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
  Download,
  AlertTriangle,
  AlertCircle
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
import { toast } from 'sonner';
import DeduplicationReview, { DeduplicationDecision } from './DeduplicationReview';
import { DuplicateMatch, Proposal, parseCsvLine } from '../types/deduplication';

interface PipelineProps {
  localFileName: string | null;
  onComplete: (doc: ProcessedDocument) => void;
  onCancel: () => void;
  onDocumentProcessed?: (docName: string) => void;
}

export default function Pipeline({ localFileName, onComplete, onCancel, onDocumentProcessed }: PipelineProps) {
  const [step, setStep] = useState<PipelineStep>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvBlob, setCsvBlob] = useState<Blob | null>(null);
  const [proposalCount, setProposalCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to generate a CSV blob strictly containing the chosen proposals
  const generateProposalsCsv = (proposals: Proposal[]): Blob => {
    const header = ['Vorschlag', 'Exaktes Verbatim', 'Quelldokument', 'Seitennummer', 'Kategorie', 'Verarbeitungsdatum'];
    const rows = proposals.map(p => [
      p.vorschlag || '',
      p.verbatim || '',
      p.quelldokument || '',
      p.seitennummer || '',
      p.kategorie || 'Sonstiges',
      p.verarbeitungsdatum || new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
    ].map(val => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(','));
    const csvText = [header.join(','), ...rows].join('\n');
    return new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  };

  // RAG Deduplication States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicateMatch[]>([]);
  const [pendingUnique, setPendingUnique] = useState<Proposal[]>([]);
  const [rawCsvText, setRawCsvText] = useState('');

  // Duplicate Document Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    fileName: string;
    previousFileName?: string;
    processedAt?: string;
    message: string;
  } | null>(null);

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

  const handleDeduplicationConfirm = async (decisions: DeduplicationDecision[]) => {
    setIsReviewModalOpen(false);
    const targetFileName = 'reforms_master.csv';
    
    const merges = decisions
      .filter(d => d.action === 'merge')
      .map(d => ({
        existingFile: 'reforms_master.csv',
        existingRowIndex: d.match.existingRowIndex,
        incoming: d.match.incoming
      }));
      
    // Proposals explicitly marked as 'keep' (to be added as new separate rows)
    const keptAsNew = decisions
      .filter(d => d.action === 'keep')
      .map(d => d.match.incoming);

    // Proposals marked as 'merge' (merged with existing entries)
    const mergedProposals = decisions
      .filter(d => d.action === 'merge')
      .map(d => d.match.incoming);
      
    const allNewProposals = [...pendingUnique, ...keptAsNew];
    // All proposals picked by the user (unique + kept as new row + merged with existing)
    const allPickedProposals = [...pendingUnique, ...keptAsNew, ...mergedProposals];
    
    // Generate downloadable CSV containing ALL picked proposals matching the count displayed
    const chosenCsvBlob = generateProposalsCsv(allPickedProposals);
    setCsvBlob(chosenCsvBlob);
    
    addLog(`Saving ${merges.length} merged proposal(s) and ${allNewProposals.length} new proposal(s) to master database...`);
    
    try {
      const saveResponse = await fetch('/api/save-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: targetFileName,
          newProposals: allNewProposals,
          merges: merges
        })
      });
      
      if (saveResponse.ok) {
        addLog("Success: Deduplication choices saved and master CSV updated.");
        toast.success(`Saved ${allNewProposals.length} new proposals and merged ${merges.length} sources.`);
        setProposalCount(allPickedProposals.length);
        if (onDocumentProcessed) onDocumentProcessed(fileName);
        setStep('results');
      } else {
        const errJson = await saveResponse.json();
        const saveError = `Failed to save proposals: ${errJson.error}`;
        addLog(`[Error] ${saveError}`);
        setErrorMessage(saveError);
        setStep('error');
        toast.error(saveError);
      }
    } catch (err: any) {
      const saveError = `Error during save: ${err.message}`;
      addLog(`[Error] ${saveError}`);
      setErrorMessage(saveError);
      setStep('error');
      toast.error(saveError);
    }
  };

  const runExtraction = async (forceParam?: boolean | React.MouseEvent) => {
    const force = forceParam === true;
    if (!localFileName && !selectedFile) {
      addLog("Error: No file selected.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgress(15);
    addLog("Extraction started...");
    
    try {
      let response;
      if (localFileName) {
        addLog("Requesting local server to process local PDF...");
        addLog(`POSTing filename "${localFileName}" to /api/extract-local-pdf...${force ? ' (Force Re-extract)' : ''}`);
        response = await fetch('/api/extract-local-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fileName: localFileName, force: Boolean(force) })
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

      if (response.status === 409) {
        const errJson = await response.json();
        addLog(`Duplicate Document Blocked: ${errJson.error}`);
        setDuplicateWarning({
          fileName: localFileName || (selectedFile ? selectedFile.name : ''),
          previousFileName: errJson.previousFileName,
          processedAt: errJson.processedAt,
          message: errJson.error
        });
        setIsProcessing(false);
        return;
      }

      if (!response.ok) {
        let errorMsg = `n8n extraction failed with status ${response.status}: ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson.error) errorMsg = errJson.error;
        } catch {}
        throw new Error(errorMsg);
      }

      const blob = await response.blob();
      addLog("n8n: Extraction completed, analyzing returned data...");
      setProgress(75);

      if (selectedFile) {
        try {
          await fetch('/api/record-processed-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: selectedFile.name })
          });
        } catch (recErr) {
          console.error("Failed to record processed document:", recErr);
        }
      }

      // Parse CSV to structured proposals
      const text = await blob.text();
      setRawCsvText(text);
      const lines = text.trim().split('\n');
      const nonHeaderLines = lines.filter(line => line.trim().length > 0);
      
      const parsedProposals: Proposal[] = [];
      const currentDocName = localFileName || (selectedFile ? selectedFile.name : 'document.pdf');

      for (let i = 1; i < nonHeaderLines.length; i++) {
        const row = parseCsvLine(nonHeaderLines[i]);
        if (row.length >= 4) {
          const rawSource = (row[2] || '').trim();
          let quelldokument = currentDocName;
          if (rawSource && rawSource !== currentDocName && rawSource !== 'unknown_document.pdf') {
            quelldokument = `${currentDocName} (${rawSource})`;
          }

          parsedProposals.push({
            vorschlag: (row[0] || '').trim(),
            verbatim: (row[1] || '').trim(),
            quelldokument,
            seitennummer: (row[3] || '').trim(),
            kategorie: (row[4] || 'Sonstiges').trim(),
            verarbeitungsdatum: (row[5] || new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })).trim()
          });
        }
      }

      const count = parsedProposals.length;
      setProposalCount(count);
      addLog(`Parsed CSV: Found ${count} proposal(s).`);

      if (count === 0) {
        const zeroError = `Extraction failed: 0 proposals were extracted from "${currentDocName}". A pipeline error may have occurred in n8n (e.g. Classification Agent service unavailable).`;
        addLog(`[Error] ${zeroError}`);
        setErrorMessage(zeroError);
        setIsProcessing(false);
        setProgress(0);
        setStep('error');
        toast.error(zeroError);
        return;
      }

      // Run RAG Semantic Deduplication check
      addLog("Running RAG semantic similarity check against master database...");
      setProgress(85);

      const dedupRes = await fetch('/api/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposals: parsedProposals, threshold: 0.85 })
      });

      setProgress(100);

      if (dedupRes.ok) {
        const dedupData = await dedupRes.json();
        const duplicates: DuplicateMatch[] = dedupData.duplicates || [];
        const unique: Proposal[] = dedupData.unique || [];

        if (duplicates.length > 0) {
          addLog(`RAG Analysis: Found ${duplicates.length} semantic duplicate(s) and ${unique.length} unique proposal(s).`);
          setPendingDuplicates(duplicates);
          setPendingUnique(unique);
          setIsReviewModalOpen(true);
          // Wait for user modal decision
          return;
        } else {
          addLog("RAG Analysis: All extracted proposals are unique.");
        }
      } else {
        addLog("Warning: Deduplication service returned an error, proceeding with standard save.");
      }

      // No duplicates: save directly to reforms_master.csv
      addLog("Saving proposals to master database (reforms_master.csv)...");
      const targetFileName = 'reforms_master.csv';
      const saveResponse = await fetch('/api/save-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: targetFileName,
          newProposals: parsedProposals
        })
      });

      if (saveResponse.ok) {
        addLog("Success: Saved proposals to reforms_master.csv and updated thesis database.");
        if (onDocumentProcessed) onDocumentProcessed(fileName);
        const chosenBlob = generateProposalsCsv(parsedProposals);
        setCsvBlob(chosenBlob);
        setStep('results');
      } else {
        const errJson = await saveResponse.json();
        const saveError = `Failed to save proposals: ${errJson.error}`;
        addLog(`[Error] ${saveError}`);
        setErrorMessage(saveError);
        setStep('error');
        toast.error(saveError);
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      addLog(`[Error] Extraction failed: ${errorMsg}`);
      setErrorMessage(errorMsg);
      setIsProcessing(false);
      setProgress(0);
      setStep('error');
      toast.error(errorMsg);
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
                        <Button onClick={() => runExtraction(false)}>
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

            {step === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <Card className="border-red-300 bg-red-50/20">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-red-600 text-lg">
                      <AlertCircle className="w-5 h-5" />
                      Extraction Failed
                    </CardTitle>
                    <CardDescription className="text-xs text-red-600/80">
                      The extraction pipeline could not complete processing {fileName}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="p-4 flex flex-col border border-red-200 rounded-xl bg-white shadow-xs text-zinc-900 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 mt-0.5">
                          <X className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-900">
                            Pipeline Error
                          </p>
                          <p className="text-xs text-zinc-700 mt-1 leading-relaxed break-words font-mono bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/80">
                            {errorMessage || "An unexpected error occurred during extraction."}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-100">
                        The document was not marked as processed, and no changes were made to the database. You can inspect the logs on the right or retry the extraction.
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="py-4 flex justify-end gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                      Close
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 shadow-xs"
                      onClick={() => {
                        setErrorMessage(null);
                        setStep('extract');
                        runExtraction(true);
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Extraction
                    </Button>
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

      <DeduplicationReview
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setIsProcessing(false);
        }}
        duplicates={pendingDuplicates}
        uniqueProposals={pendingUnique}
        onConfirm={handleDeduplicationConfirm}
      />

      {duplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/10 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-zinc-200/90 rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Document Already Processed
                </h3>
                <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                  This document's content matches{' '}
                  <span className="font-semibold text-zinc-900 font-mono">
                    "{duplicateWarning.previousFileName || 'previous file'}"
                  </span>
                  {duplicateWarning.processedAt && (
                    <>
                      , extracted on{' '}
                      <span className="font-semibold text-zinc-800">
                        {duplicateWarning.processedAt}
                      </span>
                    </>
                  )}.
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/70 rounded-xl p-3 text-xs text-zinc-600 leading-relaxed">
              Extracting again will run the extraction pipeline and register this file as a separate document in your processed history.
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium px-3 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                onClick={() => setDuplicateWarning(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold px-3 bg-zinc-900 hover:bg-zinc-800 text-white shadow-xs gap-1.5"
                onClick={() => {
                  setDuplicateWarning(null);
                  runExtraction(true);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Force Re-extract
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
