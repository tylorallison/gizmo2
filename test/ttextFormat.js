import { TextFormat } from '../js/textFormat.js';

describe('text formats', () => {
    it('can measure text', ()=>{
        let f = new TextFormat();
        console.log(`m(xabx): ${f.measure('xabx').x}`);
        console.log(`m(xa): ${f.measure('xa').x}`);
        console.log(`m(bx): ${f.measure('bx').x}`);
    });
});