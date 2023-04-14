#! /usr/bin/env node

const program = require('commander')
const version = require('./package').version
const coap = require('coap')
const request = coap.request
const URI = require('uri-js')
const through = require('through2')
let method = 'GET' // default
const coapOptionSeperator = ','

function collectOptions (val, memo) {
  const coapOptionRegex = new RegExp('\\d{1}\\' + coapOptionSeperator + '\\w+')
  if (coapOptionRegex.test(val)) {
    memo.push(val)
  } else {
    console.log('Error: Option \'%s\' is invalid.', val)
    console.log('Please provide options in this way:')
    console.log('-O 2048' + coapOptionSeperator + 'HelloWorld')
    console.log('OR --coap-option 2048' + coapOptionSeperator + 'HelloWorld')
    process.exit(-1)
  }
  return memo
}

program
  .version(version)
  .option('-o, --observe', 'Observe the given resource', false)
  .option('-n, --no-new-line', 'No new line at the end of the stream', true)
  .option('-p, --payload <payload>', 'The payload for POST and PUT requests')
  .option('-b, --block2 <option>', 'set the block2 size option', parseInt)
  .option('-q, --quiet', 'Do not print status codes of received packets', false)
  .option('-c, --non-confirmable', 'non-confirmable', false)
  .option('-t, --timeout <seconds>', 'The maximum send time in seconds')
  .option('-T, --show-timing', 'Print request time, handy for simple performance tests', false)
  .option('-O, --coap-option <option>', 'Add COAP-Options to the request, e.q. -O 2048,HelloWorld (repeatable)', collectOptions, [])
  .option('-C, --content-format <content-format>', 'Include a Content-Format option in the request')
  .option('-a, --accept <accept>', 'Include an Accept option in the request')

let inputUrl
;['GET', 'PUT', 'POST', 'DELETE'].forEach(function (name) {
  program
    .command(name.toLowerCase())
    .argument('<url>')
    .description('performs a ' + name + ' request')
    .action(function (url) {
      method = name
      inputUrl = url
    })
})

program.parse(process.argv)

const url = URI.parse(inputUrl)

if (url.scheme === undefined || url.host === undefined) {
  console.log('Invalid URL. Protocol is not given or URL is malformed.')
  process.exit(-1)
}

const requestParams = {
  method,
  observe: program.opts().observe,
  confirmable: !program.opts().nonConfirmable,
  hostname: url.host,
  pathname: url.path,
  protocol: url.scheme + ':',
  port: url.port,
  query: url.query,
  accept: program.opts().accept,
  contentFormat: program.opts().contentFormat
}

if (requestParams.protocol !== 'coap:' || !requestParams.hostname) {
  console.log('Wrong URL. Protocol is not coap or no hostname found.')
  process.exit(-1)
}

coap.parameters.exchangeLifetime = program.opts().timeout ? program.opts().timeout : 30

if (program.opts().block2 && (program.opts().block2 < 1 || program.opts().block2 > 6)) {
  console.log('Invalid block2 size, valid range [1..6]')
  console.log('block2 1: 32 bytes payload, block2 2: 64 bytes payload...')
  process.exit(-1)
}

const startTime = new Date()
const req = request(requestParams)
if (program.opts().block2) {
  req.setOption('Block2', Buffer.from([program.block2]))
}

if (typeof program.opts().coapOption !== 'undefined' && program.opts().coapOption.length > 0) {
  const options = {}
  // calling req.setOption() multiple times for the same key will overwrite previous values,
  // therefore group options by name/key and add them all at once
  program.opts().coapOption.forEach(function (singleOption) {
    const i = singleOption.indexOf(coapOptionSeperator)
    const key = singleOption.slice(0, i)
    const value = singleOption.slice(i + 1)
    const valueBuffer = value.startsWith('0x') ? Buffer.from(value.substring(2), 'hex') : Buffer.from(value)
    if (!Object.prototype.hasOwnProperty.call(options, key)) options[key] = []
    options[key].push(valueBuffer)
  })
  Object.entries(options).forEach(([key, values]) => {
    req.setOption(key, values)
  })
}

req.on('response', function (res) {
  const endTime = new Date()
  if (program.opts().showTiming) {
    console.log('Request took ' + (endTime.getTime() - startTime.getTime()) + ' ms')
  }

  // print only status code on empty response
  if (!res.payload.length && !program.opts().quiet) {
    process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\n')
  }

  res.pipe(through(function addNewLine (chunk, enc, callback) {
    if (!program.opts().quiet) {
      process.stderr.write('\x1b[1m(' + res.code + ')\x1b[0m\t')
    }
    if (program.opts().newLine && chunk) {
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

if (method === 'GET' || method === 'DELETE' || program.opts().payload) {
  req.end(program.opts().payload)
} else if (!process.stdin.isTTY) {
  process.stdin.pipe(req)
} else {
  req.end()
}
