import { TextFormat } from '../js/textFormat.js';
import { Text } from '../js/text.js';

describe('text assets', () => {
    it('can be parsed', ()=>{
        let t = new Text({ text:'hello <b>big</b> world', wrap:true, wrapWidth:40 });
        expect(t.$fmts[0].weight).toEqual('normal')
        expect(t.$fmts[5].weight).toEqual('normal')
        expect(t.$fmts[6].weight).toEqual('bold')
        expect(t.$fmts[8].weight).toEqual('bold')
        expect(t.$fmts[9].weight).toEqual('normal')
        expect(t.$fmts[12].weight).toEqual('normal')
        expect(t.$ftext).toEqual('hello big world')
        expect(t.$ftext.length).toEqual(15);
        expect(t.$lines.length).toEqual(3);
    });
});