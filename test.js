
var expect = require('chai').expect
  , coap   = require('coap')
  , concat = require('concat-stream')
  , spawn  = require('child_process').spawn

describe('coap', function() {
  var server

  before(function(done) {
    server = coap.createServer()

    // CoAP default port
    server.listen(5683, done)
  })

  after(function() {
    server.close()
  })

  function call() {
    var child = spawn('node', ['index.js'].concat(Array.prototype.slice.call(arguments)))
    child.stderr.pipe(process.stdout)
    return child
  }

  it('should GET a given resource by default', function(done) {
    call('coap://localhost').stdout.pipe(concat(function(data) {
      expect(data.toString()).to.eql('hello world\n')
      done()
    }))

    server.once('request', function(req, res) {
      res.end('hello world')
    })
  })

  it('should GET a given resource by default (bis)', function(done) {
    call('coap://localhost').stdout.pipe(concat(function(data) {
      expect(data.toString()).to.eql('hello matteo\n')
      done()
    }))

    server.once('request', function(req, res) {
      res.end('hello matteo')
    })
  })

  it('should GET not adding a newline (short)', function(done) {
    call('-n', 'coap://localhost').stdout.pipe(concat(function(data) {
      expect(data.toString()).to.eql('hello matteo')
      done()
    }))

    server.once('request', function(req, res) {
      res.end('hello matteo')
    })
  })

  it('should print help if no url', function(done) {
    call().stdout.pipe(concat(function(data) {
      expect(data.toString()).to.match(/Usage/)
      done()
    }))
  })

  it('should should not emit a new line if the response was a 4.04', function(done) {
    call('coap://localhost').stdout.pipe(concat(function(data) {
      expect(data).to.equal(undefined)
      done()
    }))

    server.once('request', function(req, res) {
      res.statusCode = 404
      res.end()
    })
  })
})
