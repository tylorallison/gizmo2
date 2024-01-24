export { Sfx };

import { Asset } from './asset.js';
import { Media } from './media.js';

/** ========================================================================
 * Audio sound effect asset
 */
class Sfx extends Asset {

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('media', { readonly:true });
        this.$schema('channel', { readonly:true, dflt:'sfx' });
        this.$schema('loop', { readonly:true, dflt:false });
        this.$schema('volume', { readonly:true, dflt:1 });
    }

    static from(src, spec={}) {
        let media;
        if (src instanceof Media) {
            media = src;
        } else {
            media = Media.from(src);
        }
        let asset = new this(Object.assign({}, spec, { media:media }));
        return asset;
    }

    // METHODS -------------------------------------------------------------
    async load() {
        if (this.media) {
            return this.media.load();
        } else {
            return Promise.resolve();
        }
    }

}
