import arangojs from 'arangojs';


const databaseName = 'test';

const db = arangojs({
  url: process.env.ARANGO_URL || 'http://localhost:8529' ,
});


before(function (done) {
  db.createDatabase(databaseName, function (err, info) {
    if (err){
      console.error(err.stack);
      done(err);
    } else {
      done();
    }
  });
});


after(function (done) {
  db.dropDatabase(databaseName, function (err, info) {
    if (err) console.error(err.stack);
    done();
  });
});
