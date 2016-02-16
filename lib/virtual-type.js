/**
 * @class VirtualType constructor
 *
 * This is what palta uses to define virtual attributes via `Schema.prototype.virtual`.
 *
 * ####Example:
 *
 *     var fullname = schema.virtual('fullname');
 *     fullname instanceof palta.VirtualType // true
 *
 * @parma {Object} options
 * @api public
 */

export default class VirtualType {

  constructor (options={}, name) {
    this.path = name;
    this.getters = [];
    this.setters = [];
    this.options = options;
  }

  /**
   * Defines a getter.
   *
   * ####Example:
   *
   *     var virtual = schema.virtual('fullname');
   *     virtual.get(function () {
   *       return this.name.first + ' ' + this.name.last;
   *     });
   *
   * @param {Function} fn
   * @return {VirtualType} this
   * @api public
   */
  get (fn) {
    this.getters.push(fn);
    return this;
  }


  /**
   * Defines a setter.
   *
   * ####Example:
   *
   *     var virtual = schema.virtual('fullname');
   *     virtual.set(function (v) {
   *       var parts = v.split(' ');
   *       this.name.first = parts[0];
   *       this.name.last = parts[1];
   *     });
   *
   * @param {Function} fn
   * @return {VirtualType} this
   * @api public
   */
  set (fn) {
    this.setters.push(fn);
    return this;
  }


  /**
   * Applies getters to `value` using optional `scope`.
   *
   * @param {Object} value
   * @param {Object} scope
   * @return {any} the value after applying all getters
   * @api public
   */
  applyGetters (value, scope) {
    let v = value;
    for (let l = this.getters.length - 1; l >= 0; l--) {
      v = Reflect.apply(this.getters[l], scope, v, this);
    }
    return v;
  }

  /**
   * Applies setters to `value` using optional `scope`.
   *
   * @param {Object} value
   * @param {Object} scope
   * @return {any} the value after applying all setters
   * @api public
   */
  applySetters (value, scope) {
    let v = value;
    for (let l = this.setters.length - 1; l >= 0; l--) {
      v = Reflect.apply(this.setters[l], scope, v, this);
    }
    return v;
  };

}




