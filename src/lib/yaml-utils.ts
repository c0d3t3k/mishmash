import yaml from 'js-yaml';


export interface YamlExportData {
  traces?: any[];
  spans?: any[];
  agents?: any[];
  tools?: any[];
  events?: any[];
  exportedAt: string;
  version: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    traces: number;
    spans: number;
    agents: number;
    tools: number;
    events: number;
  };
  errors?: string[];
}

// Export all telemetry data to YAML
export async function exportToYaml(
  traces: any[],
  spans: any[],
  agents: any[],
  tools: any[],
  events: any[]
): Promise<string> {
  const exportData: YamlExportData = {
    traces: traces || [],
    spans: spans || [],
    agents: agents || [],
    tools: tools || [],
    events: events || [],
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  return yaml.dump(exportData, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });
}

// Parse YAML data and validate structure
export function parseYamlImport(yamlContent: string): YamlExportData {
  try {
    const data = yaml.load(yamlContent) as YamlExportData;
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid YAML format: Expected object');
    }

    // Validate required structure
    const validatedData: YamlExportData = {
      traces: Array.isArray(data.traces) ? data.traces : [],
      spans: Array.isArray(data.spans) ? data.spans : [],
      agents: Array.isArray(data.agents) ? data.agents : [],
      tools: Array.isArray(data.tools) ? data.tools : [],
      events: Array.isArray(data.events) ? data.events : [],
      exportedAt: data.exportedAt || new Date().toISOString(),
      version: data.version || '1.0.0'
    };

    return validatedData;
  } catch (error) {
    throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Download YAML file
export function downloadYamlFile(yamlContent: string, filename?: string) {
  const blob = new Blob([yamlContent], { type: 'application/x-yaml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename || `telemetry-export-${new Date().toISOString().split('T')[0]}.yaml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Read file as text
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsText(file);
  });
}

// Validate individual record types
export function validateTraceRecord(trace: any): boolean {
  return (
    typeof trace === 'object' &&
    typeof trace.traceId === 'string' &&
    typeof trace.startTime === 'string'
  );
}

export function validateSpanRecord(span: any): boolean {
  return (
    typeof span === 'object' &&
    typeof span.traceId === 'string' &&
    typeof span.spanId === 'string' &&
    typeof span.name === 'string' &&
    typeof span.startTime === 'string'
  );
}

export function validateAgentRecord(agent: any): boolean {
  return (
    typeof agent === 'object' &&
    typeof agent.agentId === 'string' &&
    typeof agent.startTime === 'string'
  );
}

export function validateToolRecord(tool: any): boolean {
  return (
    typeof tool === 'object' &&
    typeof tool.agentId === 'string' &&
    typeof tool.toolId === 'string' &&
    typeof tool.toolName === 'string'
  );
}

export function validateEventRecord(event: any): boolean {
  return (
    typeof event === 'object' &&
    typeof event.traceId === 'string' &&
    typeof event.spanId === 'string' &&
    typeof event.eventName === 'string' &&
    typeof event.timestamp === 'string' &&
    typeof event.objectType === 'string' &&
    typeof event.phase === 'string'
  );
} 