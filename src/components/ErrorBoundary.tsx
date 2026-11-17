import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'Une erreur inattendue est survenue.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="max-w-md w-full border border-zinc-200 rounded-2xl p-8 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-[#D92323] mb-2">
              Interruption technique
            </p>
            <h1 className="font-display text-2xl font-bold text-[#141414] mb-3">
              Impossible d’afficher cette vue
            </h1>
            <p className="text-sm text-zinc-600 mb-6 leading-relaxed">
              {this.state.errorMessage.startsWith('{')
                ? 'Une vérification de sécurité ou de connexion Firebase a interrompu l’opération.'
                : this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
