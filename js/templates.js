export { SheetTemplate, AutotilerMap, AutotilerTemplate };

import { Gadget } from './gadget.js';
import { Sprite } from './sprite.js';
import { ImageMedia } from './media.js';
import { SketchMixer } from './sketchMixer.js';
import { Fmt } from './fmt.js';

class SheetTemplate extends Gadget {
    static { this.$schema('mediaDir', { dflt:'media' }); }
    static { this.$schema('width', { dflt:32 }); }
    static { this.$schema('height', { dflt:32 }); }
    static { this.$schema('xoff', { dflt:0 }); }
    static { this.$schema('yoff', { dflt:0 }); }

    spriteFromIJ(tag, src, ij, overrides={}) {
        let width = overrides.width || this.width;
        let height = overrides.width || this.height;
        let media = ImageMedia.xspec({
            src:`${this.mediaDir}/${src}.png`, 
            width:width,
            height:height,
            x:this.xoff + this.width*ij.x, 
            y:this.yoff + this.height*ij.y,
        });
        let asset = Sprite.xspec({
            tag:tag,
            media:media,
        })
        return asset;
    }

    mixerFromIJs(tag, src, ijs, overrides={}) {
        let variations = [];
        let i = 0;
        for (const ij of ijs) {
            i++;
            let vtag = `${tag}.v${i}`;
            variations.push(this.spriteFromIJ(vtag, src, ij, overrides));
        }
        //console.log(`${Fmt.ofmt(variations)}`);
        return SketchMixer.xspec({ 
            tag:tag,
            variations:variations,
        });
    }
}

/**
 * +---+---+---+---+---+---+---+---+---+---+---+
 * |   | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
 * +---+---+---+---+---+---+---+---+---+---+---+
 * | 0 |   |   |   |ctl| t | t |ctr|   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+
 * | 1 |   |   |   | l |   |   | r |   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+
 * | 2 |   |   |ctl|jtl|       |jtr|ctr|   |   |
 * +---+---+---+---+---+   m   +---+---+---+---+
 * | 3 |ctl| t |jtl|   |       |   |jtr| t |ctr|
 * +---+---+---+---+---+-------+---+---+---+---+
 * | 4 | l |   |       |       |       | m | r |
 * +---+---+---+   m   |   m   |   m   +---+---+
 * | 5 | l |   |       |       |       | m | r |
 * +---+---+---+---+---+-------+---+---+---+---+
 * | 6 |cbl| b |jbl|   |       |   |jbr| b |cbr|
 * +---+---+---+---+---+   m   +---+---+---+---+
 * | 7 |   |   |cbl|jbl|       |jbr|cbr|   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+
 * | 8 |   |   |   | l |   |   | r |   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+
 * | 9 |   |   |   |cbl| b | b |cbr|   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+
 */
class AutotilerMap extends Gadget {
    static {
        this.$schema('base',    { dflt: [{x:4,y:2}, {x:2,y:4}, {x:4,y:4}, {x:6,y:4}, {x:4,y:6}] });
        this.$schema('ctl',     { dflt: [{x:3,y:0}, {x:2,y:2}, {x:0,y:3}] });
        this.$schema('t',       { dflt: [{x:4,y:0}, {x:5,y:0}, {x:1,y:3}, {x:8,y:3}] });
        this.$schema('ctr',     { dflt: [{x:6,y:0}, {x:7,y:2}, {x:9,y:3}] });
        this.$schema('r',       { dflt: [{x:6,y:1}, {x:9,y:4}, {x:9,y:4}, {x:9,y:5}] });
        this.$schema('jtr',     { dflt: [{x:6,y:2}, {x:7,y:3}] });
        this.$schema('cbr',     { dflt: [{x:9,y:6}, {x:7,y:7}, {x:6,y:9}] });
        this.$schema('b',       { dflt: [{x:1,y:6}, {x:8,y:6}, {x:4,y:9}, {x:5,y:9}] });
        this.$schema('jbr',     { dflt: [{x:7,y:6}, {x:6,y:7}] });
        this.$schema('cbl',     { dflt: [{x:0,y:6}, {x:2,y:7}, {x:3,y:9}] });
        this.$schema('l',       { dflt: [{x:3,y:1}, {x:0,y:4}, {x:0,y:5}, {x:3,y:8}] });
        this.$schema('jbl',     { dflt: [{x:2,y:6}, {x:3,y:7}] });
        this.$schema('jtl',     { dflt: [{x:3,y:2}, {x:2,y:3}] });
    }

    entries() {
        return Object.entries(this);
    }
}

class AutotilerTemplate extends SheetTemplate {
    static { this.$schema('width', { dflt:16 }); }
    static { this.$schema('height', { dflt:16 }); }
    static { this.$schema('map',     { dflt: () => new AutotilerMap() }); }

    static from(src, tag, spec={}) {
        let tmp = new this(spec);
        return tmp.sketches(src, tag);
    }

    sketches(src, tag) {
        if (!tag) tag = src;
        let xspecs = [];
        // push spec for base sketch
        xspecs.push(this.mixerFromIJs(tag, src, this.map.base, {width:this.width*2, height:this.height*2}));
        // push specs for each of the "sides" of the autotiler map
        for (const [which,ijs] of this.map.entries()) {
            if (which === 'base') continue;
            let mtag = `${tag}_${which}`;
            xspecs.push(this.mixerFromIJs(mtag, src, ijs));
        }
        return xspecs;
    }

}
