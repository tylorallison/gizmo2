export { UiInput };

import { Rect } from './rect.js';
import { TextFormat } from './textFormat.js';
import { Text } from './text.js';
import { Timer } from './timer.js';
import { Util } from './util.js';
import { UiPanel } from './uiPanel.js';
//import { UiView } from './uiView.js';
//import { Evts } from './evt.js';
import { GadgetCtx } from './gadget.js';
import { UiText } from './uiText.js';
import { XForm } from './xform.js';
import { Fmt } from './fmt.js';

/*
class UiInputText extends UiView {
    // STATIC VARIABLES ----------------------------------------------------
    static get dfltCursor() { return new Rect({ color: 'rgba(255,255,255,.5)' }); }
    static dfltCursorBlinkRate = 500;
    static dfltCursorHeightPct = .8;
    static dfltCursorWidthPct = .1;

    // SCHEMA --------------------------------------------------------------
    static {
        this.schema('token', { link: true, parser: (o,x) => (x.hasOwnProperty('token')) ? x.token : new TextToken() });
        this.schema('cursor', { link: true, parser: (o,x) => (x.hasOwnProperty('cursor')) ? x.cursor : o.constructor.dfltCursor });
        this.schema('cursorBlinkRate', { dflt: this.dfltCursorBlinkRate });
        this.schema('cursorHeightPct', { dflt: this.dfltCursorHeightPct });
        this.schema('cursorAlignY', { dflt: 0 });
        this.schema('cursorWidthPct', { dflt: this.dfltCursorWidthPct });
        this.schema('cursorIdx', { serializable: false, parser: (o,x) => o.token.text.length });
        this.schema('cursorOn', { serializable: false, dflt: false });
        this.schema('timer', { link: true, eventable: false, serializable: false });
        this.schema('selected', { link: true, serializable: false, dflt: false, atUpdate: (o,k,ov,nv) => o.updateSelected(nv)});
    }

    updateSelected(value) {
        this.selected = value;
        if (value) {
            this.cursorOn = true;
            if (this.cursorBlinkRate) this.timer = new Timer({ttl: this.cursorBlinkRate, cb: () => (this.cursorOn = !this.cursorOn), loop: true});
        } else {
            this.cursorOn = false;
            if (this.timer) {
                this.timer.destroy();
                this.timer = null;
            }
        }
    }

    subrender(ctx) {
        this.token.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        // determine cursor position/dimensions
        if (this.cursorOn) {
            let cursorBounds = this.token.getCharBounds(this.cursorIdx);
            let cursorHeight = Math.round(cursorBounds.height * this.cursorHeightPct);
            let cursorWidth = Math.round(cursorHeight * this.cursorWidthPct);
            // update offset for token alignment
            let offX = this.token.alignx*(this.xform.width - this.token.width);
            let offY = this.token.aligny*(this.xform.height - this.token.height);
            // update offset for cursor alignment
            offY += (cursorBounds.height - cursorHeight)*this.cursorAlignY;
            this.cursor.render(ctx, this.xform.minx+offX+cursorBounds.x, this.xform.miny+offY, cursorWidth, cursorHeight);
        }
    }

}
*/

class UiInput extends UiPanel {
    // STATIC VARIABLES ----------------------------------------------------
    static dfltCharset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 ';

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('textFmt', { order:-2, dflt:() => new TextFormat(), eventable:false });
        this.$schema('text', { order:-1, dflt:'default text' });
        this.$schema('$text', { eventable:false, link:true, dflt: (o) => new Text({
            fitter: 'none',
            parsable:false, 
            text:o.text, 
            fmt:o.textFmt, 
            cursorIdx:o.text.length,
            cursorOn:true,
        }) });
        this.$schema('backgroundSketch', { link: true, dflt: () => new Rect({ color: 'rgba(255,255,255,.25)' }) });
        this.$schema('selectedSketch', { link: true, dflt: () => new Rect({ borderColor: 'yellow', border: 3, fill: false }) });
        this.$schema('textXForm', { readonly:true, dflt: () => new XForm({grip:.1}) });
        this.$schema('emptyText', { readonly: true, dflt: 'enter value' }),
        this.$schema('selectedFmt', { eventable:false });
        this.$schema('emptyFmt', { eventable:false, dflt:() => new TextFormat({ color:'gray', style:'italic' })});
        this.$schema('charset', { dflt: this.dfltCharset });
        this.$schema('$selected', { serializable:false, dflt:false });
    }

    // CONSTRUCTOR ---------------------------------------------------------
    $cpost(spec) {
        super.$cpost(spec);
        GadgetCtx.at_keyed.listen(this.$on_keyed, this, false, (evt) => evt.tag === 'keydowned');
        GadgetCtx.at_moused.listen(this.$on_otherClicked, this, false, (evt) => evt.tag === 'mouseclicked');
        let uitext = new UiText({
            xform:this.textXForm,
            text:this.text,
            $text:this.$text,
            mousable:false,
        });
        this.adopt(uitext);
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_clicked(evt) {
        console.log(`on_clicked`);
        if (!this.active) return;
        // activate/deactivate
        this.$selected = (!this.$selected);
        super.$on_clicked(evt);
    }

    $on_otherClicked(evt) {
        console.log(`on_otherClicked`);
        if ((!this.hovered) && this.$selected) {
            this.$selected = false;
        }
    }

    $on_keyed(evt) {
        console.log(`on_keyed: ${Fmt.ofmt(evt)}`);
        if (!this.active) return;
        // ignore key events if not selected
        if (!this.$selected) return;
        // handle escape
        if (evt.key === 'Escape') {
            this.$selected = false;
            return;
        }
        // handle backspace
        if (evt.key === 'Backspace') {
            if (this.$text.cursorIdx > 0) {
                this.$text.cursorIdx = this.$text.cursorIdx-1;
                this.text = Util.spliceStr(this.text, this.$text.cursorIdx, 1);
            }
            return;
        }
        // handle arrows
        if (evt.key === 'ArrowLeft') {
            if (this.$text.cursorIdx > 0) {
                this.$text.cursorIdx = this.$text.cursorIdx-1;
            }
            return;
        }
        if (evt.key === 'ArrowRight') {
            if (this.$text.cursorIdx < this.text.length) {
                this.$text.cursorIdx = this.$text.cursorIdx+1;
            }
            return;
        }
        if (evt.key === 'ArrowUp') {
            if (this.$text.cursorIdx !== 0) {
                this.$text.cursorIdx = 0;
            }
            return;
        }
        if (evt.key === 'ArrowDown') {
            if (this.$text.cursorIdx !== this.text.length) {
                this.$text.cursorIdx = this.text.length;
            }
            return;
        }
        // handle delete
        if (evt.key === 'Delete') {
            if (this.$text.cursorIdx < this.text.length) {
                this.text = Util.spliceStr(this.text, this.$text.cursorIdx, 1);
            }
            return;
        }
        // ignore other meta keys
        if (evt.key.length > 1) return;
        let key = evt.key;
        // check charset
        if (!this.charset.includes(key)) return;
        // good to go...
        let left = this.text.slice(0, this.$text.cursorIdx);
        let right = this.text.slice(this.$text.cursorIdx);
        this.text = left + key + right;
        this.$text.cursorIdx = this.$text.cursorIdx+1;
    }

    // METHODS -------------------------------------------------------------

    /*
    updateText(value) {
        // handle null/empty string
        if (!value) {
            // display empty string using empty string format
            if (this.ttext.selected) {
                this.ttext.token.text = '';
            } else {
                this.ttext.token.text = this.emptyText;
            }
            this.ttext.token.fmt = this.emptyTextFmt;
        // handle non-empty string
        } else {
            this.ttext.token.text = value;
            if (this.ttext.selected) {
                this.ttext.token.fmt = this.selectedTextFmt;
            } else {
                this.ttext.token.fmt = this.textFmt;
            }
        }
        if (this.ttext.cursorIdx > value.length) this.ttext.cursorIdx = value.length;
    }
    */

    /*
    $updateSelected(value) {
        this.$selected = value;
        // handle selected
        if (value) {
            // upon selecting empty input, replace placeholder text w/ empty string
            if (!this.text.length) this.ttext.token.text = '';
            this.$text.text = this.text;
            if (this.selectedFmt) this.$text.fmt = this.selectedFmt;
        // handle deselected
        } else {
            if (!this.text.length) {
                this.$text.text = this.emptyText;
                this.$text.fmt = this.emptyFmt;
            } else {
                this.$text.fmt = this.textFmt;
            }
        }
    }
    */

    $subrender(ctx) {
        // render sketch
        if (this.backgroundSketch) this.backgroundSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        // render selected highlight
        if (this.$selected) {
            if (this.selectedSketch) this.selectedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            this.$text.text = this.text;
            if (this.selectedFmt) {
                this.$text.fmt = this.selectedFmt;
            } else {
                this.$text.fmt = this.textFmt;
            }
            /*
            // update cursor position
            let bounds;
            if (this.$cursorIdx < this.text.length) {
                bounds = this.$text.getCharBounds(this.$cursorIdx);
            } else {
                bounds = this.$text.getCharBounds(this.text.length-1);
            }
            this.$cursor.xform.x = bounds.x;
            this.$cursor.xform.y = bounds.y;
            //this.$cursor.xform.fixedWidth = bounds.width;
            //this.$cursor.xform.fixedHeight = bounds.height;
            console.log(`cursor idx: ${this.$cursorIdx} bounds: ${bounds}`);
            */
        } else {
            if (!this.text.length) {
                this.$text.text = this.emptyText;
                if (this.emptyFmt) this.$text.fmt = this.emptyFmt;
            } else {
                this.$text.fmt = this.textFmt;
            }
        }
    }

}
