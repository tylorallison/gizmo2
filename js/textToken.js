export { TextToken, $FormattedText };

import { Bounds } from './bounds.js';
import { Fmt } from './fmt.js';
import { Sketch } from './sketch.js';
import { TextFormat } from './textFormat.js';

// FIXME: this wont work as is... when attached to schema, a single instance of this generator would be used across all instances...
class CachingGenerator {
    constructor(keys, fcn) {
        this.$keys = keys;
        this.$fcn = fcn;
        this.$lasts = {};
        this.$cache;
        let callable = this.compute.bound(this);
        return callable;
    }
    compute(o,ov) {
        let modified = false;
        for (const key of this.$keys) {
            if (o[key] !== this.$lasts[key]) {
                this.$lasts[key] = o[key];
                modified = true;
            }
        }
        if (modified) this.$cache = this.$fcn(o,ov);
        return this.$cache;
    }
}

class $FormattedText {
    constructor(fmt, text) {
        this.width = 0;
        this.height = 0;
        this.text = '';
        this.$fmts = [];
        this.$blocks = [];
        this.$bounds = [];
        this.$parse(fmt, text);
    }

    get length() {
        return this.text.length;
    }

    $parse(baseFmt, baseText) {
        let ctrls = baseText.match(/<[^<>]*>/g) || [];
        let remaining = baseText;
        let fmts = [baseFmt];
        let len = 0;
        this.text = '';
        for (var ctrl of ctrls) {
            // skip escaped '<'
            let splits = remaining.split(ctrl, 1);
            if (splits[0].endsWith('\\')) continue;
            let block = splits[0];
            remaining = remaining.slice(block.length+ctrl.length);
            if (block) {
                let idx = len;
                let fmt = fmts[fmts.length-1];
                len += block.length;
                this.$fmts.push(fmt);
                this.$blocks.push(idx);
                this.text += block;
            }
            // parse control
            if (ctrl.startsWith('</')) {
                if (fmts.length > 1) fmts.pop();
            } else {
                ctrl = ctrl.replace(/[<>]*/g, '');
                let spec = TextFormat.parse(ctrl);
                let newFmt = fmts[fmts.length-1].copy(spec);
                fmts.push(newFmt);
            }
        }
        if (remaining) {
            let idx = len;
            let fmt = fmts[fmts.length-1];
            this.$fmts.push(fmt);
            this.$blocks.push(idx);
            this.text += remaining;
        }
        for (let i=0; i<this.text.length; i++) {
            let fmt = this.fmt(i);
            let size = fmt.measure(this.text[i]);
            let left = 0, right = 0;
            // left kerning
            if (i>0) {
                let lsize = fmt.measure(this.text[i-1]);
                let csize = fmt.measure(this.text.slice(i-1,i+1));
                left = Math.max(0, csize.x-(lsize.x+size.x))*.5;
            }
            // right kerning
            if (i<this.text.length-1) {
                let rsize = fmt.measure(this.text[i+1]);
                let csize = fmt.measure(this.text.slice(i,i+2));
                right = Math.max(0, csize.x-(rsize.x+size.x))*.5;
            }
            this.$bounds[i] = new Bounds({
                x:this.width,
                y:0,
                width: size.x+left+right,
                height: size.y,
            });
            this.width += this.$bounds[i].width;
            if (this.$bounds[i].height > this.height) this.height = this.$bounds[i].height;
        }
    }

    fmt(idx) {
        let i=0;
        for (i=0; (i<this.$blocks.length) && (idx>=this.$blocks[i]); i++);
        i = Math.max(i-1,0);
        return this.$fmts[i];
    }

    bounds(idx) {
        return this.$bounds[idx];
        //let x = (idx>0) ? this.$widths.slice(0,idx).reduce((pv,cv) => pv+cv,0) : 0;
        //console.log(`idx: ${idx} x: ${x}`);
        //return new Bounds({x:x, y:0, width:this.$widths[idx], height:this.$maxHeight})
    }
}

class TextToken extends Sketch {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('text', { dflt: 'default text' });
        this.$schema('fmt', { dflt: () => new TextFormat()});
        this.$schema('$ftext', { eventable:false, parser: () => {return {}} });
        this.$schema('width', { generator: ((o,ov) => ( o.$ftext.width ))});
        this.$schema('height', { generator: ((o,ov) => ( o.$ftext.height ))});
    }

    $cpost(spec) {
        super.$cpost(spec);
        this.$ftext = new $FormattedText(this.fmt, this.text);
        this.at_modified.listen(this.$on_modified, this);
    }

    $on_modified(evt) {
        if (evt.key === 'text' || evt.key === 'fmt');
        this.$ftext = new $FormattedText(this.fmt, this.text);
    }

    // METHODS -------------------------------------------------------------
    $subrender(ctx, x=0, y=0, width=0, height=0) {
        // scale if necessary
        let ctxXform = ctx.getTransform();
        // text box positions
        if (x || y) ctx.translate(x, y);
        if ((width && width !== this.width) || (height && height !== this.height)) {
            let scalex = width/this.width;
            let scaley = height/this.height;
            ctx.scale(scalex, scaley);
        }
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let i=0; i<this.$ftext.length; i++) {
            let b = this.$ftext.bounds(i);
            let f = this.$ftext.fmt(i);
            if (f.highlight) {
                ctx.fillStyle = f.highlightColor;
                ctx.fillRect(b.x, b.y, b.width, b.height);
            }
            ctx.font = f.font;
            if (f.fill) {
                ctx.fillStyle = f.color;
                ctx.fillText(this.$ftext.text[i], b.x, b.y);
            }
            if (f.border) {
                ctx.lineWidth = f.border;
                ctx.strokeStyle = f.borderColor;
                ctx.strokeText(this.$ftext.text[i], b.x, b.y);
            }
        }
        if (ctxXform) ctx.setTransform(ctxXform);
    }

    getCharBounds(idx) {
        if (idx < 0) idx = 0;
        if (idx > this.text.length) idx = this.text.length;
        let left = this.fmt.measure( this.text.slice(0,idx) );
        let right = this.fmt.measure( this.text.slice(0,Math.min(idx, this.text.length)) );
        return new Bounds({x:left.x, y:0, width:right.x-left.x, height:left.y});
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.text);
    }

}
