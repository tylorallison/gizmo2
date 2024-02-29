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
import { SketchMixer } from '../js/sketchMixer.js';
import { Autotiler } from '../js/autotiler.js';
import { Prng } from '../js/prng.js';

const atb = 0;
const atc = 'red';

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

        Rect.xspec({ tag:'one', color:'blue', width:32, height:32, fitter:'none' }),
        Rect.xspec({ tag:'one_ctl', color:'blue', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:1 }),
        Rect.xspec({ tag:'one_t', color:'blue', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:1 }),
        Rect.xspec({ tag:'one_ctr', color:'blue', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'one_r', color:'blue', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:0, aligny:.5 }),
        Rect.xspec({ tag:'one_l', color:'blue', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:1, aligny:.5 }),
        Shape.xspec({ tag:'one_jtr', color:'blue', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:8,y:0}, {x:8,y:8}, {x:16, y:8}, {x:16, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Shape.xspec({ tag:'one_jtl', color:'blue', border:atb, borderColor:atc, verts: [{x:8,y:0}, {x:16,y:0}, {x:16,y:16}, {x:0, y:16}, {x:0, y:8}, {x:8,y:8}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'one_cbr', color:'blue', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:0 }),
        Rect.xspec({ tag:'one_b', color:'blue', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:0 }),
        Shape.xspec({ tag:'one_jbr', color:'blue', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:8}, {x:8, y:8}, {x:8, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'one_cbl', color:'blue', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:0 }),
        Shape.xspec({ tag:'one_jbl', color:'blue', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:16}, {x:8, y:16}, {x:8, y:8}, {x:0,y:8}], fitter:'none', alignx:0, aligny:1 }),

        Rect.xspec({ tag:'two', color:'green', width:32, height:32, fitter:'none' }),
        Rect.xspec({ tag:'two_ctl', color:'green', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:1 }),
        Rect.xspec({ tag:'two_t', color:'green', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:1 }),
        Rect.xspec({ tag:'two_ctr', color:'green', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'two_r', color:'green', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:0, aligny:.5 }),
        Rect.xspec({ tag:'two_l', color:'green', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:1, aligny:.5 }),
        Shape.xspec({ tag:'two_jtr', color:'green', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:8,y:0}, {x:8,y:8}, {x:16, y:8}, {x:16, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Shape.xspec({ tag:'two_jtl', color:'green', border:atb, borderColor:atc, verts: [{x:8,y:0}, {x:16,y:0}, {x:16,y:16}, {x:0, y:16}, {x:0, y:8}, {x:8,y:8}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'two_cbr', color:'green', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:0 }),
        Rect.xspec({ tag:'two_b', color:'green', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:0 }),
        Shape.xspec({ tag:'two_jbr', color:'green', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:8}, {x:8, y:8}, {x:8, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'two_cbl', color:'green', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:0 }),
        Shape.xspec({ tag:'two_jbl', color:'green', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:16}, {x:8, y:16}, {x:8, y:8}, {x:0,y:8}], fitter:'none', alignx:0, aligny:1 }),

        Rect.xspec({ tag:'three', color:'purple', width:32, height:32, fitter:'none' }),
        Rect.xspec({ tag:'three_ctl', color:'purple', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:1 }),
        Rect.xspec({ tag:'three_t', color:'purple', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:1 }),
        Rect.xspec({ tag:'three_ctr', color:'purple', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'three_r', color:'purple', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:0, aligny:.5 }),
        Rect.xspec({ tag:'three_l', color:'purple', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:1, aligny:.5 }),
        Shape.xspec({ tag:'three_jtr', color:'purple', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:8,y:0}, {x:8,y:8}, {x:16, y:8}, {x:16, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Shape.xspec({ tag:'three_jtl', color:'purple', border:atb, borderColor:atc, verts: [{x:8,y:0}, {x:16,y:0}, {x:16,y:16}, {x:0, y:16}, {x:0, y:8}, {x:8,y:8}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'three_cbr', color:'purple', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:0 }),
        Rect.xspec({ tag:'three_b', color:'purple', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:0 }),
        Shape.xspec({ tag:'three_jbr', color:'purple', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:8}, {x:8, y:8}, {x:8, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'three_cbl', color:'purple', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:0 }),
        Shape.xspec({ tag:'three_jbl', color:'purple', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:16}, {x:8, y:16}, {x:8, y:8}, {x:0,y:8}], fitter:'none', alignx:0, aligny:1 }),

        Rect.xspec({ tag:'four', color:'orange', width:32, height:32, fitter:'none' }),
        Rect.xspec({ tag:'four_ctl', color:'orange', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:1 }),
        Rect.xspec({ tag:'four_t', color:'orange', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:1 }),
        Rect.xspec({ tag:'four_ctr', color:'orange', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'four_r', color:'orange', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:0, aligny:.5 }),
        Rect.xspec({ tag:'four_l', color:'orange', border:atb, borderColor:atc, width:8, height:16, fitter:'none', alignx:1, aligny:.5 }),
        Shape.xspec({ tag:'four_jtr', color:'orange', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:8,y:0}, {x:8,y:8}, {x:16, y:8}, {x:16, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Shape.xspec({ tag:'four_jtl', color:'orange', border:atb, borderColor:atc, verts: [{x:8,y:0}, {x:16,y:0}, {x:16,y:16}, {x:0, y:16}, {x:0, y:8}, {x:8,y:8}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'four_cbr', color:'orange', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:0, aligny:0 }),
        Rect.xspec({ tag:'four_b', color:'orange', border:atb, borderColor:atc, width:16, height:8, fitter:'none', alignx:.5, aligny:0 }),
        Shape.xspec({ tag:'four_jbr', color:'orange', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:8}, {x:8, y:8}, {x:8, y:16}, {x:0,y:16}], fitter:'none', alignx:0, aligny:1 }),
        Rect.xspec({ tag:'four_cbl', color:'orange', border:atb, borderColor:atc, width:8, height:8, fitter:'none', alignx:1, aligny:0 }),
        Shape.xspec({ tag:'four_jbl', color:'orange', border:atb, borderColor:atc, verts: [{x:0,y:0}, {x:16,y:0}, {x:16,y:16}, {x:8, y:16}, {x:8, y:8}, {x:0,y:8}], fitter:'none', alignx:0, aligny:1 }),

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
        });
        let view = new UiPanel({
            sketch: tiler,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
        tiler._setij(0, 2, 'one_ctl');
        tiler._setij(1, 2, 'one_t');
        tiler._setij(2, 2, 'one_jtl');
        tiler._setij(2, 1, 'one_l');
        tiler._setij(2, 0, 'one_ctl');
        tiler._setij(3, 0, 'one_t');
        tiler._setij(4, 0, 'one_ctr');
        tiler._setij(4, 1, 'one_r');
        tiler._setij(4, 2, 'one_jtr');
        tiler._setij(5, 2, 'one_t');
        tiler._setij(6, 2, 'one_ctr');
        tiler._setij(6, 3, 'one_r');
        tiler._setij(6, 4, 'one_cbr');
        tiler._setij(5, 4, 'one_b');
        tiler._setij(4, 4, 'one_jbr');
        tiler._setij(4, 5, 'one_r');
        tiler._setij(4, 6, 'one_cbr');
        tiler._setij(3, 6, 'one_b');
        tiler._setij(2, 6, 'one_cbl');
        tiler._setij(2, 5, 'one_l');
        tiler._setij(2, 4, 'one_jbl');
        tiler._setij(1, 4, 'one_b');
        tiler._setij(0, 4, 'one_cbl');
        tiler._setij(0, 3, 'one_l');
    }

    test6() {
        let tiler = new Autotiler({
            tileSize: {x:32,y:32},
            gridSize: {x:8,y:8},
            priorityMap: { one:1, two:2, three:3, four:4 },
        });
        let view = new UiPanel({
            sketch: tiler,
            dbg: { xform: true },
        });
        this.placer(this.bgpanel, view);
        for (let i=0; i<tiler.gridSize.x; i++) {
            for (let j=0; j<tiler.gridSize.y; j++) {
                tiler._setij(i, j, Prng.choose(['one','two','three']));
            }
        }
        //tiler.at_modified.listen((evt) => console.log(`tiler modified: ${Fmt.ofmt(evt)}`));
        let last = -1;
        let lastIdx = -1;
        new Timer({ttl: 1000, loop: true, cb: () => { 
            if (lastIdx !== -1) {
                //console.log(`restore ${lastIdx} => ${last}`);
                tiler.setidx(lastIdx, last);
            }
            let idx = Prng.rangeInt(0, tiler.$grid.length-1);
            last = tiler.getidx(idx);
            lastIdx = idx;
            //console.log(`set ${idx} => four`);
            tiler.setidx(idx, 'four');
        }});
    }

    async $prepare() {
        this.size = 800;
        this.maxCols = 4;
        this.maxRows = 4;
        this.col = 0;
        this.row = 0;

        this.cvs = new UiCanvas({});
        this.bgpanel = new UiPanel( { xform:new XForm({ grip:.5, fixedWidth:this.size, fixedHeight:this.size })});
        this.cvs.adopt(this.bgpanel);

        this.test1();
        this.test2();
        this.test3();
        this.test4();
        this.test5();
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
