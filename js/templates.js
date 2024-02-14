export { SheetTemplate, AutotilerMap, AutotilerTemplate };

import { Gadget } from './gadget.js';
import { Sprite } from './sprite.js';
import { ImageMedia } from './media.js';
import { SketchMixer } from './sketchMixer.js';

class SheetTemplate extends Gadget {
    static { this.$schema('mediaDir', { dflt:'media' }); }
    static { this.$schema('width', { dflt:16 }); }
    static { this.$schema('height', { dflt:16 }); }
    static { this.$schema('xoff', { dflt:0 }); }
    static { this.$schema('yoff', { dflt:0 }); }

    spriteFromIJ(tag, src, ij) {
        let media = ImageMedia.xspec({
            src:`${this.mediaDir}/${src}.png`, 
            width:this.width,
            height:this.height,
            x:this.xoff + this.width*ij.x, 
            y:this.yoff + this.height*ij.y,
        });
        let asset = Sprite.xspec({
            tag:tag,
            media:media,
        })
        return asset;
    }

    mixerFromIJs(tag, src, ijs) {
        let variations = [];
        let i = 0;
        for (const ij of ijs) {
            i++;
            let vtag = `${tag}.v${i}`;
            variations.push(this.spriteFromIJ(vtag, src, ij));
        }
        return SketchMixer.xspec({ 
            tag:tag,
            variations:variations,
        });
    }
}

class AutotilerMap extends Gadget {
    static {
        this.$schema('ctl',     { dflt: [{x:0, y:0}] });
        this.$schema('t',       { dflt: [{x:1, y:0}] });
        this.$schema('ctr',     { dflt: [{x:2, y:0}] });
        this.$schema('l',       { dflt: [{x:0, y:1}] });
        this.$schema('m',       { dflt: [{x:1, y:1}] });
        this.$schema('r',       { dflt: [{x:2, y:1}] });
        this.$schema('cbl',     { dflt: [{x:0, y:2}] });
        this.$schema('b',       { dflt: [{x:1, y:2}] });
        this.$schema('cbr',     { dflt: [{x:2, y:2}] });
        this.$schema('jbr',     { dflt: [{x:3, y:0}] });
        this.$schema('jbl',     { dflt: [{x:5, y:0}] });
        this.$schema('jtr',     { dflt: [{x:3, y:2}] });
        this.$schema('jtl',     { dflt: [{x:5, y:2}] });
    }

    entries() {
        return Object.entries(this.$store);
    }
}

class AutotilerTemplate extends SheetTemplate {
    static { this.$schema('map',     { dflt: () => new AutotilerMap() }); }
    static from(src, tag, spec={}) {
        if (!tag) tag = src;
        let xspecs = [];
        let tmp = new this(spec);
        for (const [which,ijs] of tmp.map.entries()) {
            let mtag = `${tag}.${which}`;
            xspecs.push(SheetTemplate.mixerFromIJs(mtag, src, ijs));
        }
        return xspecs;
    }
}
