
import React, { ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { hardResetLocalDB } from './lib/db';
import './src/index.css';

if (typeof window !== 'undefined') {
  (window as any).process = (window as any).process || { env: { NODE_ENV: 'production' } };
}

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

// FIX: Explicitly using React.Component and providing type parameters to ensure correct inheritance.
class ErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("APP_CRASH:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-6 text-center font-sans" dir="rtl">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-lg border border-rose-100">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            </div>
            <h1 className="text-2xl font-black text-neutral-800 mb-2">خطأ في تهيئة الذاكرة</h1>
            <p className="text-neutral-500 text-sm mb-6 leading-relaxed">حدث تضارب في البيانات المحفوظة محلياً. يرجى الضغط على الزر أدناه لمسح الذاكرة المؤقتة والبدء من جديد.</p>
            
            <button 
                onClick={() => hardResetLocalDB()} 
                className="w-full py-4 px-4 bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all active:scale-95"
            >
                إعادة ضبط الذاكرة وتشغيل التطبيق
            </button>
          </div>
        </div>
      );
    }
    // FIX: Casting this to any to access props.children, bypassing the TS error where props property is not recognized.
    return (this as any).props.children;
  }
}

const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    args.length > 0 &&
    typeof args[0] === 'string' &&
    args[0].toLowerCase().includes('refresh token')
  ) {
    return; // suppress Refresh Token Not Found errors from supabase
  }
  // also check if the error object itself has the message
  if (
    args.length > 0 &&
    args[0] &&
    args[0].message &&
    args[0].message.toLowerCase().includes('refresh token')
  ) {
    return; 
  }
  originalConsoleError(...args);
};

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.toLowerCase().includes('refresh token')) {
      event.preventDefault(); // Prevent it from being logged as an error
    }
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
