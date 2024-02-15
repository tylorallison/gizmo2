import { Fmt } from '../js/fmt.js';
import { AutotilerTemplate, SheetTemplate } from '../js/templates.js';

describe('sheet templates', () => {

    it('can load a single sprite spec', ()=>{
        let tmp = new SheetTemplate({
            mediaDir:'test',
        });
        let x = tmp.spriteFromIJ('tsprite', 'file', {x:1,y:2});
        expect(x.args[0].tag).toEqual('tsprite');
        expect(x.args[0].media.args[0].src).toEqual('test/file.png');
        expect(x.args[0].media.args[0].x).toEqual(32);
        expect(x.args[0].media.args[0].y).toEqual(64);
        expect(x.args[0].media.args[0].width).toEqual(32);
        expect(x.args[0].media.args[0].height).toEqual(32);
    });

    it('can load a sprite mixer', ()=>{
        let tmp = new SheetTemplate({
            mediaDir:'test',
        });
        let x = tmp.mixerFromIJs('tmixer', 'file', [{x:1,y:2},{x:2,y:3}]);
        console.log(`x: ${Fmt.ofmt(x)}`);
        expect(x.args[0].tag).toEqual('tmixer');
        expect(x.args[0].variations[0].args[0].tag).toEqual('tmixer.v1');
        expect(x.args[0].variations[0].args[0].media.args[0].src).toEqual('test/file.png');
        expect(x.args[0].variations[0].args[0].media.args[0].x).toEqual(32);
        expect(x.args[0].variations[0].args[0].media.args[0].y).toEqual(64);
        expect(x.args[0].variations[1].args[0].tag).toEqual('tmixer.v2');
        expect(x.args[0].variations[1].args[0].media.args[0].src).toEqual('test/file.png');
        expect(x.args[0].variations[1].args[0].media.args[0].x).toEqual(64);
        expect(x.args[0].variations[1].args[0].media.args[0].y).toEqual(96);
    });

});

describe('autotiler templates', () => {
    it('can generate default specs', ()=>{
        let tmp = new AutotilerTemplate();
        let sketches = tmp.sketches('autofile', 'autotest');
        console.log(`sketches: ${sketches}`);
        expect(sketches.find((v) => v.args[0].tag === 'autotest')).toBeTruthy();
    });
});