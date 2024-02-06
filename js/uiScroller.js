export { UiScroller };

import { Asset } from './asset.js';
import { EvtEmitter } from './evt.js';
import { GadgetCtx } from './gadget.js';
import { Mathf } from './math.js';
import { Rect } from './rect.js';
import { UiPanel } from './uiPanel.js';
import { UiHorizontalSlider, UiVerticalSlider } from './uiSlider.js';
import { UiView } from './uiView.js';
import { XForm } from './xform.js';

class UiScroller extends UiView {
    static {
        this.$schema('verticalSliderXForm', { order:-2, readonly:true, parser: (o,x) => {
            let xform = (x.verticalSliderXForm) ? x.verticalSliderXForm : new XForm({ left:.9, bottom:.1 });
            xform.parent = o.xform;
            return xform;
        }});

        this.$schema('horizontalSliderXForm', { order:-2, readonly:true, parser: (o,x) => {
            let xform = (x.horizontalSliderXForm) ? x.horizontalSliderXForm : new XForm({ top:.9, right:.1 });
            xform.parent = o.xform;
            return xform;
        }});

        // modifiable internal scrollable xform properties
        this.$schema('width', { order:-1, dflt:0, setter: (o,v) => {
            if (o.$scrollable) {
                if (v) {
                    o.$scrollable.xform.fixedWidth = v;
                } else {
                    o.$scrollable.xform.fixedWidth = o.xform.width;
                }
            }
            return v;
        }});
        this.$schema('height', { order:-1, dflt:0, setter: (o,v) => {
            if (o.$scrollable) {
                if (v) {
                    o.$scrollable.xform.fixedHeight = v;
                } else {
                    o.$scrollable.xform.fixedHeight = o.xform.height;
                }
            }
            return v;
        }});
        this.$schema('origx', { order:-1, dflt:.5, setter: (o,v) => {
            if (o.$scrollable) o.$scrollable.xform.origx = v;
            return v;
        }});
        this.$schema('origy', { order:-1, dflt:.5, setter: (o,v) => {
            if (o.$scrollable) o.$scrollable.xform.origy = v;
            return v;
        }});
        this.$schema('scrollX', { order:-1, readonly:true, dflt: .5 });
        this.$schema('scrollY', { order:-1, readonly:true, dflt: .5 });

        this.$schema('minScroll', { readonly:true, dflt: .1 });
        this.$schema('maxScroll', { readonly:true, dflt: .9 });
        this.$schema('fitToSketchWidth', { readonly:true, dflt: false });
        this.$schema('fitToSketchHeight', { readonly:true, dflt: false });

        this.$schema('$verticalSliderPanel', { order:-1, readonly:true, parser: (o,x) => {
            let view = new UiPanel({
                xform:o.verticalSliderXForm,
                sketch:null,
                mousable:false,
            });
            return view;
        }});
        this.$schema('$verticalSlider', { readonly:true, parser: (o,x) => new UiVerticalSlider({ value:o.scrollY }) });
        this.$schema('$horizontalSliderPanel', { order:-1, readonly:true, parser: (o,x) => {
            let view = new UiPanel({
                xform:o.horizontalSliderXForm,
                sketch:null,
                mousable:false,
            });
            return view;
        }});
        this.$schema('$horizontalSlider', { readonly:true, parser: (o,x) => new UiHorizontalSlider({value:o.scrollY}) });

        this.$schema('scrollable', { dflt:true });
        this.$schema('scrollRateX', { dflt:.01 });
        this.$schema('scrollRateY', { dflt:.01 });
        this.$schema('zoomable', { dflt:true });
        this.$schema('zoomRate', { dflt:.01 });
        this.$schema('zoomKey', { dflt:'Shift' });
        this.$schema('autohide', { dflt:true });
        this.$schema('$zoomed', { eventable:false, dflt:false });
        // the internal scrollable panel
        this.$schema('$scrollable', { readonly:true, parser: (o,x) => new UiPanel({
            sketch: null,
            xform: new XForm({
                grip:.5, 
                origx:o.origx, 
                origy:o.origy, 
                fixedWidth:o.width||o.xform.width, 
                fixedHeight:o.height||o.xform.height
            }),
        })});
        // a sketch or a view that will act as the scrollable area.  
        // -- A view will be made a child of an internal scrollable panel, a
        // -- A sketch will override the default internal panel's sketch
        this.$schema('scrollable', { readonly:true, dflt: (o,x) => new Rect({ color:'rgba(127,127,127,.5', width:100, height:100, fitter:'none'}) });
        this.$schema('at_scrolled', { readonly:true, dflt: (o) => new EvtEmitter(o, 'scrolled') });

    }

    $cpost(spec) {
        super.$cpost(spec);
        // "adopt" scrollable region
        this.adopt(this.$scrollable);
        if (this.scrollable) {
            if (this.scrollable instanceof UiView) {
                this.$scrollable.adopt(this.scrollable);
            } else if (this.scrollable instanceof Asset) {
                this.$scrollable.sketch = this.scrollable;
            }
        }
        // adopt sliders
        this.adopt(this.$verticalSliderPanel);
        this.$verticalSliderPanel.adopt(this.$verticalSlider);
        this.adopt(this.$horizontalSliderPanel);
        this.$horizontalSliderPanel.adopt(this.$horizontalSlider);
        // setup event handlers
        this.$verticalSlider.at_modified.listen(this.$on_verticalSlider_modified, this, false, (evt) => (evt.key === 'value'));
        this.$horizontalSlider.at_modified.listen(this.$on_horizontalSlider_modified, this, false, (evt) => (evt.key === 'value'));
        this.at_scrolled.listen(this.$on_scrolled, this);
        if (this.zoomable) GadgetCtx.at_keyed.listen(this.$on_keyed, this);
    }

    destroy() {
        GadgetCtx.at_keyed.ignore(this.$on_keyed);
    }

    $on_keyed(evt) {
        if (evt.tag === 'keydowned') {
            if (evt.key === this.zoomKey) this.zoomed = true;
        } else if (evt.tag === 'keyupped') {
            if (evt.key === this.zoomKey) this.zoomed = false;
        }
    }

    $on_linkModified(evt, key) {
        super.$on_linkModified(evt, key);
        if (key.toString().startsWith('xform')) {
            if (!this.width) this.$scrollable.xform.fixedWidth = this.xform.width;
            if (!this.height) this.$scrollable.xform.fixedHeight = this.xform.height;
        }
    }

    $on_verticalSlider_modified(evt) {
        let overlap = (this.$scrollable.xform.height - this.xform.height);
        if (overlap > 0) {
            let y = (.5 - this.$verticalSlider.value) * overlap;
            this.$scrollable.xform.y = y;
        }
    }

    $on_horizontalSlider_modified(evt) {
        let overlap = (this.$scrollable.xform.width - this.xform.width);
        if (overlap > 0) {
            let x = (.5 - this.$horizontalSlider.value) * overlap;
            this.$scrollable.xform.x = x;
        }
    }

    $on_scrolled(evt) {
        if (this.zoomed) {
            this.$scrollable.xform.scalex *= (1+evt.scroll.y*this.zoomRate);
            this.$scrollable.xform.scaley *= (1+evt.scroll.y*this.zoomRate);
        } else if (this.scrollable) {
            let x = Mathf.clamp(this.$horizontalSlider.value + evt.scroll.x*this.scrollRateX, 0, 1);
            this.$horizontalSlider.value = x;
            let y = Mathf.clamp(this.$verticalSlider.value + evt.scroll.y*this.scrollRateY, 0, 1);
            this.$verticalSlider.value = y;
        }
    }

    $compute_scrollsize() {
        // width
        let sizex = this.xform.width/(this.$scrollable.xform.width*this.$scrollable.xform.scalex);
        this.$horizontalSlider.knobPct = Mathf.clamp(sizex, this.minScroll, this.maxScroll);
        if (sizex >= 1) {
            if (this.autohide) {
                this.$horizontalSlider.active = false;
                this.$horizontalSlider.visible = false;
            }
            this.$scrollable.xform.x = 0;
        } else {
            this.$horizontalSlider.active = true;
            this.$horizontalSlider.visible = true;
            let overlap = ((this.$scrollable.xform.width*this.$scrollable.xform.scalex) - this.xform.width);
            let x = (.5 - this.$horizontalSlider.value) * overlap;
            this.$scrollable.xform.x = x;
        }
        // height
        let sizey = this.xform.height/(this.$scrollable.xform.height*this.$scrollable.xform.scaley);
        this.$verticalSlider.knobPct = Mathf.clamp(sizey, this.minScroll, this.maxScroll);
        if (sizey >= 1) {
            if (this.autohide) {
                this.$verticalSlider.active = false;
                this.$verticalSlider.visible = false;
            }
            this.$scrollable.xform.y = 0;
        } else {
            this.$verticalSlider.active = true;
            this.$verticalSlider.visible = true;
            let overlap = ((this.$scrollable.xform.height*this.$scrollable.xform.scaley) - this.xform.height);
            let y = (.5 - this.$verticalSlider.value) * overlap;
            this.$scrollable.xform.y = y;
        }

    }

    $subrender(ctx) {
        this.$compute_scrollsize();
        if (this.$scrollable.sketch) {
            if (this.fitToSketchWidth) this.$scrollable.xform.fixedWidth = this.$scrollable.sketch.width;
            if (this.fitToSketchHeight) this.$scrollable.xform.fixedHeight = this.$scrollable.sketch.height;
        }
    }

}