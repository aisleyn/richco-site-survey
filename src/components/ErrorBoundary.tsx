import { Component } from 'react'
import type { ReactNode } from 'react'
import { Card, Button } from './ui'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('Error caught by boundary:', error)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-base p-4">
          <Card className="max-w-md w-full">
            <div className="text-center">
              <div className="text-5xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>
              <p className="text-slate-600 mb-6">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={this.handleReset}
                >
                  Try again
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => window.location.href = '/'}
                >
                  Go to home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
