import React, { createContext, useContext, ReactNode } from 'react';
import { Node, Edge } from '@xyflow/react';

interface CanvasContextType {
  nodes: Node[];
  edges: Edge[];
}

const CanvasContext = createContext<CanvasContextType | null>(null);

interface CanvasProviderProps {
  children: ReactNode;
  nodes: Node[];
  edges: Edge[];
}

export function CanvasProvider({ children, nodes, edges }: CanvasProviderProps) {
  return (
    <CanvasContext.Provider value={{ nodes, edges }}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvasContext() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvasContext must be used within a CanvasProvider');
  }
  return context;
}