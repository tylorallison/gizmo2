export { SketchMixer };

import { Prng } from './prng.js';
import { Sketch } from './sketch.js';

class SketchMixer extends Sketch {

    static {
        this.$schema('variations', { readonly: true, dflt:() => [] });
        this.$schema('$sketch', { readonly:true, parser:(o,x) => Prng.choose(o.variations)});
    }

    render(ctx, x=0, y=0, width=0, height=0) {
        if (this.$sketch) this.$sketch.render(ctx, x, y, width, height);
    }

    async load() {
        return Promise.all(this.variations.map((x) => x.load()));
    }

    copy(overrides={}) {
        let variations = (this.variations || []).map((x) => x.copy());
        return new this.constructor(Object.assign({}, this, { variations: variations}, overrides));
    }
}