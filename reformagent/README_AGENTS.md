# Digital Reform Analyst - Agentic Pipeline

This project implements a multi-agent system for monitoring digital government reforms, as part of a master's thesis.

## Architecture Overview

1.  **Frontend (React/Vite)**: The "Web Tool" for monitoring. It displays the results stored in the database and provides a UI to trigger the pipeline.
2.  **Orchestrator (n8n)**: Manages the workflow between different nodes (Ingestion, Python Agent, Database).
3.  **Agent (Python)**: The "Digital Reform Analyst" implemented in Python using LangChain and the Google GenAI SDK.
4.  **Database (Supabase)**: Stores the extracted and assessed reform proposals.

## Python Agent (`agents/reform_analyst.py`)

The Python agent is designed to be run as part of an n8n workflow (e.g., via an "Execute Command" node or a custom API).

### Capabilities:
- **Extraction**: Uses Gemini 3 Flash to extract verbatim proposals.
- **De-duplication**: Cross-references with a `master_reforms.csv` to ensure unique entries.
- **Categorization**: Maps reforms to the Digital Government Taxonomy.
- **Status Assessment**: Uses **Tavily Search** to find real-world implementation evidence and assigns a progress score (0-100%).

### Setup:
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Set environment variables in `.env`:
   - `GEMINI_API_KEY`
   - `TAVILY_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## n8n Integration

To integrate with n8n:
1. Create a webhook or trigger node.
2. Use an **Execute Command** node to run the Python script:
   ```bash
   python3 agents/reform_analyst.py '{{ $json.document_data }}'
   ```
3. Parse the JSON output and send it to the **Supabase** node.

## Web Tool (React)

The React app is configured to:
- Display reforms with **Progress Scores** and **Status Badges**.
- Simulate the n8n pipeline execution for demonstration purposes.
- Provide a "Technical Dashboard" aesthetic suitable for a master's thesis presentation.
