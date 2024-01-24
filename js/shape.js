export { Shape };

import { Mathf } from './math.js';
import { Sketch } from './sketch.js';
import { Vect } from './vect.js';

/** ========================================================================
 * A shape is a simple sketch primitive utilizing js Path2D to render a shape
 */
class Shape extends Sketch {

    // SCHEMA --------------------------------------------------------------
    static {
        this.$schema('border', {dflt: 0});
        this.$schema('fill', {dflt: true});
        this.$schema('color', {dflt: 'rgba(127,127,127,.75'});
        this.$schema('borderColor', {dflt: 'black'});
        this.$schema('dash', { dflt:null });
        this.$schema('joint', { dflt:'miter' });
        this.$schema('verts', {dflt: () => [{x:0,y:0}, {x:20,y:0}, {x:20,y:20}, {x:0,y:20}], readonly: true});
        this.$schema('$scalex', {parser: () => 1});
        this.$schema('$scaley', {parser: () => 1});
        this.$schema('$xverts', {dflt: (o) => o.verts});
        this.$schema('$scalex', {dflt:1});
        this.$schema('$scaley', {dflt:1});
        this.$schema('$path', { getter: (o, ov) => o.constructor.toPath(o.$xverts)});
        this.$schema('$min', { getter: (o, ov) => Vect.min(...o.verts) });
        this.$schema('$max', { getter: (o, ov) => Vect.max(...o.verts) });
        this.$schema('width', { getter: (o, ov) => (o.$max.x-o.$min.x) });
        this.$schema('height', { getter: (o, ov) => (o.$max.y-o.$min.y) });
    }

    static toPath(verts) {
        let path = new Path2D();
        path.moveTo(verts[0].x, verts[0].y);
        for (let i=1; i<verts.length; i++) {
            let vert = verts[i];
            path.lineTo(vert.x, vert.y);
        }
        path.closePath();
        return path;
    }

    // METHODS -------------------------------------------------------------
    $subrender(ctx, x=0, y=0, width=0, height=0) {
        // default width/height to internal width/height if not specified
        if (!width) width = this.width;
        if (!height) height = this.height;
        // translate
        let cform = ctx.getTransform();
        if (x || y) ctx.translate(x, y);
        let scalex = 1, scaley = 1;
        if ((width && width !== this.width) || (height && height !== this.height)) {
            scalex = width/this.width;
            scaley = height/this.height;
            if (!Mathf.approx(scalex, this.$scalex) || !Mathf.approx(scaley, this.$scaley)) {
                this.$scalex = scalex;
                this.$scaley = scaley;
                let delta = Vect.min(...this.verts);
                // translate verts
                this.$xverts = this.verts.map((v) => Vect.mult(Vect.sub(v, delta), {x:scalex,y:scaley}));
            }
        }
        if (this.fill) {
            ctx.fillStyle = this.color;
            ctx.fill(this.$path);
        }
        if (this.border) {
            if (this.dash) ctx.setLineDash(this.dash);
            ctx.lineWidth = this.border;
            ctx.lineJoin = this.joint;
            ctx.strokeStyle = this.borderColor;
            ctx.stroke(this.$path);
            if (this.dash) ctx.setLineDash([]);
        }
        ctx.setTransform(cform);
    }    
}