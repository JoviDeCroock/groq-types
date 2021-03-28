import { test } from 'uvu';
import * as assert from 'uvu/assert';
import schema from './schema/index.mjs';
import { generate } from '../../src/generate/index.mjs'

test('generate singular non-nested query', () => {
  const query = "groq`";
  const queryEnd = "`";
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
  assert.equal(result.replace(/\n/g, ''), `export type GroqCategoryQueryResult = {  _id: string;  name: string;};`);
});

test('generate singular non-nested query with alias', () => {
  const query = "groq`";
  const queryEnd = "`";
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
  assert.equal(result.replace(/\n/g, ''), `export type GroqCategoryQueryResult = {  _id: string;  header: string;};`);
});

test('generate array non-nested query', () => {
  const query = "groq`";
  const queryEnd = "`";
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
  assert.equal(result.replace(/\n/g, ''), `export type GroqCategoryQueryResult = Array<{  _id: string;  head: string;}>;`);
});

test('generate array non-nested double claused query', () => {
  const query = "groq`";
  const queryEnd = "`";
  const program = `
    import groq from 'groq';
  
    ${query}
     *[_id == 'x' && _type == 'Category'] {
        _id,
        "head": name
     } 
    ${queryEnd}
  `;

  const result = generate(program, schema);
  assert.equal(result.replace(/\n/g, ''), `export type GroqCategoryQueryResult = Array<{  _id: string;  head: string;}>;`);
});

test('spread keyword', () => {
  const query = "groq`";
  const queryEnd = "`";
  const program = `
    import groq from 'groq';
  
    ${query}
     *[_type == 'Category'] {
        ...
     } 
    ${queryEnd}
  `;

  const result = generate(program, schema);
  const types = result.replace(/\n/g, '').split('};');
  assert.equal(types[0]+'};', `type seo = {  _key: string;  _updatedAt: Date;  _createdAt: Date;  pageTitle: string;  pageDescription: string;};`);
  assert.equal(types[1], `export type GroqCategoryQueryResult = Array<{  _id: string;  _updatedAt: Date;  _createdAt: Date;  _rev: string;  name: string;  url: string;  visible: boolean;  id: string;  parentCategory: SanityReference;  categories: Array<SanityReference>;  seo: seo;  navChildren: Array<SanityReference>;}>;`);
});

test('querying from a nested field', () => {
  const query = "groq`";
  const queryEnd = "`";
  const program = `
    import groq from 'groq';
  
    ${query}
     *[_type == 'Category'] {
        _id,
        seo {
          pageTitle
        }
     } 
    ${queryEnd}
  `;

  const result = generate(program, schema);
  const types = result.replace(/\n/g, '').split('};');
  assert.equal(types[0]+'};', `type seo = {  pageTitle: string;};`);
  assert.equal(types[1], `export type GroqCategoryQueryResult = Array<{  _id: string;  seo: seo;}>;`);
});

// TODO: nested into seo field
// TODO: nested into seo field mixed with splat
// TODO: references
// TODO: expanded references

test.run();