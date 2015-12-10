/**
 * Arango entry point to connect to arango and other things.
 */

// Package imports
import Document from './lib/document';


// Re export
export { db, connect } from './lib/connection';


/**
 * @description Define the collection using the schema.
 *
 * If schema is provided will create/update the collection class and will
 * return the class but if not provided it will only return the class.
 *
 * @param {string} name The name that will be used as reference.
 * @param {!Schema} schema The schema used to create the collection.
 */
export function collection(name, schema) {

}
