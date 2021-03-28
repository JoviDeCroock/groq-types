import { parse } from '@babel/parser';
import generateCodeFromAstDefault from "@babel/generator";
import tDefault from '@babel/types';
import traverseDefault from "@babel/traverse";
import { parse as parseGroq } from "groq-js";

import { findType } from './findType.mjs';
import { getQueriedFields } from './getQueriedFields.mjs';
import { inferDefaultExport } from '../utils.mjs';
import { BUILT_IN_FIELDS } from './constants.mjs';
import { TYPE_MAP } from './constants.mjs';
// import { getSchemaGraph } from './getSchemaGraph';

const generateCodeFromAst = inferDefaultExport(generateCodeFromAstDefault)
const t = inferDefaultExport(tDefault)
const traverse = inferDefaultExport(traverseDefault);

function getBabelTypeForSanityType(type, isArray) {
  if (Array.isArray(type)) {
    if (type.length === 1) {
      return getBabelTypeForSanityType(type[0], isArray);
    }
  } else {
    switch (type) {
      case 'string': {
        if (isArray) {
          return t.tSTypeAnnotation(t.tSTypeReference(
            t.identifier("Array"),
            t.tsTypeParameterInstantiation([t.tSStringKeyword()]))
          )
        } else {
          return t.tSTypeAnnotation(t.tSStringKeyword())
        }
      }
      case 'number': {
        if (isArray) {
          return t.tSTypeAnnotation(t.tSTypeReference(
            t.identifier("Array"),
            t.tsTypeParameterInstantiation([t.tSNumberKeyword()]))
          )
        } else {
          return t.tSTypeAnnotation(t.tSNumberKeyword())
        }
      }
      case 'boolean': {
        if (isArray) {
          return t.tSTypeAnnotation(t.tSTypeReference(
            t.identifier("Array"),
            t.tsTypeParameterInstantiation([t.tSBooleanKeyword()]))
          )
        } else {
          return t.tSTypeAnnotation(t.tSBooleanKeyword())
        }
      }
      case 'datetime':
      case 'Datetime':
      case 'date':
      case 'Date': {
        if (isArray) {
          return t.tSTypeAnnotation(t.tSTypeReference(
            t.identifier("Array"),
            t.tsTypeParameterInstantiation([t.tSTypeReference(t.identifier('Date'))]))
          )
        } else {
          return t.tSTypeAnnotation(t.tSTypeReference(t.identifier('Date')));
        }
      }
      case 'reference':
      case 'SanityReference': {
        if (isArray) {
          return t.tSTypeAnnotation(t.tSTypeReference(
            t.identifier("Array"),
            t.tsTypeParameterInstantiation([t.tSTypeReference(t.identifier('SanityReference'))]))
          )
        } else {
          return t.tSTypeAnnotation(t.tSTypeReference(t.identifier('SanityReference')));
        }
      }
      default: {
        if (isArray) {
          return t.tSTypeAnnotation(t.tSTypeReference(
            t.identifier("Array"),
            t.tsTypeParameterInstantiation([t.tSTypeReference(t.identifier(type))]))
          )
        } else {
          return t.tSTypeAnnotation(t.tSTypeReference(t.identifier(type)));
        }
      }
    }
  }
}

export function generate(code, schema) {
  // const allTypes = getSchemaGraph(schema);
  const allTypes = ["Category"];

  const ast = parse(code, { sourceType: 'module' });

  const queries = [];
  traverse(ast, {
    TaggedTemplateExpression(path) {
      const tagPath = path.get("tag");
      if (tagPath.node.name === "groq" && tagPath.referencesImport("groq")) {
        const groqQuery = generateCodeFromAst(path.get("quasi").node).code.replace(/`/g, "");
        const groqAst = parseGroq(groqQuery);

        // TODO: find out if array or singular result
        const isArray = !groqAst.base.index;
        const type = findType(groqAst, allTypes);
        if (!type) {
          // Warn and return this query was impossible.
          console.warn(`Issues generating groq query as no "_type" was found.`);
          return;
        }

        const sanityDocument = schema.types.find(function (schemaType) {
          return schemaType.name === type;
        });

        // TODO: we start here with base but should expand into relational ones as well;
        const attributes = { [type]: [] };
        // TODO: we should probably account for complexer projections
        getQueriedFields(groqAst, attributes, type, schema);

        const { [type]: baseAttributes, ...rest } = attributes;
        const types = baseAttributes
          .map(function (attribute) {
            const field = sanityDocument.fields.find(function (sanityField) {
              return sanityField.name === attribute.attribute;
            });

            if (BUILT_IN_FIELDS[attribute.attribute]) {
              return {
                name: attribute.alias || attribute.attribute || field.name,
                type: BUILT_IN_FIELDS[attribute.attribute],
              };
            }

            if (!field) return;

            const type = TYPE_MAP[field.type];
            if (field.type === 'reference' && attribute.expanded) {

            } else if (attribute.isArray) {
              if (attribute.expanded) {

              } else {
                return {
                  name: attribute.alias || attribute.attribute || field.name,
                  type: field.of.map(function (x) { return x.type; }),
                  isArray: true,
                }
              }

            } else {
              return {
                name: attribute.alias || attribute.attribute || field.name,
                type: type || field.type,
              };
            }

          })
          .filter(Boolean);
        
        const members = types.map(function (x) {
          return t.tSPropertySignature(
            t.identifier(x.name),
            getBabelTypeForSanityType(x.type, x.isArray)
          );
        });

        let baseExport;
        if (isArray) {
          baseExport = t.exportNamedDeclaration(
            t.tSTypeAliasDeclaration(
              t.identifier("GroqQueryResult"),
              null,
              t.tSTypeReference(
                t.identifier("Array"),
                t.tsTypeParameterInstantiation([t.tSTypeLiteral(members)])
              )
            )
          );
        } else {
          baseExport = t.exportNamedDeclaration(
            t.tSTypeAliasDeclaration(
              t.identifier("GroqQueryResult"),
              null,
              t.tSTypeLiteral(members)
            )
          );
        }

        queries.push(generateCodeFromAst(baseExport).code);
      }
    }
  });

  return queries.join('\n\n');
}
