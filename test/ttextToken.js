import { TextFormat } from '../js/textFormat.js';
import { $FormattedText, Text } from '../js/textToken.js';

describe('char formats', () => {
    it('can be parsed', ()=>{
        let cf = new $FormattedText(new TextFormat(), 'hello <b>big</b> world');
        expect(cf.fmt(0).weight).toEqual('normal')
        expect(cf.fmt(5).weight).toEqual('normal')
        expect(cf.fmt(6).weight).toEqual('bold')
        expect(cf.fmt(8).weight).toEqual('bold')
        expect(cf.fmt(9).weight).toEqual('normal')
        expect(cf.fmt(12).weight).toEqual('normal')
        expect(cf.text).toEqual('hello big world')
        expect(cf.length).toEqual(15);
    });
});

describe('text sketches', () => {
    it('can be parsed', ()=>{
        let t = new Text({ text:'hello\n<b>big</b> world', wrap:false, wrapWidth:50 });
        console.log(`t.$ftext: ${t.$ftext}`)
        for (const line of t.$lines) {
            console.log(`line: ${line} ftext: |${line.$ftext}| dim: ${line.width},${line.height}`);
        }
    });
});