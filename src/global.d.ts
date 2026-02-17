import React from 'react';

declare global {
  namespace JSX {
    // Manually map IntrinsicElements to React's JSX definition
    interface IntrinsicElements extends React.JSX.IntrinsicElements { }

    // Ensure Element is compatible with React Element
    interface Element extends React.JSX.Element { }
  }
}
