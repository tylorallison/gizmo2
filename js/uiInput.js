export { UiInput };

import { Rect } from './rect.js';
import { TextFormat } from './textFormat.js';
import { Text } from './text.js';
import { Util } from './util.js';
import { UiPanel } from './uiPanel.js';
import { GadgetCtx } from './gadget.js';
import { UiText } from './uiText.js';
import { XForm } from './xform.js';
import { Fmt } from './fmt.js';

class UiInput extends UiPanel {
    // STATIC VARIABLES ----------------------------------------------------
    static dfltCharset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890 ';

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('textFmt', { order:-2, dflt:() => new TextFormat(), eventable:false });
        this.$schema('text', { order:-1, dflt:'default text' });
        this.$schema('$text', { eventable:false, link:true, dflt: (o) => new Text({
            parsable:false, 
            text:o.text, 
            fmt:o.textFmt, 
            cursorIdx:o.text.length,
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
        if (!this.active) return;
        // activate/deactivate
        this.$selected = (!this.$selected);
        this.$text.cursorOn = this.$selected;
        super.$on_clicked(evt);
    }

    $on_otherClicked(evt) {
        if ((!this.hovered) && this.$selected) {
            this.$selected = false;
            this.$text.cursorOn = this.$selected;
        }
    }

    $on_keyed(evt) {
        if (!this.active) return;
        // ignore key events if not selected
        if (!this.$selected) return;
        // handle escape
        if (evt.key === 'Escape') {
            this.$selected = false;
            this.$text.cursorOn = this.$selected;
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
