export { Asset };

import { Fmt } from './fmt.js';
import { Gadget } from './gadget.js';

/**
 * Assets represent game resources such as textures, audio files, etc. used by the game.
 * Every asset is either linked to the current asset context (the asset context that is in scope when the asset was created)
 * or a global asset list.  Assets linked to the asset context will only be referencable while that asset context is in scope.  Global
 * assets are always referencable once loaded.
 * All assets will be cached within the asset context (or globally) and can be referenced by an asset tag.
 * Asset contents can contain media references.  Media references link an external file/url or data to be loaded with the asset.  Assets will
 * asynchronously load media references.
 * Assets and media references can also be preloaded during asset context advancement.
 */
class Asset extends Gadget {

    static { this.prototype.assetable = true };
    static _gid = 1;

    static { this.$schema('tag', { dflt: (o) => `${o.constructor.name}.${o.constructor._gid++}`}); }
    static { this.$schema('$loadable', { readonly:true, dflt:false, xkey:'loadable' }); }

    static from(src, spec={}) {
        let asset = new this(spec);
        return asset;
    }

    static async load(src, spec={}) {
        let asset = this.from(src, spec);
        return new Promise((resolve) => {
            asset.load().then(() => {
                resolve(asset);
            });
        });
    }

    async load() {
        return Promise.resolve();
    }

    copy(overrides={}) {
        return new this.constructor(Object.assign({}, this, overrides));
    }

    toString() {
        return Fmt.toString(this.constructor.name, this.tag);
    }

}