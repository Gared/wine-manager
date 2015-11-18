var APIeasy = require('api-easy');
var assert = require('assert');

var suite = APIeasy.describe('Checking wines API');

var validateWine = function(wine) {
  assert.isObject(wine);
  assert.isNotNull(wine.id);
  assert.isNotNull(wine.name);
  assert.isNotNull(wine.year);
  assert.isNotNull(wine.country);
  assert.isNotNull(wine.type);
  assert.isNotNull(wine.description);
};

var updateWine = {
  name: 'Spätburgunder',
  year: 2006,
  country: 'Germany',
  type: 'red',
  description: 'Delicious wine from germany'
};

var urlIdRegex = new RegExp(/^.*\/(\d+)$/);

suite.use('localhost', 8080)
  .setHeader('Content-Type', 'application/json');

suite.discuss('Testing wine API')  
  .get('/wines')
  .expect(200)
  .expect('should response with all wine objects in database', function (err, res, body) {
    var wines = JSON.parse(body);
    wines.forEach(validateWine);
  })
  .get('/wines/1')
  .expect(200, {
    id:1,
    name:'Cabernet sauvignon',
    year: 2013,
    country:'France',
    type:'red',
    description:'The Sean Connery of red wines'
  })
  .get('/wines?year=2013')
  .expect(200)
  .expect('should response with wines with the year 2008', function (err, res, body) {
    var wines = JSON.parse(body);
    wines.forEach(function(wine) {
      validateWine(wine);
      assert.equal(wine.year, 2013);
    });
  })
  .post('/wines', {
    name: 'Chardonnay',
    year: 2008,
    country: 'France',
    type: 'white',
    description: 'Good wine'
  })
  .expect(200)
  .expect('should response with the created wine object', function (err, res, body) {
    var createdWine = JSON.parse(body);
    validateWine(createdWine);
    
    suite.before('replaceWineId', function(outgoing) {
      outgoing.uri = outgoing.uri.replace(':id', createdWine.id);
      return outgoing;
    });   
  })
  .next()
  .get('/wines/:id')
  .expect(200)
  .expect('should response with the wine object which has previously been created', function (err, res, body) {
    validateWine(JSON.parse(body));
  })
  .put('/wines/:id', updateWine)
  .expect(200)
  .expect('should response with changed wine object', function (err, res, body) {
    var wine = JSON.parse(body);
    validateWine(wine);
    
    updateWine.id = res.request.uri.href.match(urlIdRegex)[1];
    assert.deepEqual(wine, updateWine);
  })
  .del('/wines/:id')
  .expect(200)
  .expect('should response with a successful message', function(err, res, body) {
    assert.deepEqual(JSON.parse(body), { success: true });
    suite.unbefore('replaceWineId');
  })
  .next()
  .get('/wines/test')
  .expect(500)
  .get('/wines/12345')
  .expect(400, { error: 'UNKNOWN_OBJECT' })
  .del('/wines/12345')
  .expect(400, { error: 'UNKNOWN_OBJECT' })
  .post('/wines', {
    name: 'Chardonnay',
    year: 'test',
    type: 'white',
    description: 'Good wine'
  })
  .expect(400, {
    error: 'VALIDATION_ERROR',
    validation: {
      country: 'MISSING',
      year: 'INVALID'
    }
  })
  .put('/wines/1', {
    name: 'Dornfelder',
    year: 2006,
    country: 'Germany',
    type: 'green',
    description: 'Delicious wine from germany'
  })
  .expect(400);
  
  
suite.export(module);
