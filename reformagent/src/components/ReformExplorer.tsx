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
  Pencil,
  GitMerge,
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
import { Textarea } from '@/src/components/ui/textarea';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/src/components/ui/dropdown-menu';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Progress } from '@/src/components/ui/progress';
import { ProcessedDocument } from '../types';
import { escapeCsvField } from '../types/deduplication';
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

const CLUSTER_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-900 border-amber-200',
  'bg-purple-100 text-purple-900 border-purple-200',
  'bg-slate-200 text-slate-800 border-slate-300',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-sky-100 text-sky-800 border-sky-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-stone-200 text-stone-800 border-stone-300',
];

function getClusterBadge(cluster: string) {
  if (!cluster || cluster.trim().toLowerCase() === 'allgemein') {
    return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
  let hash = 0;
  const str = cluster.trim();
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return CLUSTER_COLORS[hash % CLUSTER_COLORS.length];
}

function getCategoryBadge(category: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('governance')) {
    return 'bg-purple-100 text-purple-900 border-purple-200';
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

function DocumentRevealButton({
  theme,
  remainingCount,
  onExpand,
}: {
  theme: 'sky' | 'emerald';
  remainingCount: number;
  onExpand: () => void;
}) {
  const isEmerald = theme === 'emerald';
  return (
    <button
      type="button"
      onClick={onExpand}
      className={`border border-dashed transition-all rounded-xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer h-[48px] w-full text-xs font-semibold group px-3 ${
        isEmerald
          ? 'border-emerald-300 hover:border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 hover:text-emerald-950'
          : 'border-sky-300 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-100/70 text-sky-800 hover:text-sky-950'
      }`}
    >
      <ChevronDown className={`w-4 h-4 transition-transform group-hover:translate-y-0.5 shrink-0 ${
        isEmerald ? 'text-emerald-600 group-hover:text-emerald-800' : 'text-sky-600 group-hover:text-sky-800'
      }`} />
      <span className="truncate">Reveal rest of documents ({remainingCount} more)</span>
    </button>
  );
}

function DocumentHideButton({
  theme,
  onCollapse,
}: {
  theme: 'sky' | 'emerald';
  onCollapse: () => void;
}) {
  const isEmerald = theme === 'emerald';
  return (
    <div className="mt-3.5 flex justify-center">
      <Button
        variant="outline"
        size="sm"
        onClick={onCollapse}
        className={`text-xs font-medium flex items-center gap-1.5 px-3.5 py-1 h-7 rounded-lg shadow-2xs ${
          isEmerald
            ? 'text-emerald-800 hover:text-emerald-950 bg-emerald-50/60 hover:bg-emerald-100 border-emerald-200'
            : 'text-sky-800 hover:text-sky-950 bg-sky-50/60 hover:bg-sky-100 border-sky-200'
        }`}
      >
        <ChevronUp className={`w-3.5 h-3.5 ${isEmerald ? 'text-emerald-600' : 'text-sky-600'}`} />
        Hide documents
      </Button>
    </div>
  );
}

function renderNumberedItems(
  text: string, 
  renderItem: (content: string, isMarked: boolean) => React.ReactNode,
  gapClass: string = "gap-1.5"
) {
  if (!text) return "N/A";
  const parts = text.split(/(?=\b\d+\)\s*)/g).filter(p => p.trim());
  if (parts.length <= 1) {
    return renderItem(text, false);
  }
  return (
    <div className="space-y-1.5 py-0.5">
      {parts.map((part, index) => {
        const markerMatch = part.match(/^(\d+\))\s*(.*)/s);
        if (markerMatch) {
          const [_, marker, rest] = markerMatch;
          return (
            <div key={index} className={`flex items-start ${gapClass}`}>
              <span className="italic font-bold text-indigo-600 shrink-0">{marker}</span>
              <div className="min-w-0 flex-1">{renderItem(rest, true)}</div>
            </div>
          );
        }
        return <div key={index}>{renderItem(part, false)}</div>;
      })}
    </div>
  );
}

function renderNumberedText(text: string, isItalicText: boolean = false) {
  return renderNumberedItems(text, (content) => (
    <span className={isItalicText ? "italic" : ""}>{content}</span>
  ), "gap-1.5 leading-relaxed");
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
  return renderNumberedItems(source, (content) => renderSingleSource(content));
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

interface ReformProposalItem {
  id: string;
  text: string;
  verbatim: string;
  source: string;
  sourceUrl?: string;
  page: string;
  category: string;
  cluster?: string;
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
  const [isProcessedExpanded, setIsProcessedExpanded] = useState(false);

  // Only documents that have NOT been processed are shown in Retrieved Policy Documents
  const unprocessedFiles = localFiles.filter(fileName => !processedDocs.some(d => d.fileName === fileName));

  // Total retrieved documents = unique count across unprocessed and processed documents
  const totalDocsCount = new Set([
    ...localFiles.filter(Boolean),
    ...processedDocs.map(d => d.fileName).filter(Boolean)
  ]).size;

  // Filter States for Proposals Table
  const [selectedFileFilter, setSelectedFileFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedClusterFilter, setSelectedClusterFilter] = useState<string>('ALL');
  const [showMultipleProposalsOnly, setShowMultipleProposalsOnly] = useState(false);

  // Proposal Batch Select State
  const [selectedProposalIds, setSelectedProposalIds] = useState<string[]>([]);
  const [isProposalSelectMode, setIsProposalSelectMode] = useState(false);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [discoveredDocs, setDiscoveredDocs] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Proposal Edit & Version Picking State
  const [editingProposal, setEditingProposal] = useState<ReformProposalItem | null>(null);
  const [deleteVersionProposal, setDeleteVersionProposal] = useState<ReformProposalItem | null>(null);
  const [isDeletingVersion, setIsDeletingVersion] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    text: string;
    verbatim: string;
    category: string;
    cluster: string;
    source: string;
    page: string;
  }>({ text: '', verbatim: '', category: '', cluster: '', source: '', page: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [mergedSimilarity, setMergedSimilarity] = useState<number | null>(null);
  const [isLoadingSimilarity, setIsLoadingSimilarity] = useState(false);

  // Helper to extract Version 1 and Version 2 from a merged proposal
  const getMergedVersions = (proposal: ReformProposalItem | null) => {
    if (!proposal) return null;
    const parseParts = (str: string) => {
      if (!str) return [];
      const parts = str.split(/(?=\b\d+\)\s*)/g).map(p => p.trim()).filter(Boolean);
      if (parts.length <= 1) return [str];
      return parts.map(p => p.replace(/^\d+\)\s*/, '').trim());
    };

    const texts = parseParts(proposal.text);
    const verbatims = parseParts(proposal.verbatim);
    const sources = parseParts(proposal.source);
    const pages = parseParts(proposal.page);

    const maxLen = Math.max(texts.length, verbatims.length, sources.length, pages.length);
    if (maxLen <= 1) return null;

    return {
      version1: {
        text: texts[0] || proposal.text,
        verbatim: verbatims[0] || proposal.verbatim,
        source: sources[0] || proposal.source,
        page: pages[0] || proposal.page
      },
      version2: {
        text: texts.length > 1 ? texts[1] : (verbatims.length > 1 ? verbatims[1] : proposal.text),
        verbatim: verbatims[1] || verbatims[0] || proposal.verbatim,
        source: sources[1] || sources[0] || proposal.source,
        page: pages[1] || pages[0] || proposal.page
      }
    };
  };

  const handleOpenEditModal = (proposal: ReformProposalItem) => {
    setEditingProposal(proposal);
    setEditFormData({
      text: proposal.text,
      verbatim: proposal.verbatim,
      category: proposal.category,
      cluster: proposal.cluster || 'Allgemein',
      source: proposal.source,
      page: proposal.page
    });
    setMergedSimilarity(null);

    const merged = getMergedVersions(proposal);
    if (merged) {
      setIsLoadingSimilarity(true);
      fetch('/api/calculate-similarity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text1: merged.version1.text,
          text2: merged.version2.text,
          verbatim1: merged.version1.verbatim,
          verbatim2: merged.version2.verbatim
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.similarityPercent === 'number') {
            setMergedSimilarity(data.similarityPercent);
          }
        })
        .catch(err => {
          console.error('Error calculating similarity:', err);
        })
        .finally(() => {
          setIsLoadingSimilarity(false);
        });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingProposal) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/update-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProposal.id,
          updatedProposal: {
            text: editFormData.text.trim(),
            verbatim: editFormData.verbatim.trim(),
            category: editFormData.category.trim(),
            cluster: editFormData.cluster.trim(),
            source: editFormData.source.trim(),
            page: editFormData.page.trim()
          }
        })
      });
      if (res.ok) {
        toast.success("Proposal updated successfully.");
        setProposals(prev => prev.map(p => p.id === editingProposal.id ? {
          ...p,
          text: editFormData.text.trim(),
          verbatim: editFormData.verbatim.trim(),
          category: editFormData.category.trim(),
          cluster: editFormData.cluster.trim(),
          source: editFormData.source.trim(),
          page: editFormData.page.trim()
        } : p));
        setEditingProposal(null);
      } else {
        const err = await res.json();
        toast.error(`Update failed: ${err.error || 'Server error'}`);
      }
    } catch (err: any) {
      toast.error(`Failed to update proposal: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSpecificVersion = async (versionIndex: 1 | 2) => {
    if (!deleteVersionProposal) return;
    const confirmMsg = `Are you sure you want to delete Proposal ${versionIndex}? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    const merged = getMergedVersions(deleteVersionProposal);
    if (!merged) {
      // If it cannot be parsed into multiple versions, delete whole proposal
      const id = deleteVersionProposal.id;
      setDeleteVersionProposal(null);
      handleDeleteProposalsBatch([id]);
      return;
    }

    // If version 1 is deleted, version 2 is kept (and becomes the only entry)
    // If version 2 is deleted, version 1 is kept (and becomes the only entry)
    const kept = versionIndex === 1 ? merged.version2 : merged.version1;
    setIsDeletingVersion(true);

    try {
      const res = await fetch('/api/update-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteVersionProposal.id,
          updatedProposal: {
            text: kept.text,
            verbatim: kept.verbatim,
            category: deleteVersionProposal.category,
            source: kept.source,
            page: kept.page
          }
        })
      });

      if (res.ok) {
        toast.success(`Deleted Proposal #${versionIndex}. Kept Proposal #${versionIndex === 1 ? 2 : 1}.`);
        setProposals(prev => prev.map(p => p.id === deleteVersionProposal.id ? {
          ...p,
          text: kept.text,
          verbatim: kept.verbatim,
          source: kept.source,
          page: kept.page
        } : p));
        setDeleteVersionProposal(null);
      } else {
        const err = await res.json();
        toast.error(`Deletion failed: ${err.error || 'Server error'}`);
      }
    } catch (err: any) {
      toast.error(`Failed to delete version: ${err.message}`);
    } finally {
      setIsDeletingVersion(false);
    }
  };

  // Extract individual clean file names from a proposal's source string
  const getProposalFiles = (sourceText: string): string[] => {
    if (!sourceText) return [];
    // Match filenames ending with .pdf, e.g. "zangazanga.pdf" or "pd2.pdf"
    const matches = sourceText.match(/[a-zA-Z0-9_\u00C0-\u017F.-]+\.pdf/gi);
    if (matches && matches.length > 0) {
      return Array.from(new Set(matches));
    }
    // Fallback: strip url annotations like " (www.vitako.de)" and numbers like "1) "
    const cleaned = sourceText.replace(/\s*\([^)]*\)/g, '').replace(/\b\d+\)\s*/g, '').trim();
    return cleaned ? [cleaned] : [];
  };

  // Extract date strings (DD.MM.YYYY) from a proposal's processedAt string
  const getProposalDates = (dateText: string): string[] => {
    if (!dateText) return [];
    // Match date patterns like 21.9.2026 or 21.09.2026 or 2026-09-21
    const matches = dateText.match(/\b\d{1,2}\.\d{1,2}\.\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g);
    if (matches && matches.length > 0) {
      return Array.from(new Set(matches));
    }
    const firstPart = dateText.split(',')[0].replace(/\b\d+\)\s*/g, '').trim();
    return firstPart ? [firstPart] : [];
  };

  // Compute unique file names and extraction dates across all proposals
  const uniqueFileNames = Array.from(
    new Set(proposals.flatMap(p => getProposalFiles(p.source || '')))
  ).filter(Boolean).sort((a, b) => a.localeCompare(b));

  const uniqueExtractionDates = Array.from(
    new Set(proposals.flatMap(p => getProposalDates(p.processedAt || '')))
  ).filter(Boolean).sort((a, b) => {
    // Sort dates descending (newest first)
    const parseDateStr = (d: string) => {
      const parts = d.split('.');
      if (parts.length === 3) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
      }
      return new Date(d).getTime() || 0;
    };
    return parseDateStr(b) - parseDateStr(a);
  });

  const uniqueCategories = Array.from(
    new Set(proposals.map(p => (p.category || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const uniqueClusters = Array.from(
    new Set(proposals.map(p => (p.cluster || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  // Count proposals that contain multiple proposal statements (merged proposals)
  const multipleProposalsCount = proposals.filter(p => Boolean(getMergedVersions(p))).length;

  const filteredProposals = proposals.filter(p => {
    // 1. Text Search Filter
    const matchesSearch = !searchTerm || 
      (p.text || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (p.verbatim || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cluster || '').toLowerCase().includes(searchTerm.toLowerCase());

    // 2. File Name Filter
    const matchesFile = selectedFileFilter === 'ALL' || 
      getProposalFiles(p.source || '').includes(selectedFileFilter);

    // 3. Extraction Day Filter
    const matchesDate = selectedDateFilter === 'ALL' || 
      getProposalDates(p.processedAt || '').includes(selectedDateFilter);

    // 4. Category Filter
    const matchesCategory = selectedCategoryFilter === 'ALL' ||
      (p.category || '').trim() === selectedCategoryFilter;

    // 5. Cluster Filter
    const matchesCluster = selectedClusterFilter === 'ALL' ||
      (p.cluster || '').trim() === selectedClusterFilter;

    // 6. Multiple Proposals in Statement Filter
    const matchesMultipleProposals = !showMultipleProposalsOnly || Boolean(getMergedVersions(p));

    return matchesSearch && matchesFile && matchesDate && matchesCategory && matchesCluster && matchesMultipleProposals;
  });

  // Client-side export of filtered proposals as CSV
  const handleDownloadFilteredCsv = () => {
    if (filteredProposals.length === 0) {
      toast.error("No proposals to export in current view.");
      return;
    }
    const headers = ['Vorschlag', 'Exaktes Verbatim', 'Quelldokument', 'Seitennummer', 'Kategorie', 'Cluster', 'Verarbeitungsdatum'];
    const csvRows = [headers.map(escapeCsvField).join(',')];

    for (const p of filteredProposals) {
      csvRows.push([
        escapeCsvField(p.text || ''),
        escapeCsvField(p.verbatim || ''),
        escapeCsvField(p.source || ''),
        escapeCsvField(p.page || ''),
        escapeCsvField(p.category || ''),
        escapeCsvField(p.cluster || 'Allgemein'),
        escapeCsvField(p.processedAt || '')
      ].join(','));
    }

    const blob = new Blob([csvRows.join('\n') + '\n'], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Construct dynamic clean filename based on applied filters
    const fileSuffix = selectedFileFilter !== 'ALL' ? `_${selectedFileFilter.replace(/\.pdf$/i, '')}` : '';
    const dateSuffix = selectedDateFilter !== 'ALL' ? `_${selectedDateFilter.replace(/[^\w]/g, '-')}` : '';
    const categorySuffix = selectedCategoryFilter !== 'ALL' ? `_${selectedCategoryFilter.replace(/[^\w]+/g, '-')}` : '';
    const multipleSuffix = showMultipleProposalsOnly ? '_dual-proposals' : '';
    link.setAttribute('download', `reforms_filtered${fileSuffix}${dateSuffix}${categorySuffix}${multipleSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredProposals.length} filtered proposals.`);
  };

  const fetchAndSet = async <T,>(url: string, setter: (data: T) => void, label: string) => {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setter(data);
      }
    } catch (e) {
      console.error(`Failed to load ${label}:`, e);
    }
  };

  const loadLocalFiles = () => fetchAndSet<string[]>('/api/list-pdfs', setLocalFiles, 'local files');
  const loadProposals = () => fetchAndSet<any[]>('/api/list-proposals', setProposals, 'proposals');
  const loadProcessedDocs = () => fetchAndSet<ProcessedDocItem[]>('/api/list-processed-documents', setProcessedDocs, 'processed docs');

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

  const handleDeleteProposal = (id: string) => handleDeleteProposalsBatch([id]);

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
      if (result.skippedDuplicatesCount > 0) {
        if (result.successCount > 0) {
          toast.success(`Downloaded ${result.successCount} new document(s). Skipped ${result.skippedDuplicatesCount} identical duplicate(s).`, { id: toastId });
        } else {
          toast.info(`All ${result.skippedDuplicatesCount} document(s) were skipped (identical content already exists in repository).`, { id: toastId });
        }
      } else {
        toast.success(`Successfully downloaded ${result.successCount} documents!`, { id: toastId });
      }
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
        <Card className="bg-gradient-to-br from-purple-50/70 via-slate-50/40 to-white border border-purple-200/80 shadow-xs rounded-2xl relative">
          <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center shadow-2xs">
            <FileText className="w-4 h-4" />
          </div>
          <CardHeader className="px-5" style={{ paddingTop: '9.5px', paddingBottom: '9.5px' }}>
            <CardDescription className="text-[11px] uppercase font-mono font-bold tracking-wider text-purple-900">Total Extracted Reforms</CardDescription>
            <CardTitle className="text-3xl font-mono text-purple-950 mt-1">
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
                            setSelectedProcessedFiles([]);
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
                        onClick={() => {
                          setIsProcessedSelectMode(true);
                          setIsProcessedExpanded(true);
                        }}
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
                  <DocumentRevealButton
                    theme="sky"
                    remainingCount={unprocessedFiles.length - 2}
                    onExpand={() => setIsDocsExpanded(true)}
                  />
                )}
              </div>

              {isDocsExpanded && unprocessedFiles.length > 2 && (
                <DocumentHideButton
                  theme="sky"
                  onCollapse={() => setIsDocsExpanded(false)}
                />
              )}
            </div>
          )
        ) : (
          processedDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              No processed documents recorded yet. Once extractions are completed, documents will appear here.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {(!isProcessedExpanded && processedDocs.length > 2
                  ? processedDocs.slice(0, 2)
                  : processedDocs
                ).map((doc) => {
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

                {!isProcessedExpanded && processedDocs.length > 2 && (
                  <DocumentRevealButton
                    theme="emerald"
                    remainingCount={processedDocs.length - 2}
                    onExpand={() => setIsProcessedExpanded(true)}
                  />
                )}
              </div>

              {isProcessedExpanded && processedDocs.length > 2 && (
                <DocumentHideButton
                  theme="emerald"
                  onCollapse={() => setIsProcessedExpanded(false)}
                />
              )}
            </div>
          )
        )}
      </Card>

      <Card className="border border-zinc-200/80 shadow-xs bg-white rounded-2xl">
        <CardHeader className="pb-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-bold text-zinc-900 shrink-0">Reformation Proposals</CardTitle>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
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

              {/* Download Filtered CSV Button (Active when filtered or specific view) */}
              {(selectedFileFilter !== 'ALL' || selectedDateFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedClusterFilter !== 'ALL' || showMultipleProposalsOnly || searchTerm.trim() !== '') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 shrink-0 border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-800 font-semibold shadow-2xs h-9 text-xs rounded-lg"
                  onClick={handleDownloadFilteredCsv}
                  title={`Download only the ${filteredProposals.length} currently filtered proposals as CSV`}
                >
                  <Download className="w-4 h-4 text-indigo-600" />
                  Download Filtered ({filteredProposals.length})
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 shrink-0 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-800 font-semibold shadow-2xs h-9 text-xs rounded-lg"
                onClick={() => window.open('/api/download-master-csv', '_blank')}
                title="Download entire master database as CSV"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Download Master CSV
              </Button>
              <div className="relative w-56 md:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search proposals..." 
                  className="pl-9 bg-zinc-50/50 border-zinc-200 h-9 w-full rounded-lg text-xs"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filter Bar: File Name and Day of Extraction */}
          <div className="flex flex-wrap items-center gap-3 pt-3.5 mt-2 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-semibold shrink-0">
              <Filter className="w-3.5 h-3.5 text-zinc-500" />
              <span>Filter by:</span>
            </div>

            {/* File Name Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-zinc-500 shrink-0">
                File:
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium bg-white hover:bg-zinc-50 border border-black text-zinc-900 rounded-lg px-2.5 flex items-center justify-between gap-2 max-w-[220px] shadow-2xs cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedFileFilter === 'ALL'
                          ? `All Files (${uniqueFileNames.length})`
                          : selectedFileFilter}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0 ml-0.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto custom-scrollbar p-1 shadow-xl border border-black !bg-white">
                  <DropdownMenuRadioGroup
                    value={selectedFileFilter}
                    onValueChange={(val) => setSelectedFileFilter(val)}
                  >
                    <DropdownMenuRadioItem
                      value="ALL"
                      className="text-xs font-medium cursor-pointer py-1.5 px-2 rounded-md hover:bg-zinc-100"
                    >
                      <span className="font-semibold">All Files</span>
                      <span className="text-zinc-500 font-mono text-[10px] ml-1">({uniqueFileNames.length})</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator className="my-1 bg-zinc-200" />
                    {uniqueFileNames.map((fileName) => (
                      <DropdownMenuRadioItem
                        key={fileName}
                        value={fileName}
                        className="text-xs cursor-pointer py-1.5 px-2 rounded-md truncate hover:bg-zinc-100"
                      >
                        <span className="truncate" title={fileName}>{fileName}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Day of Extraction Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-zinc-500 shrink-0">
                Extraction Date:
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium bg-white hover:bg-zinc-50 border border-black text-zinc-900 rounded-lg px-2.5 flex items-center justify-between gap-2 shadow-2xs cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedDateFilter === 'ALL'
                          ? `All Dates (${uniqueExtractionDates.length})`
                          : selectedDateFilter}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0 ml-0.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto custom-scrollbar p-1 shadow-xl border border-black !bg-white">
                  <DropdownMenuRadioGroup
                    value={selectedDateFilter}
                    onValueChange={(val) => setSelectedDateFilter(val)}
                  >
                    <DropdownMenuRadioItem
                      value="ALL"
                      className="text-xs font-medium cursor-pointer py-1.5 px-2 rounded-md hover:bg-zinc-100"
                    >
                      <span className="font-semibold">All Dates</span>
                      <span className="text-zinc-500 font-mono text-[10px] ml-1">({uniqueExtractionDates.length})</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator className="my-1 bg-zinc-200" />
                    {uniqueExtractionDates.map((dateStr) => (
                      <DropdownMenuRadioItem
                        key={dateStr}
                        value={dateStr}
                        className="text-xs font-mono cursor-pointer py-1.5 px-2 rounded-md hover:bg-zinc-100"
                      >
                        <span>{dateStr}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-zinc-500 shrink-0">
                Category:
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-lg px-2.5 flex items-center justify-between gap-2 max-w-[220px] shadow-2xs cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedCategoryFilter === 'ALL'
                          ? `All Categories (${uniqueCategories.length})`
                          : selectedCategoryFilter}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-0.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto custom-scrollbar p-1 shadow-lg border border-zinc-200 !bg-white">
                  <DropdownMenuRadioGroup
                    value={selectedCategoryFilter}
                    onValueChange={(val) => setSelectedCategoryFilter(val)}
                  >
                    <DropdownMenuRadioItem
                      value="ALL"
                      className="text-xs font-medium cursor-pointer py-1.5 px-2 rounded-md hover:bg-zinc-100"
                    >
                      <span className="font-semibold">All Categories</span>
                      <span className="text-zinc-500 font-mono text-[10px] ml-1">({uniqueCategories.length})</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator className="my-1 bg-zinc-200" />
                    {uniqueCategories.map((category) => (
                      <DropdownMenuRadioItem
                        key={category}
                        value={category}
                        className="text-xs cursor-pointer py-1.5 px-2 rounded-md truncate hover:bg-zinc-100"
                      >
                        <span className="truncate" title={category}>{category}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Cluster Dropdown Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-medium bg-white hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 text-zinc-900 rounded-lg px-2.5 flex items-center justify-between gap-2 max-w-[220px] shadow-2xs cursor-pointer"
                    >
                      <span className="truncate">
                        {selectedClusterFilter === 'ALL'
                          ? `All Clusters (${uniqueClusters.length})`
                          : selectedClusterFilter}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600 shrink-0 ml-0.5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto custom-scrollbar p-1 shadow-xl border border-zinc-200 !bg-white">
                  <DropdownMenuRadioGroup
                    value={selectedClusterFilter}
                    onValueChange={(val) => setSelectedClusterFilter(val)}
                  >
                    <DropdownMenuRadioItem
                      value="ALL"
                      className="text-xs font-medium cursor-pointer py-1.5 px-2 rounded-md hover:bg-zinc-100"
                    >
                      <span className="font-semibold">All Clusters</span>
                      <span className="text-zinc-500 font-mono text-[10px] ml-1">({uniqueClusters.length})</span>
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator className="my-1 bg-zinc-200" />
                    {uniqueClusters.map((cluster) => (
                      <DropdownMenuRadioItem
                        key={cluster}
                        value={cluster}
                        className="text-xs cursor-pointer py-1.5 px-2 rounded-md truncate hover:bg-zinc-100"
                      >
                        <span className="truncate" title={cluster}>{cluster}</span>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Multiple Proposals / Unresolved Merges Toggle Button */}
            <Button
              variant={showMultipleProposalsOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMultipleProposalsOnly(prev => !prev)}
              className={`h-8 text-xs font-semibold rounded-lg px-2.5 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                showMultipleProposalsOnly
                  ? '!bg-purple-900 hover:!bg-purple-950 !text-white !border-purple-900'
                  : '!bg-white hover:!bg-purple-50 !text-zinc-700 hover:!text-zinc-900 border-zinc-300'
              }`}
              title="Show only proposals that contain multiple proposal statements from merged sources"
            >
              <GitMerge className={`w-3.5 h-3.5 ${showMultipleProposalsOnly ? '!text-white' : 'text-purple-800'}`} />
              <span>Multiple Proposals</span>
              {multipleProposalsCount > 0 && (
                <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                  showMultipleProposalsOnly ? 'bg-purple-950 text-white' : 'bg-purple-100 text-purple-900'
                }`}>
                  {multipleProposalsCount}
                </span>
              )}
            </Button>

            {/* Reset Filters Button */}
            {(selectedFileFilter !== 'ALL' || selectedDateFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedClusterFilter !== 'ALL' || showMultipleProposalsOnly || searchTerm.trim() !== '') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-2 rounded-md flex items-center gap-1 cursor-pointer"
                onClick={() => {
                  setSelectedFileFilter('ALL');
                  setSelectedDateFilter('ALL');
                  setSelectedCategoryFilter('ALL');
                  setSelectedClusterFilter('ALL');
                  setShowMultipleProposalsOnly(false);
                  setSearchTerm('');
                }}
              >
                <X className="w-3.5 h-3.5" />
                Reset filters
              </Button>
            )}
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
                    <TableHead className="col-header border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Cluster</TableHead>
                    <TableHead className="col-header border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Source Document (Quelldokument)</TableHead>
                    <TableHead className="col-header text-center border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Page</TableHead>
                    <TableHead className="col-header text-right border-r border-dashed border-zinc-200 dark:border-zinc-800 px-3">Processed Date</TableHead>
                    <TableHead className="col-header text-center w-24 px-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {filteredProposals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isProposalSelectMode ? 9 : 8} className="text-center py-12 text-muted-foreground italic">
                          No proposals found. Click "Discover New Documents" or "Upload New Document" to start.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProposals.map((proposal) => {
                        const isSelected = selectedProposalIds.includes(proposal.id);
                        return (
                          <motion.tr 
                            key={proposal.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
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
                              <div className="text-xs leading-relaxed font-medium">
                                {renderNumberedText(proposal.text, false)}
                              </div>
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
                            <TableCell className="align-middle px-3 whitespace-normal border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              <span className={`inline-block whitespace-nowrap font-medium text-[10px] px-2.5 py-0.5 rounded-md border shadow-2xs ${getClusterBadge(proposal.cluster)}`}>
                                {proposal.cluster || "Sonstiges"}
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
                            <TableCell className="text-right align-middle px-3 text-xs font-mono text-muted-foreground whitespace-normal border-r border-dashed border-zinc-200 dark:border-zinc-800">
                              {renderNumberedText(proposal.processedAt, false)}
                            </TableCell>
                            <TableCell className="text-center align-middle px-2 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  onClick={() => handleOpenEditModal(proposal)}
                                  title="Edit proposal or pick merged version"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  onClick={() => {
                                    if (getMergedVersions(proposal)) {
                                      setDeleteVersionProposal(proposal);
                                    } else {
                                      handleDeleteProposalsBatch([proposal.id]);
                                    }
                                  }}
                                  title={getMergedVersions(proposal) ? "Delete a specific merged proposal or entire row" : "Delete proposal"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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

      {/* Edit Proposal & Merged-Version Picker Modal */}
      {editingProposal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-zinc-900 border border-zinc-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Edit Reformation Proposal
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Row ID: <span className="font-mono font-semibold text-zinc-700">#{editingProposal.id}</span>
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                onClick={() => setEditingProposal(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Merged Proposal Quick Picker (if proposal contains merged versions) */}
              {(() => {
                const merged = getMergedVersions(editingProposal);
                if (!merged) return null;
                return (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <GitMerge className="w-3.5 h-3.5 text-indigo-600" />
                          Merged Proposal Detected (Multiple Sources)
                        </span>
                        {isLoadingSimilarity ? (
                          <span className="text-[11px] font-mono text-zinc-500 animate-pulse bg-white/70 px-2 py-0.5 rounded-full border border-zinc-200">
                            Calculating match...
                          </span>
                        ) : mergedSimilarity !== null ? (
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
                            mergedSimilarity >= 95 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : mergedSimilarity >= 85
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}>
                            {mergedSimilarity}% Match
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[11px] text-zinc-600">Quickly adopt one version:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs font-semibold bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-800 shadow-2xs"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            text: merged.version1.text
                          }));
                          toast.info("Adopted Version 1 statement (kept all sources, quotes & pages).");
                        }}
                      >
                        Adopt Statement 1 ({merged.version1.source.split('(')[0].replace(/\.pdf/i, '').trim().substring(0, 20)}...)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs font-semibold bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-800 shadow-2xs"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            text: merged.version2.text
                          }));
                          toast.info("Adopted Version 2 statement (kept all sources, quotes & pages).");
                        }}
                      >
                        Adopt Statement 2 ({merged.version2.source.split('(')[0].replace(/\.pdf/i, '').trim().substring(0, 20)}...)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-zinc-600 hover:text-zinc-900 hover:bg-white/80"
                        onClick={() => {
                          setEditFormData(prev => ({
                            ...prev,
                            text: editingProposal.text
                          }));
                          toast.info("Restored both merged proposal statements.");
                        }}
                      >
                        Keep Both Statements
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Proposal Text */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Proposal Statement (Vorschlag)
                </label>
                <Textarea
                  rows={4}
                  value={editFormData.text}
                  onChange={e => setEditFormData(prev => ({ ...prev, text: e.target.value }))}
                  className="text-xs leading-relaxed"
                  placeholder="Enter proposal statement..."
                />
              </div>

              {/* Exact Verbatim */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Exact Verbatim Quote (Exaktes Verbatim)
                </label>
                <Textarea
                  rows={3}
                  value={editFormData.verbatim}
                  onChange={e => setEditFormData(prev => ({ ...prev, verbatim: e.target.value }))}
                  className="text-xs leading-relaxed italic"
                  placeholder="Enter verbatim quote..."
                />
              </div>

              {/* Category, Cluster, Source, Page in responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Category (Kategorie)
                  </label>
                  <select
                    className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                    value={editFormData.category}
                    onChange={e => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    {[
                      "IT-Infrastruktur",
                      "Organisation",
                      "Strategie",
                      "Personal",
                      "Gesetzgebung",
                      "Föderalismus",
                      "Leistungen & Prozesse",
                      "Governance",
                      "Sonstiges"
                    ].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Cluster (Sub-Thema)
                  </label>
                  <Input
                    className="text-xs h-9"
                    value={editFormData.cluster}
                    onChange={e => setEditFormData(prev => ({ ...prev, cluster: e.target.value }))}
                    placeholder="e.g. Open Source, Standards..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Source Document (Quelldokument)
                  </label>
                  <Input
                    className="text-xs h-9"
                    value={editFormData.source}
                    onChange={e => setEditFormData(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="Document name..."
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Page (Seitennummer)
                  </label>
                  <Input
                    className="text-xs h-9 font-mono"
                    value={editFormData.page}
                    onChange={e => setEditFormData(prev => ({ ...prev, page: e.target.value }))}
                    placeholder="e.g. 4 or 1) 4 2) 7"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-zinc-100 flex items-center justify-end gap-2 bg-zinc-50/50 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setEditingProposal(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Specific Version Modal for Merged / Dual Proposals */}
      {deleteVersionProposal && (() => {
        const merged = getMergedVersions(deleteVersionProposal);
        if (!merged) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-zinc-900 border border-zinc-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-xs shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Delete Merged Proposal
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Row <span className="font-mono font-semibold text-zinc-700">#{deleteVersionProposal.id}</span> contains multiple proposals. Choose which one to delete.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                  onClick={() => setDeleteVersionProposal(null)}
                  disabled={isDeletingVersion}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Modal Body: Cards for each proposal version */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <p className="text-xs text-zinc-600">
                  Select which proposal version you wish to remove from this row, or delete the entire row from the database:
                </p>

                {/* Proposal Version 1 */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-bold flex items-center justify-center font-mono">1</span>
                      Proposal 1
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                      Page {merged.version1.page}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                    {merged.version1.text}
                  </p>
                  <div className="text-[10px] text-zinc-500 truncate" title={merged.version1.source}>
                    <span className="font-semibold text-zinc-700">Source:</span> {merged.version1.source}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300"
                      onClick={() => handleDeleteSpecificVersion(1)}
                      disabled={isDeletingVersion}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                      Delete Proposal 1 (Keep Proposal 2)
                    </Button>
                  </div>
                </div>

                {/* Proposal Version 2 */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:border-zinc-300 transition-all space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-800 text-[11px] font-bold flex items-center justify-center font-mono">2</span>
                      Proposal 2
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                      Page {merged.version2.page}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-800 leading-relaxed font-medium">
                    {merged.version2.text}
                  </p>
                  <div className="text-[10px] text-zinc-500 truncate" title={merged.version2.source}>
                    <span className="font-semibold text-zinc-700">Source:</span> {merged.version2.source}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-300"
                      onClick={() => handleDeleteSpecificVersion(2)}
                      disabled={isDeletingVersion}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                      Delete Proposal 2 (Keep Proposal 1)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-8 text-xs font-semibold"
                  onClick={() => {
                    const id = deleteVersionProposal.id;
                    setDeleteVersionProposal(null);
                    handleDeleteProposalsBatch([id]);
                  }}
                  disabled={isDeletingVersion}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete Entire Row
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setDeleteVersionProposal(null)}
                  disabled={isDeletingVersion}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
