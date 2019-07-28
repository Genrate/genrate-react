import React from 'react';

export function view(layout, components = []) {
  return React.createElement(layout, null, ...components);
}