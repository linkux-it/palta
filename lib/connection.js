/**
 * Copyright (c) 2015
 *
 * @author Luis Carlos Cruz Carballo [lcruzc@linkux-it.com]
 *
 * @fileoverview Some methods and shared variables to connect with ArangoDB.
 */

import {Database} from 'arangojs';


/**
 * Database shared connection
 *
 */
export let db = null;


/**
 * @param {Object} config This params will be same as
 *                         https://github.com/arangodb/arangojs#database-api
 *
 * @desc This function is used to connect to ArangoDB.
 *
 * This whill create a database object what will be shared with all
 * documents, graphs and all arango interaction needs.
 *
 */
export function connect(config) {
  db = new Database(config);
}
