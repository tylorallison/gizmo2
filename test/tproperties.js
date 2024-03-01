import { Gadget } from '../js/gadget.js';
import { CachingProperty, DependentProperty } from '../js/properties.js';

describe('a caching property', () => {
    let docheck = false;
    class tprop extends CachingProperty {
        static key = 'tprop';
        static dflt = 1;
        $check() {
            return docheck;
        }
        $compute() {
            this.$value *= 2;
        }
    }
    class tgadget extends Gadget {
        static {
            tprop.apply(this);
        }
    }

    it(`caching property can update when needed`, ()=>{
        let gdt = new tgadget();
        expect(gdt.tprop).toEqual(1);
        expect(gdt.tprop).toEqual(1);
        docheck = true;
        expect(gdt.tprop).toEqual(2);
        expect(gdt.tprop).toEqual(4);
        docheck = false;
        expect(gdt.tprop).toEqual(4);
    });
});

describe('a dependent property', () => {
    class tprop extends DependentProperty {
        static key = 'tprop';
        static dflt = 1;
        static deps = ['v1', 'v2'];
        $compute() {
            this.$value *= 2;
        }
    }
    class tgadget extends Gadget {
        static {
            tprop.apply(this);
            this.$schema('v1', { dflt: 1 })
            this.$schema('v2', { dflt: 2 })
            this.$schema('v3', { dflt: 3 })
        }
    }

    it(`dependent property updates when dependent keys change`, ()=>{
        let gdt = new tgadget();
        expect(gdt.tprop).toEqual(2);
        expect(gdt.tprop).toEqual(2);
        gdt.v1 = 'hello';
        expect(gdt.tprop).toEqual(4);
        expect(gdt.tprop).toEqual(4);
        gdt.v2 = 'there';
        expect(gdt.tprop).toEqual(8);
        expect(gdt.tprop).toEqual(8);
        gdt.v3 = 'again';
        expect(gdt.tprop).toEqual(8);
    });

});