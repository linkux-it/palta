/**
 * Arango entry point to connect to arango and other things.
 */

// Package imports
import Document from './lib/document';
import Schema from './lib/schema';

import * as errors from './lib/errors';

// Re export
export { db, connect } from './lib/connection';


let modelSchemas = {};


/**
 * @description Define the collection using the schema or retrieve it.
 *
 * If schema is provided will create/update the collection class and will
 * return the class but if not provided it will only return the class.
 *
 * ####Example:
 *
 *     var schema = new Schema({ name: String }, { collection: 'actor' });
 *
 *     // or
 *
 *     schema.set('collection', 'actor');
 *
 *     // or
 *
 *     var collectionName = 'actor'
 *     var M = palta.model('Actor', schema, collectionName)
 *
 * @param {string} name The name that will be used as reference.
 * @param {Schema} [schema] The schema used to create the collection.
 * @param {String} [collection] name (optional, induced from model name)
 */
export function model(name, schema, collection) {

  if (schema && !(schema instanceof Schema)) {
    schema = new Schema(schema);
  }

  if (!modelSchemas[name]) {
    if (schema) {
      modelSchemas[name] = schema;
      applyPlugins(schema);
    } else {
      throw new errors.MissingSchemaError(name);
    }
  }
}

