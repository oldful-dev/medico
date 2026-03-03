const fs = require('fs');
const path = require('path');

const dir = 'd:\\codes\\MERN\\medico\\mobile\\assets\\images';
const file = 'd8ad60edd50d15bfa3472e8a2d9ca46b49e1d6b3.png';
const buf = fs.readFileSync(path.join(dir, file));
const hex = Array.from(buf.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ');
console.log(file + ': ' + hex + ' size=' + buf.length);
