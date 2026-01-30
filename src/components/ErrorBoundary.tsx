import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // Mantém log para diagnóstico em produção/mobile.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {this.props.title ?? "Algo deu errado"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            O app encontrou um erro inesperado. Tente recarregar. Se acontecer novamente, me diga qual tela estava aberta.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => window.location.reload()}>Recarregar</Button>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
