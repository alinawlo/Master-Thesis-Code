import React, { useState, useEffect } from 'react';
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
  Activity
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

interface ReformExplorerProps {
  documents: ProcessedDocument[];
  onAddProposal?: () => void;
}

export default function ReformExplorer({ documents, onAddProposal }: ReformExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDocuments = documents.filter(doc => {
    return doc.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const downloadCsv = (doc: ProcessedDocument) => {
    if (!doc.csvBlob) return;
    const url = window.URL.createObjectURL(doc.csvBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reforms_${doc.name.replace('.pdf', '')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reform Explorer Extension</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onAddProposal}>
            <Plus className="w-4 h-4 mr-2" /> New Extraction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-muted/30 border-none shadow-none">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-mono font-bold tracking-widest">Processed Documents</CardDescription>
            <CardTitle className="text-3xl font-mono">{documents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/30 border-none shadow-none">
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        {/*
        <CardHeader className="pb-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search processed documents..." 
                className="pl-9 bg-background/50"
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        */}
        <CardContent className="pt-6">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="col-header">Document Name</TableHead>
                  <TableHead className="col-header">Processed At</TableHead>
                  <TableHead className="col-header text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-12 text-muted-foreground italic">
                        No documents processed yet. Click "New Extraction" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <motion.tr 
                        key={doc.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="data-grid-row group"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-primary/60" />
                            <span className="font-medium group-hover:text-primary transition-colors">
                              {doc.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono opacity-70">{doc.processedAt}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => downloadCsv(doc)}
                            className="hover:bg-primary/10 hover:text-primary"
                          >
                            <Download className="w-4 h-4 mr-2" /> Download CSV
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
