/**
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 * @fileoverview Arango entry point to connect to arango and other things.
 *
 */

import { Database } from 'arangojs';


// Package imports
import Document from './lib/document';
import Schema from './lib/schema';

import * as errors from './lib/errors';


/**
 * @class Palta
 * @classdesc Class that is used as an interface to register models and use it.
 *
 *            The default exports object of the `palta` module is an
 *            instance of this class.
 *
 *            Most apps will only use this one instance.
 * @api public
 */
export class Palta {

  constructor () {
    this._connection = null;
    this.plugins = [];
    this.models = {};
    this.modelSchemas = {};

    // default global options
    this.options = {
      pluralization: true
    };
  }

  /**
   * Sets palta options
   *
   * ####Example:
   *
   *     // sets the 'test' option to `value`
   *     palta.set('test', value)
   *
   *     // enable logging collection methods + arguments to the console
   *     palta.set('debug', true)
   *
   *     // use custom function to log collection methods + arguments
   *     palta.set(
   *       'debug',
   *       function(collectionName, methodName, arg1, arg2...) {}
   *     );
   *
   * @param {String} key
   * @param {String|Function} value
   * @method set
   * @api public
   */
  set (key, value) {
    this.options[key] = value;
    return this;
  }


  /**
   * Gets palta options
   *
   * ####Example:
   *
   *     palta.get('test') // returns the 'test' value
   *
   * @param {String} key
   * @method get
   * @api public
   */
  get (key, value) {
    return this.options[key];
  }


  /**
   * @desc This function is used to connect to ArangoDB.
   *
   *       This whill create a database object what will be shared with all
   *       documents, graphs and all arango interaction needs.
   *
   * @param {Object} config This params will be same as
   *                         https://github.com/arangodb/arangojs#database-api
   *
   * @return {Palta} this
   */
  connect(config) {
    this._connection = new Database(config);
    return this;
  }


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
   * @api public
   */
  model(name, { schema, collection }) {

    if (schema && !(schema instanceof Schema)) {
      schema = new Schema(schema);
    }

    if (!this.modelSchemas[name]) {
      if (schema) {
        modelSchemas[name] = schema;
        this._applyPlugins(schema);
      } else {
        throw new errors.MissingSchemaError(name);
      }
    }

    let model, sub;

    if (modelSchemas[name] && false !== options.cache) {
      if (schema && schema instanceof Schema && schema != modelSchemas[name].schema) {
        throw new errors.OverwriteModelError(name);
      }

      if (collection) {
        // subclass current model with alternate collection
        model = this.models[name];
        schema = model.prototype.schema;
        // TODO: This maybe is not needed
        sub = model.__subclass(this.connection, schema, collection);
        // do not cache the sub model
        return sub;
      }

      return this.models[name];
    }


    // ensure a schema exists
    if (!schema) {
      schema = this.modelSchemas[name];
      if (!schema) {
        throw new errors.MissingSchemaError(name);
      }
    }

    // Apply relevant "global" options to the schema
    if (!('pluralization' in schema.options))
      schema.options.pluralization = this.options.pluralization;


    if (!collection) {
      collection = schema.get('collection') || format(name, schema.options);
    }

    let connection = options.connection || this.connection;

    model = Model.compile(name, schema, collection, connection, this);

    // FIXME: Maybe init
    // if (!skipInit) {
    //   model.init();
    // }

    if (options.cache === false) {
      return model;
    }

    this.models[name] = model;
    return this.models[name];
  }


  /**
   * Returns an array of model names created on this instance of Palta.
   *
   * ####Note:
   *
   * _Does not include names of models created using `connection.model()`._
   *
   * @api public
   * @return {Array}
   */
  modelNames () {
    return Object.keys(this.models);
  }


  /**
   * Applies global plugins to `schema`.
   *
   * @param {Schema} schema
   * @api private
   */
  applyPlugins (schema) {
    for (var i = 0, l = this.plugins.length; i < l; i++) {
      schema.plugin(this.plugins[i][0], this.plugins[i][1]);
    }
  }


  /**
   * Declares a global plugin executed on all Schemas.
   *
   * Equivalent to calling `.plugin(fn)` on each Schema you create.
   *
   * @param {Function} fn plugin callback
   * @param {Object} [opts] optional options
   * @return {Palta} this
   * @see plugins ./plugins.html
   * @api public
   */
  plugin (fn, opts) {
    this.plugins.push([fn, opts]);
    return this;
  }


  /**
   * The default connection of the palta module.
   *
   * ####Example:
   *
   *     var palta = require('palta');
   *     palta.connect(...);
   *
   * This is the connection used by default for every model created using [palta.model](#index_Palta-model).
   *
   * @property connection
   * @return {Connection}
   * @api public
   */

  get connection () {
    return this._connection;
  }

}

export default new Palta();


// Re export some Classes
export {
  Schema
}


// /**
//  * The Mongoose Aggregate constructor
//  *
//  * @method Aggregate
//  * @api public
//  */
//
// Mongoose.prototype.Aggregate = Aggregate;
//
// /**
//  * The Mongoose Collection constructor
//  *
//  * @method Collection
//  * @api public
//  */
//
// Mongoose.prototype.Collection = Collection;
//
// /**
//  * The Mongoose [Connection](#connection_Connection) constructor
//  *
//  * @method Connection
//  * @api public
//  */
//
// Mongoose.prototype.Connection = Connection;
//
// /**
//  * The Mongoose version
//  *
//  * @property version
//  * @api public
//  */
//
// Mongoose.prototype.version = pkg.version;
//
// /**
//  * The Mongoose constructor
//  *
//  * The exports of the mongoose module is an instance of this class.
//  *
//  * ####Example:
//  *
//  *     var mongoose = require('mongoose');
//  *     var mongoose2 = new mongoose.Mongoose();
//  *
//  * @method Mongoose
//  * @api public
//  */
//
// Mongoose.prototype.Mongoose = Mongoose;
//
// /**
//  * The Mongoose [Schema](#schema_Schema) constructor
//  *
//  * ####Example:
//  *
//  *     var mongoose = require('mongoose');
//  *     var Schema = mongoose.Schema;
//  *     var CatSchema = new Schema(..);
//  *
//  * @method Schema
//  * @api public
//  */
//
// Mongoose.prototype.Schema = Schema;
//
// /**
//  * The Mongoose [SchemaType](#schematype_SchemaType) constructor
//  *
//  * @method SchemaType
//  * @api public
//  */
//
// Mongoose.prototype.SchemaType = SchemaType;
//
// /**
//  * The various Mongoose SchemaTypes.
//  *
//  * ####Note:
//  *
//  * _Alias of mongoose.Schema.Types for backwards compatibility._
//  *
//  * @property SchemaTypes
//  * @see Schema.SchemaTypes #schema_Schema.Types
//  * @api public
//  */
//
// Mongoose.prototype.SchemaTypes = Schema.Types;
//
// /**
//  * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
//  *
//  * @method VirtualType
//  * @api public
//  */
//
// Mongoose.prototype.VirtualType = VirtualType;
//
// /**
//  * The various Mongoose Types.
//  *
//  * ####Example:
//  *
//  *     var mongoose = require('mongoose');
//  *     var array = mongoose.Types.Array;
//  *
//  * ####Types:
//  *
//  * - [ObjectId](#types-objectid-js)
//  * - [Buffer](#types-buffer-js)
//  * - [SubDocument](#types-embedded-js)
//  * - [Array](#types-array-js)
//  * - [DocumentArray](#types-documentarray-js)
//  *
//  * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
//  *
//  *     var ObjectId = mongoose.Types.ObjectId;
//  *     var id1 = new ObjectId;
//  *
//  * @property Types
//  * @api public
//  */
//
// Mongoose.prototype.Types = Types;
//
// /**
//  * The Mongoose [Query](#query_Query) constructor.
//  *
//  * @method Query
//  * @api public
//  */
//
// Mongoose.prototype.Query = Query;
//
//
// // Re export
// export { db } from './lib/connection';
//
//
// /**
//  * @exports Schema
//  * @exports Palta
//  *
//  */
// export {Schema, Palta};
//
//
// let modelSchemas = {};

// /**
//  * The Mongoose [Model](#model_Model) constructor.
//  *
//  * @method Model
//  * @api public
//  */
//
// Mongoose.prototype.Model = Model;
//
// /**
//  * The Mongoose [Document](#document-js) constructor.
//  *
//  * @method Document
//  * @api public
//  */
//
// Mongoose.prototype.Document = Document;
//
// /**
//  * The Mongoose DocumentProvider constructor.
//  *
//  * @method DocumentProvider
//  * @api public
//  */
//
// Mongoose.prototype.DocumentProvider = require('./document_provider');
//
// /**
//  * The [MongooseError](#error_MongooseError) constructor.
//  *
//  * @method Error
//  * @api public
//  */
//
// Mongoose.prototype.Error = require('./error');
//
// /**
//  * The Mongoose CastError constructor
//  *
//  * @method Error
//  * @api public
//  */
//
// Mongoose.prototype.CastError = require('./error/cast');
//
// /**
//  * The [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver Mongoose uses.
//  *
//  * @property mongo
//  * @api public
//  */
//
// Mongoose.prototype.mongo = require('mongodb');
//
// /**
//  * The [mquery](https://github.com/aheckmann/mquery) query builder Mongoose uses.
//  *
//  * @property mquery
//  * @api public
//  */
//
// Mongoose.prototype.mquery = require('mquery');
//
// /*!
//  * The exports object is an instance of Mongoose.
//  *
//  * @api public
//  */
