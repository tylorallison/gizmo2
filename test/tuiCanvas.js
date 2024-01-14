import { UiCanvas } from '../js/uiCanvas.js';
import { UiView } from '../js/uiView.js';
import { XForm } from '../js/xform.js';

describe('a ui canvas', () => {
    let cvs;
    afterEach(() => {
        if (cvs) cvs.destroy()
    })

    it('can be constructed w/ specified dimensions', ()=>{
        cvs = new UiCanvas({
            canvasId: 'canvas.test', 
            fitToWindow: false, 
            xform: new XForm({fixedWidth: 200, fixedHeight: 100})
        });
        expect(cvs.canvas.id).toEqual('canvas.test');
        expect(cvs.canvas.width).toEqual(200);
        expect(cvs.canvas.height).toEqual(100);
    });

    it('nested children automatically resized', ()=>{
        cvs = new UiCanvas({
            fitToWindow: false, 
            xform: new XForm({fixedWidth: 200, fixedHeight: 100}),
            children: [ new UiView({ tag: 'child' }), ],
        });
        let child = cvs.find((v) => v.tag === 'child');
        expect(child.xform.width).toEqual(200);
        expect(child.xform.height).toEqual(100);
    });

    it('children automatically resized', ()=>{
        cvs = new UiCanvas({
            fitToWindow: false, 
            xform: new XForm({fixedWidth: 200, fixedHeight: 100})
        });
        let child = new UiView();
        expect(child.xform.width).toEqual(0);
        expect(child.xform.height).toEqual(0);
        cvs.adopt(child);
        expect(child.xform.width).toEqual(200);
        expect(child.xform.height).toEqual(100);
    });

    it('manual resize of xform works for unfit canvas', ()=>{
        cvs = new UiCanvas({
            fitToWindow: false, 
            xform: new XForm({fixedWidth: 200, fixedHeight: 100}),
            children: [ new UiView({ tag: 'child' }), ],
        });
        let child = cvs.find((v) => v.tag === 'child');
        expect(cvs.canvas.width).toEqual(200);
        expect(cvs.canvas.height).toEqual(100);
        expect(child.xform.width).toEqual(200);
        expect(child.xform.height).toEqual(100);
        cvs.xform.fixedWidth = 300;
        expect(cvs.canvas.width).toEqual(300);
        expect(cvs.canvas.height).toEqual(100);
        expect(child.xform.width).toEqual(300);
        expect(child.xform.height).toEqual(100);
    });

    it('manual resize of xform blocked for fit canvas', ()=>{
        cvs = new UiCanvas({
            fitToWindow: true, 
            xform: new XForm({fixedWidth: 200, fixedHeight: 100}),
            children: [ new UiView({ tag: 'child' }), ],
        });
        let child = cvs.find((v) => v.tag === 'child');
        expect(cvs.canvas.width).toEqual(cvs.xform.width);
        expect(cvs.canvas.height).toEqual(cvs.xform.height);
        expect(child.xform.width).toEqual(cvs.xform.width);
        expect(child.xform.height).toEqual(cvs.xform.height);
        let width = cvs.canvas.width;
        let height = cvs.canvas.height;
        cvs.xform.fixedWidth = 111;
        expect(cvs.canvas.width).toEqual(width);
        expect(cvs.canvas.height).toEqual(height);
        expect(child.xform.width).toEqual(width);
        expect(child.xform.height).toEqual(height);
    });


});
