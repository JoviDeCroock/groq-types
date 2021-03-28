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

const objBase = [
  { name: '_key', type: 'string' }, // TODO: this is actually only present when the object is requested as an array.
];

const docBase = [
  { type: 'string', name: '_id' },
  { type: 'date', name: '_createdAt' },
  { type: 'date', name: '_udpatedAt' },
  { type: 'string', name: '_rev' },
  { type: 'string', name: '_type' },
];

const createTypes = (x) => t.tSPropertySignature(
  t.identifier(x.name),
  getBabelTypeForSanityType(x.type, x.isArray)
);

export function generateBaseTypes(schema) {
  const types = [];
  schema.types.forEach(schemaType => {
    const fields = [...schemaType.fields];
    if (schemaType.type === 'document') {
      fields.push(...docBase);
    } else if (schemaType.type === 'object') {
      fields.push(...objBase);
    }

    const processedFields = fields.map(x => ({
      name: x.name,
      // TODO: push these up with an OR SanityReference | RealType (multiple types).
      type: x.type === 'array' ? x.of[0].type : x.type,
      isArray: x.type === 'array',
    }))

    const base = t.exportNamedDeclaration(
      t.tSTypeAliasDeclaration(
        t.identifier(schemaType.name),
        null,
        t.tSTypeLiteral(processedFields.map(createTypes))
      )
    );

    types.push(generateCodeFromAst(base).code);
  });

  return types.join('\n\n')
}


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

        const { root: baseAttributes, ...rest } = attributes;
        const types = {
          root: {
            type: baseAttributes.type,
            types: convertTypes(baseAttributes.fields, baseAttributes.type, sanityDocument)
          }
        }

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

        const getType = (currentTypes, allTypes, isArray, key) => {
          const type = t.tSTypeLiteral(
            currentTypes.types.map(x => {
              const nesType = allTypes[key + '.' + x.type];
              const nesName = allTypes[key + '.' + x.name];
              const nes = nesType || nesName;
              if (nes && x.isExpanded) {
                const newKey = key + '.' + (nesType ? x.type : x.name);
                return t.tSPropertySignature(
                  t.identifier(x.name),
                  getType(nes, allTypes, x.isArray, newKey  )
                )
              } else {
                return t.tSPropertySignature(
                  t.identifier(x.name),
                  getBabelTypeForSanityType(x.type, x.isArray)
                );
              }
            })
          )
          if (isArray) {
            return t.tSTypeAnnotation(t.tSTypeReference(t.identifier('Array'), t.tsTypeParameterInstantiation([type])));
          } else {
            return t.tSTypeAnnotation(type)
          }
        }

        const generateTypes = (currentTypes, allTypes, isArray, key = 'root') => {
          const baseType = t.tSTypeLiteral(currentTypes.types.map(x => {
            const nesType = allTypes[key + '.' + x.type];
            const nesName = allTypes[key + '.' + x.name];
            const nes = nesType || nesName;
            if (nes && x.isExpanded) {
              const newKey = key + '.' + (nesType ? x.type : x.name);
              const nestedType = getType(nes, allTypes, x.isArray, newKey);
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
