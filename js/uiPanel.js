export { UiPanel };

import { Rect } from './rect.js';
import { UiView } from './uiView.js';

class UiPanel extends UiView {

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('sketch', { link: true, dflt: (o) => o.constructor.dfltSketch });
    }

    // STATIC PROPERTIES ---------------------------------------------------
    static get dfltSketch() {
        return new Rect({ color: 'rgba(255,255,255,.25)' });
    }

    // METHODS -------------------------------------------------------------
    $subrender(ctx) {
        if (this.sketch) this.sketch.render(ctx, this.xform.minx, this.xform.miny, this.xform.width, this.xform.height);
    }

}
