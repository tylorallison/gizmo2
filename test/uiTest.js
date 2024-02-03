import { Game } from '../js/game.js';
import { UiCanvas } from '../js/uiCanvas.js';
import { XForm } from '../js/xform.js';
import { Text } from '../js/text.js';
import { TextFormat } from '../js/textFormat.js';
import { UiPanel } from '../js/uiPanel.js';
import { UiButton } from '../js/uiButton.js';
import { UiText } from '../js/uiText.js';
import { Sfx } from '../js/sfx.js';
import { UiHorizontalSpacer, UiVerticalSpacer } from '../js/uiSpacer.js';
import { Rect } from '../js/rect.js';
import { Timer } from '../js/timer.js';
import { UiToggle } from '../js/uiToggle.js';
import { UiInput } from '../js/uiInput.js';
import { UiHorizontalSlider, UiVerticalSlider } from '../js/uiSlider.js';
import { UiScroller } from '../js/uiScroller.js';
import { ImageMedia } from '../js/media.js';
import { GadgetCtx } from '../js/gadget.js';
import { Sprite } from '../js/sprite.js';

class UITest extends Game {
    static xassets = [
        Sfx.from('../media/sound.mp3', { tag:'test.sound' }),
        //Sprite.xspec({tag: 'test.sprite', media: ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 0, y: 0, smoothing: false}), }),
        Sprite.xspec({tag: 'test.sprite', smoothing:false, media:ImageMedia.xspec({src: '../media/sprite.png', width: 16, height: 16, x: 0, y: 0}), }),
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
        this.placer(this.bgpanel, new UiPanel());
    }

    test2() {
        this.placer(this.bgpanel, new UiButton({ 
            text:'hello', 
            hoveredSound:'test.sound',
            unhoveredSound:'test.sound',
            highlightFmt:new TextFormat({color:'yellow'}),
        }));
    }

    test3() {
        this.placer(this.bgpanel, new UiText({ 
            text:'hello <b,color=red>big</b> world', 
        }));
    }

    test4() {
        this.placer(this.bgpanel, new UiVerticalSpacer({ 
            tag:'vspacer',
            children: [
                new UiPanel({ sketch:new Rect({ color:'green' }), }),
                new UiPanel({ sketch:new Rect({ color:'red' }), }),
            ],
        }));
        let vspacer = this.bgpanel.find((v) => v.tag === 'vspacer');
        new Timer({ loop:true, ttl: 2000, cb: () => { 
            if (vspacer.children.length === 2) {
                let panel = new UiPanel({ sketch:new Rect({ color:'blue' }) });
                vspacer.adopt(panel);
            } else {
                vspacer.children[2].destroy();
            }
        }})
    }

    test5() {
        this.placer(this.bgpanel, new UiHorizontalSpacer({ 
            tag:'hspacer',
            size:.2, 
            spacer:.1,
            children: [
                new UiPanel({ sketch:new Rect({ color:'green' }), }),
                new UiPanel({ sketch:new Rect({ color:'red' }), }),
            ],
        }));
        let hspacer = this.bgpanel.find((v) => v.tag === 'hspacer');
        new Timer({ loop:true, ttl: 2000, cb: () => { 
            if (hspacer.children.length === 2) {
                let panel = new UiPanel({ sketch:new Rect({ color:'blue' }) });
                hspacer.adopt(panel);
            } else {
                hspacer.children[2].destroy();
            }
        }})
    }

    test6() {
        this.placer(this.bgpanel, new UiToggle({
            dbg: { xform:false },
            hoveredSound:'test.sound',
        }));
    }

    test7() {
        this.placer(this.bgpanel, new UiInput({
            dbg: { xform:false },
        }));
    }

    test8() {
        this.placer(this.bgpanel, new UiHorizontalSlider({
            dbg: { xform:false },
        }));
    }

    test9() {
        this.placer(this.bgpanel, new UiVerticalSlider({
            dbg: { xform:false },
        }));
    }

    test10() {
        this.placer(this.bgpanel, new UiPanel({
            tag: 'panel.10',
            //mask: true,
            children: [
                new UiText({
                    tag: 'text.10',
                    text: UiText.rword,
                    xform: new XForm({right:.1}),
                    $text: new Text({fitter:'none', alignx:0, aligny:0, wrap:true, fmt: new TextFormat({color:'red', size:20})}),
                    dbg: { xform:false },
                }),
                new UiVerticalSlider({
                    tag: 'slider.10',
                    xform: new XForm({left:.9}),
                }),
            ],
        }));
        let uitext = this.bgpanel.find((v) => v.tag === 'text.10');
        let uislider = this.bgpanel.find((v) => v.tag === 'slider.10');
        uislider.at_modified.listen((evt) => {
            uitext.$text.aligny = uislider.value;
        }, this, false, (evt) => (evt.key === 'value') );
        let words = 1;
        new Timer({ loop:true, ttl: 500, cb: () => { 
            if (words > 20) {
                uitext.text = UiText.rword;
                words = 1;
            } else {
                uitext.text = `${uitext.text} ` + UiText.rword;
                words += 1;
            }
        }});
    }

    test11() {
        this.placer(this.bgpanel, new UiScroller({
            dbg: { xform:false },
            scrollable: new UiPanel({
                tag: 'panel.11',
                sketch: GadgetCtx.assets.get('test.sprite', { fitter:'stretch' }),
                xform: new XForm({ fixedWidth:300, fixedHeight:300 }),

            }),
        }));
    }

    test12() {
        this.placer(this.bgpanel, new UiScroller({
            dbg: { xform:false },
            scrollable: new Text({ text:UiText.rword, fitter:'none', alignx:0, aligny:0, wrap:true, fmt: new TextFormat({color:'red', size:20})}),
        }));
    }

    async $prepare() {
        this.size = 600;
        this.maxCols = 4;
        this.maxRows = 4;
        this.col = 0;
        this.row = 0;

        let cvs = new UiCanvas({});
        this.bgpanel = new UiPanel( { xform:new XForm({ grip:.5, fixedWidth:this.size, fixedHeight:this.size })});
        cvs.adopt(this.bgpanel);

        //this.test8();
        //this.test9();
        //this.test10();
        this.test11();
        //this.test12();

        /*
        let grid = new UiGrid({
            hex: true,
            dbg: { xform: true, grid: true },
            createFilter: (gzo) => gzo.tag === 'grid',
            rows: 4,
            cols: 4,
            alignx: 0,
            aligny: 0,
            xform: new XForm({ 
                grip: .5, 
                x: 0, 
                y: 75+128, 
                fixedWidth: 256, 
                fixedHeight: 256*.75,
            }),
        });
        Hierarchy.adopt(cvs, grid)
        */

        //let panel = new UiPanel({sketch: new Rect({color: 'green'}), tag: 'grid', xform: new XForm({ x: 32, y: 32, fixedWidth: 16, fixedHeight: 16})});

    }
}

/** ========================================================================
 * start the game when page is loaded
 */
window.onload = async function() {
    // start the game
    let game = new UITest();
    game.start();
}
