import { Fmt } from '../js/fmt.js';
import { UiView } from '../js/uiView.js';

describe('a view', () => {

    let tevt, view;
    beforeEach(() => {
        view = new UiView();
        tevt = null;
    });

    it('xform updates trigger view event', ()=>{
        view.at_modified.listen((evt) => tevt=evt);
        view.xform.x = 1;
        expect(tevt.key).toEqual('xform.x');
        expect(tevt.value).toEqual(1);
    });

});
