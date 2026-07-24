import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in QuantumCore:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('quantum-hive-storage');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl max-w-md space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto animate-bounce" />
            <h2 className="text-xl font-bold text-white">QuantumCore - Recuperación de Aplicación</h2>
            <p className="text-xs text-gray-400">
              Se detectó un conflicto de datos en la memoria local (localStorage). Haz clic abajo para restablecer la sesión limpia.
            </p>
            <div className="bg-black/50 p-3 rounded text-[11px] font-mono text-red-300 text-left overflow-x-auto">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw size={16} /> Restablecer y Cargar QuantumCore
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
