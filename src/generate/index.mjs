import { parse } from '@babel/parser';
import generateCodeFromAst from "@babel/generator";
import t from '@babel/types';
import traverse from "@babel/traverse";
import { parse as parseGroq } from "groq-js";

export function generate(code, schema) {
  // const allTypes = exploreFullSchema(schema);
  const allTypes = ["Category"];

  function findType(node) {
    switch (node.type) {
      case "Filter": {
        return findType(node.query);
      }
      case "OpCall": {
        switch (node.op) {
          case "==": {
            if (
              node.left.name === "_type" &&
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

  function getQueriedFields(node, attributes, type) {
    switch (node.type) {
      case "Object": {
        node.attributes.forEach(function (node) {
          getQueriedFields(node, attributes, type);
        });
        break;
      }
      case "ObjectAttribute": {
        // TODO: this should check for identifiers
        attributes[type] = [
          ...attributes[type],
          {
            alias: node.key.value || node.value.name,
            attribute: node.value.name
          }
        ];
        break;
      }
      default:
        break;
    }
  }

  const ast = parse(code, {
    sourceType: 'module'
  });

  const queries = [];
  traverse.default(ast, {
    TaggedTemplateExpression(path) {
      const tagPath = path.get("tag");
      if (tagPath.node.name === "groq" && tagPath.referencesImport("groq")) {
        let { code: groqQuery } = generateCodeFromAst.default(path.get("quasi").node);
        groqQuery = groqQuery.replace(/`/g, "");
        const groqAst = parseGroq(groqQuery);

        // TODO: find out if array or singuiar result
        const type = findType(groqAst.base);
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
        getQueriedFields(groqAst.query, attributes, type);

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
        const baseExport = t.exportNamedDeclaration(
          t.tSTypeAliasDeclaration(
            t.identifier("GroqQueryResult"),
            null,
            t.tSTypeLiteral(members)
          )
        );

        queries.push(generateCodeFromAst.default(baseExport).code);
      }
    }
  });

  return queries.join('\n\n');
}
