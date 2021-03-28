import { test } from 'uvu';
import * as assert from 'uvu/assert';
import schema from './schema/index.mjs';
import { generate } from '../../src/generate/index.mjs';

test('generate singular non-nested query', () => {
  const query = 'groq`';
  const queryEnd = '`';
  const program = `
    import groq from 'groq';

    ${query}
     *[_type == 'Category'][0] {
        _id,
        name
     }
    ${queryEnd}
  `;

  const result = generate(program, schema);
  assert.equal(
    result.replace(/\n/g, ''),
    `export type GroqCategoryQueryResult = Pick<Category, "_id" | "name">;`
  );
});

test('generate singular non-nested query with alias', () => {
  const query = 'groq`';
  const queryEnd = '`';
  const program = `
    import groq from 'groq';

    ${query}
     *[_type == 'Category'][0] {
        _id,
        "header": name
     }
    ${queryEnd}
  `;

  const result = generate(program, schema);
  assert.equal(
    result.replace(/\n/g, ''),
    `export type GroqCategoryQueryResult = Pick<Category, "_id"> & { header: Category['name'] };`
  );
});

test('generate array non-nested query', () => {
  const query = 'groq`';
  const queryEnd = '`';
  const program = `
    import groq from 'groq';

    ${query}
     *[_type == 'Category'] {
        _id,
        "head": name
     }
    ${queryEnd}
  `;

  const result = generate(program, schema);
  assert.equal(
    result.replace(/\n/g, ''),
    `export type GroqCategoryQueryResult = Array<Pick<Category, "_id" | "name">>;`
  );
});

// test('generate array non-nested double claused query', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_id == 'x' && _type == 'Category'] {
//         _id,
//         "head": name
//      }
//     ${queryEnd}
//   `;

//   const result = generate(program, schema);
//   assert.equal(
//     result.replace(/\n/g, ''),
//     `export type GroqCategoryQueryResult = Array<{  _id: string;  head: string;}>;`
//   );
// });

// test('spread keyword', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == 'Category'] {
//         ...
//      }
//     ${queryEnd}
//   `;

//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '').split('};');
//   assert.equal(
//     types[0] + '};',
//     `type seo = {  _key: string;  _updatedAt: Date;  _createdAt: Date;  pageTitle: string;  pageDescription: string;};`
//   );
//   assert.equal(
//     types[1],
//     `export type GroqCategoryQueryResult = Array<{  _id: string;  _updatedAt: Date;  _createdAt: Date;  _rev: string;  name: string;  url: string;  visible: boolean;  id: string;  parentCategory: SanityReference;  categories: Array<SanityReference>;  seo: seo;  navChildren: Array<SanityReference>;}>;`
//   );
// });

// test('querying from a nested field', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == 'Category'] {
//         _id,
//         seo {
//           pageTitle
//         }
//      }
//     ${queryEnd}
//   `;

//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '').split('};');
//   assert.equal(types[0] + '};', `type seo = {  pageTitle: string;};`);
//   assert.equal(
//     types[1],
//     `export type GroqCategoryQueryResult = Array<{  _id: string;  seo: seo;}>;`
//   );
// });

// test('querying from a nested splatted field', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == 'Category'] {
//         _id,
//         seo {
//           ...
//         }
//      }
//     ${queryEnd}
//   `;

//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '').split('};');
//   assert.equal(
//     types[0] + '};',
//     `type seo = {  _id: string;  _updatedAt: Date;  _createdAt: Date;  _rev: string;  pageTitle: string;  pageDescription: string;};`
//   );
//   assert.equal(
//     types[1],
//     `export type GroqCategoryQueryResult = Array<{  _id: string;  seo: seo;}>;`
//   );
// });

// test('expanding a field', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == "Category"] {
//         _id,
//         parentCategory => {
//           _id
//         }
//      }
//     ${queryEnd}
//   `;


//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '').split('};');
//   assert.equal(
//     types[0] + '};',
//     `type parentCategory = {  _id: string;};`
//   );
//   assert.equal(
//     types[1],
//     `export type GroqCategoryQueryResult = Array<{  _id: string;  parentCategory: parentCategory;}>;`
//   );
// });

// test('expanding a field with splat', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == "Category"] {
//         ...,
//         parentCategory => {
//           ...
//         }
//      }
//     ${queryEnd}
//   `;


//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '').split('};');
//   assert.equal(
//     types[0] + '};',
//     `type parentCategory = {  _id: string;};`
//   );
//   assert.equal(
//     types[1],
//     `export type GroqCategoryQueryResult = Array<{  _id: string;  parentCategory: parentCategory;}>;`
//   );
// });

// test('expanding an array-field', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == "Category"] {
//         _id,
//         categories[] => {
//           _id
//         }
//      }
//     ${queryEnd}
//   `;


//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '');
//   assert.equal(
//     types,
//     `export type GroqCategoryQueryResult = Array<{}>;`
//   );
// });

// test('expanding an array-field with splat', () => {
//   const query = 'groq`';
//   const queryEnd = '`';
//   const program = `
//     import groq from 'groq';

//     ${query}
//      *[_type == "Category"] {
//         ...,
//         categories[] => {
//           ...
//         }
//      }
//     ${queryEnd}
//   `;


//   const result = generate(program, schema);
//   const types = result.replace(/\n/g, '');
//   assert.equal(
//     types,
//     `export type GroqCategoryQueryResult = Array<{}>;`
//   );
// });

// Expand array field
// Splat expanded field

test.run();
