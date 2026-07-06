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
  const [activeTab, setActiveTab] = useState<'explorer' | 'pipeline'>('explorer');
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);

  const handlePipelineComplete = (newDoc: ProcessedDocument) => {
    setDocuments((prev) => [...prev, newDoc]);
    setActiveTab('explorer');
    toast.success(`Successfully processed ${newDoc.name}.`);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full">
          <div className="p-8 max-w-7xl mx-auto">
            {activeTab === 'explorer' ? (
              <ReformExplorer 
                documents={documents} 
                onAddProposal={() => setActiveTab('pipeline')} 
              />
            ) : (
              <Pipeline 
                onComplete={handlePipelineComplete} 
                onCancel={() => setActiveTab('explorer')} 
              />
            )}
          </div>
        </ScrollArea>
      </main>

      <Toaster position="bottom-right" />
    </div>
  );
}
