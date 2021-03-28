import tDefault from '@babel/types';
import { BUILT_IN_FIELDS, TYPE_MAP } from './constants.mjs';
import { inferDefaultExport } from '../utils.mjs';

const t = inferDefaultExport(tDefault);

export function findType(node, allTypes) {
  switch (node.type) {
    case 'Projection':
    case 'Element': {
      return findType(node.base, allTypes);
    }
    case 'Or':
    case 'And': {
      return findType(node.left, allTypes) || findType(node.right, allTypes);
    }
    case 'Filter': {
      return findType(node.query, allTypes);
    }
    case 'OpCall': {
      switch (node.op) {
        case '==': {
          if (
            node.left.name === '_type' &&
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

export function getBabelTypeForSanityType(type, isArray) {
  if (Array.isArray(type)) {
    if (type.length === 1) {
      return getBabelTypeForSanityType(type[0], isArray);
    } else {
      console.warn('Currently not supporting multiple "of" on an array.');
    }
  } else {
    switch (type) {
      case 'text':
      case 'url':
      case 'string': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([t.tSStringKeyword()])
            )
          );
        } else {
          return t.tSTypeAnnotation(t.tSStringKeyword());
        }
      }
      case 'number': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([t.tSNumberKeyword()])
            )
          );
        } else {
          return t.tSTypeAnnotation(t.tSNumberKeyword());
        }
      }
      case 'boolean': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([t.tSBooleanKeyword()])
            )
          );
        } else {
          return t.tSTypeAnnotation(t.tSBooleanKeyword());
        }
      }
      case 'datetime':
      case 'Datetime':
      case 'date':
      case 'Date': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('Date')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(t.tSTypeReference(t.identifier('Date')));
        }
      }
      case 'reference':
      case 'SanityReference': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanityReference')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanityReference'))
          );
        }
      }
      case 'block':
      case 'SanityBlock': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanityBlock')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanityBlock'))
          );
        }
      }
      case 'file':
      case 'SanityFile': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanityFile')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanityFile'))
          );
        }
      }
      case 'geopoint':
      case 'SanityGeoPoint': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanityGeoPoint')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanityGeoPoint'))
          );
        }
      }
      case 'image':
      case 'SanityImage': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanityImage')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanityImage'))
          );
        }
      }
      case 'slug':
      case 'SanitySlug': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanitySlug')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanitySlug'))
          );
        }
      }
      case 'span':
      case 'SanitySpan': {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier('SanitySpan')),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(
            t.tSTypeReference(t.identifier('SanitySpan'))
          );
        }
      }
      default: {
        if (isArray) {
          return t.tSTypeAnnotation(
            t.tSTypeReference(
              t.identifier('Array'),
              t.tsTypeParameterInstantiation([
                t.tSTypeReference(t.identifier(type)),
              ])
            )
          );
        } else {
          return t.tSTypeAnnotation(t.tSTypeReference(t.identifier(type)));
        }
      }
    }
  }
}

export function convertTypes(attributes, type, sanityDocument) {
  return attributes
    .map(attribute => {
      const field = sanityDocument.fields.find(sanityField => sanityField.name === attribute.attribute);

      if (BUILT_IN_FIELDS[attribute.attribute]) {
        return {
          name: attribute.alias || attribute.attribute || field.name,
          type: BUILT_IN_FIELDS[attribute.attribute],
        };
      }

      if (!field) return;

      const type = TYPE_MAP[field.type];
      if (field.type === 'reference' && attribute.isExpanded) {
        return {
          name: attribute.alias || attribute.attribute || field.name,
          type: field.name,
          isExpanded: true,
        };
      } else if (attribute.isArray) {
        if (attribute.isExpanded) {
          return {
            name: attribute.alias || attribute.attribute || field.name,
            type: field.of[0].to[0].type,
            isArray: true,
            isExpanded: true,
          };
        } else {
          return {
            name: attribute.alias || attribute.attribute || field.name,
            type: field.of[0].type,
            isArray: true,
          };
        }
      } else {
        return {
          name: attribute.alias || attribute.attribute || field.name,
          type: type || field.type,
          isExpanded: !!attribute.isExpanded
        };
      }
    })
    .filter(Boolean);
}
