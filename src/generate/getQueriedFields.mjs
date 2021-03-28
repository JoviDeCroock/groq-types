import { TYPE_MAP } from './constants.mjs';

function extractSplattedFields(schema, type, property, nested) {
  const sanityDocument = schema.types.find(
    schemaType => schemaType.name === type
  );
  let result = {
    [property]:
      sanityDocument.type === 'object'
        ? { type, isExpanded: true, fields: [{ attribute: '_key' }] } // TODO: this is actually only present when the object is requested as an array.
        : {
            type,
            fields: [
              { attribute: '_type' },
              { attribute: '_id' },
              { attribute: '_updatedAt' },
              { attribute: '_createdAt' },
              { attribute: '_rev' },
            ],
          },
  };

  sanityDocument.fields.forEach(field => {
    // TOODO: ensure we don't override existing fields due to: id, ..., visible for instance
    if (TYPE_MAP[field.type]) {
      result[property].fields.push({ attribute: field.name });
    } else if (field.type === 'array') {
      result[property].fields.push({ attribute: field.name, isArray: true });
    } else {
      const sanityDocument = schema.types.find(
        schemaType => schemaType.name === field.type
      );
      result[property].fields.push({
        attribute: field.name,
        isExpanded: sanityDocument.type === 'object',
      });
      result = {
        ...result,
        ...extractSplattedFields(
          schema,
          field.type,
          property + '.' + field.name,
          true
        ),
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
      const sanityDocument = schema.types.find(
        schemaType => schemaType.name === type
      );
      if (!sanityDocument) break;

      const isArray = node.condition.type === 'Mapper';
      const field = sanityDocument.fields.find(
        x =>
          x.name === (isArray ? node.condition.base.name : node.condition.name)
      );
      if (!field) break;

      if (field.type === 'reference') {
        const fieldType = field.to[0].type;
        if (attributes[property]) {
          const foundIndex = attributes[property].fields.findIndex(
            x => x.attribute === field.name
          );
          if (foundIndex === -1) {
            attributes[property].fields.push({
              alias: field.name,
              attribute: field.name,
              isExpanded: true,
            });
          } else {
            attributes[property].fields[foundIndex] = {
              ...attributes[property].fields[foundIndex],
              ...{
                alias: field.name,
                attribute: field.name,
                isExpanded: true,
              },
            };
          }
        } else {
          attributes[property] = {
            ...attributes[property],
            type,
            fields: [
              ...((attributes[property] && attributes[property].fields) || []),
              {
                alias: field.name,
                attribute: field.name,
                isExpanded: true,
              },
            ],
          };
        }

        getQueriedFields(
          node.value,
          attributes,
          fieldType,
          schema,
          property + '.' + field.name
        );
      } else if (field.type === 'array') {
        // TODO: push these up with an OR SanityReference | RealType (multiple types).
        const fieldType = field.of[0].to[0].type;
        if (attributes[property]) {
          const foundIndex = attributes[property].fields.findIndex(
            x => x.attribute === field.name
          );
          if (foundIndex === -1) {
            attributes[property].fields.push({
              alias: field.name,
              attribute: field.name,
              isExpanded: true,
              isArray: true,
            });
          } else {
            attributes[property].fields[foundIndex] = {
              ...attributes[property].fields[foundIndex],
              ...{
                alias: field.name,
                attribute: field.name,
                isExpanded: true,
                isArray: true,
              },
            };
          }
        } else {
          attributes[property] = {
            ...attributes[property],
            type,
            fields: [
              ...((attributes[property] && attributes[property].fields) || []),
              {
                alias: field.name,
                attribute: field.name,
                isExpanded: true,
                isArray: true,
              },
            ],
          };
        }
        getQueriedFields(
          node.value,
          attributes,
          fieldType,
          schema,
          property + '.' + field.name
        );
      }
      break;
    }
    case 'ObjectSplat': {
      const queried = extractSplattedFields(schema, type, property);
      Object.keys(queried).forEach(function (key) {
        attributes[key] = {
          ...attributes[key],
          type: queried[key].type,
          isExpanded: queried[key].isExpanded,
          fields: [
            ...((attributes[key] && attributes[key].fields) || []),
            ...queried[key].fields,
          ],
        };
      });
      break;
    }
    case 'ObjectAttribute': {
      if (node.value.type === 'Projection') {
        attributes[property] = {
          ...attributes[property],
          fields: [
            ...((attributes[property] && attributes[property].fields) || []),
            {
              alias: node.key.value || node.value.name,
              attribute: node.value.name || node.key.value,
              isExpanded: true,
            },
          ],
        };
        getQueriedFields(
          node.value,
          attributes,
          node.key.value,
          schema,
          `${property}.` + (node.key.value || node.value.name)
        );
      } else {
        if (attributes[property]) {
          const foundIndex = attributes[property].fields.findIndex(
            x => x.attribute === (node.value.name || node.key.value)
          );
          if (foundIndex === -1) {
            attributes[property].fields.push({
              alias: node.key.value || node.value.name,
              attribute: node.value.name || node.key.value,
            });
          } else {
            attributes[property].fields[foundIndex] = {
              ...attributes[property].fields[foundIndex],
              ...{
                alias: node.key.value || node.value.name,
                attribute: node.value.name || node.key.value,
              },
            };
          }
        } else {
          attributes[property] = {
            ...attributes[property],
            type,
            fields: [
              ...((attributes[property] && attributes[property].fields) || []),
              {
                alias: node.key.value || node.value.name,
                attribute: node.value.name || node.key.value,
              },
            ],
          };
        }
      }
      break;
    }
    default:
      break;
  }
}
