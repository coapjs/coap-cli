#! /usr/bin/env node

var program = require('commander')
  , version = require('./package').version
  , request = require('coap').request
  , URL     = require('url')
  , through = require('through2')
  , method  = 'GET' // default
  , url

program
  .version(version)
  .option('-o, --observe', 'Observe the given resource', 'boolean', false)
  .option('-n, --no-new-line', 'No new line at the end of the stream', 'boolean', true)
  .option('-p, --payload <payload>', 'The payload for POST and PUT requests')
  .usage('[command] [options] url')


;['GET', 'PUT', 'POST', 'DELETE'].forEach(function(name) {
  program
    .command(name.toLowerCase())
    .description('performs a ' + name + ' request')
    .action(function() { method = name })
})

program.parse(process.argv)

if (!program.args[0]) {
  program.outputHelp()
  process.exit(-1)
}

url = URL.parse(program.args[0])
url.method = method
url.observe = program.observe

if (url.protocol !== 'coap:' || !url.hostname) {
  console.log('Wrong URL')
  process.exit(-1)
}

req = request(url).on('response', function(res) {
  var dest = process.stdout

  if (res.code === '4.04')
    return

  if (program.newLine)
    if (program.observe) {
      dest = through(function (chunk, enc, callback) {
        this.push(chunk.toString('utf-8') + '\n')
        callback()
      })

      dest.pipe(process.stdout)
    }
    else
      res.on('end', function() {
        process.stdout.write('\n')
      })

  res.pipe(dest)

})

if (method === 'GET' || method === 'DELETE' || program.payload) {
  req.end(program.payload)
  return
}

process.stdin.pipe(req)
