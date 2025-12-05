"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./button"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: { componentStack: string }) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Something went wrong
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={this.handleRetry} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="border-border hover:bg-secondary"
            >
              Refresh Page
            </Button>
          </div>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 max-w-2xl">
              <summary className="text-sm text-muted-foreground cursor-pointer">
                Error Details (Development)
              </summary>
              <pre className="mt-2 p-4 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive overflow-auto">
                {this.state.error.message}
                {this.state.error.stack && (
                  <>
                    {"\n\nStack Trace:\n"}
                    {this.state.error.stack}
                  </>
                )}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}











