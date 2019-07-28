import React from 'react';

export function template(cb) {
  return (props) => {
    let contents = [];
    React.Children.map(props.children, (child, i) => contents.push(child));

    return cb((def) => {
      let content = contents.shift();
      return content === undefined ? def : content;
    });
  }
}