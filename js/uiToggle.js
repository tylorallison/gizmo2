export { UiToggle };

import { Rect } from './rect.js';
import { Shape } from './shape.js';
import { UiView } from './uiView.js';
import { XForm } from './xform.js';

class UiToggle extends UiView {
    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('unpressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color:'rgba(255,255,255,.25)' }) });
        this.$schema('highlightSketch', { link: true, dflt: (o) => new Rect({ borderColor:'yellow', border:3, fill:false }) });
        this.$schema('pressedSketch', { link: true, dflt: (o) => new Rect({ borderColor:'blue', border:3, color: 'rgba(255,255,255,.75)' }) });
        this.$schema('iconSketch', { link: true, dflt: (o) => new Shape({ 
            fitter:'ratio',
            fill: true,
            joint:'round',
            verts: [ {x:2, y:19}, {x:5, y:16}, {x:10, y:21}, {x:26, y:5}, {x:29, y:8}, {x:10, y:27}, ],
            border: 3,
            borderColor: 'rgba(0,0,0,1)',
            color: 'rgba(255,255,255,1)'
        })});
        this.$schema('blankSketch', { link: true, dflt: (o) => new Shape({ 
            fitter:'ratio',
            fill: false,
            joint:'round',
            verts: [ {x:2, y:19}, {x:5, y:16}, {x:10, y:21}, {x:26, y:5}, {x:29, y:8}, {x:10, y:27}, ],
            border: 3,
            borderColor: 'rgba(0,0,0,.25)',
        })});
        this.$schema('value', { dflt:true });
        this.$schema('iconXForm', { readonly:true, parser: (o,x) => {
            let xform = (x.iconXForm) ? x.iconXForm : new XForm({grip: .1});
            xform.parent = o.xform;
            return xform;
        }});
    }

    // EVENT HANDLERS ------------------------------------------------------
    $on_clicked(evt) {
        super.$on_clicked(evt);
        this.value = !this.value;
    }

    // METHODS -------------------------------------------------------------
    $subrender(ctx) {
        // render active sketch
        if (this.value) {
            this.pressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        } else {
            this.unpressedSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        }
        // render highlight
        if (this.hovered) {
            this.highlightSketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
        }
        // apply icon transform
        this.iconXForm.apply(ctx, false);
        // render icon
        if (this.value) {
            this.iconSketch.render(ctx, this.iconXForm.minx, this.iconXForm.miny, this.iconXForm.width, this.iconXForm.height);
        } else {
            this.blankSketch.render(ctx, this.iconXForm.minx, this.iconXForm.miny, this.iconXForm.width, this.iconXForm.height);
        }
        if (this.dbg && this.dbg.xform) this.iconXForm.render(ctx);
        this.iconXForm.revert(ctx, false);
    }

}
