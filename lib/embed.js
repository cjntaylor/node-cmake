var fs = require('fs');
if(process.argv.length < 3) {
  console.error('USAGE: ' + process.argv[0] + ' <file>')
}
fs.readFile(process.argv[2], function (err, data) {
  if(err) {
    console.error(err);
    process.exit(1);
  }
  data = data.toString().trim();
  data = data.split(/\r?\n/);
  data = data.map(function (line) {
    line = line.replace(/"/g, '\\"')
    return 'file(APPEND ${OUTPUT} "' + line + '\\n")'
  });
  console.log(data.join('\n'));
});