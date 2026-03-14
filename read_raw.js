const fs = require('fs');
const content = fs.readFileSync('D:\\codes\\MERN\\medico\\OLDFUL API FILE.pdf');
console.log(content.toString('utf8').slice(0, 2000));
