import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Download,
  Plus,
  LayoutDashboard,
  Database,
  Settings,
  Activity,
  Globe,
  Loader2,
  Trash2
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/src/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/src/components/ui/table';
import { Input } from '@/src/components/ui/input';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Progress } from '@/src/components/ui/progress';
import { ProcessedDocument } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);

  return (
    <div 
      ref={containerRef}
      className="relative inline-block max-w-full"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <div onClick={() => setVisible(true)} className="cursor-pointer max-w-full">
        {children}
      </div>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-zinc-900 text-xs font-semibold rounded-lg border-0 shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-2.5 z-50 whitespace-normal break-all w-72 max-w-xs text-center animate-in fade-in slide-in-from-bottom-1 duration-150">
          {content}
        </div>
      )}
    </div>
  );
}

interface ReformExplorerProps {
  documents: ProcessedDocument[];
  onAddProposal?: () => void;
  onStartLocalExtraction?: (fileName: string) => void;
}

export default function ReformExplorer({ documents, onAddProposal, onStartLocalExtraction }: ReformExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);

  const loadLocalFiles = async () => {
    try {
      const response = await fetch('/api/list-pdfs');
      if (response.ok) {
        const data = await response.json();
        setLocalFiles(data);
      }
    } catch (e) {
      console.error("Failed to load local files list:", e);
    }
  };

  const loadProposals = async () => {
    try {
      const response = await fetch('/api/list-proposals');
      if (response.ok) {
        const data = await response.json();
        setProposals(data);
      }
    } catch (e) {
      console.error("Failed to load proposals list:", e);
    }
  };

  const handleDeleteProposal = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this proposal entry?")) {
      return;
    }
    try {
      const response = await fetch('/api/delete-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (response.ok) {
        toast.success("Proposal entry deleted successfully.");
        loadProposals();
        loadLocalFiles();
      } else {
        throw new Error("Deletion failed");
      }
    } catch (e) {
      toast.error("Failed to delete proposal entry.");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL extracted proposals? This will empty your master CSV and cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch('/api/clear-all-proposals', {
        method: 'POST'
      });
      if (response.ok) {
        toast.success("All proposals cleared successfully.");
        loadProposals();
        loadLocalFiles();
      } else {
        throw new Error("Clearing failed");
      }
    } catch (e) {
      toast.error("Failed to clear proposals.");
    }
  };

  useEffect(() => {
    loadLocalFiles();
    loadProposals();
  }, [documents]);

  const filteredProposals = proposals.filter(p => {
    return p.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
           p.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.category.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const runWebDiscovery = async () => {
    setIsScraping(true);
    const toastId = toast.loading("Scanning German digital policy sites via Tavily & downloading new PDFs...");
    try {
      const response = await fetch('/webhook/discover-reforms', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error("n8n discovery failed");
      }
      const data = await response.json();
      const count = Array.isArray(data) ? data.length : 0;
      toast.success(`Success: Discovered and downloaded ${count} new documents!`, { id: toastId });
      loadLocalFiles();
    } catch (e) {
      toast.error("Error during web discovery: " + e, { id: toastId });
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reform Explorer Extension</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runWebDiscovery} 
            disabled={isScraping}
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" /> Discover New Documents
              </>
            )}
          </Button>
          <Button size="sm" onClick={onAddProposal} disabled={isScraping}>
            <Plus className="w-4 h-4 mr-2" /> New Extraction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-muted/30 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-mono font-bold tracking-widest">Retrieved Documents</CardDescription>
            <CardTitle className="text-3xl font-mono">{localFiles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-mono font-bold tracking-widest">Total Extracted Reforms</CardDescription>
            <CardTitle className="text-3xl font-mono">
              {proposals.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {localFiles.length > 0 && (
        <Card className="border-none shadow-sm bg-card/30 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Retrieved Policy Documents
            </h2>
            <Badge variant="secondary" className="font-mono">
              {localFiles.length} Found
            </Badge>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {localFiles.map((fileName) => (
              <div 
                key={fileName} 
                className="bg-background/40 hover:bg-background/60 transition-all border border-border/80 rounded-xl flex items-center justify-between shadow-sm hover:border-primary/40 group w-full max-w-[400px]"
                style={{ padding: '5px' }}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <Tooltip content={fileName}>
                      <p className="text-xs font-semibold truncate text-foreground group-hover:text-primary transition-colors pr-1">
                        {fileName}
                      </p>
                    </Tooltip>
                    <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">
                      Local PDF File
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  size="sm" 
                  className="bg-background hover:bg-muted/50 border border-border/80 text-foreground text-xs font-semibold px-2.5 py-1.5 h-8 rounded-lg flex items-center gap-1.5 shrink-0"
                  onClick={() => onStartLocalExtraction && onStartLocalExtraction(fileName)}
                >
                  <Activity className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
                  Extract Proposals
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold">Reformation Proposals</CardTitle>
            <div className="flex items-center gap-2 flex-1 max-w-md md:justify-end">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 shrink-0 border border-border bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                onClick={handleClearAll}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                Clear All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 shrink-0 border border-border bg-background/50"
                onClick={() => window.open('/api/download-master-csv', '_blank')}
              >
                <Download className="w-4 h-4 text-muted-foreground" />
                Download Master CSV
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search extracted proposals..." 
                  className="pl-9 bg-background/50"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-y-auto h-[500px] pr-2 custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="col-header">Proposal</TableHead>
                  <TableHead className="col-header">Category</TableHead>
                  <TableHead className="col-header">Source Document (Quelldokument)</TableHead>
                  <TableHead className="col-header text-center">Page</TableHead>
                  <TableHead className="col-header text-right">Processed Date</TableHead>
                  <TableHead className="col-header text-right w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredProposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                        No proposals found. Click "Discover New Documents" or "New Extraction" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProposals.map((proposal) => (
                      <motion.tr 
                        key={proposal.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="data-grid-row group"
                      >
                        <TableCell className="py-4 max-w-md whitespace-normal break-words">
                          <p className="text-xs leading-relaxed font-medium">
                            {proposal.text}
                          </p>
                        </TableCell>
                        <TableCell className="align-middle whitespace-normal">
                          <Badge variant="secondary" className="whitespace-nowrap font-semibold text-[10px]">
                            {proposal.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle whitespace-normal break-words">
                          <div className="max-w-[240px]">
                            {(() => {
                              const match = proposal.source.match(/^(.*?)\s*\((https?:\/\/[^\s)]+|www\.[^\s)]+|[^\s)]+\.[a-zA-Z]{2,})\)$/);
                              if (match) {
                                const [_, name, url] = match;
                                const href = url.startsWith('http') ? url : `https://${url}`;
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <Tooltip content={name}>
                                      <span className="font-semibold break-all text-foreground leading-normal cursor-pointer hover:text-primary transition-colors pr-1">
                                        {name}
                                      </span>
                                    </Tooltip>
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-[10px] text-primary hover:underline break-all"
                                      title={url}
                                    >
                                      ({url})
                                    </a>
                                  </div>
                                );
                              } else {
                                const matchedUrl = proposal.sourceUrl;
                                return (
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <Tooltip content={proposal.source}>
                                      <span className="font-semibold break-all text-foreground leading-normal cursor-pointer hover:text-primary transition-colors pr-1">
                                        {proposal.source}
                                      </span>
                                    </Tooltip>
                                    {matchedUrl && (
                                      <a 
                                        href={matchedUrl.startsWith('http') ? matchedUrl : `https://${matchedUrl}`} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-[10px] text-primary hover:underline break-all"
                                        title={matchedUrl}
                                      >
                                        ({matchedUrl})
                                      </a>
                                    )}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-middle font-mono text-xs font-semibold whitespace-normal">
                          {proposal.page || "N/A"}
                        </TableCell>
                        <TableCell className="text-right align-middle text-xs font-mono text-muted-foreground whitespace-normal">
                          {proposal.processedAt}
                        </TableCell>
                        <TableCell className="text-right align-middle">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            onClick={() => handleDeleteProposal(proposal.id)}
                            title="Delete proposal entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
