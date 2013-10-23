#! /usr/bin/env node

var program = require('commander')
  , version = require('./package').version
  , request = require('coap').request
  , URL     = require('url')
  , method  = 'GET' // default
  , url

program
  .version(version)
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

if (url.protocol !== 'coap:' || !url.hostname) {
  console.log('Wrong URL')
  process.exit(-1)
}

req = request(url).on('response', function(res) {
  res.pipe(process.stdout)

  if (res.code !== '4.04' && program.newLine)
    res.on('end', function() {
      process.stdout.write('\n')
    })
})

if (method === 'GET' || method === 'DELETE' || program.payload) {
  req.end(program.payload)
  return
}

process.stdin.pipe(req)
