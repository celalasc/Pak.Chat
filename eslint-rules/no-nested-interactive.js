module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow nesting interactive elements',
    },
    schema: [],
  },
  create(context) {
    function containsButton(children) {
      return children.some((child) => {
        if (child.type === 'JSXElement') {
          if (child.openingElement.name.name === 'button') {
            return true;
          }
          return containsButton(child.children);
        }
        return false;
      });
    }

    return {
      JSXElement(node) {
        if (node.openingElement.name.name !== 'button') return;
        if (containsButton(node.children)) {
          context.report({ node, message: 'Nested button elements are not allowed.' });
        }
      },
    };
  },
};
