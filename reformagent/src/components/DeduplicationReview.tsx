import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  GitMerge, 
  CopyPlus, 
  CheckCircle2, 
  X, 
  Database,
  Layers,
  Check,
  Sparkles,
  AlertCircle,
  FileText
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader 
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { DuplicateMatch, Proposal } from '../types/deduplication';

export interface DeduplicationDecision {
  match: DuplicateMatch;
  action: 'merge' | 'keep' | 'discard';
}

interface DeduplicationReviewProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: DuplicateMatch[];
  uniqueProposals: Proposal[];
  onConfirm: (decisions: DeduplicationDecision[]) => void;
}

export default function DeduplicationReview({
  isOpen,
  onClose,
  duplicates,
  uniqueProposals,
  onConfirm
}: DeduplicationReviewProps) {
  // Untriggered ('none') by default as requested
  const [decisions, setDecisions] = useState<Record<number, 'merge' | 'keep' | 'none'>>({});

  // Reset and synchronize decisions whenever modal opens or duplicates change
  useEffect(() => {
    if (isOpen) {
      const initial: Record<number, 'merge' | 'keep' | 'none'> = {};
      duplicates.forEach((_, idx) => {
        initial[idx] = 'none';
      });
      setDecisions(initial);
    }
  }, [isOpen, duplicates]);

  // Lock background page scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAction = (idx: number, action: 'merge' | 'keep') => {
    setDecisions(prev => ({
      ...prev,
      [idx]: prev[idx] === action ? 'none' : action
    }));
  };

  const handleSetAll = (action: 'merge' | 'keep') => {
    const updated: Record<number, 'merge' | 'keep' | 'none'> = {};
    duplicates.forEach((_, idx) => {
      updated[idx] = action;
    });
    setDecisions(updated);
  };

  const handleProceed = () => {
    // Items set to 'merge' will be merged; items set to 'keep' are saved as new rows;
    // items left as 'none' are discarded by default
    const formatted: DeduplicationDecision[] = duplicates.map((match, idx) => ({
      match,
      action: decisions[idx] === 'merge' ? 'merge' : decisions[idx] === 'keep' ? 'keep' : 'discard'
    }));
    onConfirm(formatted);
  };

  const totalProposals = duplicates.length + uniqueProposals.length;
  const mergeCount = Object.values(decisions).filter(a => a === 'merge').length;
  const keepCount = Object.values(decisions).filter(a => a === 'keep').length;
  const unselectedCount = duplicates.length - mergeCount - keepCount;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div 
        className="bg-white text-zinc-900 border border-zinc-200 rounded-2xl shadow-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/40 via-white to-purple-50/30 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                  Semantic Deduplication Review
                </h2>
                <span className="text-[11px] font-semibold font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  AI Deduplication
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                RAG similarity analysis detected <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200/60">{duplicates.length}</span> potential duplicate(s) out of {totalProposals} extracted proposals.
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Action & Filter Bar */}
        <div className="px-6 py-3 bg-zinc-50 border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-700">Selection Status:</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              {uniqueProposals.length} Unique
            </span>
            <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md transition-colors ${
              mergeCount > 0 
                ? 'bg-violet-100 text-violet-800 border border-violet-300 shadow-xs' 
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}>
              <GitMerge className="w-3 h-3 text-violet-600" />
              {mergeCount} To Merge
            </span>
            <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md transition-colors ${
              keepCount > 0 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs' 
                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
            }`}>
              <CopyPlus className="w-3 h-3 text-emerald-600" />
              {keepCount} To Keep
            </span>
            {unselectedCount > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-xs font-medium px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-dashed border-amber-300">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                {unselectedCount} To Discard
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-semibold border-violet-200 bg-violet-50/50 hover:bg-violet-100 hover:text-violet-800 text-violet-700 transition-colors shadow-xs"
              onClick={() => handleSetAll('merge')}
            >
              <GitMerge className="w-3.5 h-3.5 mr-1.5 text-violet-600" />
              Merge All
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs font-semibold border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-800 text-emerald-700 transition-colors shadow-xs"
              onClick={() => handleSetAll('keep')}
            >
              <CopyPlus className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Keep All
            </Button>
          </div>
        </div>

        {/* Scrollable Container with Duplicate Cards */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 overscroll-contain bg-zinc-50/60 custom-scrollbar">
          {duplicates.map((item, idx) => {
            const currentAction = decisions[idx] || 'none';
            const similarityPercent = Math.round(item.similarity * 100);

            // Determine card highlight border & background based on active selection
            let cardClasses = 'border-zinc-200/90 bg-white hover:border-zinc-300';
            if (currentAction === 'merge') {
              cardClasses = 'border-violet-300 ring-2 ring-violet-200/60 bg-gradient-to-b from-violet-50/30 to-white shadow-sm';
            } else if (currentAction === 'keep') {
              cardClasses = 'border-emerald-300 ring-2 ring-emerald-200/60 bg-gradient-to-b from-emerald-50/30 to-white shadow-sm';
            }

            return (
              <Card 
                key={idx} 
                className={`border rounded-xl shadow-xs transition-all overflow-hidden ${cardClasses}`}
              >
                <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b border-zinc-100 bg-zinc-50/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border ${
                      similarityPercent >= 95 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : similarityPercent >= 85
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {similarityPercent}% Match
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                      {item.incoming?.kategorie || 'Sonstiges'}
                    </span>
                  </div>

                  {/* Decision Buttons (Untriggered by default) */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 transition-all cursor-pointer ${
                        currentAction === 'merge'
                          ? 'bg-violet-600 hover:bg-violet-700 text-white border-violet-600 shadow-sm'
                          : 'bg-white hover:bg-violet-50 text-violet-700 border-violet-200 hover:border-violet-300'
                      }`}
                      onClick={() => toggleAction(idx, 'merge')}
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      Merge Sources
                      {currentAction === 'merge' && <Check className="w-3.5 h-3.5 ml-0.5 stroke-[2.5]" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 px-3 text-xs font-semibold rounded-lg gap-1.5 transition-all cursor-pointer ${
                        currentAction === 'keep'
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm'
                          : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300'
                      }`}
                      onClick={() => toggleAction(idx, 'keep')}
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                      Keep Separate
                      {currentAction === 'keep' && <Check className="w-3.5 h-3.5 ml-0.5 stroke-[2.5]" />}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Candidate Incoming Proposal */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-50/60 to-blue-50/30 border border-sky-200/80 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                          New Candidate Proposal
                        </span>
                        <span className="text-[10px] text-sky-800 bg-sky-100/90 px-1.5 py-0.5 rounded font-mono font-semibold">
                          Page {item.incoming?.seitennummer || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-zinc-900">
                        {item.incoming?.vorschlag || ''}
                      </p>
                      <div className="pt-2 border-t border-sky-200/60 text-[10px] text-zinc-600 truncate" title={item.incoming?.quelldokument}>
                        <span className="font-semibold text-sky-900">Source:</span> {item.incoming?.quelldokument || 'Unknown'}
                      </div>
                    </div>

                    {/* Existing Matching Proposal */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-zinc-50 border border-slate-200/90 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-slate-600" />
                          Existing Database Entry
                        </span>
                        <span className="text-[10px] text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono font-semibold">
                          Page {item.existing?.seitennummer || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-zinc-600">
                        {item.existing?.vorschlag || ''}
                      </p>
                      <div className="pt-2 border-t border-slate-200/60 text-[10px] text-zinc-600 truncate" title={item.existing?.quelldokument}>
                        <span className="font-semibold text-slate-900">Source:</span> {item.existing?.quelldokument || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  {/* Decision Guidance Banner */}
                  {currentAction === 'merge' && (
                    <div className="text-xs text-violet-900 bg-violet-50/90 border border-violet-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 animate-in fade-in duration-150">
                      <GitMerge className="w-4 h-4 shrink-0 text-violet-600" />
                      <span>
                        <strong>Merge selected:</strong> The canonical recommendation will be kept, and the new source quote will be merged into the existing row with a numbered marker (e.g. <em>2)</em>).
                      </span>
                    </div>
                  )}

                  {currentAction === 'keep' && (
                    <div className="text-xs text-emerald-900 bg-emerald-50/90 border border-emerald-200 rounded-lg px-3.5 py-2.5 flex items-center gap-2.5 animate-in fade-in duration-150">
                      <CopyPlus className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>
                        <strong>Keep separate selected:</strong> This proposal will be saved as an independent, distinct row in <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[11px]">reforms_master.csv</code>.
                      </span>
                    </div>
                  )}

                  {currentAction === 'none' && (
                    <div className="text-xs text-amber-800 bg-amber-50/70 border border-dashed border-amber-300/80 rounded-lg px-3.5 py-2 flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>
                        <strong>Untriggered:</strong> This proposal is not selected for merge or keeping separate, so it will be <em>discarded</em> upon saving.
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between bg-white shrink-0">
          <p className="text-xs text-zinc-600 flex items-center gap-1.5">
            <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {uniqueProposals.length} unique
            </span> proposal(s) will be added.
            {unselectedCount > 0 && (
              <>
                <span className="font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded ml-1">
                  {unselectedCount} untriggered
                </span> duplicate(s) will be discarded.
              </>
            )}
          </p>
          <div className="flex items-center gap-2.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose} 
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleProceed} 
              className="gap-1.5 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save & Continue
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
