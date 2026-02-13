import type * as React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "chatkit-ui": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        style?: React.CSSProperties;
        className?: string;
      };
    }
  }
}

export {};