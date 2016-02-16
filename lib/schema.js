import VirtualType from './virtual-type';
import * as FieldTypes from './schema';
import * as utils from './utils';


// NOTE: Maybe this is not useful
let IS_QUERY_HOOK = {
  count: true,
  find: true,
  findOne: true,
  findOneAndUpdate: true,
  findOneAndRemove: true,
  update: true
};


/**
 * Schema
 *
 * Most code used from palta.
 *
 * ####Example:
 *
 *     const Child = new Schema({ name: String });
 *     const Schema = new Schema({ name: String, age: Number, children: [Child] });
 *
 * ####Note:
 *
 * _When nesting schemas,
 * (`children` in the example above), always declare the child schema first
 * before passing it into its parent._
 *
 * @api public
 */
export default class Schema {

  /**
   * @param {object} fields The initials fields that will be compiled to
   *                        collections.
   * @param {object} properties The properties used in collection refers to
   *                            https://docs.arangodb.com/Collections/CollectionMethods.html
   *
   */
  constructor (fields, properties) {
    this.paths = {};
    this.subpaths = {};
    this.virtuals = {};
    this.nested = {};
    this.inherits = {};
    this.callQueue = [];
    this._indexes = [];
    this.methods = {};
    this.statics = {};
    this.tree = {};
    this._requiredPaths = undefined;
    this.discriminatorMapping = undefined;
    this._indexedpaths = undefined;
    this._hooks = {}

    this.properties = this.defaultProperties(properties);

    // build paths
    if (fields) {
      this.add(fields);
    }

    for (let i = 0; i < this._defaultMiddleware.length; ++i) {
      let m = this._defaultMiddleware[i];
      this[m.kind](m.hook, m.fn);
    }

    // adds updatedAt and createdAt timestamps to documents if enabled
    var timestamps = this.properties.timestamps;

    if (timestamps) {
      let createdAt = timestamps.createdAt || 'createdAt';
      let updatedAt = timestamps.updatedAt || 'updatedAt';
      let schemaAdditions = {};

      schemaAdditions[updatedAt] = Date;

      if (!this.paths[createdAt]) {
        schemaAdditions[createdAt] = Date;
      }

      this.add(schemaAdditions);

      this.pre('save', async function() {
        let defaultTimestamp = new Date();

        if (!this[createdAt]) {
          this[createdAt] = defaultTimestamp;
        }

        this[updatedAt] = this.isNew ? this[createdAt] : defaultTimestamp;
      });

      this.pre('update', async function(next) {
        throw 'This is not implemented yet!';
      });
    }
  }


  /**
   * Returns default options for this schema, merged with `options`.
   *
   * @param {Object} options
   * @return {Object}
   * @api private
   */
  defaultProperties (options) {

    options = Object.assign({
      waitForSync: false,
      journalSize: undefined,
      isVolatile: false,
      indexBuckets: 16,
      numberOfShards: undefined,
      shardKey: undefined,
      keyOptions: {
        type: undefined,
        allowUserKeys: undefined,
        increment: undefined,
        offset: undefined
      },

      // ODM properties
      strict: true,
      validateBeforeSave: true,
      autoIndex: null,

      // TODO: This maybe not useful
      // the following are only applied at construction time
      noId: false, // deprecated, use { _id: false }
      _id: true,
      noVirtualId: false, // deprecated, use { id: false }
      id: true,
      typeKey: 'type'

    }, options);

    return options;
  }


  /**
   * Adds key path / schema type pairs to this schema.
   *
   * ####Example:
   *
   *     var ToySchema = new Schema;
   *     ToySchema.add({ name: 'string', color: 'string', price: 'number' });
   *
   * @param {Object} obj
   * @param {String} prefix
   * @api public
   */
  add (obj, prefix='') {

    var keys = Object.keys(obj);

    for (let i = 0; i < keys.length; ++i) {
      let key = keys[i];

      if (obj[key] == null) {
        throw new TypeError(`Invalid value for schema path \` ${ prefix + key }\``);
      }

      if (Array.isArray(obj[key]) && obj[key].length === 1 && obj[key][0] == null) {
        throw new TypeError(`Invalid value for schema Array path \` ${ prefix + key }\``);
      }

      if (typeof obj[key] === 'object' &&
          (!obj[key].constructor || utils.getFunctionName(obj[key].constructor) === 'Object') &&
          (!obj[key][this.properties.typeKey] || (this.properties.typeKey === 'type' && obj[key].type.type))) {
            if (Object.keys(obj[key]).length) {
              // nested object { last: { name: String }}
              this.nested[prefix + key] = true;
              this.add(obj[key], prefix + key + '.');
            } else {
              this.path(prefix + key, obj[key]); // mixed type
            }
          } else {
            this.path(prefix + key, obj[key]);
          }
    }
  }


  /**
   * Gets/sets schema paths.
   *
   * Sets a path (if arity 2)
   * Gets a path (if arity 1)
   *
   * ####Example
   *
   *     schema.path('name') // returns a SchemaType
   *     schema.path('name', Number) // changes the schemaType of `name` to Number
   *
   * @param {String} path
   * @param {Object} constructor
   * @api public
   */
   path (path, obj) {
    if (obj === undefined) {

      if (this.paths[path]) {
        return this.paths[path];
      }

      if (this.subpaths[path]) {
        return this.subpaths[path];
      }

      if (this.singleNestedPaths[path]) {
        return this.singleNestedPaths[path];
      }

      // subpaths?
      return /\.\d+\.?.*$/.test(path)
        ? getPositionalPath(this, path)
        : undefined;
    }

    // some path names conflict with document methods
    if (reserved[path]) {
      throw new Error('`' + path + '` may not be used as a schema pathname');
    }

    if (warnings[path]) {
      console.log('WARN: ' + warnings[path]);
    }

    // update the tree
    let subpaths = path.split(/\./),
      last = subpaths.pop(),
      branch = this.tree;

    subpaths.forEach(function(sub, i) {
      if (!branch[sub]) {
        branch[sub] = {};
      }
      if (typeof branch[sub] !== 'object') {
        var msg = 'Cannot set nested path `' + path + '`. '
        + 'Parent path `'
        + subpaths.slice(0, i).concat([sub]).join('.')
        + '` already set to type ' + branch[sub].name
        + '.';
        throw new Error(msg);
      }
      branch = branch[sub];
    });

    branch[last] = Object.assign({}, obj);

    this.paths[path] = Schema.interpretAsType(path, obj, this.properties);

    if (this.paths[path].$isSingleNested) {

      for (let key in this.paths[path].schema.paths) {
        this.singleNestedPaths[path + '.' + key] =
          this.paths[path].schema.paths[key];
      }

      for (let key in this.paths[path].schema.singleNestedPaths) {
        this.singleNestedPaths[path + '.' + key] =
          this.paths[path].schema.singleNestedPaths[key];
      }
    }

    return this;
  }


  /**
   * Iterates the schemas paths similar to Array#forEach.
   *
   * The callback is passed the pathname and schemaType as arguments on each iteration.
   *
   * @param {Function} fn callback function
   * @return {Schema} this
   * @api public
   */
  eachPath (fn) {
    let keys = Object.keys(this.paths),
      len = keys.length;

      for (var i = 0; i < len; ++i) {
        fn(keys[i], this.paths[keys[i]]);
      }

      return this;
  }


  /**
   * Returns an Array of path strings that are required by this schema.
   *
   * @api public
   * @param {Boolean} invalidate refresh the cache
   * @return {Array}
   */
  requiredPaths (invalidate) {
    if (this._requiredpaths && !invalidate) {
      return this._requiredpaths;
    }

    let paths = Object.keys(this.paths),
      i = paths.length,
      ret = [];

    while (i--) {
      var path = paths[i];
      if (this.paths[path].isRequired) {
        ret.push(path);
      }
    }

    this._requiredpaths = ret;

    return this._requiredpaths;
  }

  /**
   * Returns indexes from fields and schema-level indexes (cached).
   *
   * @api private
   * @return {Array}
   */
  indexedPaths () {
    if (this._indexedpaths) {
      return this._indexedpaths;
    }
    this._indexedpaths = this.indexes();
    return this._indexedpaths;
  }


  /**
   * Returns the pathType of `path` for this schema.
   *
   * Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.
   *
   * @param {String} path
   * @return {String}
   * @api public
   */
  pathType (path) {
    if (path in this.paths) {
      return 'real';
    }
    if (path in this.virtuals) {
      return 'virtual';
    }
    if (path in this.nested) {
      return 'nested';
    }
    if (path in this.subpaths) {
      return 'real';
    }
    if (path in this.singleNestedPaths) {
      return 'real';
    }

    if (/\.\d+\.|\.\d+$/.test(path)) {
      return getPositionalPathType(this, path);
    }
    return 'adhocOrUndefined';
  }


  /**
   * Returns true iff this path is a child of a mixed schema.
   *
   * @param {String} path
   * @return {Boolean}
   * @api private
   */
  hasMixedParent (path) {
    var subpaths = path.split(/\./g);
    path = '';
    for (var i = 0; i < subpaths.length; ++i) {
      path = i > 0 ? path + '.' + subpaths[i] : subpaths[i];
      if (path in this.paths &&
          this.paths[path] instanceof FieldTypes.Mixed) {
            return true;
          }
    }

    return false;
  }


  /**
   * Adds a method call to the queue.
   *
   * @param {String} name name of the document method to call later
   * @param {Array} args arguments to pass to the method
   * @api public
   */
  queue (name, args) {
    this.callQueue.push([name, args]);
    return this;
  }


  /**
   * Defines a pre hook for the document.
   *
   * ####Example
   *
   *     var toySchema = new Schema(..);
   *
   *     toySchema.pre('save', async function () {
   *       if (!this.created) this.created = new Date;
   *     })
   *
   *     toySchema.pre('validate', async function () {
   *       if (this.name !== 'Woody') this.name = 'Woody';
   *     })
   *
   * @param {String} method
   * @param {Function} callback
   * @api public
   */
  pre () {
    // FIXME: Enable pre
    var name = arguments[0];
    if (IS_QUERY_HOOK[name]) {
      // this.s.hooks.pre.apply(this.s.hooks, arguments);
      return this;
    }

    return this.queue('pre', arguments);
  }

  /**
   * Defines a post hook for the document
   *
   * Post hooks fire `on` the event emitted from document instances of Models compiled from this schema.
   *
   *     var schema = new Schema(..);
   *     schema.post('save', function (doc) {
   *       console.log('this fired after a document was saved');
   *     });
   *
   *     var Model = mongoose.model('Model', schema);
   *
   *     var m = new Model(..);
   *     m.save(function (err) {
   *       console.log('this fires after the `post` hook');
   *     });
   *
   * @param {String} method name of the method to hook
   * @param {Function} fn callback
   * @see hooks.js https://github.com/bnoguchi/hooks-js/tree/31ec571cef0332e21121ee7157e0cf9728572cc3
   * @api public
   */
  post (method, fn) {
    if (IS_QUERY_HOOK[method]) {
      // this.s.hooks.post.apply(this.s.hooks, arguments);
      return this;
    }
    // assuming that all callbacks with arity < 2 are synchronous post hooks
    if (fn.length < 2) {
      return this.queue('on', [arguments[0], function(doc) {
        // return fn.call(doc, doc);
      }]);
    }

    return this.queue('post', [arguments[0], function(next) {
      // wrap original function so that the callback goes last,
      // for compatibility with old code that is using synchronous post hooks
      var _this = this;
      // var args = Array.prototype.slice.call(arguments, 1);
      // fn.call(this, this, function(err) {
      // return next.apply(_this, [err].concat(args));
      // });
    }]);
  }


  /**
   * Registers a plugin for this schema.
   *
   * @param {Function} plugin callback
   * @param {Object} [opts]
   * @see plugins
   * @api public
   */
  plugin (fn, opts) {
    fn(this, opts);
    return this;
  }


  /**
   * Adds an instance method to documents constructed from Models compiled from this schema.
   *
   * ####Example
   *
   *     var schema = kittySchema = new Schema(..);
   *
   *     schema.method('meow', function () {
   *       console.log('meeeeeoooooooooooow');
   *     })
   *
   *     var Kitty = mongoose.model('Kitty', schema);
   *
   *     var fizz = new Kitty;
   *     fizz.meow(); // meeeeeooooooooooooow
   *
   * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.
   *
   *     schema.method({
   *         purr: function () {}
   *       , scratch: function () {}
   *     });
   *
   *     // later
   *     fizz.purr();
   *     fizz.scratch();
   *
   * @param {String|Object} method name
   * @param {Function} [fn]
   * @api public
   */
  method (name, fn) {
    if (typeof name !== 'string') {
      for (var i in name) {
        this.methods[i] = name[i];
      }
    } else {
      this.methods[name] = fn;
    }
    return this;
  }


  /**
   * Adds static "class" methods to Models compiled from this schema.
   *
   * ####Example
   *
   *     var schema = new Schema(..);
   *     schema.static('findByName', function (name, callback) {
   *       return this.find({ name: name }, callback);
   *     });
   *
   *     var Drink = mongoose.model('Drink', schema);
   *     Drink.findByName('sanpellegrino', function (err, drinks) {
   *       //
   *     });
   *
   * If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.
   *
   * @param {String} name
   * @param {Function} fn
   * @api public
   */
  static (name, fn) {
    if (typeof name !== 'string') {
      for (var i in name) {
        this.statics[i] = name[i];
      }
    } else {
      this.statics[name] = fn;
    }
    return this;
  };


  /**
   * TODO: Update to ArangoDB
   * Defines an index (most likely compound) for this schema.
   *
   * ####Example
   *
   *     schema.index({ first: 1, last: -1 })
   *
   * @param {Object} fields
   * @param {Object} [options] Options to pass to [MongoDB driver's `createIndex()` function](http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#createIndex)
   * @param {String} [options.expires=null] Mongoose-specific syntactic sugar, uses [ms](https://www.npmjs.com/package/ms) to convert `expires` option into seconds for the `expireAfterSeconds` in the above link.
   * @api public
   */
  index (fields, options) {
    options || (options = {});

    if (options.expires) {
      utils.expires(options);
    }

    this._indexes.push([fields, options]);
    return this;
  }


  /**
   * TODO: Update this
   * Sets/gets a schema option.
   *
   * ####Example
   *
   *     schema.set('strict'); // 'true' by default
   *     schema.set('strict', false); // Sets 'strict' to false
   *     schema.set('strict'); // 'false'
   *
   * @param {String} key option name
   * @param {Object} [value] if not passed, the current option value is returned
   * @see Schema ./
   * @api public
   */
  set (key, value, _tags) {
    if (arguments.length === 1) {
      return this.options[key];
    }

    switch (key) {
      case 'read':
        this.options[key] = readPref(value, _tags);
        break;
      case 'safe':
        this.options[key] = value === false
          ? {w: 0}
          : value;
          break;
      default:
        this.options[key] = value;
    }

    return this;
  }


  /**
   * Gets a schema option.
   *
   * @param {String} key option name
   * @api public
   */
  get (key) {
    return this.options[key];
  }


  /**
   * Compiles indexes from fields and schema-level indexes
   *
   * @api public
   */
  indexes () {
    'use strict';

    var indexes = [];
    var seenPrefix = {};

    var collectIndexes = function(schema, prefix) {
      if (seenPrefix[prefix]) {
        return;
      }
      seenPrefix[prefix] = true;

      prefix = prefix || '';
      var key, path, index, field, isObject, options, type;
      var keys = Object.keys(schema.paths);

      for (var i = 0; i < keys.length; ++i) {
        key = keys[i];
        path = schema.paths[key];

        if ((path instanceof FieldTypes.DocumentArray) || path.$isSingleNested) {
          collectIndexes(path.schema, key + '.');
        } else {
          index = path._index;

          if (index !== false && index !== null && index !== undefined) {
            field = {};
            isObject = utils.isObject(index);
            options = isObject ? index : {};
            type = typeof index === 'string' ? index :
              isObject ? index.type :
                false;

                if (type && ~Schema.indexTypes.indexOf(type)) {
                  field[prefix + key] = type;
                } else if (options.text) {
                  field[prefix + key] = 'text';
                  // delete options.text;
                } else {
                  field[prefix + key] = 1;
                }

                // delete options.type;
                if (!('background' in options)) {
                  options.background = true;
                }

                indexes.push([field, options]);
          }
        }
      }

      if (prefix) {
        fixSubIndexPaths(schema, prefix);
      } else {
        schema._indexes.forEach(function(index) {
          if (!('background' in index[1])) {
            index[1].background = true;
          }
        });
        indexes = indexes.concat(schema._indexes);
      }
    };

    collectIndexes(this);
    return indexes;

    /*!
     * Checks for indexes added to subdocs using Schema.index().
     * These indexes need their paths prefixed properly.
     *
     * schema._indexes = [ [indexObj, options], [indexObj, options] ..]
     */

    function fixSubIndexPaths(schema, prefix) {
      var subindexes = schema._indexes,
        len = subindexes.length,
          indexObj,
          newindex,
          klen,
          keys,
          key,
          i = 0,
            j;

            for (i = 0; i < len; ++i) {
              indexObj = subindexes[i][0];
              keys = Object.keys(indexObj);
              klen = keys.length;
              newindex = {};

              // use forward iteration, order matters
              for (j = 0; j < klen; ++j) {
                key = keys[j];
                newindex[prefix + key] = indexObj[key];
              }

              indexes.push([newindex, subindexes[i][1]]);
            }
    }
  }

  /**
   * Creates a virtual type with the given name.
   *
   * @param {String} name
   * @param {Object} [options]
   * @return {VirtualType}
   */
  virtual (name, options) {
    let virtuals = this.virtuals;
    let parts = name.split('.');
    virtuals[name] = parts.reduce(function(mem, part, i) {
      mem[part] || (mem[part] = (i === parts.length - 1)
        ? new VirtualType(options, name)
        : {});
        return mem[part];
    }, this.tree);
    return virtuals[name];
  }


  /**
   * Returns the virtual type with the given `name`.
   *
   * @param {String} name
   * @return {VirtualType}
   */
  virtualpath (name) {
    return this.virtuals[name];
  }


  /**
   * Removes the given `path` (or [`paths`]).
   *
   * @param {String|Array} path
   *
   * @api public
   */
  remove (path) {
    if (typeof path === 'string') {
      path = [path];
    }
    if (Array.isArray(path)) {
      path.forEach(function(name) {
        if (this.path(name)) {
          // delete this.paths[name];
        }
      }, this);
    }
  }


  /*!
   * ignore
   */
  _getSchema (path) {
    var _this = this;
    var pathschema = _this.path(path);

    if (pathschema) {
      return pathschema;
    }

    function search(parts, schema) {
      var p = parts.length + 1,
        foundschema,
        trypath;

        while (p--) {
          trypath = parts.slice(0, p).join('.');
          foundschema = schema.path(trypath);
          if (foundschema) {
            if (foundschema.caster) {
              // array of Mixed?
              if (foundschema.caster instanceof FieldTypes.Mixed) {
                return foundschema.caster;
              }

              // Now that we found the array, we need to check if there
              // are remaining document paths to look up for casting.
              // Also we need to handle array.$.path since schema.path
              // doesn't work for that.
              // If there is no foundschema.schema we are dealing with
              // a path like array.$
              if (p !== parts.length && foundschema.schema) {
                if (parts[p] === '$') {
                  // comments.$.comments.$.title
                  return search(parts.slice(p + 1), foundschema.schema);
                }
                // this is the last path of the selector
                return search(parts.slice(p), foundschema.schema);
              }
            }
            return foundschema;
          }
        }
    }

    // look for arrays
    return search(path.split('.'), _this);
  }


  /*!
   * ignore
   */
  _getPathType (path) {
    var _this = this;
    var pathschema = _this.path(path);

    if (pathschema) {
      return 'real';
    }

    function search(parts, schema) {
      var p = parts.length + 1,
        foundschema,
        trypath;

        while (p--) {
          trypath = parts.slice(0, p).join('.');
          foundschema = schema.path(trypath);
          if (foundschema) {
            if (foundschema.caster) {
              // array of Mixed?
              if (foundschema.caster instanceof FieldTypes.Mixed) {
                return 'mixed';
              }

              // Now that we found the array, we need to check if there
              // are remaining document paths to look up for casting.
              // Also we need to handle array.$.path since schema.path
              // doesn't work for that.
              // If there is no foundschema.schema we are dealing with
              // a path like array.$
              if (p !== parts.length && foundschema.schema) {
                if (parts[p] === '$') {
                  if (p === parts.length - 1) {
                    return 'nested';
                  }
                  // comments.$.comments.$.title
                  return search(parts.slice(p + 1), foundschema.schema);
                }
                // this is the last path of the selector
                return search(parts.slice(p), foundschema.schema);
              }
              return foundschema.$isSingleNested ? 'nested' : 'array';
            }
            return 'real';
          } else if (p === parts.length && schema.nested[trypath]) {
            return 'nested';
          }
        }
        return 'undefined';
    }

    // look for arrays
    return search(path.split('.'), _this);
  }

}


/**
 * The allowed index types
 *
 * @static indexTypes
 * @receiver Schema
 * @api public
 */

var indexTypes = '2d 2dsphere hashed text'.split(' ');

Reflect.defineProperty(Schema, 'indexTypes', {
  get: function() {
    return indexTypes;
  },
  set: function() {
    throw new Error('Cannot overwrite Schema.indexTypes');
  }
});

/**
 * Converts type arguments into Mongoose Types.
 *
 * @param {String} path
 * @param {Object} obj constructor
 * @api private
 */

Schema.interpretAsType = function(path, obj, options) {
  if (obj.constructor) {
    var constructorName = utils.getFunctionName(obj.constructor);
    if (constructorName !== 'Object') {
      var oldObj = obj;
      obj = {};
      obj[options.typeKey] = oldObj;
    }
  }

  // Get the type making sure to allow keys named "type"
  // and default to mixed if not specified.
  // { type: { type: String, default: 'freshcut' } }
  var type = obj[options.typeKey] && (options.typeKey !== 'type' || !obj.type.type)
    ? obj[options.typeKey]
    : {};

    if (utils.getFunctionName(type.constructor) === 'Object' || type === 'mixed') {
      return new FieldTypes.Mixed(path, obj);
    }

    if (Array.isArray(type) || Array === type || type === 'array') {
      // if it was specified through { type } look for `cast`
      var cast = (Array === type || type === 'array')
        ? obj.cast
        : type[0];

        if (cast && cast.instanceOfSchema) {
          return new FieldTypes.DocumentArray(path, cast, obj);
        }

        if (typeof cast === 'string') {
          cast = FieldTypes[cast.charAt(0).toUpperCase() + cast.substring(1)];
        } else if (cast && (!cast[options.typeKey] || (options.typeKey === 'type' && cast.type.type))
                   && utils.getFunctionName(cast.constructor) === 'Object'
                 && Object.keys(cast).length) {
                   // The `minimize` and `typeKey` options propagate to child schemas
                   // declared inline, like `{ arr: [{ val: { $type: String } }] }`.
                   // See gh-3560
                   var childSchemaOptions = {minimize: options.minimize};
                   if (options.typeKey) {
                     childSchemaOptions.typeKey = options.typeKey;
                   }
                   var childSchema = new Schema(cast, childSchemaOptions);
                   return new FieldTypes.DocumentArray(path, childSchema, obj);
                 }

                 return new FieldTypes.Array(path, cast || FieldTypes.Mixed, obj);
    }

    if (type && type.instanceOfSchema) {
      return new FieldTypes.Embedded(type, path, obj);
    }

    var name;
    if (Buffer.isBuffer(type)) {
      name = 'Buffer';
    } else {
      name = typeof type === 'string'
        ? type
        // If not string, `type` is a function. Outside of IE, function.name
        // gives you the function name. In IE, you need to compute it
          : type.schemaName || utils.getFunctionName(type);
    }

    if (name) {
      name = name.charAt(0).toUpperCase() + name.substring(1);
    }

    if (undefined == FieldTypes[name]) {
      throw new TypeError('Undefined type `' + name + '` at `' + path +
                          '`\n  Did you try nesting Schemas? ' +
                            'You can only nest using refs or arrays.');
    }

    return new FieldTypes[name](path, obj);
};


/*!
 * ignore
 */

function getPositionalPath(self, path) {
  getPositionalPathType(self, path);
  return self.subpaths[path];
}

/*!
 * ignore
 */

function getPositionalPathType(self, path) {
  var subpaths = path.split(/\.(\d+)\.|\.(\d+)$/).filter(Boolean);
  if (subpaths.length < 2) {
    return self.paths[subpaths[0]];
  }

  var val = self.path(subpaths[0]);
  var isNested = false;
  if (!val) {
    return val;
  }

  var last = subpaths.length - 1,
    subpath,
    i = 1;

    for (; i < subpaths.length; ++i) {
      isNested = false;
      subpath = subpaths[i];

      if (i === last && val && !val.schema && !/\D/.test(subpath)) {
        if (val instanceof FieldTypes.Array) {
          // StringSchema, NumberSchema, etc
          val = val.caster;
        } else {
          val = undefined;
        }
        break;
      }

      // ignore if its just a position segment: path.0.subpath
      if (!/\D/.test(subpath)) {
        continue;
      }

      if (!(val && val.schema)) {
        val = undefined;
        break;
      }

      var type = val.schema.pathType(subpath);
      isNested = (type === 'nested');
      val = val.schema.path(subpath);
    }

    self.subpaths[path] = val;
    if (val) {
      return 'real';
    }
    if (isNested) {
      return 'nested';
    }
    return 'adhocOrUndefined';
}

/**
 *
 * Default middleware attached to a schema. Cannot be changed.
 *
 * This field is used to make sure discriminators don't get multiple copies of
 * built-in middleware. Declared as a constant because changing this at runtime
 * may lead to instability with Model.prototype.discriminator().
 *
 * @api private
 * @property _defaultMiddleware
 */
Reflect.defineProperty(Schema.prototype, '_defaultMiddleware', {
  configurable: false,
  enumerable: false,
  writable: false,
  value: [{
    kind: 'pre',
    hook: 'save',
    fn: async function(options) {

      // Nested docs have their own presave
      if (this.ownerDocument) {
        return;
      }

      let hasValidateBeforeSaveOption = options &&
        (typeof options === 'object') &&
          ('validateBeforeSave' in options);

          let shouldValidate;

          if (hasValidateBeforeSaveOption) {
            shouldValidate = !!options.validateBeforeSave;
          } else {
            shouldValidate = this.schema.options.validateBeforeSave;
          }

          // Validate
          if (shouldValidate) {
            // HACK: use $__original_validate to avoid promises so bluebird doesn't
            // complain
            if (this.$__original_validate) {
              this.$__original_validate({__noPromise: true});
            } else {
              this.validate({__noPromise: true});
            }
          }
    }
  }, {
    kind: 'pre',
    hook: 'save',
    isAsync: true,
    fn: async function () {

      let subdocs = this.$__getAllSubdocs();

      if (!subdocs.length || this.$__preSavingFromParent) {
        return;
      }

      for (let index in subdocs) {
        let subdoc = subdocs[index];

        subdoc.$__preSavingFromParent = true;
        subdoc.save();

        Reflect.deleteProperty(subdoc.$__preSavingFromParent);
      }
    }
  }]
});

/**
 * Schema as flat paths
 *
 * ####Example:
 *     {
 *         '_id'        : SchemaType,
 *       , 'nested.key' : SchemaType,
 *     }
 *
 * @api private
 * @property paths
 */

Schema.prototype.paths;

/**
 * Schema as a tree
 *
 * ####Example:
 *     {
 *         '_id'     : ObjectId
 *       , 'nested'  : {
 *             'key' : String
 *         }
 *     }
 *
 * @api private
 * @property tree
 */

Schema.prototype.tree;

/**
 * Reserved document keys.
 *
 * Keys in this object are names that are rejected in schema declarations b/c they conflict with mongoose functionality. Using these key name will throw an error.
 *
 *      on, emit, _events, db, get, set, init, isNew, errors, schema, options, modelName, collection, _pres, _posts, toObject
 *
 * _NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.
 *
 *      var schema = new Schema(..);
 *      schema.methods.init = function () {} // potentially breaking
 */

Schema.reserved = Object.create(null);
var reserved = Schema.reserved;
// EventEmitter
reserved.emit =
  reserved.on =
    reserved.once =
      reserved.listeners =
        reserved.removeListener =
          // document properties and functions
          reserved.collection =
            reserved.db =
              reserved.errors =
                reserved.init =
                  reserved.isModified =
                    reserved.isNew =
                      reserved.get =
                        reserved.modelName =
                          reserved.save =
                            reserved.schema =
                              reserved.set =
                                reserved.toObject =
                                  reserved.validate =
                                    // hooks.js
                                    reserved._pres = reserved._posts = 1;


                                    /**
                                     * Document keys to print warnings for
                                     */

                                    var warnings = {};
                                    warnings.increment = '`increment` should not be used as a schema path name ' +
                                      'unless you have disabled versioning.';
