import { TextFormat } from '../js/textFormat.js';

describe('text formats', () => {
    it('can measure text', ()=>{
        let f = new TextFormat();
        console.log(`m(xabx): ${f.measure('xabx').x}`);
        console.log(`m(xax): ${f.measure('xax').x}`);
        console.log(`m(xx): ${f.measure('xx').x}`);
    });
});