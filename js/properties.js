export { CachingProperty, DependentProperty };

import { Fmt } from './fmt.js';
import { GadgetProperty } from './gadget.js';

class CachingProperty extends GadgetProperty{

    $check() {
        return true;
    }

    $compute() {
        return null;
    }

    $getter() {
        if (this.$check()) this.$compute()
        return this.$value;
    }

}

class DependentProperty extends CachingProperty {
    static deps = [];

    constructor(gzd, xprop={}, xgzd={}) {
        super(gzd, xprop, xgzd);
        this.$deps = ('deps' in xprop) ? xprop.deps : this.constructor.deps;
        this.$lasts = {};
    }

    $check() {
        let recompute = false;
        for (const dep of this.$deps) {
            if (this.$gzd[dep] != this.$lasts[dep]) {
                recompute = true;
                this.$lasts[dep] = this.$gzd[dep];
            }
        }
        return recompute;
    }
}