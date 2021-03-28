# Groq types

## Introduction

When we approach the idea of transforming a query language to types we know that this has already been tackled by tools like
[graphql-code-generator](https://www.graphql-code-generator.com/), the difference ehre being that GraphQL has a means of being
introspected which means we can look at the schema this is in-play _as well as_ the schema we are querying this in-play schema with,
AST-to-AST.

When we approach this Groq-to-TS transformation we have to consider that the source of truth containing the types is a POJO of the
following shape:

```js
const schema = {
  name: 'default',
  types: [...someSanityTypes]
}
```

This means that we'll have to map our AST-to-JSON all the time to know what we're dealing with, essentially this doesn't pose the biggest
issue in itself. The issues present themselves when we start including the syntax that groq allows, let's look at some options.

## Syntax

Groq essentially allows us to query fields, this can be anything becuase if we'd do `* { ... }` we'd essentially get every document in
the dataset. This means that for the sake of typings we'll start by making some of these queries untyped, a first need to generate
proper types for a groq-query would be that we want one or more `_type` clauses in our query.

```
*[_type == 'todo'] { ... }
```

This now means that we can look at the schema type for todo and generate appropriate typings for this document, in this case we would
say that the user queries all the fields and can expect multiple results. This means that we essentially have:

```ts
export type GroqTodoQueryResult = Array<{ _id: string; }>
```

A next challenge presents itself when we think about how we use this schema, essentially this schema is telling a client how to
represent _all_ data that is available in the dataset.
This means that no validation will ever be enforced on the backend, so for non-nullability we can say if there's a `.required()` on
there that it's not-nullable (and same for the default Sanity-fields) but essentially once data is written these types are ... not
reliable.
The same story can be told when we consider a select-box, a relational list, ... Stale data can make the enforced types incorrect.

When we are querying a todo and that todo has an author we can use the concept of `projections` to expand that child-entity, this looks
like the following:

```
*[_type == 'todo'] {
  author => { _id }
}
```

again, this seems possible to generate we can traverse the query, find the author and say that it has an `_id`.

We can alias by means of `"alias": name`, we can make eager projections by doing `author -> author.name` and so on.

We can make subqueries

```
*[_type == 'todo'] {
  authors: *[_type == 'author' && age > 40]
}
```

## Challenges

A scattered set of files could impose a challenging aspect, when `index.js` defines a query but the used fields are
gotten from another file. There's probably adequate solutions for this when using Babel.
