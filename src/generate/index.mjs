import { parse } from '@babel/parser';
import generateCodeFromAstDefault from '@babel/generator';
import tDefault from '@babel/types';
import traverseDefault from '@babel/traverse';
import { parse as parseGroq } from 'groq-js';

import { findType, getBabelTypeForSanityType, convertTypes } from './types.mjs';
import { getQueriedFields } from './getQueriedFields.mjs';
import { inferDefaultExport, capitalize } from '../utils.mjs';

const generateCodeFromAst = inferDefaultExport(generateCodeFromAstDefault);
const t = inferDefaultExport(tDefault);
const traverse = inferDefaultExport(traverseDefault);

export function generate(code, schema) {
  // TODO: we could eagerly fill out all object-types and extend our base-types with
  // sanity extenions i.e. object that extends image as name figure that adds an alt.
  const allTypes = schema.types
    .map(schemaType => schemaType.type === 'document' ? schemaType.name : null)
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

        const sanityDocument = schema.types.find(schemaType => schemaType.name === type);

        const attributes = { root: { type, fields: [] } };
        getQueriedFields(groqAst, attributes, type, schema, 'root');
        console.log(attributes);
        const { root: baseAttributes, ...rest } = attributes;
        const types = {
          root: {
            type: baseAttributes.type,
            types: convertTypes(baseAttributes.fields, baseAttributes.type, sanityDocument)
          }
        }

        const createTypes = (x) => t.tSPropertySignature(
          t.identifier(x.name),
          getBabelTypeForSanityType(x.type, x.isArray)
        );

        const additionalTypes = [];
        Object.entries(rest).forEach(([key, entry]) => {
          const sanityDocument = schema.types.find(schemaType => schemaType.name === entry.type);

          if (!sanityDocument) {
            console.warn(
              `Issues generating type as no "_type" was found for ${key}.`
            );
            return;
          }

          types[key] = {
            type: entry.type,
            types: convertTypes(rest[key].fields, rest[key].type, sanityDocument)
          }
        });

        const getType = (currentTypes, allTypes, isArray) => {
          return t.tSTypeAnnotation(
            t.tSTypeLiteral(
              currentTypes.types.map(x => {
                const type = allTypes[x.name];
                console.log(type, x);
                if (allTypes[x.type]) {
                  return t.tSPropertySignature(
                    t.identifier(x.name),
                    getType(allTypes[x.type], allTypes, x.isArray)
                  )
                } else {
                  return t.tSPropertySignature(
                    t.identifier(x.name),
                    getBabelTypeForSanityType(x.type, x.isArray)
                  );
                }
              })
            )
          )
        }

        const generateTypes = (currentTypes, allTypes, isArray) => {
          const baseType = t.tSTypeLiteral(currentTypes.types.map(x => {
            console.log(x);
            if (allTypes[x.type]) {
              const nestedType = getType(allTypes[x.type], allTypes, x.isArray);
              return t.tSPropertySignature(
                t.identifier(x.name),
                nestedType
              )
            } else {
              return t.tSPropertySignature(
                t.identifier(x.name),
                getBabelTypeForSanityType(x.type, x.isArray)
              );
            }
          }));

          if (isArray) {
            return t.exportNamedDeclaration(
              t.tSTypeAliasDeclaration(
                t.identifier(queryName),
                null,
                t.tSTypeReference(
                  t.identifier('Array'),
                  t.tsTypeParameterInstantiation([
                    baseType
                  ])
                )
              )
            )
          } else {
            return t.exportNamedDeclaration(
              t.tSTypeAliasDeclaration(
                t.identifier(queryName),
                null,
                baseType
              )
            )
          }
        }

        const baseTypes = generateTypes(types.root, types, isArray)
        queries.push(generateCodeFromAst(baseTypes).code);
      }
    },
  });

  return queries.join('\n\n');
}
