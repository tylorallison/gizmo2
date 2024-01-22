export { Text, TextToken, $FormattedText };

import { Bounds } from './bounds.js';
import { Fmt } from './fmt.js';
import { Gadget } from './gadget.js';
import { Sketch } from './sketch.js';
import { TextFormat } from './textFormat.js';
import { Vect } from './vect.js';

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

class $FormattedText2 extends Gadget {
    static {
        this.$schema('fmt', { dflt:() => new TextFormat() });
        this.$schema('text', { dflt:'default text' });
        this.$schema('wrap', { dflt:false });
        this.$schema('width', { dflt:0 });
        this.$schema('height', { dflt:0 });
        this.$schema('allowFormatting', { dflt:true });
        this.$schema('delimiter', { dflt:' ' });
        this.$schema('leadingPct', { dflt:.25 });
    }
    constructor(spec={}) {
        //let fmt = ('fmt' in spec) ? spec.fmt : new TextFormat();
        //let text = ('text' in spec) ? spec.text : 'default text';
        //this.wrap = ('wrap' in spec) ? spec.wrap;
        //this.allowFormatting = spec.allowFormatting
        //this.width = 0;
        //this.height = 0;
        //this.text = '';
        this.$fmts = [];
        this.$blocks = [];
        this.$bounds = [];
        this.$parse(this.fmt, this.text, this.width);
    }

    get length() {
        return this.text.length;
    }

    $measureChar(fmt, char, lchar, rchar) {
        let size = char;
        let left = 0, right = 0;
        // left kerning ... 
        if (lchar) {
            let csize = fmt.measure(lchar+char);
            let lsize = fmt.measure(lchar);
            left = Math.max(0, csize.x-(lsize.x+size.x))*.5;
        }
        // right kerning
        if (rchar) {
            let csize = fmt.measure(char+rchar);
            let rsize = fmt.measure(rchar);
            right = Math.max(0, csize.x-(rsize.x+size.x))*.5;
        }
        bounds[i] = new Bounds({
            x:0,
            y:0,
            width: size.x+left+right,
            height: size.y,
        });
    }

    $parse(baseFmt, baseText, fitWidth) {
        let fmtstack = [baseFmt];
        let ptext = '';
        let fmts = [];
        let ctrl = '';
        let inescape = false, inctrl=false;
        let width=0, height=0;
        // parse character by character
        for (const char of baseText) {
            if (inescape) {
                if (char !== '<') {
                    ptext += '\\';
                    fmts.push(fmtstack[0])
                    ptext += char;
                    fmts.push(fmtstack[0])
                } else {
                    ptext += char;
                    fmts.push(fmtstack[0])
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
                if (this.allowFormatting && char === '\\') {
                    inescape = true;
                } else if (this.allowFormatting && char === '<') {
                    inctrl = true;
                } else {
                    ptext += char;
                    fmts.push(fmtstack[0])
                }
            }
        }

        // string has been parsed for format and ctrl characters are stripped... now determine character placement
        let bounds = [];
        let isnewline = true;
        let lineWidth = 0;
        let lineHeight = 0;
        let delimIdx = -1;
        let y = 0;
        let advanceLine = () => {
            if (!lineHeight) {
                let size = baseFmt.measure(' ');
                y += size.y*(1+this.leadingPct);
            } else {
                y += lineHeight*(1+this.leadingPct);
            }
            if (lineWidth > width) width = lineWidth;
            lineHeight = 0;
            lineWidth = 0;
            delimIdx = -1;
            isnewline = true;
        };
        for (let i=0; i<ptext.length; i++) {
            let fmt = fmts[i];
            let char = ptext[i];
            if (this.allowFormatting && char === '\n') {
                fmts.splice(i, 1);
                ptext = ptext.slice(0,i) + ptext.slice(i+1);
                i -= 1;
                advanceLine();
                continue;
            }
            bounds[i] = this.$measureChar(fmt, char, (isnewline) ? null : ptext[i-1], (i<ptext.length-1) ? ptext[i+1] : null);
            // adjust bounds position
            bounds[i].x = lineWidth;
            bounds[i].y = y;
            lineWidth += bounds[i].x;
            if (bounds[i].y > lineHeight) lineHeight = bounds[i].y;
            // check for wrap...
            if (this.wrap && fitWidth) {
                if (lineWidth + bounds[i].width > fitWidth) {
                    // if a delimiter is set... token after delimiter gets dropped to newline
                    if (delimIdx >= 0) {
                        let start = delimIdx+1;
                        // advance to next line...
                        advanceLine();
                        for (let j=start; j<=i; j++) {
                            if (j===start) {
                                bounds[j] = this.$measureChar(fmts[j], ptext[j], null, (j<ptext.length-1) ? ptext[j+1] : null);
                            }
                            bounds[j].x = lineWidth;
                            bounds[j].y = y;
                            lineWidth += bounds[j].x;
                            if (bounds[j].y > lineHeight) lineHeight = bounds[j].y;
                        }
                    // otherwise, newline is injected at current position and current character gets dropped to newline
                    } else {
                        // advance to next line...
                        advanceLine();
                        bounds[i] = this.$measureChar(fmts[i], ptext[i], null, (j<ptext.length-1) ? ptext[i+1] : null);
                        bounds[i].x = lineWidth;
                        bounds[i].y = y;
                        lineWidth += bounds[i].x;
                        if (bounds[j].y > lineHeight) lineHeight = bounds[i].y;
                    }
                }
                if (char === this.delimiter) delimIdx = i;
            }
        }

    }

    defunct() {

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

    $splitLines(text, width) {
        let wrapHeight = 0;
        let wrapWidth = 0;
        // lines are split based on current text format
        let lines = [];
        let line = [];
        let lineWidth = 0;
        let lineHeight = 0;
        for (let i=0; i<tokens.length; i++) {
            let token = tokens[i];
            // measure spacing required for token...
            let spacing = token.fmt.measure(' ');
            // check if token will fit in current line...
            let checkWidth = token.width + ((line.length) ? spacing.x : 0);
            if (lineWidth + checkWidth < width) {
                line.push(token);
                lineWidth += checkWidth;
                if (spacing.y > lineHeight) lineHeight = spacing.y;
            // otherwise, doesn't fit
            } else {
                // line is empty.  this means the token is too large to fit in space allocated for a line and will overflow.
                if (!line.length) {
                    line.push(token);
                    lines.push(line);
                    line = [];
                    // update total wrap height
                    if (lines.length > 1) {
                        wrapHeight += (lineHeight + lineHeight*leadingPct);
                    } else {
                        wrapHeight += lineHeight;
                    }
                    lineWidth = 0;
                    lineHeight = 0;
                    if (token.width > wrapWidth) wrapWidth = token.width;
                // line is not empty.  push current line and start a new line with the current token...
                } else {
                    lines.push(line);
                    line = [];
                    line.push(token);
                    if (lineWidth > wrapWidth) wrapWidth = lineWidth;
                    lineWidth = token.width;
                    // update total wrap height
                    if (lines.length > 1) {
                        wrapHeight += (lineHeight + lineHeight*leadingPct);
                    } else {
                        wrapHeight += lineHeight;
                    }
                    lineHeight = spacing.y;
                }
            }
        }
        if (line.length) {
            wrapHeight += (lineHeight + lineHeight*leadingPct);
            if (lineWidth > wrapWidth) wrapWidth = lineWidth;
            lines.push(line);
        }
        // calculate required wrap space
        return [lines, wrapHeight, wrapWidth];
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

class $TextLine extends Gadget {
    static {
        this.$schema('fmt', { eventable:false, dflt:() => new TextFormat() });
        this.$schema('$ftext', { eventable:false, dflt:'' });
        this.$schema('$fmts', { eventable:false, dflt:() => [] });
        this.$schema('$bounds', { eventable:false, dflt:() => [] });
        //this.$schema('x', { eventable:false, dflt:0 });
        //this.$schema('y', { eventable:false, dflt:0 });
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
        let lchar = this.$ftext[idx-1];
        let rchar = this.$ftext[idx+1];
        let size = fmt.measure(char);
        let lkerning=0, rkerning=0;
        // left kerning ... 
        if (lchar) {
            let csize = fmt.measure(lchar+char);
            let lsize = fmt.measure(lchar);
            lkerning = Math.max(0, csize.x-(lsize.x+size.x))*.5;
        }
        // right kerning
        if (rchar) {
            let csize = fmt.measure(char+rchar);
            let rsize = fmt.measure(rchar);
            rkerning = Math.max(0, csize.x-(rsize.x+size.x))*.5;
        }
        return new Vect({ x:size.x+lkerning+rkerning, y:size.y });
    }

    push(char, fmt) {
        // add char at end of string
        let idx = this.$ftext.length;
        this.$ftext += char;
        this.$fmts[idx] = fmt;
        // update bounds of last char (recomputes last char's right kerning)
        if (idx > 0) {
            let p = this.$measureAt(idx-1);
            //console.log(`idx: ${idx}`)
            let lastWidth = this.$bounds[idx-1].width;
            this.$bounds[idx-1].width = p.x;
            // adjust current x position for delta of previously computed width and new width
            this.width += (p.x-lastWidth);
        }
        // add bounds for new character and adjust current x
        let p = this.$measureAt(idx);
        if (p.y > this.height) this.height = p.y;
        this.$bounds[idx] = new Bounds({ x:this.width, y:0, width:p.x, height:p.y });
        this.width += p.x;
    }

    split(idx) {
        // local index
        let lidx = idx-this.idx;
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
        this.width = 0;
        this.height = 0;
        for (let i=0; i<this.$ftext.length; i++) {
            this.width += this.$bounds[i].width;
            if (this.$bounds[i].height > this.height) this.height = this.$bounds[i].height;
        }
        return newline;
    }

    render(ctx, x, y) {
        for (let i=0; i<this.$ftext.length; i++) {
            let b = this.$ftext.bounds(i);
            let f = this.$ftext.fmt(i);
            if (f.highlight) {
                ctx.fillStyle = f.highlightColor;
                ctx.fillRect(x+b.x, y+b.y, b.width, b.height);
            }
            ctx.font = f.font;
            if (f.fill) {
                ctx.fillStyle = f.color;
                ctx.fillText(this.$ftext.text[i], x+b.x, y+b.y);
            }
            if (f.border) {
                ctx.lineWidth = f.border;
                ctx.strokeStyle = f.borderColor;
                ctx.strokeText(this.$ftext.text[i], x+b.x, y+b.y);
            }
        }
    }
}

class Text extends Sketch {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('parsable', { order:-1, dflt:true });
        this.$schema('text', { dflt: 'default text' });
        this.$schema('fmt', { dflt: () => new TextFormat()});
        this.$schema('delimiter', { dflt:' ' });
        this.$schema('leadingPct', { dflt:.25 });

        this.$schema('wrap', { dflt:false });
        this.$schema('wrapWidth', { dflt:0 });

        this.$schema('$savedWidth', { dflt:0 });
        this.$schema('$ftext', { eventable:false, parser: () => '' });
        this.$schema('$fmts', { eventable:false, parser: () => [] });
        this.$schema('$bounds', { eventable:false, parser: () => [] });
        this.$schema('$lines', { eventable:false, parser: () => [] });

        this.$schema('width', { dflt:0 });
        this.$schema('height', { dflt:0 });
    }

    $cpost(spec) {
        super.$cpost(spec);
        this.$parse();
        this.$layout();
        //this.$ftext = new $FormattedText(this.fmt, this.text);
        //this.at_modified.listen(this.$on_modified, this);
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
        this.$bounds = [];
        let line = new $TextLine({ idx:0, fmt:this.fmt });
        let idx=0, delimIdx=-1;

        for (idx=0; idx<this.$ftext.length; idx++) {
            let char = this.$ftext[idx];
            // handle newline break
            if (this.parsable && (char === '\n')) {
                // strip newline from formatted text string
                this.$fmts.splice(idx, 1);
                this.$ftext = this.$ftext.slice(0,idx) + this.$ftext.slice(idx+1);
                // current line is pushed to stack
                this.$lines.push(line);
                // newline is created
                line = new $TextLine({ idx:idx, fmt:this.$fmts[idx] });
                // rewind index to account for spliced text
                idx -= 1;
                continue;
            }

            // push current character to line
            line.push(char, this.$fmts[idx]);

            // handle line wrapping
            if (this.wrap && this.wrapWidth) {
                // line width exceeds wrap width... need to wrap
                if (line.width > this.wrapWidth) {
                    // if a delimiter is set within current line...
                    if (delimIdx > line.idx) {
                        // line is split at last delimiter
                        let newline = line.split(delimIdx+1);
                        this.$lines.push(line);
                        line = newline;
                    // otherwise, line is split at current character
                    } else {
                        let newline = line.split(idx);
                        this.$lines.push(line);
                        line = newline;
                    }
                }
                // track last seen delimiter char
                if (char === this.delimiter) delimIdx = idx;
            }
        }
        if (line.length) {
            this.$lines.push(line);
        }
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
