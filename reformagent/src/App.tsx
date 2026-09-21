import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileSearch, 
  Settings, 
  Activity,
  Globe,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Separator } from '@/src/components/ui/separator';
import { Toaster } from '@/src/components/ui/sonner';
import { toast } from 'sonner';
import ReformExplorer from './components/ReformExplorer';
import Pipeline from './components/Pipeline';
import { ProcessedDocument } from './types';

export default function App() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [localFileName, setLocalFileName] = useState<string | null>(null);
  const [isPipelineOpen, setIsPipelineOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePipelineComplete = (newDoc: ProcessedDocument) => {
    setDocuments((prev) => [...prev, newDoc]);
    setLocalFileName(null);
    setIsPipelineOpen(false);
    triggerRefresh();
    toast.success(`Successfully processed ${newDoc.name}.`);
  };

  const handleCancel = () => {
    setLocalFileName(null);
    setIsPipelineOpen(false);
    triggerRefresh();
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="p-8 max-w-7xl mx-auto">
            <ReformExplorer 
              documents={documents} 
              refreshTrigger={refreshTrigger}
              onAddProposal={() => {
                setLocalFileName(null);
                setIsPipelineOpen(true);
              }} 
              onStartLocalExtraction={(fileName) => {
                setLocalFileName(fileName);
                setIsPipelineOpen(true);
              }}
            />
          </div>
        </ScrollArea>
      </main>

      {/* Extraction Popup Modal */}
      {isPipelineOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900 animate-in zoom-in-95 duration-200">
            <div className="flex-1 overflow-y-auto p-6">
              <Pipeline 
                localFileName={localFileName}
                onComplete={handlePipelineComplete} 
                onCancel={handleCancel} 
                onDocumentProcessed={triggerRefresh}
              />
            </div>
          </div>
        </div>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
