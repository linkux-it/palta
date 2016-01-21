/**
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 * @fileoverview Schema logic here, it is based on mongoose schema code.
 */

/**
 * Schema
 *
 * Most code used from mongoose.
 *
 * ####Example:
 *
 *     var child = new Schema({ name: String });
 *     var schema = new Schema({ name: String, age: Number, children: [child] });
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
    if (obj) {
      this.add(obj);
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

      this.pre('update', function(next) {
        throw 'This is not implemented yet!';
      });
    }
  }

  static [Symbol.hasInstance] (lho) {
    return Array.isArray(lho);
  }

}
