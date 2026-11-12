import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[BloodMatch ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#F5F1EF] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#D9C7C2] p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#7A0C17]/10 text-[#D72638] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#1A1D20]">Clinical Interface Notice</h2>
              <p className="text-xs text-[#5A626A] mt-1">
                The clinical view encountered a momentary rendering pause. Your data is securely preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 rounded-xl bg-[#D72638] hover:bg-[#b51d2c] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restore Clinical Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

