export { UiVerticalSpacer, UiHorizontalSpacer }

import { UiView } from './uiView.js';

class UiVerticalSpacer extends UiView {
    static { this.$schema('align', { dflt:.5 }); }
    static { this.$schema('size', { dflt:0 }); }
    static { this.$schema('spacer', { dflt:0 }); }
    static { this.$schema('$count', { eventable:false, dflt:0 }); }

    $cpost(spec) {
        super.$cpost(spec);
        this.$resize();
        this.$count = this.children.length;
    }

    $prerender(ctx) {
        if (this.$count !== this.children.length) {
            this.$count = this.children.length;
            this.$resize();
        }
    }

    $resize() {
        if (this.children && this.children.length) {
            // calculate size
            let size=0, maxSize=0;
            let spacer = this.spacer;
            if (this.size) {
                size = this.size;
                maxSize = this.children.length * size + (this.children.length-1)*spacer;
            } else {
                size = (this.size) ? this.size : 1/this.children.length;
                maxSize = 1;
            }
            let otop = 0;
            if (maxSize > 1) {
                let factor = 1/maxSize;
                size *= factor;
                spacer *= factor;
            } else {
                let delta = 1-maxSize;
                otop = delta * this.align;
            }
            let total = size + spacer;
            for (let i=0; i<this.children.length; i++) {
                let top = otop + total*i;
                let bottom = 1-(top+size);
                this.children[i].xform.top = top;
                this.children[i].xform.bottom = bottom;
            }
        }
    }

}

class UiHorizontalSpacer extends UiVerticalSpacer {

    $resize() {
        if (this.children && this.children.length) {
            // calculate size
            let size=0, maxSize=0;
            let spacer = this.spacer;
            if (this.size) {
                size = this.size;
                maxSize = this.children.length * size + (this.children.length-1)*spacer;
            } else {
                size = (this.size) ? this.size : 1/this.children.length;
                maxSize = 1;
            }
            let oleft = 0;
            if (maxSize > 1) {
                let factor = 1/maxSize;
                size *= factor;
                spacer *= factor;
            } else {
                let delta = 1-maxSize;
                oleft = delta * this.align;
            }
            let total = size + spacer;
            for (let i=0; i<this.children.length; i++) {
                let left = oleft + total*i;
                let right = 1-(left+size);
                this.children[i].xform.left = left;
                this.children[i].xform.right = right;
            }
        }
    }

}
