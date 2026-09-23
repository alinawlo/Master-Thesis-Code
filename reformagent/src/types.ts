export type ReformStatus = 'Planned' | 'In Progress' | 'Completed' | 'Unknown';

export interface ReformProposal {
  id: string;
  quotation: string;
  goal: string;
  responsibleEntity: string;
  category: string;
  status: ReformStatus;
  progressScore?: number;
  statusEvidence?: string;
  sourceDocument: string;
  pageNumber: string;
  confidence: number;
  extractedAt: string;
}

export interface ExtractionResult {
  proposals: ReformProposal[];
  summary: string;
}

export type PipelineStep = 'upload' | 'extract' | 'results' | 'error';

export interface ProcessedDocument {
  id: string;
  name: string;
  processedAt: string;
  proposalCount: number;
  csvBlob?: Blob;
}
