export { UiButton };

import { Rect } from './rect.js';
import { Text } from './text.js';
import { UiPanel } from './uiPanel.js';
import { UiText } from './uiText.js';
import { XForm } from './xform.js';

class UiButton extends UiPanel {
    // SCHEMA --------------------------------------------------------------
    static {
        // button sketches
        this.$schema('unpressed', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color:'rgba(255,255,255,.25)' }) });
        this.$schema('highlight', { link: true, dflt: (o) => new Rect({ borderColor:'yellow', border:3, fill:false }) });
        this.$schema('pressed', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color: 'rgba(255,255,255,.75)' }) });
        this.$schema('inactive', { link: true, dflt: (o) => new Rect({ borderColor:'rgba(55,55,55,.5)', border:3, color: 'rgba(127,127,127,.25)' }) });
        // button text
        this.$schema('$text', { order:-1, link:true, dflt: () => new Text({text: 'default text'}) });
        this.$schema('$textXForm', { dflt: () => new XForm({grip:.1}) });
        this.$schema('text', { dflt: 'default text', setter: (o,v) => { o.$text.text = v; return v } });
        this.$schema('highlightFmt', { eventable:false });
        this.$schema('highlighted', { dflt:false });
    }

    $cpost(spec) {
        super.$cpost(spec);
        this.adopt(new UiText({
            dbg: {xform:true},
            xform:this.$textXForm,
            text:this.text,
            $text:this.$text,
        }));
    }

    // EVENT HANDLERS ------------------------------------------------------
    /*
    // FIXME
    $onMouseEntered(evt) {
        super.$onMouseEntered(evt);
        if (this.hltext) {
            this._text.text = this.hltext;
        }
        if (this.hlTextSpec) {
            Object.assign(this._text, this.hlTextSpec);
        }
    }
    $onMouseExited(evt) {
        super.$onMouseExited(evt);
        if (this.hltext) {
            this._text.text = this.text;
        }
        if (this.hlTextSpec) {
            Object.assign(this._text, this.textSpec);
        }
    }
    */

    // METHODS -------------------------------------------------------------
    $subrender(ctx) {
        // render inactive
        if (!this.active) {
            this.inactive.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        } else {
            // render pressed/unpressed sketch
            if (this.mouseOver && this.mousePressed) {
                this.pressed.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            } else {
                this.unpressed.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            }
            // render highlight
            if (this.highlighted || (this.mouseOver && !this.mousePressed)) {
                this.highligted.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            }
        }
        //this.$text.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
    }

}
