import { Fmt } from '../js/fmt.js';
import { Game } from '../js/game.js';
//import { Evts } from '../js/evt.js';
import { UiCanvas } from '../js/uiCanvas.js';
import { Rect } from '../js/rect.js';
//import { Hierarchy } from '../js/hierarchy.js';
import { XForm } from '../js/xform.js';
import { Sprite } from '../js/sprite.js';
import { Animation } from '../js/animation.js';
//import { Generator } from '../js/generator.js';
import { UiPanel } from '../js/uiPanel.js';
import { Animator } from '../js/animator.js';
import { Timer } from '../js/timer.js';
//import { CompositeSprite } from '../js/compositeSprite.js';
import { Shape } from '../js/shape.js';
import { ImageMedia } from '../js/media.js';
import { GadgetCtx } from '../js/gadget.js';
import { UiView } from '../js/uiView.js';
import { TextToken } from '../js/textToken.js';
import { TextFormat } from '../js/textFormat.js';
//import { Assets } from '../js/asset.js';

/*
class TestModel extends UiPanel {
    static {
        this.$schema('state', { dflt: 'on', renderable: true });
    }
}
*/

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

    ];

    async $prepare() {
        //Evts.listen(null, 'KeyDown', (evt) => { console.log(`key pressed: ${Fmt.ofmt(evt)}`)});

        let cvs = new UiCanvas({ canvasId: 'game.canvas'});

        let animator = GadgetCtx.assets.get('test.animator', { fitter: 'ratio'});
        let text = new TextToken({text:'hello', fmt: new TextFormat({color:'red', size:40}), fitter: 'none'});

        let view1 = new UiPanel({
            sketch: GadgetCtx.assets.get('test.rect', { fitter:'stretch' }),
            dbg: { xform: true },
            xform: new XForm({ left:.4, right:.6, top:.5, bottom:.5, x: 0, y: 0, fixedWidth: 200, fixedHeight: 200}),
        });
        cvs.adopt(view1);

        let view2 = new UiPanel({
            //sketch: GadgetCtx.assets.get('test.rect', { fitter:'none' }),
            sketch: text,
            dbg: { xform: true },
            xform: new XForm({ left:.6, right:.4, top:.5, bottom:.5, x: 0, y: 0, fixedWidth: 200, fixedHeight: 400}),
        });
        cvs.adopt(view2);

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

        new Timer({ttl: 1000, loop: true, cb: () => { 
            if (animator.state === 'on') {
                //console.log(`animator: ${animator.state}->off`);
                animator.state = 'off';
            } else {
                //console.log(`animator: ${animator.state}->off`);
                animator.state = 'on';
            }
        }});


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
