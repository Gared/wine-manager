var restify = require('restify');
var pg = require('pg');
var config = require('./config');
var validator = require('validator');

var postgreUri = 'postgres://'+config.postgre.user+':'+config.postgre.password+'@'+config.postgre.host+':'+config.postgre.port+'/'+config.postgre.database;

pg.defaults.ssl = true;

var parseSQLFilter = function(filter) {
  if (!config.database.searchColumns) {
    return console.log('Paramter config.database.searchColumns is missing');
  }
  
  var params = [];
  var searchColumns = [];
  
  config.database.searchColumns.forEach(function(column) {
    if (filter[column]) {
      searchColumns.push(column);
      params.push(filter[column]);
    }
  });
  
  var whereString = '';
  if (searchColumns.length > 0) {
    whereString = 'WHERE ';
  }
  for (var i=0; i < searchColumns.length; i++) {
    whereString += searchColumns[i]+' = $'+(i+1)+' ';
  }
  
  return { whereSQL: whereString, params: params };
};

var getWinesByFilter = function(filter, callback) {
  pg.connect(postgreUri, function(err, client, done) {
    if(err) {
      return callback(err);
    }
    
    var sqlArgs = parseSQLFilter(filter);
    
    client.query('SELECT wine_id AS id, name, year, country, type, description FROM wine '+sqlArgs.whereSQL, sqlArgs.params, function(err, result) {
      done();

      if(err) {
        return callback(err);
      }
      callback(null, result.rows);
    });
  });
};

var insertWine = function(wine, callback) {
  pg.connect(postgreUri, function(err, client, done) {
    if(err) {
      return callback(err);
    }
    
    client.query('INSERT INTO wine (name, year, country, type, description) VALUES ($1, $2, $3, $4, $5) RETURNING wine_id', [wine.name, wine.year, wine.country, wine.type, wine.description], function(err, result) {
      done();

      if(err) {
        return callback(err);
      }
      callback(null, result.rows[0].wine_id);
    });
  });
};

var updateWine = function(wine, callback) {
  pg.connect(postgreUri, function(err, client, done) {
    if(err) {
      return callback(err);
    }
    
    client.query('UPDATE wine SET name = $1, year = $2, country = $3, type = $4, description = $5 WHERE wine_id = $6', [wine.name, wine.year, wine.country, wine.type, wine.description, wine.id], function(err, result) {
      done();

      if(err) {
        return callback(err);
      }
      callback(null, result.rowCount === 1);
    });
  });
};

var deleteWine = function(wineId, callback) {
  pg.connect(postgreUri, function(err, client, done) {
    if(err) {
      return callback(err);
    }
    
    client.query('DELETE FROM wine WHERE wine_id = $1', [wineId], function(err, result) {
      done();

      if(err) {
        return callback(err);
      }
      callback(null, result.rowCount === 1);
    });
  });
};

var validateWine = function(wine) {
  var errors = {};
  if (wine && typeof wine === 'object') {
    if (validator.isNull(wine.name)) {
      errors.name = 'MISSING';
    }
    if (validator.isNull(wine.year)) {
      errors.year = 'MISSING';
    } else if (!validator.isInt(wine.year)) {
      errors.year = 'INVALID';
    }
    if (validator.isNull(wine.country)) {
      errors.country = 'MISSING';
    }
    if (validator.isNull(wine.type)) {
      errors.type = 'MISSING';
    } else if (wine.type != 'red' && wine.type != 'white' && wine.type != 'rose') {
      errors.type = 'INVALID';
    }
  }
  return errors;
};

var server = restify.createServer({
  name: 'wine-manage-app',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/wines', function (req, res, next) {
  getWinesByFilter(req.params, function(err, wines) {
    res.charSet('utf-8');
    if (err) {
      res.send(400, { error: err });
    } else {
      res.send(200, wines);
    }
    return next();
  });
});

server.get('/wines/:id', function (req, res, next) {
  var wineId = req.params.id;
  getWinesByFilter({ wine_id: wineId }, function(err, wines) {
    res.charSet('utf-8');
    if (wines.length > 1) {
      res.send(200, wines);
    } else if (wines.length == 1) {
      res.send(200, wines[0]);
    } else if (err) {
      res.send(400, { error: err });
    } else {
      res.send(400, { error: 'UNKNOWN_OBJECT' });
    }
    return next();
  });
});

server.post('/wines', function (req, res, next) {
  var wine = req.params;
  var validationErrors = validateWine(wine);
  if (Object.keys(validationErrors).length == 0) {
    insertWine(wine, function(err, insertedId) {
      res.charSet('utf-8');
      if (err) {
        res.send(400, { error: err });
      } else {
        wine.id = insertedId;
        res.send(200, wine);
      }
      return next();
    });
  } else {
    res.send(400, { error: 'VALIDATION_ERROR', validation: validationErrors });
    return next();
  }
});

server.put('/wines/:id', function (req, res, next) {
  var wine = req.params;
  updateWine(wine, function(err, updated) {
    res.charSet('utf-8');
    if (updated) {
      res.send(200, wine);
    } else if (err) {
      res.send(400, { error: err });
    } else {
      res.send(400, { error: 'UNKNOWN_OBJECT' });
    }
    return next();
  });
});

server.del('/wines/:id', function (req, res, next) {
  var wineId = req.params.id;
  deleteWine(wineId, function(err, deleted) {
    res.charSet('utf-8');
    if (deleted) {
      res.send(200, { success: true });
    } else if (err) {
      res.send(400, { error: err });
    } else {
      res.send(400, { error: 'UNKNOWN_OBJECT' });
    }
    return next();
  });
});

server.listen(config.web.port, function () {
  console.log('%s listening at %s', server.name, server.url);
});
