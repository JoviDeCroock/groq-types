import { TYPE_MAP } from './constants.mjs';

function extractSplattedFields(schema, type, property, nested) {
  const sanityDocument = schema.types.find(schemaType => schemaType.name === type);

  let result = {
    [property]: sanityDocument.type === 'object'
      ? { type, fields: [{ attribute: '_key' }] } // TODO: this is actually only present when the object is requested as an array.
      : {
        type,
        fields: [
          { attribute: '_type' },
          { attribute: '_id' },
          { attribute: '_updatedAt' },
          { attribute: '_createdAt' },
          { attribute: '_rev' },
        ]
      },
  };

  sanityDocument.fields.forEach(field => {
    if (TYPE_MAP[field.type]) {
      result[property].fields.push({ attribute: field.name });
    } else if (field.type === 'array') {
      result[property].fields.push({ attribute: field.name, isArray: true });
    } else {
      result[property].fields.push({ attribute: field.name });
      result = {
        ...result,
        ...extractSplattedFields(schema, field.type, field.name, true),
      };
    }
  });

  return result;
}

export function getQueriedFields(node, attributes, type, schema, property) {
  switch (node.type) {
    case 'Projection': {
      getQueriedFields(node.query, attributes, type, schema, property);
      break;
    }
    case 'Object': {
      node.attributes.forEach(function (node) {
        getQueriedFields(node, attributes, type, schema, property);
      });
      break;
    }
    case 'ObjectConditionalSplat': {
      const sanityDocument = schema.types.find(schemaType => schemaType.name === type);
      if (!sanityDocument) break;

      const isArray = node.condition.type === 'Mapper';
      const field = sanityDocument.fields.find(x => x.name === (isArray ? node.condition.base.name : node.condition.name));
      if (!field) break;

      if (field.type === 'reference') {
        const fieldType = field.to[0].type;
        attributes[property] = {
          ...attributes[property],
          type,
          fields: [
            ...(attributes[property] && attributes[property].fields || []),
            {
              alias: field.name,
              attribute: field.name,
              isExpanded: true,
            },
          ]
        }
        getQueriedFields(node.value, attributes, fieldType, schema, field.name);
      } else if (field.type === 'array') {
        const fieldType = field.of[0].to[0].type;
        attributes[property] = {
          ...attributes[property],
          type,
          fields: [
            ...(attributes[property] && attributes[property].fields || []),
            {
              alias: field.name,
              attribute: field.name,
              isArray: true,
              isExpanded: true,
            },
          ]
        }
        getQueriedFields(node.value, attributes, fieldType, schema, field.name);
      }
      break;
    }
    case 'ObjectSplat': {
      const queried = extractSplattedFields(schema, type, property);
      Object.keys(queried).forEach(function (key) {
        attributes[key] = {
          ...attributes[key],
          type: queried[key].type,
          fields: [...(attributes[key] && attributes[key].fields || []), ...queried[key].fields]
        }
      });
      break;
    }
    case 'ObjectAttribute': {
      if (node.value.type === 'Projection') {
        attributes[property] = {
          ...attributes[property],
          fields: [
            ...(attributes[property] && attributes[property].fields || []),
            {
              alias: node.key.value || node.value.name,
              attribute: node.value.name || node.key.value,
            },
          ]
        }
        getQueriedFields(node.value, attributes, node.key.value, schema, node.key.value || node.value.name);
      } else {
        attributes[property] = {
          ...attributes[property],
          type,
          fields: [
            ...(attributes[property] && attributes[property].fields || []),
            {
              alias: node.key.value || node.value.name,
              attribute: node.value.name || node.key.value,
            },
          ]
        }
      }
      break;
    }
    default:
      break;
  }
}
