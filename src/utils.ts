import { ReactNode } from "react";

export type Node = ReactNode & { type?: { name: string, render: { name: string }, type: { render: { name: string, displayName: string }}}}

export function get_tag_name(node: Node) {
  return node && node.type && ((
          node.type.name 
        ) || (
          node.type.render && 
          node.type.render.name
        ) || (
          node.type.type &&
          node.type.type.render && (
            node.type.type.render.displayName ||
            node.type.type.render.name
          )
        ))
}
