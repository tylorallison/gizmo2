import { Fmt } from '../js/fmt.js';
import { XForm } from '../js/xform.js';
import { Vect } from '../js/vect.js';
import { Bounds } from '../js/bounds.js';

describe('xforms', () => {

    it('data can be set on init', ()=>{
        let x = new XForm({ left: .1, right: .2 });
        expect(x.left).toEqual(.1);
        expect(x.right).toEqual(.2);
    });

    it('bounds are auto updated', ()=>{
        let parent = new XForm({fixedWidth: 100, fixedHeight: 200, x: 50, y: 50});
        let xform = new XForm({grip:.25, parent:parent, orig:0});
        expect(xform.bounds).toEqual(new Bounds({width:50, height:100}));
        xform.left = .5;
        expect(xform.bounds).toEqual(new Bounds({width:25, height:100}));
        xform.left = .25;
        expect(xform.bounds).toEqual(new Bounds({width:50, height:100}));
        parent.fixedWidth = 200;
        expect(xform.bounds).toEqual(new Bounds({width:100, height:100}));
    });

    for (const test of [
        { d: 'root xform has valid properties', 
          x: {fixedWidth: 100, fixedHeight: 200}, 
          xrslt: {minx: -50, maxx: 50, miny: -100, maxy: 100, width: 100, height: 200, deltax: 0, deltay: 0}},
        { d: 'root xform has valid properties - tl origin', 
          x: {origx: 0, origy: 0, fixedWidth: 100, fixedHeight: 200}, 
          xrslt: {minx: -0, maxx: 100, miny: -0, maxy: 200, width: 100, height: 200, deltax: 0, deltay: 0}},
        { d: 'root xform has valid properties - br origin', 
          x: {origx: 1, origy: 1, x: 100, y: 200, fixedWidth: 100, fixedHeight: 200}, 
          xrslt: {minx: -100, maxx: 0, miny: -200, maxy: 0, width: 100, height: 200, deltax: 100, deltay: 200}},
        { d: 'default child has same dimensions as parent', 
          px: {fixedWidth: 100, fixedHeight: 200, x: 50, y: 100}, 
          x: {}, 
          xrslt: {minx: -50, maxx: 50, miny: -100, maxy: 100, width: 100, height: 200, deltax: 0, deltay: 0}},
        { d: 'stretched child mid origin', 
          px: {fixedWidth: 100, fixedHeight: 200, x: 50, y: 100}, 
          x: {grip:0}, 
          xrslt: {minx: -50, maxx: 50, miny: -100, maxy: 100, width: 100, height: 200, deltax: 0, deltay: 0}},
        { d: 'stretched child tl origin', 
          px: {fixedWidth: 100, fixedHeight: 200, x: 50, y: 100}, 
          x: {grip:0, origx: 0, origy:0}, 
          xrslt: {minx: 0, maxx: 100, miny: 0, maxy: 200, width: 100, height: 200, deltax: -50, deltay: -100}},
        { d: 'stretched child br origin', 
          px: {fixedWidth: 100, fixedHeight: 200, x: 50, y: 100}, 
          x: {grip:0, origx: 1, origy:1}, 
          xrslt: {minx: -100, maxx: 0, miny: -200, maxy: 0, width: 100, height: 200, deltax: 50, deltay: 100}},
    ]) {
        it(test.d, ()=>{
            let parent, xform;
            if (test.px) {
                parent = new XForm(test.px);
                test.x.parent = parent;
            }
            xform = new XForm(test.x);
            for (const [k,v] of Object.entries(test.xrslt)) {
                expect(xform[k]).toEqual(v);
            }
        });
    }

    for (const test of [
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip:0, origx: .5, origy: .5, scalex: 1, scaley: 1, angle: 0 },
            wp: new Vect({x:0,y:0}), 
            xlp: new Vect({x:-50,y:-50}) 
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip:0, origx: .5, origy: .5, scalex: 1, scaley: 1, angle: 0}, 
            wp: new Vect({x:50,y:50}), 
            xlp: new Vect({x:0,y:0}),
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip:0, origx: .5, origy: .5, scalex: 1, scaley: 1, angle: 0}, 
            wp: new Vect({x:100,y:100}), 
            xlp: new Vect({x:50,y:50}),
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip:0, origx: .5, origy: .5, scalex: 2, scaley: 1, angle: 0}, 
            wp: new Vect({x:50,y:50}), 
            xlp: new Vect({x:0,y:0}),
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip: 0, origx: .5, origy: .5, scalex: 2, scaley: 1, angle: 0}, 
            wp: new Vect({x:0,y:0}), 
            xlp: new Vect({x:-25,y:-50}),
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip: 0, origx: .5, origy: .5, scalex: 2, scaley: 1, angle: 0}, 
            wp: new Vect({x:100,y:100}), 
            xlp: new Vect({x:25,y:50}) 
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip: 0, origx: 0, origy: .5, scalex: 2, scaley: 1, angle: 0}, 
            wp: new Vect({x:100,y:100}), 
            xlp: new Vect({x:50,y:50}) 
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip: 0, origx: .5, origy: .5, scalex: 1, scaley: 1, angle: Math.PI/2}, 
            wp: new Vect({x:50,y:50}), 
            xlp: new Vect({x:0,y:0}) 
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip: 0, origx: .5, origy: .5, scalex: 1, scaley: 1, angle: Math.PI/2}, 
            wp: new Vect({x:0,y:0}), 
            xlp: new Vect({x:-50,y:50}) 
        },
        { 
            px: { fixedWidth: 100, fixedHeight: 100, x: 50, y: 50, origx: .5, origy: .5},
            x: { grip: 0, origx: .5, origy: .5, scalex: 1, scaley: 1, angle: Math.PI/2}, 
            wp: new Vect({x:100,y:100}), 
            xlp: new Vect({x:50,y:-50}) 
        },
    ]) {
        let desc = `world to local to world translations: ${Fmt.ofmt(test.x)}`;
        it(desc, ()=>{
            let parent = new XForm(test.px);
            test.x.parent = parent;
            let xform = new XForm(test.x);
            let lp = xform.getLocal(test.wp);
            // workaround strange issue w/ jasmine treating -0 !== 0 which doesn't align w/ the rest of javascript
            if (Object.is(lp.x, -0)) lp.x = 0;
            if (Object.is(lp.y, -0)) lp.y = 0;
            expect(lp).toEqual(test.xlp)
            let nwp = xform.getWorld(lp);
            // workaround strange issue w/ jasmine treating -0 !== 0 which doesn't align w/ the rest of javascript
            if (Object.is(nwp.x, -0)) nwp.x = 0;
            if (Object.is(nwp.y, -0)) nwp.y = 0;
            expect(nwp).toEqual(test.wp)
        });
    }

});