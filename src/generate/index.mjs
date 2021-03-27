import { parse } from '@babel/parser';
import generateCodeFromAstDefault from "@babel/generator";
import tDefault from '@babel/types';
import traverseDefault from "@babel/traverse";
import { parse as parseGroq } from "groq-js";

import { findType } from './findType.mjs';
import { getQueriedFields } from './getQueriedFields.mjs';
import { inferDefaultExport } from '../utils.mjs';
// import { getSchemaGraph } from './getSchemaGraph';

const generateCodeFromAst = inferDefaultExport(generateCodeFromAstDefault)
const t = inferDefaultExport(tDefault)
const traverse = inferDefaultExport(traverseDefault)

export function generate(code, schema) {
  // const allTypes = getSchemaGraph(schema);
  const allTypes = ["Category"];

  const ast = parse(code, { sourceType: 'module' });

  const queries = [];
  traverse(ast, {
    TaggedTemplateExpression(path) {
      const tagPath = path.get("tag");
      if (tagPath.node.name === "groq" && tagPath.referencesImport("groq")) {
        let { code: groqQuery } = generateCodeFromAst(path.get("quasi").node);
        groqQuery = groqQuery.replace(/`/g, "");
        const groqAst = parseGroq(groqQuery);

        // TODO: find out if array or singular result
        const isArray = !groqAst.base.index;
        const type = findType(groqAst, allTypes);
        if (!type) {
          // Warn and return this query was impossible.
          return;
        }

        const sanityDocument = schema.types.find(function (schemaType) {
          return schemaType.name === type;
        });

        // TODO: we start here with base but should expand into relational ones as well;
        const attributes = { [type]: [] };
        // TODO: we should probably account for complexer projections
        getQueriedFields(groqAst, attributes, type);

        const baseAttributes = attributes[type];
        const types = baseAttributes
          .map(function (attribute) {
            const field = sanityDocument.fields.find(function (sanityField) {
              return sanityField.name === attribute.attribute;
            });

            // TODO: list of built-ins
            if (attribute.attribute === "_id") {
              return { name: attribute.alias, type: "string" };
            }

            if (!field) {
              return;
            }

            return { name: attribute.alias, type: "string" };
          })
          .filter(Boolean);

        const members = types.map(function (x) {
          return t.tSPropertySignature(
            t.identifier(x.name),
            t.tSTypeAnnotation(t.tSStringKeyword())
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
