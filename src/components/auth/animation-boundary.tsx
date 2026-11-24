import { Component, type PropsWithChildren } from "react";

// Decorative effects must not take down sign-in or the authenticated workspace
// when a chunk cannot be fetched or WebGL initialization fails.
export class AnimationBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
