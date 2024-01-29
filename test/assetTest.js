import { Fmt } from '../js/fmt.js';
import { Game } from '../js/game.js';
import { UiCanvas } from '../js/uiCanvas.js';
import { Rect } from '../js/rect.js';
import { XForm } from '../js/xform.js';
import { Sprite } from '../js/sprite.js';
import { Animation } from '../js/animation.js';
import { UiPanel } from '../js/uiPanel.js';
import { Animator } from '../js/animator.js';
import { Timer } from '../js/timer.js';
//import { CompositeSprite } from '../js/compositeSprite.js';
import { Shape } from '../js/shape.js';
import { ImageMedia } from '../js/media.js';
import { GadgetCtx } from '../js/gadget.js';
import { Text } from '../js/text.js';
import { TextFormat } from '../js/textFormat.js';
import { Tiler } from '../js/tiler.js';
import { SketchMixer } from '../js/randomSketch.js';
import { Autotiler } from '../js/autotiler.js';

class AssetTest extends Game {

    static xassets = [

        Rect.xspec({ tag: 'test.rect', joint:'round', color: 'blue', borderColor:'red', border: 3, width: 40, height: 40 }),
        Sprite.xspec({tag: 'test.sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 0, y: 0, scale: 4, smoothing: false}), }),
        Shape.xspec({tag: 'test.shape', joint:'round', color: 'purple', border: 3, borderColor: 'red', verts: [{x:0,y:0}, {x:10,y:0}, {x:10,y:10}, {x:5, y:15}, {x:0, y:10}]}),
        Animation.xspec({tag: 'test.animation', jitter: false, sketches: [
            Sprite.xspec({cls: 'Sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 0, y: 0, scale: 4, smoothing: false}), ttl: 100 }),
            Sprite.xspec({cls: 'Sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 16*1, y: 0, scale: 4, smoothing: false }), ttl: 100 }),
            Sprite.xspec({cls: 'Sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 16*2, y: 0, scale: 4, smoothing: false }), ttl: 100 }),
            Sprite.xspec({cls: 'Sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 16*3, y: 0, scale: 4, smoothing: false }), ttl: 100 }),
            Sprite.xspec({cls: 'Sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 16*4, y: 0, scale: 4, smoothing: false }), ttl: 100 }),
            Sprite.xspec({cls: 'Sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 16*5, y: 0, scale: 4, smoothing: false }), ttl: 100 }),
        ]}),
        SketchMixer.xspec({ tag:'test.mixer', variations: [
            Rect.xspec({ joint:'round', color: 'blue', borderColor:'red', border: 3, width: 40, height: 40 }),
            Rect.xspec({ joint:'round', color: 'green', borderColor:'red', border: 3, width: 40, height: 40 }),
            Rect.xspec({ joint:'round', color: 'orange', borderColor:'red', border: 3, width: 40, height: 40 }),
        ]}),

        Animator.xspec({ 
            tag: 'test.animator', state: 'on', 
            sketches: {
                on: Rect.xspec({ color: 'green', borderColor: 'blue', border: 2, width: 40, height: 40 }),
                off: Rect.xspec({ color: 'gray', borderColor: 'blue', border: 2, width: 40, height: 40 }),
            },
            transitions: {
                off: [{ sketch: Animation.xspec({ loop: false, sketches: [ 
                    Rect.xspec({ color: 'orange', borderColor: 'red', border: 2, width: 40, height: 40, ttl: 250 }),
                ]}) }],
            },
        }),

        Rect.xspec({ tag:'test.br', color:'blue', borderColor:'red', border:3, width:16, height:16, fitter:'none', alignx:1, aligny:1 }),

        Rect.xspec({ tag:'one', color:'blue', width:32, height:32, fitter:'none' }),
        Rect.xspec({ tag:'one.ctl', color:'blue', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:1, aligny:1 }),
        Rect.xspec({ tag:'one.t', color:'blue', border:3, borderColor:'red', width:16, height:8, fitter:'none', alignx:.5, aligny:1 }),
        Rect.xspec({ tag:'one.ctr', color:'blue', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'one.r', color:'blue', border:3, borderColor:'red', width:8, height:16, fitter:'none', alignx:0, aligny:.5 }),
        Rect.xspec({ tag:'one.l', color:'blue', border:3, borderColor:'red', width:8, height:16, fitter:'none', alignx:1, aligny:.5 }),
        Shape.xspec({ tag:'one.jtr', color:'blue', border:3, borderColor:'red', verts: [{x:0,y:0}, {x:8,y:0}, {x:8,y:8}, {x:16, y:8}, {x:16, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Shape.xspec({ tag:'one.jtl', color:'blue', border:3, borderColor:'red', verts: [{x:8,y:0}, {x:16,y:0}, {x:16,y:16}, {x:0, y:16}, {x:0, y:8}, {x:8,y:8}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'one.cbr', color:'blue', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:0, aligny:0 }),
        Rect.xspec({ tag:'one.b', color:'blue', border:3, borderColor:'red', width:16, height:8, fitter:'none', alignx:.5, aligny:0 }),
        Shape.xspec({ tag:'one.jbr', color:'blue', border:3, borderColor:'red', verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:8}, {x:8, y:8}, {x:8, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'one.cbl', color:'blue', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:1, aligny:0 }),
        Shape.xspec({ tag:'one.jbl', color:'blue', border:3, borderColor:'red', verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:16}, {x:8, y:16}, {x:8, y:8}, {x:0,y:8}], fitter:'none', alignx:0, aligny:1 }),

        Rect.xspec({ tag:'two', color:'green', width:32, height:32, fitter:'none' }),
        Rect.xspec({ tag:'two.ctl', color:'green', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:1, aligny:1 }),
        Rect.xspec({ tag:'two.t', color:'green', border:3, borderColor:'red', width:16, height:8, fitter:'none', alignx:.5, aligny:1 }),
        Rect.xspec({ tag:'two.ctr', color:'green', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'two.r', color:'green', border:3, borderColor:'red', width:8, height:16, fitter:'none', alignx:0, aligny:.5 }),
        Rect.xspec({ tag:'two.l', color:'green', border:3, borderColor:'red', width:8, height:16, fitter:'none', alignx:1, aligny:.5 }),
        Shape.xspec({ tag:'two.jtr', color:'green', border:3, borderColor:'red', verts: [{x:0,y:0}, {x:8,y:0}, {x:8,y:8}, {x:16, y:8}, {x:16, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Shape.xspec({ tag:'two.jtl', color:'green', border:3, borderColor:'red', verts: [{x:8,y:0}, {x:16,y:0}, {x:16,y:16}, {x:0, y:16}, {x:0, y:8}, {x:8,y:8}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'two.cbr', color:'green', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:0, aligny:0 }),
        Rect.xspec({ tag:'two.b', color:'green', border:3, borderColor:'red', width:16, height:8, fitter:'none', alignx:.5, aligny:0 }),
        Shape.xspec({ tag:'two.jbr', color:'green', border:3, borderColor:'red', verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:8}, {x:8, y:8}, {x:8, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'two.cbl', color:'green', border:3, borderColor:'red', width:8, height:8, fitter:'none', alignx:1, aligny:0 }),
        Shape.xspec({ tag:'two.jbl', color:'green', border:3, borderColor:'red', verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:16}, {x:8, y:16}, {x:8, y:8}, {x:0,y:8}], fitter:'none', alignx:0, aligny:1 }),

    ];

    placer(parent, node) {
        let width = parent.xform.width/this.maxCols;
        let height = parent.xform.height/this.maxRows;
        let x = parent.xform.minx + this.col*width;
        let y = parent.xform.miny + this.row*height;
        let panel = new UiPanel({ 
            sketch: null, 
            xform: new XForm({ grip: .5, orig:0, x: x, y: y, fixedWidth: width, fixedHeight: height}),
            children: [ node ],
        });
        parent.adopt(panel);
        this.col++;
        if (this.col >= this.maxCols) {
            this.row++;
            this.col = 0;
        }
    }

    test1() {
        let view = new UiPanel({
            sketch: GadgetCtx.assets.get('test.rect', { fitter:'stretch' }),
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
    }

    test2() {
        let text = new Text({text:'hello <color=orange,b>big</> world', wrap:true, wrapWidth:0, aligny:0, alignx:0, fmt: new TextFormat({color:'red', size:40, highlight:true}), fitter: 'none'});
        let view = new UiPanel({
            sketch: text,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
    }

    test3() {
        let tiler = new Tiler({
            gridSize: {x:8,y:8},
        });
        let view = new UiPanel({
            sketch: tiler,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
        for (let i=0; i<8; i++) {
            for (let j=0; j<8; j++) {
                tiler._setij(i, j, 'test.mixer');
            }
        }
        tiler._setij(7, 7, 'test.br');
    }

    test4() {
        let animator = GadgetCtx.assets.get('test.animator', { fitter: 'ratio'});
        let view = new UiPanel({
            sketch: animator,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
        new Timer({ttl: 1000, loop: true, cb: () => { 
            if (animator.state === 'on') {
                animator.state = 'off';
            } else {
                animator.state = 'on';
            }
        }});
    }

    test5() {
        let tiler = new Tiler({
            tileSize: {x:16,y:16},
            gridSize: {x:8,y:8},
            priorityMap: { one:1, two:2 },
        });
        let view = new UiPanel({
            sketch: tiler,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
        tiler._setij(0, 2, 'one.ctl');
        tiler._setij(1, 2, 'one.t');
        tiler._setij(2, 2, 'one.jtl');
        tiler._setij(2, 1, 'one.l');
        tiler._setij(2, 0, 'one.ctl');
        tiler._setij(3, 0, 'one.t');
        tiler._setij(4, 0, 'one.ctr');
        tiler._setij(4, 1, 'one.r');
        tiler._setij(4, 2, 'one.jtr');
        tiler._setij(5, 2, 'one.t');
        tiler._setij(6, 2, 'one.ctr');
        tiler._setij(6, 3, 'one.r');
        tiler._setij(6, 4, 'one.cbr');
        tiler._setij(5, 4, 'one.b');
        tiler._setij(4, 4, 'one.jbr');
        tiler._setij(4, 5, 'one.r');
        tiler._setij(4, 6, 'one.cbr');
        tiler._setij(3, 6, 'one.b');
        tiler._setij(2, 6, 'one.cbl');
        tiler._setij(2, 5, 'one.l');
        tiler._setij(2, 4, 'one.jbl');
        tiler._setij(1, 4, 'one.b');
        tiler._setij(0, 4, 'one.cbl');
        tiler._setij(0, 3, 'one.l');
    }

    test6() {
        let tiler = new Autotiler({
            tileSize: {x:32,y:32},
            gridSize: {x:4,y:4},
            priorityMap: { one:1, two:2 },
        });
        let view = new UiPanel({
            sketch: tiler,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
        tiler._setij(1, 1, 'one');
        tiler._setij(2, 2, 'two');
    }

    async $prepare() {
        this.size = 600;
        this.maxCols = 4;
        this.maxRows = 4;
        this.col = 0;
        this.row = 0;

        this.cvs = new UiCanvas({});
        this.bgpanel = new UiPanel( { xform:new XForm({ grip:.5, fixedWidth:this.size, fixedHeight:this.size })});
        this.cvs.adopt(this.bgpanel);

        //this.test1();
        //this.test2();
        //this.test3();
        //this.test4();
        //this.test5();
        this.test6();

        /*

        */

        /*
        // FIXME: needs to be refactored
        let c = new CompositeSprite();
        c.add('one', Generator.generate(Assets.get('rect.one')));
        c.add('two', Generator.generate(Assets.get('rect.two')));
        */
        /*
        let p = new TestModel({ 
            sketch: animator, 
            xform: new XForm({origx: .5, origy: .5, grip: .3}),
            fitter: 'stretchRatio',
        });
        Hierarchy.adopt(cvs, p);
        */


    }
}

/** ========================================================================
 * start the game when page is loaded
 */
window.onload = async function() {
    // start the game
    let game = new AssetTest();
    game.start();
}
