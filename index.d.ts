
import * as React from 'react';

export function template(content: (def?: React.ReactNode) => React.ReactNode): React.Component;
export function view(template: React.Component, contents?: React.ReactNode[])