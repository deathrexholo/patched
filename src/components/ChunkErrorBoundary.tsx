import React, { Component, ReactNode, ErrorInfo } from 'react';

interface ChunkErrorBoundaryProps {
  children: ReactNode;
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChunkErrorBoundary extends Component<ChunkErrorBoundaryProps, ChunkErrorBoundaryState> {
  constructor(props: ChunkErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState | null {
    // Check if it's a chunk loading error
    if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
      return { hasError: true, error };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Chunk loading error:', error, errorInfo);
    
    if (error.name === 'ChunkLoadError' || error.message?.includes('Loading chunk')) {
      // Auto-reload after 2 seconds to fetch fresh chunks
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h2>Loading Error</h2>
          <p>Refreshing page to load latest version...</p>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
