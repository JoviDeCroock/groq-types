import { parse } from '@babel/parser';
import generateCodeFromAstDefault from '@babel/generator';
import tDefault from '@babel/types';
import traverseDefault from '@babel/traverse';
import { parse as parseGroq } from 'groq-js';

import { findType, getBabelTypeForSanityType, convertTypes } from './types.mjs';
import { getQueriedFields } from './getQueriedFields.mjs';
import { inferDefaultExport, capitalize } from '../utils.mjs';
// import { getSchemaGraph } from './getSchemaGraph';

const generateCodeFromAst = inferDefaultExport(generateCodeFromAstDefault);
const t = inferDefaultExport(tDefault);
const traverse = inferDefaultExport(traverseDefault);

export function generate(code, schema) {
  // TODO: we could eagerly fill out all object-types and extend our base-types with
  // sanity extenions i.e. object that extends image as name figure that adds an alt.
  const allTypes = schema.types
    .map(function (schemaType) {
      if (schemaType.type === 'document') {
        return schemaType.name;
      }
    })
    .filter(Boolean);

  const ast = parse(code, { sourceType: 'module' });

  const queries = [];
  traverse(ast, {
    TaggedTemplateExpression(path) {
      const tagPath = path.get('tag');
      if (tagPath.node.name === 'groq' && tagPath.referencesImport('groq')) {
        const groqQuery = generateCodeFromAst(
          path.get('quasi').node
        ).code.replace(/`/g, '');
        const groqAst = parseGroq(groqQuery);

        const isArray = !groqAst.base.index;
        const type = findType(groqAst, allTypes);
        if (!type) {
          console.warn(
            `Issues generating groq query as no "_type" was found inside of a groq call.`
          );
          return;
        }

        const queryName = `Groq${capitalize(type)}QueryResult`;

        const sanityDocument = schema.types.find(function (schemaType) {
          return schemaType.name === type;
        });

        const attributes = { [type]: [] };
        getQueriedFields(groqAst, attributes, type, schema);

        const { [type]: baseAttributes, ...rest } = attributes;
        const types = convertTypes(baseAttributes, sanityDocument, queryName);

        const createTypes = function (x) {
          return t.tSPropertySignature(
            t.identifier(x.name),
            getBabelTypeForSanityType(x.type, x.isArray)
          );
        };

        const additionalTypes = [];
        Object.keys(rest).forEach(function (key) {
          const sanityDocument = schema.types.find(function (schemaType) {
            return schemaType.name === key;
          });

          if (!sanityDocument) {
            console.warn(
              `Issues generating type as no "_type" was found for ${key}.`
            );
            return;
          }

          const types = convertTypes(rest[key], sanityDocument);

          additionalTypes.push(
            t.tSTypeAliasDeclaration(
              t.identifier(key),
              null,
              t.tSTypeLiteral(types.map(createTypes))
            )
          );
        });

        let baseExport;
        if (isArray) {
          baseExport = t.exportNamedDeclaration(
            t.tSTypeAliasDeclaration(
              t.identifier(queryName),
              null,
              t.tSTypeReference(
                t.identifier('Array'),
                t.tsTypeParameterInstantiation([
                  t.tSTypeLiteral(types.map(createTypes)),
                ])
              )
            )
          );
        } else {
          baseExport = t.exportNamedDeclaration(
            t.tSTypeAliasDeclaration(
              t.identifier(queryName),
              null,
              t.tSTypeLiteral(types.map(createTypes))
            )
          );
        }

        additionalTypes.forEach(function (typeTree) {
          queries.push(generateCodeFromAst(typeTree).code);
        });
        queries.push(generateCodeFromAst(baseExport).code);
      }
    },
  });

  return queries.join('\n\n');
}
