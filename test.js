'use strict'
/* global describe, before, after, it */

var expect = require('chai').expect
var coap = require('coap')
var concat = require('concat-stream')
var spawn = require('child_process').spawn
var replace = require('event-stream').replace

describe('coap', function () {
  var server

  before(function (done) {
    server = coap.createServer()

    // CoAP default port
    server.listen(5683, done)
  })

  after(function () {
    server.close()
  })

  function call () {
    var child = spawn('node', ['index.js'].concat(Array.prototype.slice.call(arguments)))

    // piping child.stderr to stdout but filtering out the status codes
    child.stderr
      .pipe(replace('\x1b[1m(4.04)\x1b[0m\n', ''))
      .pipe(replace('\x1b[1m(2.05)\x1b[0m\n', ''))
      .pipe(process.stdout)

    return child
  }

  it('should error with a invalid URL', function (done) {
    call('abcde').stdout.pipe(concat(function (data) {
      expect(data.toString()).to.eql('Invalid URL. Protocol is not given or URL is malformed.\n')
      done()
    }))
  })

  it('should error with a wrong URL', function (done) {
    call('http://abcde').stdout.pipe(concat(function (data) {
      expect(data.toString()).to.eql('Wrong URL. Protocol is not coap or no hostname found.\n')
      done()
    }))
  })

  it('should GET a given resource by default', function (done) {
    var child = call('coap://localhost')

    child.stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
      child.stdout.pipe(concat(function (data) {
        expect(data.toString()).to.eql('hello world\n')
        done()
      }))
    }))

    server.once('request', function (req, res) {
      res.end('hello world')
    })
  })

  it('should GET a given resource by default (bis)', function (done) {
    var child = call('coap://localhost')

    child.stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
      child.stdout.pipe(concat(function (data) {
        expect(data.toString()).to.eql('hello matteo\n')
        done()
      }))
    }))

    server.once('request', function (req, res) {
      res.end('hello matteo')
    })
  })

  it('should GET not adding a newline (short)', function (done) {
    var child = call('-n', 'coap://localhost')

    child.stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
      child.stdout.pipe(concat(function (data) {
        expect(data.toString()).to.eql('hello matteo')
        done()
      }))
    }))

    server.once('request', function (req, res) {
      res.end('hello matteo')
    })
  })

  it('should GET non-confirmable (short)', function (done) {
    call('-c', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expect(req._packet.confirmable).to.eql(false)
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should print help if no url', function (done) {
    call().stdout.pipe(concat(function (data) {
      expect(data.toString()).to.match(/Usage/)
      done()
    }))
  })

  it('should not print status code on quiet option', function (done) {
    call('-q', 'coap://localhost').stderr.pipe(concat(function (data) {
      expect(null)
      done()
    }))

    server.once('request', function (req, res) {
      res.end('hello world')
    })
  })

  it('should only emit status code if the response was a 4.04', function (done) {
    var child = call('coap://localhost')

    child.stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(4.04)\x1b[0m\n')
      child.stdout.pipe(concat(function (data) {
        expect(null)
        done()
      }))
    }))

    server.once('request', function (req, res) {
      res.statusCode = 404
      res.end()
    })
  })

  it('should GET a given resource by specifying the verb', function (done) {
    var child = call('get', 'coap://localhost')

    child.stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
      child.stdout.pipe(concat(function (data) {
        expect(data.toString()).to.eql('hello world\n')
        done()
      }))
    }))

    server.once('request', function (req, res) {
      res.end('hello world')
    })
  })

  ;['PUT', 'POST'].forEach(function (method) {
    it('should ' + method + ' a given resource', function (done) {
      call(method.toLowerCase(), 'coap://localhost').stdin.end('hello world')

      server.once('request', function (req, res) {
        res.end('')

        expect(req.method).to.eql(method)

        req.pipe(concat(function (data) {
          expect(data.toString()).to.eql('hello world')
          done()
        }))
      })
    })

    it('should ' + method + ' a given resource from an option', function (done) {
      call(method.toLowerCase(), '-p', 'hello world', 'coap://localhost')

      server.once('request', function (req, res) {
        res.end('')

        expect(req.method).to.eql(method)

        req.pipe(concat(function (data) {
          expect(data.toString()).to.eql('hello world')
          done()
        }))
      })
    })
  })

  it('should DELETE a given resource', function (done) {
    call('delete', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('deleted')

      expect(req.method).to.eql('DELETE')
      done()
    })
  })

  it('should observe the given resource and emit the values', function (done) {
    var child = call('-o', 'coap://localhost')

    child.stderr.once('data', function (data) {
      expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
      child.stdout.once('data', function (data) {
        expect(data.toString()).to.eql('hello\n')
        child.stderr.once('data', function (data) {
          expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
          child.stdout.once('data', function (data) {
            expect(data.toString()).to.eql('matteo\n')
            child.kill()
            done()
          })
        })
      })
    })

    server.once('request', function (req, res) {
      setTimeout(function () {
        res.write('hello')
        setTimeout(function () {
          res.end('matteo')
        }, 10)
      }, 10)
    })
  })

  it('should observe the given resource and emit the values without a new line', function (done) {
    var child = call('-o', '-n', 'coap://localhost')

    child.stderr.once('data', function (data) {
      expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
      child.stdout.once('data', function (data) {
        expect(data.toString()).to.eql('hello')
        child.stderr.once('data', function (data) {
          expect(data.toString()).to.eql('\x1b[1m(2.05)\x1b[0m\t')
          child.stdout.once('data', function (data) {
            expect(data.toString()).to.eql('matteo')
            child.kill()
            done()
          })
        })
      })
    })

    server.once('request', function (req, res) {
      setTimeout(function () {
        res.write('hello')
        setTimeout(function () {
          res.end('matteo')
        }, 10)
      }, 10)
    })
  })

  it('should support a 4.04 for an observe', function (done) {
    call('-o', 'coap://localhost').stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(4.04)\x1b[0m\n')
      done()
    }))

    server.once('request', function (req, res) {
      res.statusCode = 404
      res.end()
    })
  })

  it('should support coap option as string', function (done) {
    call('-O 2048,HelloWorld', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expect(req._packet.options.length).to.eql(1)
        expect(req._packet.options[0].name).to.eql('2048')
        expect(req._packet.options[0].value.toString()).to.eql('HelloWorld')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options as string', function (done) {
    call('-O 2048,HelloWorld', '-O 2050,FooBarBaz', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expect(req._packet.options.length).to.eql(2)
        expect(req._packet.options[0].name).to.eql('2048')
        expect(req._packet.options[0].value.toString()).to.eql('HelloWorld')
        expect(req._packet.options[1].name).to.eql('2050')
        expect(req._packet.options[1].value.toString()).to.eql('FooBarBaz')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support coap option as hex', function (done) {
    call('-O 2048,0x61', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expect(req._packet.options.length).to.eql(1)
        expect(req._packet.options[0].name).to.eql('2048')
        expect(req._packet.options[0].value.toString()).to.eql('a')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options as hex', function (done) {
    call('-O 2048,0x61', '-O 2050,0x62', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expect(req._packet.options.length).to.eql(2)
        expect(req._packet.options[0].name).to.eql('2048')
        expect(req._packet.options[0].value.toString()).to.eql('a')
        expect(req._packet.options[1].name).to.eql('2050')
        expect(req._packet.options[1].value.toString()).to.eql('b')
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options as string and hex mixed', function (done) {
    call('-O 2048,0x61', '-O 2050,FooBarBaz', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expect(req._packet.options.length).to.eql(2)
        expect(req._packet.options[0].name).to.eql('2048')
        expect(req._packet.options[0].value.toString()).to.eql('a')
        expect(req._packet.options[1].name).to.eql('2050')
        expect(req._packet.options[1].value.toString()).to.eql('FooBarBaz')
        done()
      } catch (err) {
        done(err)
      }
    })
  })
})
