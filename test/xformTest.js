import { Game } from '../js/game.js';
import { Timer } from '../js/timer.js';
import { UiCanvas } from '../js/uiCanvas.js';
import { UiView } from '../js/uiView.js';
import { XForm } from '../js/xform.js';

class XFormTest extends Game {
    async $prepare() {
        let ucvs = new UiCanvas({
            dbg: { xform: true },
            canvasId: 'game.canvas'
        });

        let view1 = new UiView({
            dbg: { xform: true },
            xform: new XForm({ grip: .5, x: 0, y: 0, fixedWidth: 400, fixedHeight: 400}),
        });
        ucvs.adopt(view1);

        let child = new UiView({
            dbg: { xform: true },
            xform: new XForm({ grip: .1, origx: .5, origy: .5, scaley: 1, angle: Math.PI/4, gripOffsetLeft: 200 }),
        });
        view1.adopt(child);

        let view2 = new UiView({
            dbg: { xform: true },
            xform: new XForm({ left: 0, right: 1, top: 0, bottom: 1, x: 400, y: 200, fixedWidth: 300, fixedHeight: 300}),
        })
        ucvs.adopt(view2);

        new Timer({ 
            ttl:0, 
            loop:true,
            cb:(evt) => {
                let angle = view1.xform.angle;
                angle += evt.elapsed*.001;
                view1.xform.angle = angle;
                child.xform.angle += evt.elapsed*.001;
            },
        });

    }
}

/** ========================================================================
 * start the game when page is loaded
 */
window.onload = async function() {
    // start the game
    let game = new XFormTest();
    game.start();
}
