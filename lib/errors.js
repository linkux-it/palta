/**
 * @fileoverview Errors that will be used in all library.
 *
 */


/**
 * @class MissingSchemaError
 * @api private
 * @exports
 *
 */
export class MissingSchemaError extends Error {

  constructor (name) {
    let msg = `Schema hasn\'t been registered for model "${name}".\n` +
      'Use palta.model(name, schema)';

    super (msg);
  }

}


/**
 * @class OverwriteModelError
 * @api private
 * @exports
 *
 */
export class OverwriteModelError extends Error {

  constructor (name) {
    let message = `Cannot overwrite ${name} model once compiled.`;

    super (msg);
  }

}


/**
 * Document Validation Error
 *
 * @class ValidatorError
 * @api private
 * @param {Document} instance
 * @exports
 *
 */
export class ValidatorError extends Error {

  constructor (instance) {
    let message = 'Validation failed';

    if (instance && instance.constructor.name === 'model') {
      message = `${ intance.constructor.modelName } validation failed.`
    }

    super (message);

    this.name = 'ValidationError';
    this.errors = {};

    if (instance) {
      instance.errors = this.errors;
    }
  }

  toString () {
    var ret = this.name + ': ';
    var msgs = [];

    Object.keys(this.errors).forEach(function(key) {
      if (this === this.errors[key]) {
        return;
      }
      msgs.push(String(this.errors[key]));
    }, this);

    return ret + msgs.join(', ');
  }

}


/**
 * Casting Error constructor.
 *
 * @param {String} type
 * @param {String} value
 * @api private
 */
export class CastError extends Error {
  constructor(type, value, path, reason) {
    let msg =  `Cast to ${ type } failed for value "${ value }" at path "${ path }"`;

    super (message);

    this.name = 'CastError';
    this.kind = type;
    this.value = value;
    this.path = path;
    this.reason = reason;
  }
}
