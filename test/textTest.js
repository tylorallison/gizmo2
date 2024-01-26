import { Game } from '../js/game.js';
import { UiCanvas } from '../js/uiCanvas.js';
import { XForm } from '../js/xform.js';
import { TextFormat } from '../js/textFormat.js';
import { UiPanel } from '../js/uiPanel.js';
import { UiText } from '../js/uiText.js';
import { Timer } from '../js/timer.js';
import { Text } from '../js/text.js';

class TextTest extends Game {

    testText(panel, xtext, ui=false) {
        let width = panel.xform.width/this.maxCols;
        let height = panel.xform.height/this.maxRows;
        let x = panel.xform.minx + this.col*width;
        let y = panel.xform.miny + this.row*height;
        let text = new Text(xtext);
        let tpanel;
        if (ui) {
            tpanel = new UiText({ text:text.text, $text:text, dbg: { xform: true }, xform: new XForm({ grip: .5, orig:0, x: x, y: y, fixedWidth: width, fixedHeight: height})});
        } else {
            tpanel = new UiPanel({ sketch: text, dbg: { xform: true }, xform: new XForm({ grip: .5, orig:0, x: x, y: y, fixedWidth: width, fixedHeight: height})});
        }
        panel.adopt(tpanel);
        this.col++;
        if (this.col >= this.maxCols) {
            this.row++;
            this.col = 0;
        }
        return tpanel;
    }

    async $prepare() {
        this.size = 600;
        this.maxCols = 4;
        this.maxRows = 4;
        this.col = 0;
        this.row = 0;
        this.fontsize = 16;

        let cvs = new UiCanvas({ dbg: { xform:true }});
        let bgpanel = new UiPanel( { xform:new XForm({ grip:.5, fixedWidth:this.size, fixedHeight:this.size })});
        cvs.adopt(bgpanel);

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            text: 'default',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            text: 'hello none',
            fitter: 'none',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            text: 'hello ratio',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            text: 'hello stretch',
            fitter: 'stretch',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            text: 'hello tile',
            fitter: 'tile',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            text: 'hello autotile',
            fitter: 'autotile',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            text: 'hello with some nice wrapped words center aligned',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            alignx:0,
            aligny:0,
            text: 'hello with some nice wrapped words top-left aligned',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            alignx:1,
            aligny:1,
            text: 'hello with some nice wrapped words bottom-right aligned',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            text: 'hello\nwith\nforced\nnewlines',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            text: 'hello <i>with</i> <b>embedded</b> <color=orange>formatting</>',
            fitter: 'ratio',
        });

        this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            text: 'a test w/ ui panel',
        }, true);

        let flashPanel = this.testText(bgpanel, {
            fmt: new TextFormat({color: 'red', highlight: false, size: this.fontsize}),
            wrap: true,
            text: 'hello with changeable text',
            fitter: 'ratio',
        });

        new Timer({ ttl: 1000, loop: true, cb: 
            () => {
                if (flashPanel.sketch.text === 'hello with changeable text') {
                    flashPanel.sketch.text = 'hello with <b,i,color=green>modifiable</> text';
                } else {
                    flashPanel.sketch.text = 'hello with changeable text';
                }
            }
        });


    }
}

/** ========================================================================
 * start the game when page is loaded
 */
window.onload = async function() {
    // start the game
    let game = new TextTest();
    game.start();
}
