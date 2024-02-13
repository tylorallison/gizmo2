export { GameModel };

import { Bounds } from './bounds.js';
import { Gizmo } from './gizmo.js';
import { Rect } from './rect.js';

class GameModel extends Gizmo {
    static {
        this.$schema('x', { dflt:0 });
        this.$schema('y', { dflt:0 });
        this.$schema('z', { dflt:0 });
        this.$schema('sketch', { link:true, dflt:new Rect({color:'green', width:16, height:16}) });
        this.prototype.alignx = .5;
        this.prototype.aligny = .5;
        this.prototype.gridable = true;
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
        if (m.sketch) {
            let x = m.x - (m.sketch.width*m.alignx);
            let y = m.y - (m.sketch.height*m.aligny);
            return new Bounds({
                x:x,
                y:y,
                width:m.sketch.width,
                height:m.sketch.height,
            });
        }
        return new Bounds({
            x:m.x,
            y:m.y,
        });
    }

    render(ctx) {
        if (this.sketch) {
            let width = this.sketch.width;
            let height = this.sketch.height;
            let x = this.x - (width*this.alignx);
            let y = this.y - (height*this.aligny);
            this.sketch.render(ctx, x, y);
        }
    }

}