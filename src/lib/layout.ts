import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from '@xyflow/react';

const elk = new ELK();

// ELK layout options for different node arrangements
const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
  'elk.direction': 'RIGHT',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
};

// Default node dimensions
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 150;

// Get node dimensions based on node type
function getNodeDimensions(nodeType: string): { width: number; height: number } {
  switch (nodeType) {
    case 'supervisor':
      return { width: 220, height: 160 };
    case 'memory':
      return { width: 200, height: 140 };
    case 'tool':
      return { width: 180, height: 120 };
    case 'inputOutput':
      return { width: 250, height: 200 };
    case 'task':
    default:
      return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  }
}

// Convert React Flow nodes and edges to ELK graph format
function toElkGraph(nodes: Node[], edges: Edge[]) {
  const elkNodes = nodes.map((node) => {
    const dimensions = getNodeDimensions(node.type || 'task');
    return {
      id: node.id,
      width: dimensions.width,
      height: dimensions.height,
      // Include any additional properties that might be useful for layout
      properties: {
        nodeType: node.type,
      },
    };
  });

  const elkEdges = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  return {
    id: 'root',
    layoutOptions: elkOptions,
    children: elkNodes,
    edges: elkEdges,
  };
}

// Convert ELK graph back to React Flow format
function fromElkGraph(elkGraph: any, originalNodes: Node[]): Node[] {
  const nodeMap = new Map(originalNodes.map(node => [node.id, node]));
  
  return elkGraph.children.map((elkNode: any) => {
    const originalNode = nodeMap.get(elkNode.id);
    if (!originalNode) {
      throw new Error(`Node ${elkNode.id} not found in original nodes`);
    }

    return {
      ...originalNode,
      position: {
        x: elkNode.x || 0,
        y: elkNode.y || 0,
      },
    };
  });
}

// Main layout function
export async function layoutNodes(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  if (nodes.length === 0) {
    return nodes;
  }

  try {
    const elkGraph = toElkGraph(nodes, edges);
    const layoutedGraph = await elk.layout(elkGraph);
    return fromElkGraph(layoutedGraph, nodes);
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Return original nodes if layout fails
    return nodes;
  }
}

// Layout nodes with custom algorithm options
export async function layoutNodesWithOptions(
  nodes: Node[], 
  edges: Edge[], 
  customOptions: Record<string, string> = {}
): Promise<Node[]> {
  if (nodes.length === 0) {
    return nodes;
  }

  try {
    const elkGraph = toElkGraph(nodes, edges);
    // Merge custom options with defaults
    elkGraph.layoutOptions = { ...elkOptions, ...customOptions };
    
    const layoutedGraph = await elk.layout(elkGraph);
    return fromElkGraph(layoutedGraph, nodes);
  } catch (error) {
    console.error('ELK layout failed:', error);
    return nodes;
  }
}

// Hierarchical layout for agent flows (good for supervisor -> agents -> tools structure)
export async function layoutAgentFlow(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const hierarchicalOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.layered.spacing.nodeNodeBetweenLayers': '120',
    'elk.spacing.nodeNode': '60',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.cycleBreaking.strategy': 'GREEDY',
    'elk.spacing.portPort': '10',
    'elk.layered.spacing.edgeNodeBetweenLayers': '40',
  };

  return layoutNodesWithOptions(nodes, edges, hierarchicalOptions);
}

// Radial layout (good for showing relationships around a central node)
export async function layoutRadial(nodes: Node[], edges: Edge[]): Promise<Node[]> {
  const radialOptions = {
    'elk.algorithm': 'radial',
    'elk.radial.radius': '200',
    'elk.spacing.nodeNode': '80',
  };

  return layoutNodesWithOptions(nodes, edges, radialOptions);
} 