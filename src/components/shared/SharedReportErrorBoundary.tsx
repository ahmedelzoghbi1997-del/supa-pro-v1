import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class SharedReportErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("SHARED_REPORT_CRASH:", error, errorInfo);
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-6 text-center font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md border border-red-100">
            <h1 className="text-2xl font-bold text-neutral-800 mb-2">حدث خطأ</h1>
            <p className="text-neutral-500 mb-4">
              عذراً، لم نتمكن من تحميل التقرير.
            </p>
            <pre className="text-xs text-red-500 bg-red-50 p-4 rounded overflow-auto text-left">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SharedReportErrorBoundary;
