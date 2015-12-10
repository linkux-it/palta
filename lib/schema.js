/**
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 * @fileoverview Schema logic here, it is based on mongoose schema code.
 */

import Kareem from 'kareem';

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
 * _When nesting schemas, (`children` in the example above), always declare the child schema first before passing it into its parent._
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
  constructor (fields, options) {
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
    this._requiredpaths = undefined;
    this.discriminatorMapping = undefined;
    this._indexedpaths = undefined;

    this.s = {
      hooks: new Kareem()
    };
  }

}
