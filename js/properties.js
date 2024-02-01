export { CachingProperty, DependentProperty };

import { Fmt } from './fmt.js';

class CachingProperty {
    static tag = 'factor';
    static dflt = null;

    static $schema(cls, tag=null, xsentry={}, xprop={}) {
        if (!tag) tag = this.tag;
        cls.$schema(tag, Object.assign({ 
            dflt:(o) => new this(o, xprop),
            getter:(o,v) => v.value,
            getterStore:false, 
        }, xsentry));
    }

    constructor(gzo, spec={}) {
        this.$gzo = gzo;
        this.$value = ('value' in spec) ? spec.value : this.constructor.dflt;
    }

    $check() {
        return true;
    }

    $compute() {
        return null;
    }

    get value() {
        if (this.$check()) this.$compute()
        return this.$value;
    }

}

class DependentProperty extends CachingProperty {
    static deps = [];
    constructor(gzo, spec={}) {
        super(gzo, spec);
        this.$deps = ('deps' in spec) ? spec.deps : this.constructor.deps;
        this.$lasts = {};
    }

    $check() {
        let recompute = false;
        for (const dep of this.$deps) {
            if (this.$gzo[dep] != this.$lasts[dep]) {
                recompute = true;
                this.$lasts[dep] = this.$gzo[dep];
            }
        }
        return recompute;
    }
}