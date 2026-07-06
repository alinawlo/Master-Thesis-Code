import { GoogleGenAI, Type } from "@google/genai";
import { ReformProposal, ExtractionResult, ReformStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const EXTRACTION_SYSTEM_INSTRUCTION = `
Your task is to exhaustively extract ALL explicit "Handlungsempfehlungen" (action recommendations, proposals, concrete measures) from the text.
How to identify a recommendation:
- Do not just extract section headings or broad titles.
- Look for specific, actionable sentences within the paragraphs that demand or suggest a concrete action.
- Look for sentences containing imperative phrasing or modal verbs indicating necessity or recommendation (e.g., "muss", "müssen", "sollte", "sollen", "ist erforderlich", "wird gefordert", "bedarf es").
- A passage qualifies only if it directly recommends, proposes, urges, advises, or calls for a concrete action or measure.

Rules for extraction:
- Be EXHAUSTIVE: Extract every single actionable recommendation sentence you can find.
- Use only exact text copied from the documents (verbatim). No paraphrasing.
- Provide the exact page number if available.
`;

export async function extractProposals(text: string, sourceName: string): Promise<ExtractionResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: text,
    config: {
      systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          proposals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                quotation: { type: Type.STRING },
                goal: { type: Type.STRING, description: "Short summary of the goal of this recommendation" },
                responsibleEntity: { type: Type.STRING, description: "Who is responsible for this action?" },
                pageNumber: { type: Type.STRING },
              },
              required: ["quotation", "goal", "responsibleEntity", "pageNumber"]
            }
          },
          summary: { type: Type.STRING }
        },
        required: ["proposals", "summary"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  
  const proposals: ReformProposal[] = (data.proposals || []).map((p: any, index: number) => ({
    id: `prop-${Date.now()}-${index}`,
    quotation: p.quotation,
    goal: p.goal,
    responsibleEntity: p.responsibleEntity,
    category: "Uncategorized",
    status: "Unknown",
    sourceDocument: sourceName,
    pageNumber: p.pageNumber,
    confidence: 0.9,
    extractedAt: new Date().toISOString()
  }));

  return {
    proposals,
    summary: data.summary || ""
  };
}

export async function classifyProposal(proposal: ReformProposal): Promise<string> {
  const taxonomy = [
    "Digital Infrastructure",
    "Digital Administration (E-Government)",
    "Data Policy & Privacy",
    "Digital Education & Skills",
    "Cybersecurity",
    "Innovation & Emerging Tech (AI, etc.)",
    "Legal Framework & Regulation"
  ];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Classify this reform proposal into one of the following categories: ${taxonomy.join(", ")}.
    Proposal Goal: ${proposal.goal}
    Quotation: ${proposal.quotation}`,
    config: {
      systemInstruction: "You are a policy analyst specializing in digital government. Return only the category name.",
    }
  });

  return response.text?.trim() || "Uncategorized";
}

export async function assessStatus(proposal: ReformProposal): Promise<{ status: ReformStatus, evidence: string }> {
  const response = await (ai.models as any).generateContent({
    model: "gemini-3-flash-preview",
    contents: `Search for the current implementation status of this digital government reform in Germany:
    Reform: ${proposal.goal}
    Responsible: ${proposal.responsibleEntity}
    Source context: ${proposal.quotation}`,
    tools: [{ googleSearch: {} }],
    config: {
      systemInstruction: "Assess if the reform is 'Planned', 'In Progress', or 'Completed'. Provide a short sentence of evidence.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ["Planned", "In Progress", "Completed", "Unknown"] },
          evidence: { type: Type.STRING }
        },
        required: ["status", "evidence"]
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  return {
    status: (data.status as ReformStatus) || "Unknown",
    evidence: data.evidence || "No evidence found."
  };
}
