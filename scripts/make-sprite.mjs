import fs from 'fs';
import { globSync } from 'glob';
const icons = globSync('public/icons/*.svg');
const symbols = icons.map(f => {
  const id = 'i-' + f.split('/').pop().replace('.svg','');
  return fs.readFileSync(f,'utf8')
    .replace('<svg','<symbol id="'+id+'"')
    .replace('</svg>','</symbol>');
}).join('');
fs.writeFileSync('public/icons.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">${symbols}</svg>`
);
