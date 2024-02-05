export { Text };

import { Bounds } from './bounds.js';
import { Fmt } from './fmt.js';
import { Gadget } from './gadget.js';
import { Mathf } from './math.js';
import { Rect } from './rect.js';
import { Sketch } from './sketch.js';
import { TextFormat } from './textFormat.js';
import { Timer } from './timer.js';
import { Vect3 } from './vect3.js';

class $TextLine extends Gadget {
    static {
        this.$schema('fmt', { eventable:false, dflt:() => new TextFormat() });
        this.$schema('$ftext', { eventable:false, dflt:'' });
        this.$schema('$fmts', { eventable:false, dflt:() => [] });
        this.$schema('$bounds', { eventable:false, dflt:() => [] });
        this.$schema('$bases', { eventable:false, dflt:() => [] });
        this.$schema('x', { eventable:false, dflt:0 });
        this.$schema('y', { eventable:false, dflt:0 });
        this.$schema('idx', { eventable:false, dflt:0 });
        this.$schema('width', { eventable:false, dflt:0 });
        this.$schema('height', { eventable:false, dflt:0 });
    }

    get length() {
        return this.$ftext.length;
    }

    $cpost(spec) {
        super.$cpost(spec);
        let size = this.fmt.measure(' ');
        this.height = size.y;
    }

    $measureAt(idx) {
        let char = this.$ftext[idx];
        let fmt = this.$fmts[idx]
        let rchar = this.$ftext[idx+1];
        let size = fmt.measure(char);
        let kerning = 0;
        // measure kerning (space between this char and next)... 
        if (rchar) {
            let csize = fmt.measure(char+rchar);
            let rsize = fmt.measure(rchar);
            kerning = Math.max(0, csize.x-(rsize.x+size.x));
        }
        let width = size.x+kerning;
        // special case space at end of line... set width to zero
        if (char === ' ' && !rchar) width = 0;
        // special case ... newline
        if (char === '\n') width = 0;
        // z: baseline delta
        return new Vect3({ x:width, y:size.y, z:size.z });
    }

    push(char, fmt) {
        // add char at end of string
        let idx = this.$ftext.length;
        this.$ftext += char;
        this.$fmts[idx] = fmt;
        // update bounds of last char (recomputes last char's kerning)
        if (idx > 0) {
            let p = this.$measureAt(idx-1);
            let lastWidth = this.$bounds[idx-1].width;
            this.$bounds[idx-1].width = p.x;
            // adjust current x position for delta of previously computed width and new width
            this.width += (p.x-lastWidth);
        }
        // add bounds for new character and adjust current x
        let p = this.$measureAt(idx);
        if (p.y > this.height) this.height = p.y;
        this.$bounds[idx] = new Bounds({ x:this.width, y:0, width:p.x, height:p.y });
        this.$bases[idx] = p.z;
        this.width += p.x;
    }

    split(idx) {
        // local index
        let lidx = Mathf.clampInt(idx-this.idx, 0 , this.length-1);
        // create newline to hold split string
        let newline = new this.constructor({ idx:idx, fmt:this.$fmts[lidx] });
        // push characters from current string to newline
        for (let i=lidx; i<this.$ftext.length; i++) {
            newline.push(this.$ftext[i], this.$fmts[i]);
        }
        // adjust local line
        this.$ftext = this.$ftext.slice(0,lidx);
        this.$fmts.splice(lidx);
        this.$bounds.splice(lidx);
        if (lidx > 0) {
            let p = this.$measureAt(lidx-1);
            this.$bounds[lidx-1].width = p.x;
        }
        this.width = 0;
        this.height = 0;
        for (let i=0; i<this.$ftext.length; i++) {
            this.width += this.$bounds[i].width;
            if (this.$bounds[i].height > this.height) this.height = this.$bounds[i].height;
        }
        return newline;
    }

    render(ctx, x, y) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        for (let i=0; i<this.$ftext.length; i++) {
            let b = this.$bounds[i];
            let f = this.$fmts[i];
            let by = this.$bases[i];
            let cx = x+this.x+b.x;
            let cy = y+this.y+b.y;
            if (f.highlight) {
                ctx.fillStyle = f.highlightColor;
                ctx.fillRect(cx, cy, b.width, b.height);
            }
            ctx.font = f.font;
            if (f.fill) {
                ctx.fillStyle = f.color;
                ctx.fillText(this.$ftext[i], cx, cy+by);
            }
            if (f.border) {
                ctx.lineWidth = f.border;
                ctx.strokeStyle = f.borderColor;
                ctx.strokeText(this.$ftext[i], cx, cy+by);
            }
        }
    }

    boundsAt(idx) {
        let lidx = Mathf.clampInt(idx-this.idx, 0 , this.length-1);
        let b = this.$bounds[lidx];
        return new Bounds({
            x:b.x+this.x,
            y:b.y+this.y,
            width:b.width,
            height:b.height,
        });
    }
}

class Text extends Sketch {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('wrapWidth', { order:-1, dflt:0 });
        this.$schema('parsable', { order:-1, readonly:true, dflt:true });
        this.$schema('fmt', { order:-1, dflt: () => new TextFormat()});
        this.$schema('text', { dflt: 'default text' });
        this.$schema('delimiter', { readonly:true, dflt:' ' });
        this.$schema('leadingPct', { readonly:true, dflt:.1 });
        this.$schema('fitter', { dflt: 'ratio' });
        this.$schema('wrap', { readonly:true, dflt:false });
        this.$schema('$savedWidth', { eventable:false, dflt:0 });
        this.$schema('$ftext', { eventable:false, parser: () => '' });
        this.$schema('$fmts', { eventable:false, parser: () => [] });
        this.$schema('$bounds', { eventable:false, parser: () => [] });
        this.$schema('$lines', { eventable:false, parser: () => [] });
        this.$schema('width', { eventable:false, dflt:(o,x) => o.wrapWidth });
        this.$schema('height', { eventable:false, dflt:0 });

        this.$schema('cursorOn', { dflt:false });
        this.$schema('cursorSketch', { link:true, dflt:() => new Rect({ fitter:'stretch', width:2, color:'rgba(255,255,255,.5)' })});
        this.$schema('cursorBlinkRate', { dflt:500 });
        this.$schema('cursorIdx', { dflt:0 });
        this.$schema('$cursorDim', { dflt:false, readonly:true, parser:(o) => o.fmt.measure('X') });
        this.$schema('$cursorVisible', { dflt:true });
        this.$schema('$cursorTimer', { eventable:false, serializable:false });

    }

    $cpost(spec) {
        super.$cpost(spec);
        this.$wrapWidth = this.wrapWidth;
        this.$parse();
        this.$layout();
        this.at_modified.listen(this.$on_modified, this);
    }

    $on_modified(evt) {
        this.$parse();
        this.$layout();
    }

    /**
     * $parse parses the current raw text and determines per-character formatting
     */
    $parse() {
        this.$ftext = '';
        this.$fmts = [];
        let fmtstack = [this.fmt];
        let ctrl = '';
        let inescape = false, inctrl=false;
        // parse character by character
        for (const char of this.text) {
            if (inescape) {
                if (char !== '<') {
                    this.$ftext += '\\';
                    this.$fmts.push(fmtstack[0])
                    this.$ftext += char;
                    this.$fmts.push(fmtstack[0])
                } else {
                    this.$ftext += char;
                    this.$fmts.push(fmtstack[0])
                }
                inescape = false;
            } else if (inctrl) {
                if (char === '>') {
                    if (ctrl.startsWith('/')) {
                        if (fmtstack.length > 1) fmtstack.shift();
                    } else {
                        let spec = TextFormat.parse(ctrl);
                        if (spec) {
                            let newFmt = fmtstack[0].copy(spec);
                            fmtstack.unshift(newFmt);
                        }
                    }
                    inctrl = false;
                    ctrl = '';
                } else {
                    ctrl += char;
                }
            } else {
                if (this.parsable && char === '\\') {
                    inescape = true;
                } else if (this.parsable && char === '<') {
                    inctrl = true;
                } else {
                    this.$ftext += char;
                    this.$fmts.push(fmtstack[0])
                }
            }
        }
    }

    $layout() {
        this.$lines = [];
        let line = new $TextLine({ idx:0, fmt:this.fmt });
        let idx=0, delimIdx=-1;
        // current layout dimensions
        let width=0, height=0;
        for (idx=0; idx<this.$ftext.length; idx++) {
            let char = this.$ftext[idx];
            // push current character to line
            line.push(char, this.$fmts[idx]);
            // handle newline break
            if (this.parsable && (char === '\n')) {
                // strip newline from formatted text string
                // update local dimensions
                height += (line.height * (1+this.leadingPct));
                // current line is pushed to stack
                this.$lines.push(line);
                // newline is created
                line = new $TextLine({ idx:idx, fmt:this.$fmts[idx], y:height });
            }
            // handle line wrapping
            if (this.wrap && this.$wrapWidth) {
                // line width exceeds wrap width... need to wrap
                if (line.width > this.$wrapWidth) {
                    // if a delimiter is set within current line...
                    // -- line is split at last delimiter
                    // -- otherwise, line is split at current character
                    let splitIdx = (delimIdx > line.idx) ? delimIdx+1 : idx;
                    let newline = line.split(splitIdx);
                    // update local dimensions
                    if (line.width > width) width = line.width;
                    height += (line.height * (1+this.leadingPct));
                    newline.y = height;
                    this.$lines.push(line);
                    line = newline;
                }
                // track last seen delimiter char
                if (char === this.delimiter) delimIdx = idx;
            }
        }
        if (line.length) {
            // update local dimensions
            if (line.width > width) width = line.width;
            height += line.height;
            if (this.$lines.length) height += line.height*this.leadingPct;
            this.$lines.push(line);
        }
        // update line x positions based on alignment
        for (const line of this.$lines) {
            //line.x = Math.round((width - line.width)*this.alignx);
            line.x = Math.round((width - line.width)*this.alignx);
        }
        // finalize reported text dimensions
        this.width = width;
        this.height = height;
    }

    // METHODS -------------------------------------------------------------
    $fitSketch(ctx, x, y, width, height) {
        if (this.wrap && !(this.wrapWidth) && (this.$wrapWidth !== width)) {
            this.$wrapWidth = width;
            this.$layout();
        }
        super.$fitSketch(ctx, x, y, width, height);
    }

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
        for (const line of this.$lines) {
            line.render(ctx, 0, 0);
        }
        // cursor
        if (this.cursorSketch && this.cursorOn && this.cursorBlinkRate && !(this.$cursorTimer)) {
            this.$cursorTimer = new Timer({ttl:this.cursorBlinkRate, loop:true, cb:() => this.$cursorVisible = !this.$cursorVisible});
        }
        if (!this.cursorOn && this.$cursorTimer) {
            this.$cursorTimer.destroy();
            this.$cursorTimer = null;
        }
        if (this.cursorSketch && this.cursorOn && this.$cursorVisible) {
            let bounds;
            if (this.cursorIdx < this.$ftext.length) {
                bounds = this.getCharBounds(this.cursorIdx);
            } else {
                bounds = this.getCharBounds(this.$ftext.length-1);
                bounds.x += bounds.width;
                bounds.width = 0;
            }
            // cursor position and dimensions
            let xoff = (bounds.width-this.$cursorDim.x) * this.cursorSketch.alignx;
            let yoff = (bounds.height-this.$cursorDim.y) * this.cursorSketch.aligny;
            //this.cursorSketch.render(ctx, bounds.x+xoff, bounds.y.yoff, this.$cursorDim.x, this.$cursorDim.y);
            this.cursorSketch.render(ctx, bounds.x, bounds.y, bounds.width, bounds.height);
        }
        if (ctxXform) ctx.setTransform(ctxXform);
    }

    getCharBounds(idx) {
        if (idx < 0) idx = 0;
        if (idx > this.$ftext.length) idx = this.$ftext.length;
        for (const line of this.$lines) {
            if (idx-line.idx < line.length) {
                return line.boundsAt(idx);
            }
        }
        return new Bounds();
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.text);
    }

}
