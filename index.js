#! /usr/bin/env node

var program = require('commander')
var version = require('./package').version
var coap = require('coap')
var request = coap.request
var URL = require('url')
var through = require('through2')
var method = 'GET' // default
var url
var req

program
  .version(version)
  .option('-o, --observe', 'Observe the given resource', 'boolean', false)
  .option('-n, --no-new-line', 'No new line at the end of the stream', 'boolean', true)
  .option('-p, --payload <payload>', 'The payload for POST and PUT requests')
  .option('-b, --block2 <option>', 'set the block2 size option', parseInt)
  .option('-q, --quiet', 'Do not print status codes of received packets', 'boolean', false)
  .option('-c, --non-confirmable', 'non-confirmable', 'boolean', false)
  .option('-t, --timeout <seconds>', 'The maximum send time in seconds')
  .option('-T, --show-timing', 'Print request time, handy for simple performance tests', 'boolean', false)
  .usage('[command] [options] url')

;['GET', 'PUT', 'POST', 'DELETE'].forEach(function (name) {
  program
    .command(name.toLowerCase())
    .description('performs a ' + name + ' request')
    .action(function () { method = name })
})

program.parse(process.argv)

if (!program.args[0]) {
  program.outputHelp()
  process.exit(-1)
}

url = URL.parse(program.args[0])
url.method = method
url.observe = program.observe
url.confirmable = !program.nonConfirmable

if (url.protocol !== 'coap:' || !url.hostname) {
  console.log('Wrong URL. Protocol is not coap or no hostname found.')
  process.exit(-1)
}

coap.parameters.exchangeLifetime = program.timeout ? program.timeout : 30

if (program.block2 && (program.block2 < 1 || program.block2 > 6)) {
  console.log('Invalid block2 size, valid range [1..6]')
  console.log('block2 1: 32 bytes payload, block2 2: 64 bytes payload...')
  process.exit(-1)
}

var startTime = new Date()
req = request(url)
if (program.block2) {
  req.setOption('Block2', new Buffer([program.block2]))
}

req.on('response', function (res) {
  var endTime = new Date()
  if (program.showTiming) {
    console.log('Request took ' + (endTime.getTime() - startTime.getTime()) + ' ms')
  }

  // print only status code on empty response
  if (!res.payload.length && !program.quiet) {
    process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\n')
  }

  res.pipe(through(function addNewLine (chunk, enc, callback) {
    if (!program.quiet) {
      process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\t')
    }
    if (program.newLine && chunk) {
      chunk = chunk.toString('utf-8') + '\n'
    }

    this.push(chunk)
    callback()
  })).pipe(process.stdout)

  // needed because of some weird issue with
  // empty responses and streams
  if (!res.payload.length) {
    process.exit(0)
  }
})

if (method === 'GET' || method === 'DELETE' || program.payload) {
  req.end(program.payload)
} else {
  process.stdin.pipe(req)
}
