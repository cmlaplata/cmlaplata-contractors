import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  source: string;
}

interface DebugLogContextType {
  logs: LogEntry[];
  addLog: (message: string, source?: string) => void;
  clearLogs: () => void;
}

const DebugLogContext = createContext<DebugLogContextType | undefined>(undefined);

export function DebugLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);

  const addLog = useCallback((message: string, source: string = 'APP') => {
    const id = logIdRef.current++;
    const timestamp = new Date().toLocaleTimeString('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
    
    // También loggear a consola
    console.log(`[${source}] ${message}`);
    
    setLogs(prev => {
      const newLogs = [...prev, { id, timestamp, message, source }];
      // Mantener solo los últimos 500 logs
      return newLogs.slice(-500);
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    logIdRef.current = 0;
  }, []);

  return (
    <DebugLogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </DebugLogContext.Provider>
  );
}

export function useDebugLog() {
  const context = useContext(DebugLogContext);
  if (!context) {
    // Si no hay provider, devolver funciones dummy
    return {
      logs: [],
      addLog: (message: string, source?: string) => console.log(`[${source || 'APP'}] ${message}`),
      clearLogs: () => {},
    };
  }
  return context;
}

