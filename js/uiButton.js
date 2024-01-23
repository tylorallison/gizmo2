export { UiButton };

import { Rect } from './rect.js';
import { Text } from './text.js';
import { TextFormat } from './textFormat.js';
import { UiPanel } from './uiPanel.js';
import { UiText } from './uiText.js';
import { XForm } from './xform.js';

class UiButton extends UiPanel {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('fmt', { order:-2, dflt:() => new TextFormat(), eventable:false });
        this.$schema('$text', { order:-1, eventable:false, link:true, dflt: (o) => new Text({text: 'default text', fmt:o.fmt}) });
        // button sketches
        this.$schema('unpressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color:'rgba(255,255,255,.25)' }) });
        this.$schema('highlightSketch', { link: true, dflt: (o) => new Rect({ borderColor:'yellow', border:3, fill:false }) });
        this.$schema('pressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color: 'rgba(255,255,255,.75)' }) });
        this.$schema('inactiveSketch', { link: true, dflt: (o) => new Rect({ borderColor:'rgba(55,55,55,.5)', border:3, color: 'rgba(127,127,127,.25)' }) });
        // button text
        this.$schema('textXForm', { readonly:true, dflt: () => new XForm({grip:.1}) });
        this.$schema('text', { dflt:'default text', setter: (o,v) => { o.$text.text = v; return v } });
        this.$schema('highlightFmt', { eventable:false });
        this.$schema('inactiveFmt', { eventable:false });
        this.$schema('highlighted', { dflt:false });
    }

    $cpost(spec) {
        super.$cpost(spec);
        let uitext = new UiText({
            xform:this.textXForm,
            text:this.text,
            $text:this.$text,
            mousable:false,
        });
        this.adopt(uitext);
    }

    // METHODS -------------------------------------------------------------
    $subrender(ctx) {
        // render inactive
        if (!this.active) {
            if (this.inactiveFmt) this.$text.fmt = this.inactiveFmt;
            if (this.inactiveSketch) this.inactiveSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        } else {
            // render pressed/unpressed sketch
            if (this.hovered && this.pressed) {
                if (this.pressedSketch) this.pressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            } else {
                if (this.unpressedSketch) this.unpressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            }
            // render highlight
            if (this.highlighted || (this.hovered && !this.pressed)) {
                if (this.highlightSketch) this.highlightSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
                if (this.highlightFmt) {
                    this.$text.fmt = this.highlightFmt;
                } else {
                    this.$text.fmt = this.fmt;
                }
            } else {
                this.$text.fmt = this.fmt;
            }
        }
    }

}
