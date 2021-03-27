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
        "head": name
     } 
    ${queryEnd}
  `;

  const result = generate(program, schema);
  assert.equal(result.replace(/\n/g, ''), `export type GroqQueryResult = {  _id: string;  head: string;};`);
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
  assert.equal(result.replace(/\n/g, ''), `export type GroqQueryResult = Array<{  _id: string;  head: string;}>;`);
});

test.run();