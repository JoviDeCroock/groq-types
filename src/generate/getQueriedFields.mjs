export function getQueriedFields(node, attributes, type) {
  switch (node.type) {
    case "Projection": {
      getQueriedFields(node.query, attributes, type);
      break;
    }
    case "Object": {
      node.attributes.forEach(function (node) {
        getQueriedFields(node, attributes, type);
      });
      break;
    }
    case "ObjectAttribute": {
      // TODO: this should check for identifiers
      attributes[type] = [
        ...attributes[type],
        {
          alias: node.key.value || node.value.name,
          attribute: node.value.name
        }
      ];
      break;
    }
    default:
      break;
  }
}
