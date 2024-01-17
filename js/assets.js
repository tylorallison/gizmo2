export { Assets };

import { Asset } from './asset.js';
import { Fmt } from './fmt.js';
import { GadgetCtx } from './gadget.js';

class Assets {
    // CONSTRUCTOR ---------------------------------------------------------
    constructor(spec={}) {
        // the asset references defined by the user...
        this.$xassets = [];
        // the generated/loaded asset cache
        this.$stack = [{}];
        this.$assets = this.$stack[0];
        if (spec.xassets) {
            let xassets = spec.xassets;
            if (!Array.isArray(xassets)) xassets = [ xassets ];
            for (const xasset of xassets) this.$add(xasset);
        }
    }

    $add(xasset) {
        if (xasset instanceof Asset) {
            if (xasset.tag in this.$assets) {
                console.error(`duplicate asset tag detected: ${xasset.tag}, previous asset: ${this.$assets[xasset.tag]}, new asset: ${xasset}`);
            }
            this.$assets[xasset.tag] = xasset;
        } else {
            this.$xassets.push(xasset);
        }
    }

    push(xassets) {
        let assets = {}
        assets.prototype = this.$assets;
        this.$stack.push(assets);
        this.$assets = assets;
        if (!Array.isArray(xassets)) xassets = [xassets];
        for (const xasset of xassets) {
            this.$add(xasset)
        }
    }

    pop() {
        if (this.$stack.length > 1) {
            this.$stack.pop();
            this.$assets = this.$stack[this.$stack.length-1];
        }
    }

    async load() {
        // load unresolves assets
        let xassets = this.$xassets;
        this.$xassets = [];
        for (const xasset of xassets) {
            let asset = GadgetCtx.generate(xasset);
            if (!asset) {
                console.error(`failed to generate asset for: ${Fmt.ofmt(xasset)}`);
                continue;
            }
            if (asset.tag in this.$assets) {
                console.error(`duplicate asset tag detected: ${asset.tag}, previous asset: ${this.$assets[asset.tag]}, new asset: ${asset}`);
            }
            this.$assets[asset.tag] = asset;
        }
        return Promise.all(Object.values(this.assets || {}).map((x) => x.load()));
    }

    get(tag, overrides={}) {
        // search for asset tag
        let asset = this.$assets[tag];
        if (!asset) {
            console.error(`-- missing asset for ${tag}`);
            return null;
        }
        return asset.copy(Object.assign({}, overrides, { loadable: true }));
    }

}