import { test } from 'uvu';
import * as assert from 'uvu/assert';
import schema from './schema/index.mjs';
import { generateBaseTypes } from '../../src/generate/index.mjs';

const snapshot = `export type Category = {
  name: string;
  url: string;
  visible: boolean;
  id: string;
  parentCategory: SanityReference;
  categories: Array<SanityReference>;
  seo: seo;
  navChildren: Array<SanityReference>;
  _id: string;
  _createdAt: Date;
  _udpatedAt: Date;
  _rev: string;
  _type: string;
};

export type seo = {
  pageTitle: string;
  pageDescription: string;
  _key: string;
};`;

test('generate base types for sanity-schema', () => {
  assert.equal(generateBaseTypes(schema), snapshot)
});
