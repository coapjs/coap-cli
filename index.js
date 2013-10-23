#! /usr/bin/env node

var program = require('commander')
  , version = require('./package').version
  , request = require('coap').request

program
  .version(version)
  .option('-n, --no-new-line', 'No new line at the end of the stream', 'boolean', true)
  .usage('[options] url')
  .parse(process.argv)

if (!program.args[0]) {
  program.outputHelp()
  process.exit(-1)
}

request(program.args[0]).on('response', function(res) {
  res.pipe(process.stdout)

  if (res.code !== '4.04' && program.newLine)
    res.on('end', function() {
      process.stdout.write('\n')
    })

}).end()
