export { UiScroller };

    import { Asset } from './asset.js';
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
        this.$schema('$verticalSliderPanel', { order:-1, readonly:true, parser: (o,x) => {
            let view = new UiPanel({
                xform:o.verticalSliderXForm,
                sketch:null,
                mousable:false,
            });
            return view;
        }});
        this.$schema('$verticalSlider', { readonly:true, parser: (o,x) => new UiVerticalSlider({}) });
        this.$schema('$horizontalSliderPanel', { order:-1, readonly:true, parser: (o,x) => {
            let view = new UiPanel({
                xform:o.horizontalSliderXForm,
                sketch:null,
                mousable:false,
            });
            return view;
        }});
        this.$schema('$horizontalSlider', { readonly:true, parser: (o,x) => new UiHorizontalSlider({}) });

        this.$schema('autohide', { dflt:true });
        this.$schema('scrollable', { link:true, dflt: (o,x) => new Rect({ color:'rgba(127,127,127,.5', width:100, height:100, fitter:'none'}) });

    }

    $cpost(spec) {
        super.$cpost(spec);
        console.log(`panel: ${this.$verticalSliderPanel}`);
        this.adopt(this.$verticalSliderPanel);
        this.$verticalSliderPanel.adopt(this.$verticalSlider);
        this.adopt(this.$horizontalSliderPanel);
        this.$horizontalSliderPanel.adopt(this.$horizontalSlider);
    }

    $subrender(ctx) {
        if (this.scrollable) {
            if (this.scrollable instanceof Asset) {
                this.scrollable.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
            } else if (this.scrollable instanceof UiView) {
                this.scrollable.render(ctx);
            }
        }
    }

}