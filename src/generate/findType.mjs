export function findType(node, allTypes) {
  switch (node.type) {
    case "Projection":
    case "Element": {
      return findType(node.base, allTypes);
    }
    case "Or":
    case "And": {
      return findType(node.left, allTypes) || findType(node.right, allTypes);
    }
    case "Filter": {
      return findType(node.query, allTypes);
    }
    case "OpCall": {
      switch (node.op) {
        case "==": {
          if (
            node.left.name === "_type" &&
            allTypes.includes(node.right.value)
          ) {
            return node.right.value;
          }
          break;
        }
        default:
          return;
      }
      break;
    }
    default:
      return;
  }
}
