import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type S = { err: Error | null };

export class ErrorBoundary extends Component<Props, S> {
  state: S = { err: null };

  static getDerivedStateFromError(err: Error): S {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("Areum render error:", err, info.componentStack);
  }

  render() {
    if (this.state.err) {
      return (
        <div
          style={{
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            color: "#fecaca",
            background: "#0c0e12",
            minHeight: "100vh",
          }}
        >
          <h1 style={{ color: "#fff", fontSize: "1.25rem" }}>Something went wrong</h1>
          <pre style={{ marginTop: "1rem", whiteSpace: "pre-wrap", fontSize: "0.85rem", opacity: 0.9 }}>
            {this.state.err.message}
          </pre>
          <button
            type="button"
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1rem",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#1a1f29",
              color: "#e8eaef",
              cursor: "pointer",
            }}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
