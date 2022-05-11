'use strict'
/* global describe, before, after, it */

const expect = require('chai').expect
const coap = require('coap')
const concat = require('concat-stream')
const spawn = require('child_process').spawn
const replace = require('event-stream').replace

// verify that the coap-options are exactly as expected
function expectOptions (req, expectedOptions) {
  expect(req._packet.options.length).to.eql(expectedOptions.length)
  expectedOptions.forEach(([key, value], i) => {
    expect(req._packet.options[i].name).to.eql(key)
    expect(req._packet.options[i].value.toString()).to.eql(value)
  })
}

describe('coap', function () {
  let server

  before(function (done) {
    server = coap.createServer()

    // CoAP default port
    server.listen(5683, done)
  })

  after(function () {
    server.close()
  })

  function call () {
    const child = spawn('node', ['index.js'].concat(Array.prototype.slice.call(arguments)))

    // piping child.stderr to stdout but filtering out the status codes
    child.stderr
      .pipe(replace('\x1b[1m(4.04)\x1b[0m\n', ''))
      .pipe(replace('\x1b[1m(2.05)\x1b[0m\n', ''))
      .pipe(process.stdout)

    return child
  }

  it('should error with a invalid URL', function (done) {
    call('get', 'abcde').stdout.pipe(concat(function (data) {
      expect(data.toString()).to.eql('Invalid URL. Protocol is not given or URL is malformed.\n')
      done()
    }))
  })

  it('should error with a wrong URL', function (done) {
    call('get', 'http://abcde').stdout.pipe(concat(function (data) {
      expect(data.toString()).to.eql('Wrong URL. Protocol is not coap or no hostname found.\n')
      done()
    }))
  })

  it('should GET not adding a newline (short)', function (done) {
    const child = call('get', '-n', 'coap://localhost')

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
    call('get', '-c', 'coap://localhost')

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
    call().stderr.pipe(concat(function (data) {
      expect(data.toString()).to.match(/Commands/)
      done()
    }))
  })

  it('should not print status code on quiet option', function (done) {
    call('get', '-q', 'coap://localhost').stderr.pipe(concat(function (data) {
      expect(null)
      done()
    }))

    server.once('request', function (req, res) {
      res.end('hello world')
    })
  })

  it('should only emit status code if the response was a 4.04', function (done) {
    const child = call('get', 'coap://localhost')

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
    const child = call('get', 'coap://localhost')

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
    const child = call('get', '-o', 'coap://localhost')

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
    const child = call('get', '-o', '-n', 'coap://localhost')

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
    call('get', '-o', 'coap://localhost').stderr.pipe(concat(function (data) {
      expect(data.toString()).to.eql('\x1b[1m(4.04)\x1b[0m\n')
      done()
    }))

    server.once('request', function (req, res) {
      res.statusCode = 404
      res.end()
    })
  })

  it('should support coap option as string', function (done) {
    call('get', '-O 2048,HelloWorld', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['2048', 'HelloWorld']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options as string', function (done) {
    call('get', '-O 2048,HelloWorld', '-O 2050,FooBarBaz', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['2048', 'HelloWorld'],
          ['2050', 'FooBarBaz']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support coap option as hex', function (done) {
    call('get', '-O 2048,0x61', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['2048', 'a']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options as hex', function (done) {
    call('get', '-O 2048,0x61', '-O 2050,0x62', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['2048', 'a'],
          ['2050', 'b']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options as string and hex mixed', function (done) {
    call('get', '-O 2048,0x61', '-O 2050,FooBarBaz', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['2048', 'a'],
          ['2050', 'FooBarBaz']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support coap option as string that contains commas', function (done) {
    call('get', '-O 15,sharedKeys=foo,bar,baz', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['Uri-Query', 'sharedKeys=foo,bar,baz']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  it('should support multiple coap options with the same option number in any order', function (done) {
    call('get', '-O 15,sharedKeys=foo,bar,baz', '-O 2050,narf', '-O 15,clientKeys=coap,is,life', 'coap://localhost')

    server.once('request', function (req, res) {
      res.end('')
      try {
        expectOptions(req, [
          ['Uri-Query', 'sharedKeys=foo,bar,baz'],
          ['Uri-Query', 'clientKeys=coap,is,life'],
          ['2050', 'narf']
        ])
        done()
      } catch (err) {
        done(err)
      }
    })
  })
})
