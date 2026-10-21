'use client';

import { Component, Fragment, type ReactNode } from 'react';
import styles from './ui.module.css';

/** Shows a message and a retry button when a lesson fails to load or render. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; attempt: number }> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className={styles.error} role="alert">
          <p>{this.state.error.message || 'Something went wrong.'}</p>
          <button type="button" className={styles.button} onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}>
            Try again
          </button>
        </div>
      );
    }
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
