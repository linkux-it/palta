/**
 * Adapter for factory girl
 *
 */


export default class Adapter {

  build (Document, attributes) {
    return new Document(attributes);
  }

  get (doc, attr, Document) {
    return doc.get(attr);
  }

  set (props, doc, Model) {
    return doc.set(props);
  }

  save (doc, Document, callback) {
    doc.save(function (err) {
      if (err) {
        return callback(err);
      }
      callback();
    });
  }

  destroy (doc, Document, callback) {
    doc.remove(function (err) {
      if (err) {
        return callback(err);
      }
      callback();
    });
  };

}
