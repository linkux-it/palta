/**
 * Errors that will be raised in all library.
 *
 */

export class MissingSchemaError extends Error {

  constructor (name) {
    let msg = `Schema hasn\'t been registered for model "${name}".\n` +
      'Use palta.model(name, schema)';

    super (msg);
  }

}

