export { GameModel };

import { Bounds } from './bounds.js';
import { Gizmo } from './gizmo.js';
import { Rect } from './rect.js';

class GameModel extends Gizmo {
    static {
        this.$schema('x', { dflt:0 });
        this.$schema('y', { dflt:0 });
        this.$schema('z', { dflt:0 });
        this.$schema('sketch', { link:true, dflt:new Rect({color:'red', width:4, height:4}) });
        this.prototype.alignx = .5;
        this.prototype.aligny = .5;
    }

    static sortBy(a,b) {
        if (!a || !b) return 0;
        if (a.z === b.z) {
            return a.y-b.y;
        }
        return a.z-b.z;
    }

    static boundsFor(m) {
        if (!m) return new Bounds();
        return new Bounds({
            x:m.x,
            y:m.y,
            width:(m.sketch) ? m.sketch.width : 0,
            height:(m.sketch) ? m.sketch.height : 0,
        });
    }

    render(ctx) {
        if (this.sketch) {
            let width = this.sketch.width;
            let height = this.sketch.height;
            let x = -(width*this.alignx);
            let y = -(height*this.aligny);
            this.sketch.render(ctx, x, y);
        }
    }

}