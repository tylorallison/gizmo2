import * as fs from 'fs';
import { glob } from 'glob';

let contents = "";

const jsfiles = await glob('js/**/*.js', { ignore: 'node_modules/**' });
for (const file of jsfiles) {
    if (file === 'js/index.js') continue;
    if (file === 'js/main.js') continue;
    contents += `export * from './${file.slice(3)}'\n`;
}
fs.writeFileSync("js/index.js", contents);
