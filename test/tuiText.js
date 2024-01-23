import { UiText } from '../js/uiText.js';

describe('a text view', () => {
    it('text set on constructor passed to internal $text', ()=>{
        let uitext = new UiText({ 'text':'hello there' });
        expect(uitext.text).toEqual('hello there');
        expect(uitext.$text.text).toEqual('hello there');
    });

    it('text set after constructor gets propagated to internal $text', ()=>{
        let uitext = new UiText({ 'text':'default' });
        expect(uitext.$text.text).toEqual('default');
        uitext.text = 'hello there';
        expect(uitext.text).toEqual('hello there');
        expect(uitext.$text.text).toEqual('hello there');
    });

});
