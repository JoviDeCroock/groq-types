import { TYPE_MAP } from './constants.mjs';

function extractSplattedFields(schema, type, nested) {
  const sanityDocument = schema.types.find(function (schemaType) {
    return schemaType.name === type;
  });

  let result = {
    [type]: nested
      ? [
          { attribute: '_key' },
          { attribute: '_updatedAt' },
          { attribute: '_createdAt' },
        ]
      : [
          { attribute: '_id' },
          { attribute: '_updatedAt' },
          { attribute: '_createdAt' },
          { attribute: '_rev' },
        ],
  };

  sanityDocument.fields.forEach(function (field) {
    if (TYPE_MAP[field.type]) {
      result[type].push({ attribute: field.name });
    } else if (field.type === 'array') {
      result[type].push({ attribute: field.name, isArray: true });
    } else {
      result[type].push({ attribute: field.name });
      result = {
        ...result,
        ...extractSplattedFields(schema, field.type, true),
      };
    }
  });

  return result;
}

export function getQueriedFields(node, attributes, type, schema) {
  switch (node.type) {
    case 'Projection': {
      getQueriedFields(node.query, attributes, type, schema);
      break;
    }
    case 'Object': {
      node.attributes.forEach(function (node) {
        getQueriedFields(node, attributes, type, schema);
      });
      break;
    }
    case 'ObjectSplat': {
      const queried = extractSplattedFields(schema, type);
      Object.keys(queried).forEach(function (key) {
        attributes[key] = [...(attributes[key] || []), ...queried[key]];
      });
      break;
    }
    case 'ObjectAttribute': {
      if (node.value.type === 'Projection') {
        attributes[type] = [
          ...(attributes[type] || []),
          {
            alias: node.key.value || node.value.name,
            attribute: node.value.name || node.key.value,
          },
        ];
        getQueriedFields(node.value, attributes, node.key.value, schema);
      } else {
        attributes[type] = [
          ...(attributes[type] || []),
          {
            alias: node.key.value || node.value.name,
            attribute: node.value.name,
          },
        ];
      }
      break;
    }
    default:
      break;
  }
}
