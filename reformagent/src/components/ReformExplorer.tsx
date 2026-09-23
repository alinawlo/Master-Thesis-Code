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
  Trash2,
  X,
  ExternalLink,
  Square,
  CheckSquare,
  Check,
  ChevronDown,
  ChevronUp,
  Eye
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
  const contentRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (contentRef.current) {
      const el = (contentRef.current.firstElementChild as HTMLElement) || contentRef.current;
      // Only show tooltip if text is actually cropped / overflowing
      const isCropped = el.scrollWidth > el.clientWidth;
      if (!isCropped) {
        return;
      }
    }
    setVisible(true);
  };

  const handleMouseLeave = () => {
    setVisible(false);
  };

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={contentRef} className="max-w-full">
        {children}
      </div>
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-zinc-900 border border-zinc-200 shadow-xl text-xs font-semibold rounded-lg p-2.5 z-50 whitespace-normal break-all w-72 max-w-xs text-center animate-in fade-in slide-in-from-bottom-1 duration-150 pointer-events-none">
          {content}
        </div>
      )}
    </div>
  );
}

function getCategoryBadge(category: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('governance')) {
    return 'bg-violet-100 text-violet-800 border-violet-200';
  }
  if (cat.includes('infra') || cat.includes('it-') || cat.includes('digital')) {
    return 'bg-sky-100 text-sky-800 border-sky-200';
  }
  if (cat.includes('bürokratie') || cat.includes('abbau') || cat.includes('prozess')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (cat.includes('finanz') || cat.includes('steuer') || cat.includes('budget') || cat.includes('haushalt')) {
    return 'bg-amber-100 text-amber-900 border-amber-200';
  }
  if (cat.includes('recht') || cat.includes('gesetz') || cat.includes('regul')) {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function renderNumberedText(text: string, isItalicText: boolean = false) {
  if (!text) return "N/A";
  const parts = text.split(/(?=\b\d+\)\s*)/g).filter(p => p.trim());
  if (parts.length <= 1) {
    return <span className={isItalicText ? "italic" : ""}>{text}</span>;
  }
  return (
    <div className="space-y-1.5 py-0.5">
      {parts.map((part, index) => {
        const markerMatch = part.match(/^(\d+\))\s*(.*)/s);
        if (markerMatch) {
          const [_, marker, rest] = markerMatch;
          return (
            <div key={index} className="flex items-start gap-1.5 leading-relaxed">
              <span className="italic font-bold text-indigo-600 shrink-0">{marker}</span>
              <span className={isItalicText ? "italic" : ""}>{rest}</span>
            </div>
          );
        }
        return <div key={index} className={isItalicText ? "italic" : ""}>{part}</div>;
      })}
    </div>
  );
}

function renderSingleSource(srcText: string) {
  const match = srcText.match(/^(.*?)\s*\((https?:\/\/[^\s)]+|www\.[^\s)]+|[^\s)]+\.[a-zA-Z]{2,})\)$/);
  if (match) {
    const [_, name, url] = match;
    const href = url.startsWith('http') ? url : `https://${url}`;
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Tooltip content={name}>
          <span className="font-semibold max-w-[220px] truncate block text-zinc-900 pr-1 cursor-default">
            {name}
          </span>
        </Tooltip>
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer" 
          className="text-[10px] text-zinc-500 hover:text-zinc-900 hover:underline break-all inline-flex items-center gap-0.5 font-medium"
          title={url}
        >
          <span>({url})</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0 text-zinc-400" />
        </a>
      </div>
    );
  }
  const isUrl = srcText.includes('.') && (srcText.startsWith('http') || srcText.startsWith('www') || srcText.endsWith('.de') || srcText.endsWith('.org') || srcText.endsWith('.com'));
  const href = srcText.startsWith('http') ? srcText : `https://${srcText}`;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Tooltip content={srcText}>
        <span className="font-semibold max-w-[220px] truncate block text-zinc-900 pr-1 cursor-default">
          {srcText}
        </span>
      </Tooltip>
      {isUrl && (
        <a 
          href={href} 
          target="_blank" 
          rel="noreferrer" 
          className="text-[10px] text-zinc-500 hover:text-zinc-900 hover:underline break-all inline-flex items-center gap-0.5 font-medium"
          title={srcText}
        >
          <ExternalLink className="w-3 h-3 ml-0.5 text-zinc-400" />
        </a>
      )}
    </div>
  );
}

function renderNumberedSource(source: string) {
  if (!source) return "N/A";
  const parts = source.split(/(?=\b\d+\)\s*)/g).filter(p => p.trim());
  if (parts.length <= 1) {
    return renderSingleSource(source);
  }
  return (
    <div className="space-y-1.5 py-0.5">
      {parts.map((part, index) => {
        const markerMatch = part.match(/^(\d+\))\s*(.*)/s);
        if (markerMatch) {
          const [_, marker, rest] = markerMatch;
          return (
            <div key={index} className="flex items-start gap-1.5">
              <span className="italic font-bold text-indigo-600 shrink-0">{marker}</span>
              <div className="min-w-0">{renderSingleSource(rest)}</div>
            </div>
          );
        }
        return <div key={index}>{renderSingleSource(part)}</div>;
      })}
    </div>
  );
}

interface ReformExplorerProps {
  documents: ProcessedDocument[];
  onAddProposal?: () => void;
  onStartLocalExtraction?: (fileName: string) => void;
  refreshTrigger?: number;
}

interface ProcessedDocItem {
  hash: string;
  fileName: string;
  processedAt: string;
}

export default function ReformExplorer({ documents, onAddProposal, onStartLocalExtraction, refreshTrigger }: ReformExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  
  // Retrieved Documents Collapse/Expand State
  const [isDocsExpanded, setIsDocsExpanded] = useState(false);

  // Processed Documents Tab State
  const [activeDocTab, setActiveDocTab] = useState<'retrieved' | 'processed'>('retrieved');
  const [processedDocs, setProcessedDocs] = useState<ProcessedDocItem[]>([]);
  const [selectedProcessedFiles, setSelectedProcessedFiles] = useState<string[]>([]);
  const [isProcessedSelectMode, setIsProcessedSelectMode] = useState(false);

  // Only documents that have NOT been processed are shown in Retrieved Policy Documents
  const unprocessedFiles = localFiles.filter(fileName => !processedDocs.some(d => d.fileName === fileName));

  // Total retrieved documents = unique count across unprocessed and processed documents
  const totalDocsCount = new Set([
    ...localFiles.filter(Boolean),
    ...processedDocs.map(d => d.fileName).filter(Boolean)
  ]).size;

  // Proposal Batch Select State
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [isProposalSelectMode, setIsProposalSelectMode] = useState(false);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [discoveredDocs, setDiscoveredDocs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

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

  const loadProcessedDocs = async () => {
    try {
      const response = await fetch('/api/list-processed-documents');
      if (response.ok) {
        const data = await response.json();
        setProcessedDocs(data);
      }
    } catch (e) {
      console.error("Failed to load processed documents list:", e);
    }
  };

  const handleDeleteProcessedBatch = async (filesToDelete: string[]) => {
    if (filesToDelete.length === 0) return;
    const confirmMsg = filesToDelete.length === 1
      ? "Are you sure you want to remove this document from the processed history? It can then be extracted again."
      : `Are you sure you want to remove ${filesToDelete.length} document(s) from the processed history? They can then be extracted again.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/delete-processed-documents-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames: filesToDelete, hashes: filesToDelete })
      });
      if (res.ok) {
        toast.success(`Removed ${filesToDelete.length} document(s) from processed history.`);
        setSelectedProcessedFiles(prev => prev.filter(f => !filesToDelete.includes(f)));
        loadProcessedDocs();
        loadLocalFiles();
      } else {
        throw new Error("Failed to delete processed documents");
      }
    } catch (e) {
      toast.error("Error removing processed document(s).");
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
      } else {
        throw new Error("Deletion failed");
      }
    } catch (e) {
      toast.error("Failed to delete proposal entry.");
    }
  };

  const handleDeleteProposalsBatch = async (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    const confirmMsg = idsToDelete.length === 1
      ? "Are you sure you want to delete this proposal entry?"
      : `Are you sure you want to delete ${idsToDelete.length} selected proposals? This cannot be undone.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/delete-proposals-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete })
      });
      if (res.ok) {
        toast.success(`Deleted ${idsToDelete.length} proposal(s).`);
        setSelectedProposalIds(prev => prev.filter(id => !idsToDelete.includes(id)));
        if (selectedProposalIds.length <= idsToDelete.length) {
          setIsProposalSelectMode(false);
        }
        loadProposals();
      } else {
        throw new Error("Batch deletion failed");
      }
    } catch (e) {
      toast.error("Failed to delete proposals.");
    }
  };

  useEffect(() => {
    loadLocalFiles();
    loadProposals();
    loadProcessedDocs();
  }, [documents, refreshTrigger]);

  useEffect(() => {
    const handleFocus = () => {
      loadProcessedDocs();
      loadProposals();
      loadLocalFiles();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const filteredProposals = proposals.filter(p => {
    return (p.text || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
           (p.verbatim || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (p.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
           (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStartSearch = (category: string) => {
    setSelectedCategory(category);
    runWebDiscovery(category);
  };

  const runWebDiscovery = async (category: string) => {
    setIsCategoryModalOpen(false);
    setIsScraping(true);
    const toastId = toast.loading(`Scanning Tavily for "${category}" documents...`);
    try {
      const response = await fetch(`/api/search-documents?category=${encodeURIComponent(category)}`);
      if (!response.ok) {
        throw new Error("Tavily search failed");
      }
      const data = await response.json();
      
      let dataToParse = data;
      if (Array.isArray(data) && data.length > 0 && data[0].output) {
        dataToParse = data[0].output;
      } else if (data && data.output) {
        dataToParse = data.output;
      }
      
      let parsedData = dataToParse;
      if (typeof dataToParse === 'string') {
        try {
          const cleanText = dataToParse.replace(/```json/g, '').replace(/```/g, '').trim();
          parsedData = JSON.parse(cleanText);
        } catch (e) {
          console.error("Failed to parse string output from n8n:", e);
        }
      }
      
      let docsList: any[] = [];
      if (Array.isArray(parsedData)) {
        docsList = parsedData;
      } else if (parsedData && Array.isArray(parsedData.documents)) {
        docsList = parsedData.documents;
      } else if (parsedData && typeof parsedData === 'object') {
        docsList = Object.values(parsedData).filter(v => typeof v === 'object' && v !== null);
      }
      
      const formattedDocs = docsList.map((doc: any, index: number) => ({
        id: doc.id || `doc_${index}_${Date.now()}`,
        title: doc.title || doc.fileName || `Document ${index + 1}`,
        url: doc.url || doc.pdfUrl || doc.link || '',
        description: doc.description || doc.snippet || 'No description available.',
        selected: false
      }));

      if (formattedDocs.length === 0) {
        toast.info("No documents found for this category.", { id: toastId });
        return;
      }

      setDiscoveredDocs(formattedDocs);
      setIsDiscoveryModalOpen(true);
      toast.success(`Found ${formattedDocs.length} documents!`, { id: toastId });
    } catch (e) {
      toast.error("Error during web discovery: " + e, { id: toastId });
    } finally {
      setIsScraping(false);
    }
  };

  const downloadSelectedDocuments = async () => {
    const selected = discoveredDocs.filter(doc => doc.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one document to download.");
      return;
    }
    
    setIsDownloading(true);
    const toastId = toast.loading(`Downloading ${selected.length} selected document(s)...`);
    try {
      const response = await fetch('/api/download-selected-pdfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: selected })
      });
      
      if (!response.ok) {
        throw new Error("Failed to download documents.");
      }
      
      const result = await response.json();
      toast.success(`Successfully downloaded ${result.successCount} documents!`, { id: toastId });
      setIsDiscoveryModalOpen(false);
      loadLocalFiles();
    } catch (e) {
      toast.error("Error during download: " + e, { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Reform Explorer Extension
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsCategoryModalOpen(true)} 
            disabled={isScraping}
            className="border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 font-semibold shadow-2xs gap-1.5 h-9"
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-600" /> Scanning...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-sky-600" /> Discover New Documents
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            onClick={onAddProposal} 
            disabled={isScraping}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm shadow-indigo-200 gap-1.5 h-9"
          >
            <Plus className="w-4 h-4" /> Upload New Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-sky-50/90 via-blue-50/30 to-white border border-sky-200/80 shadow-xs rounded-2xl relative">
          <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-2xs">
            <Database className="w-4 h-4" />
          </div>
          <CardHeader className="px-5" style={{ paddingTop: '9.5px', paddingBottom: '9.5px' }}>
            <div className="flex items-stretch gap-4">
              {/* Left: Total Retrieved Documents */}
              <div className="flex-1 flex flex-col justify-center pr-2">
                <CardDescription className="text-[11px] uppercase font-mono font-bold tracking-wider text-sky-700 truncate" title="Total Retrieved Documents">
                  Total Retrieved Documents
                </CardDescription>
                <CardTitle className="text-3xl font-mono text-sky-950 mt-1">
                  {totalDocsCount}
                </CardTitle>
              </div>

              {/* Connected vertical separator line matching outline color */}
              <div className="w-px bg-sky-200/80 self-stretch shrink-0" />

              {/* Right: Unprocessed & Processed Documents */}
              <div className="flex-1 flex flex-col justify-center pl-2 pr-9">
                <div>
                  <div className="text-[9px] uppercase font-mono font-bold tracking-wider text-sky-600/90 truncate leading-none" title="Unprocessed Documents">
                    Unprocessed Documents
                  </div>
                  <div className="text-base font-mono font-bold text-sky-900/90 leading-tight">
                    {unprocessedFiles.length}
                  </div>
                </div>

                <div>
                  <div 
                    className="text-[9px] uppercase font-mono font-bold tracking-wider text-sky-600/90 truncate leading-none" 
                    title="Processed Documents"
                    style={{ paddingTop: '5px' }}
                  >
                    Processed Documents
                  </div>
                  <div className="text-base font-mono font-bold text-sky-900/90 leading-tight">
                    {processedDocs.length}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50/90 via-purple-50/30 to-white border border-violet-200/80 shadow-xs rounded-2xl relative">
          <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <CardHeader className="px-5" style={{ paddingTop: '9.5px', paddingBottom: '9.5px' }}>
            <CardDescription className="text-[11px] uppercase font-mono font-bold tracking-wider text-violet-700">Total Extracted Reforms</CardDescription>
            <CardTitle className="text-3xl font-mono text-violet-950 mt-1">
              {proposals.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-zinc-200/80 shadow-xs bg-white p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-200">
          <div className="flex items-center gap-8 -mb-[1px]">
            <button
              type="button"
              onClick={() => {
                setActiveDocTab('retrieved');
                loadLocalFiles();
                loadProcessedDocs();
              }}
              className={`text-lg font-semibold flex items-center gap-2 cursor-pointer transition-all pb-3 border-b-[3px] ${
                activeDocTab === 'retrieved'
                  ? 'border-indigo-600 text-indigo-950 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
              }`}
            >
              <Database className={`w-5 h-5 ${activeDocTab === 'retrieved' ? 'text-indigo-600' : 'text-zinc-400'}`} />
              <span>Retrieved Policy Documents</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDocTab('processed');
                loadProcessedDocs();
              }}
              className={`text-lg font-semibold flex items-center gap-2 cursor-pointer transition-all pb-3 border-b-[3px] ${
                activeDocTab === 'processed'
                  ? 'border-emerald-600 text-emerald-950 font-bold'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${activeDocTab === 'processed' ? 'text-emerald-600' : 'text-zinc-400'}`} />
              <span>Processed Documents</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeDocTab === 'retrieved' ? (
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                {unprocessedFiles.length} Found
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {processedDocs.length} Found
                </span>
                {processedDocs.length > 0 && (
                  <div className="flex items-center gap-2 ml-2">
                    {isProcessedSelectMode ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs font-medium px-2.5 bg-white hover:bg-zinc-100/80 text-zinc-700 transition-colors border-zinc-200 shadow-2xs"
                          onClick={() => {
                            if (selectedProcessedFiles.length === processedDocs.length) {
                              setSelectedProcessedFiles([]);
                            } else {
                              setSelectedProcessedFiles(processedDocs.map(d => d.fileName));
                            }
                          }}
                        >
                          {selectedProcessedFiles.length === processedDocs.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedProcessedFiles.length > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs font-medium px-2.5 gap-1.5"
                            onClick={() => handleDeleteProcessedBatch(selectedProcessedFiles)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete ({selectedProcessedFiles.length})
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-100/60"
                          onClick={() => {
                            setIsProcessedSelectMode(false);
                            setSelectedProcessedHashes([]);
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs font-medium px-2.5 gap-1.5 border-zinc-200 bg-white hover:bg-zinc-100/80 text-zinc-700 hover:text-zinc-900 transition-colors shadow-2xs"
                        onClick={() => setIsProcessedSelectMode(true)}
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
                        Select
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {activeDocTab === 'retrieved' ? (
          unprocessedFiles.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              No unprocessed documents found in the repository. Use "Discover New Documents" or "Upload New Document" to add policy documents.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {(!isDocsExpanded && unprocessedFiles.length > 2
                  ? unprocessedFiles.slice(0, 2)
                  : unprocessedFiles
                ).map((fileName) => (
                  <div 
                    key={fileName} 
                    className="bg-white hover:bg-sky-50/30 transition-all border border-zinc-200/90 hover:border-sky-300 rounded-xl flex items-center justify-between shadow-2xs hover:shadow-xs group w-full"
                    style={{ padding: '6px 8px' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <Tooltip content={fileName}>
                          <a
                            href={`/api/view-pdf?fileName=${encodeURIComponent(fileName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold truncate text-zinc-900 hover:underline transition-colors pr-1 block"
                            title="Open & read PDF in new tab"
                          >
                            {fileName}
                          </a>
                        </Tooltip>
                        <span className="text-[10px] text-sky-700 mt-0.5 leading-none font-medium">
                          Local PDF File
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/api/view-pdf?fileName=${encodeURIComponent(fileName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-300 hover:border-zinc-400 rounded-lg shadow-2xs transition-colors"
                        title="Read PDF document"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-700" />
                        <span>Read</span>
                      </a>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-white hover:bg-zinc-50 border border-zinc-300 hover:border-zinc-400 text-zinc-900 text-[11px] font-semibold px-2 h-7 rounded-lg flex items-center gap-1 shrink-0 shadow-2xs transition-colors"
                        onClick={() => onStartLocalExtraction && onStartLocalExtraction(fileName)}
                        title="Extract proposals from this document"
                      >
                        <Activity className="w-3.5 h-3.5 text-zinc-700 animate-pulse" />
                        <span>Extract</span>
                      </Button>
                    </div>
                  </div>
                ))}

                {!isDocsExpanded && unprocessedFiles.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setIsDocsExpanded(true)}
                    className="border border-dashed border-sky-300 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-100/70 transition-all rounded-xl flex items-center justify-center gap-2 shadow-2xs text-sky-800 hover:text-sky-950 cursor-pointer h-[48px] w-full text-xs font-semibold group px-3"
                  >
                    <ChevronDown className="w-4 h-4 text-sky-600 group-hover:text-sky-800 transition-transform group-hover:translate-y-0.5 shrink-0" />
                    <span className="truncate">Reveal rest of documents ({unprocessedFiles.length - 2} more)</span>
                  </button>
                )}
              </div>

              {isDocsExpanded && unprocessedFiles.length > 2 && (
                <div className="mt-3.5 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDocsExpanded(false)}
                    className="text-xs font-medium text-sky-800 hover:text-sky-950 bg-sky-50/60 hover:bg-sky-100 border-sky-200 flex items-center gap-1.5 px-3.5 py-1 h-7 rounded-lg shadow-2xs"
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-sky-600" />
                    Hide documents
                  </Button>
                </div>
              )}
            </div>
          )
        ) : (
          processedDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              No processed documents recorded yet. Once extractions are completed, documents will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {processedDocs.map((doc) => {
                const isSelected = selectedProcessedFiles.includes(doc.fileName);
                return (
                  <div 
                    key={doc.fileName}
                    className={`transition-all border rounded-xl flex items-center justify-between shadow-2xs group w-full ${
                      isSelected 
                        ? 'border-emerald-300 bg-emerald-50/50 ring-1 ring-emerald-200' 
                        : 'border-zinc-200/90 bg-white hover:bg-emerald-50/20 hover:border-emerald-200'
                    }`}
                    style={{ padding: '6px 8px' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {isProcessedSelectMode ? (
                        <button
                          type="button"
                          className="shrink-0 text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedProcessedFiles(prev => 
                              isSelected ? prev.filter(f => f !== doc.fileName) : [...prev, doc.fileName]
                            );
                          }}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <Tooltip content={doc.fileName}>
                          <a
                            href={`/api/view-pdf?fileName=${encodeURIComponent(doc.fileName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold truncate text-zinc-900 hover:underline transition-colors pr-1 block"
                            title="Open & read PDF in new tab"
                          >
                            {doc.fileName}
                          </a>
                        </Tooltip>
                        <span className="text-[10px] text-emerald-700 mt-0.5 leading-none font-mono">
                          Extracted: {doc.processedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/api/view-pdf?fileName=${encodeURIComponent(doc.fileName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold text-zinc-800 hover:text-zinc-950 bg-white hover:bg-zinc-50 border border-zinc-300 hover:border-zinc-400 rounded-lg shadow-2xs transition-colors"
                        title="Read PDF document"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-700" />
                        <span>Read</span>
                      </a>

                      {!isProcessedSelectMode && (
                        <Button 
                          variant="ghost"
                          size="sm" 
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                          onClick={() => handleDeleteProcessedBatch([doc.fileName])}
                          title="Remove from processed history and return to files folder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </Card>

      <Card className="border border-zinc-200/80 shadow-xs bg-white rounded-2xl">
        <CardHeader className="pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-bold text-zinc-900 shrink-0">Reformation Proposals</CardTitle>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 shadow-2xs">
                {filteredProposals.length} Total
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 justify-end">
              {isProposalSelectMode ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-medium px-2.5 bg-white hover:bg-zinc-100/80 text-zinc-700 transition-colors border-zinc-200 shadow-2xs"
                    onClick={() => {
                      const allFilteredIds = filteredProposals.map(p => p.id);
                      const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedProposalIds.includes(id));
                      if (isAllSelected) {
                        setSelectedProposalIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                      } else {
                        setSelectedProposalIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                      }
                    }}
                  >
                    {filteredProposals.length > 0 && filteredProposals.every(p => selectedProposalIds.includes(p.id)) ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedProposalIds.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs font-medium px-2.5 gap-1.5"
                      onClick={() => handleDeleteProposalsBatch(selectedProposalIds)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete ({selectedProposalIds.length})
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground hover:bg-zinc-100/60"
                    onClick={() => {
                      setIsProposalSelectMode(false);
                      setSelectedProposalIds([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-medium px-2.5 gap-1.5 border-zinc-200 bg-white hover:bg-zinc-100/80 text-zinc-700 hover:text-zinc-900 transition-colors shadow-2xs"
                  onClick={() => setIsProposalSelectMode(true)}
                  disabled={proposals.length === 0}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-500" />
                  Select
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 shrink-0 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 font-semibold shadow-2xs h-9 text-xs rounded-lg"
                onClick={() => window.open('/api/download-master-csv', '_blank')}
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Download Master CSV
              </Button>
              <div className="relative w-64 md:w-72 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search extracted proposals..." 
                  className="pl-9 bg-zinc-50/50 border-zinc-200 h-9 w-full rounded-lg text-xs"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-y-scroll h-[500px] pr-1 custom-scrollbar">
            <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <Table className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-dashed border-zinc-200 bg-gradient-to-r from-zinc-50 via-slate-50 to-zinc-50">
                    {isProposalSelectMode && (
                      <TableHead className="w-10 text-center border-r border-dashed border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          className="align-middle text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          onClick={() => {
                            const allFilteredIds = filteredProposals.map(p => p.id);
                            const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedProposalIds.includes(id));
                            if (isAllSelected) {
                              setSelectedProposalIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                            } else {
                              setSelectedProposalIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                            }
                          }}
                          title={
                            filteredProposals.length > 0 && filteredProposals.every(p => selectedProposalIds.includes(p.id))
                              ? "Deselect All"
                              : "Select All"
                          }
                        >
                          {filteredProposals.length > 0 && filteredProposals.every(p => selectedProposalIds.includes(p.id)) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="col-header border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Proposal</TableHead>
                    <TableHead className="col-header border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Exact Verbatim</TableHead>
                    <TableHead className="col-header border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Category</TableHead>
                    <TableHead className="col-header border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Source Document (Quelldokument)</TableHead>
                    <TableHead className="col-header text-center border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Page</TableHead>
                    <TableHead className="col-header text-right px-3">Processed Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {filteredProposals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isProposalSelectMode ? 7 : 6} className="text-center py-12 text-muted-foreground italic">
                          No proposals found. Click "Discover New Documents" or "Upload New Document" to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProposals.map((proposal) => {
                        const isSelected = selectedProposalIds.includes(proposal.id);
                        return (
                          <motion.tr 
                            key={proposal.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`data-grid-row group border-b border-dashed border-zinc-200 dark:border-zinc-800 transition-colors hover:bg-muted/30 ${isSelected ? 'bg-primary/5' : ''}`}
                          >
                            {isProposalSelectMode && (
                              <TableCell className="w-10 text-center py-4 align-middle border-r border-dashed border-zinc-200 dark:border-zinc-800">
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                  onClick={() => {
                                    setSelectedProposalIds(prev => 
                                      isSelected ? prev.filter(id => id !== proposal.id) : [...prev, proposal.id]
                                    );
                                  }}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-primary" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </TableCell>
                            )}
                            <TableCell className="py-4 px-3 max-w-md whitespace-normal break-words border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              <p className="text-xs leading-relaxed font-medium">
                                {proposal.text}
                              </p>
                            </TableCell>
                            <TableCell className="py-4 px-3 max-w-md whitespace-normal break-words text-muted-foreground border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              <div className="text-xs leading-relaxed">
                                {renderNumberedText(proposal.verbatim, true)}
                              </div>
                            </TableCell>
                            <TableCell className="align-middle px-3 whitespace-normal border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              <span className={`inline-block whitespace-nowrap font-semibold text-[10px] px-2.5 py-0.5 rounded-md border ${getCategoryBadge(proposal.category)}`}>
                                {proposal.category}
                              </span>
                            </TableCell>
                            <TableCell className="align-middle px-3 whitespace-normal break-words border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              <div className="max-w-[280px]">
                                {renderNumberedSource(proposal.source)}
                              </div>
                            </TableCell>
                            <TableCell className="text-center align-middle px-3 font-mono text-xs font-semibold whitespace-normal border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              {renderNumberedText(proposal.page, false)}
                            </TableCell>
                            <TableCell className="text-right align-middle px-3 text-xs font-mono text-muted-foreground whitespace-normal">
                              {renderNumberedText(proposal.processedAt, false)}
                            </TableCell>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="mt-2.5 px-1 flex items-center justify-between text-xs text-zinc-500">
            <span className="font-mono">
              Showing <strong className="text-indigo-700 font-bold">{filteredProposals.length}</strong> {filteredProposals.length === 1 ? 'proposal' : 'proposals'}
              {proposals.length > filteredProposals.length && ` (filtered from ${proposals.length})`}
            </span>
            <span className="text-[11px] text-zinc-400">
              Scroll down table to inspect all rows
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Category Selection Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] w-full max-w-md overflow-hidden text-zinc-900 border-0">
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Select Category for Discovery</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto">
              {[
                "IT-Infrastruktur",
                "Organisation",
                "Strategie",
                "Personal",
                "Gesetzgebung",
                "Leistungen & Prozesse",
                "Föderalismus",
                "Governance",
                "Random"
              ].map((category) => (
                <button
                  key={category}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-all font-medium text-sm flex items-center justify-between group"
                  onClick={() => handleStartSearch(category)}
                >
                  <span>{category}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Discovery Preview Modal */}
      {isDiscoveryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] w-full max-w-3xl h-[80vh] flex flex-col text-zinc-900 border-0">
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold">Retrieved Policy Documents</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Category: {selectedCategory} • Select documents to download into the repository</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setIsDiscoveryModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {discoveredDocs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                  <FileText className="w-12 h-12 mb-3 opacity-40" />
                  <p>All discovered documents have been deleted or skipped.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {discoveredDocs.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`p-4 border rounded-xl transition-all flex items-start justify-between gap-4 ${
                        doc.selected ? 'border-zinc-200 bg-white shadow-sm' : 'border-zinc-100 bg-zinc-50/50 opacity-60'
                      }`}
                    >
                      {/* Checkbox and Text */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          className="mt-1 shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
                          onClick={() => {
                            setDiscoveredDocs(prev => prev.map(d => d.id === doc.id ? { ...d, selected: !d.selected } : d));
                          }}
                        >
                          {doc.selected ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate pr-2 text-zinc-900" title={doc.title}>
                            {doc.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {doc.description}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                         {doc.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-2.5 rounded-lg text-xs transition-colors ${
                              doc.visited 
                                ? 'text-green-600 bg-green-50 hover:bg-green-100 font-semibold' 
                                : 'text-zinc-600 hover:bg-zinc-100'
                            }`}
                            onClick={() => {
                              window.open(doc.url.startsWith('http') ? doc.url : `https://${doc.url}`, '_blank');
                              setDiscoveredDocs(prev => prev.map(d => d.id === doc.id ? { ...d, visited: true } : d));
                            }}
                            title="Visit document website"
                          >
                            {doc.visited ? (
                              <>
                                <Check className="w-4 h-4 mr-1.5" /> Visited
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-4 h-4 mr-1.5" /> Visit Site
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => {
                            setDiscoveredDocs(prev => prev.filter(d => d.id !== doc.id));
                          }}
                          title="Remove document from search"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/50">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">
                  Selected: {discoveredDocs.filter(d => d.selected).length} of {discoveredDocs.length}
                </span>
                {discoveredDocs.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary hover:text-primary-hover px-2 rounded-lg"
                    onClick={() => {
                      const allSelected = discoveredDocs.every(d => d.selected);
                      setDiscoveredDocs(prev => prev.map(d => ({ ...d, selected: !allSelected })));
                    }}
                  >
                    {discoveredDocs.every(d => d.selected) ? "Clear Selection" : "Select All"}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsDiscoveryModalOpen(false)}
                  disabled={isDownloading}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={downloadSelectedDocuments}
                  disabled={isDownloading || discoveredDocs.filter(d => d.selected).length === 0}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" /> Download Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
