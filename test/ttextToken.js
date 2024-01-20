import { TextFormat } from '../js/textFormat.js';
import { $FormattedText } from '../js/textToken.js';

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