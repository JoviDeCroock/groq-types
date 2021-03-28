import { parse } from '@babel/parser';
import generateCodeFromAstDefault from '@babel/generator';
import tDefault from '@babel/types';
import traverseDefault from '@babel/traverse';
import { parse as parseGroq } from 'groq-js';

import { findType, getBabelTypeForSanityType } from './types.mjs';
import { getQueriedFields } from './getQueriedFields.mjs';
import { inferDefaultExport, capitalize } from '../utils.mjs';

const generateCodeFromAst = inferDefaultExport(generateCodeFromAstDefault);
const t = inferDefaultExport(tDefault);
const traverse = inferDefaultExport(traverseDefault);

const objectBaseTypes = [
  { name: '_key', type: 'string' },
];

const documentBaseTypes = [
  { type: 'string', name: '_id' },
  { type: 'date', name: '_createdAt' },
  { type: 'date', name: '_udpatedAt' },
  { type: 'string', name: '_rev' },
];

const createTypes = (x) => t.tSPropertySignature(
  t.identifier(x.name),
  getBabelTypeForSanityType(x.type, x.isArray)
);

export function generateBaseTypes(schema) {
  const types = [];
  schema.types.forEach(schemaType => {
    if (schemaType.type === 'document') {
      schemaType.fields.push(...documentBaseTypes);
    } else if (schemaType.type === 'object') {
      schemaType.fields.push(...objectBaseTypes);
    }

    const processedFields = schemaType.fields.map(x => ({
      name: x.name,
      // TODO: push these up with an OR SanityReference | RealType
      type: x.type === 'array' ? x.of[0].type : x.type,
      isArray: x.type === 'array',
    }))

    console.log(processedFields);
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

        const basePick = t.tSTypeReference(
          t.identifier('Pick'),
          t.tsTypeParameterInstantiation([
            t.tSTypeReference(t.identifier(baseAttributes.type)),
            baseAttributes.fields.length === 1 ? t.tSLiteralType(t.stringLiteral(baseAttributes.fields[0].attribute)) : t.tSUnionType(baseAttributes.fields.map(x => t.tSLiteralType(t.stringLiteral(x.attribute)))),
          ])
        );

        let baseExport;
        if (isArray) {
          baseExport = t.exportNamedDeclaration(
            t.tSTypeAliasDeclaration(
              t.identifier(queryName),
              null,
              t.tSTypeReference(
                t.identifier('Array'),
                t.tsTypeParameterInstantiation([
                  basePick
                ])
              )
            )
          );
        } else {
          baseExport = t.exportNamedDeclaration(
            t.tSTypeAliasDeclaration(
              t.identifier(queryName),
              null,
              basePick
            )
          );
        }

        queries.push(generateCodeFromAst(baseExport).code);
      }
    },
  });

  return queries.join('\n\n');
}
