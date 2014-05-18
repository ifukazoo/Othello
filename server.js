#! /usr/bin/env node

var filePath = process.argv[2];
var connect = require('connect'),
    http = require('http'),
    child_process = require('child_process'),
    port = '',
    directory = '.';

if (process.argv.length !== 3) {
  console.log("usage:" + process[1] + " <port>");
  process.exit(1);
}

port = process.argv[2];
child_process.exec('ifconfig |grep -1 "^eth0" |grep inet', function(err, stdout, stderr) {
  if (err) throw err;

  var address = stdout.match(/(\d{1,3}\.){3}\d{1,3}/)[0];
  console.log('ip = ' + address);
  console.log('port = ' + port);
  connect()
  .use(connect.logger('short'))
  .use(connect.static(directory))
  .listen(port);
  console.log('server listening ...');
});
