import { GadgetCtx } from '../js/gadget.js';
import { Media, ImageMedia } from '../js/media.js';

describe('media assets', () => {
    var gctx;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });

    it('can be async loaded', async ()=>{
        let media = await Media.load('../media/sound.mp3');
        expect(media.data instanceof ArrayBuffer).toBeTruthy();
        expect(media.src in GadgetCtx.media).toBeTruthy();
        let media2 = await Media.load('../media/sound.mp3');
        expect(media2.data instanceof ArrayBuffer).toBeTruthy();
    });

    it('can be constructed using from helper', async ()=>{
        let media = Media.from('../media/sound.mp3');
        await media.load();
        expect(media.data instanceof ArrayBuffer).toBeTruthy();
    });

    it('can be constructed using constructor', async ()=>{
        let media = new Media({ src: '../media/sound.mp3' });
        await media.load();
        expect(media.data instanceof ArrayBuffer).toBeTruthy();
    });

});

describe('image media assets', () => {
    var gctx;
    beforeEach(() => {
        gctx = new GadgetCtx();
        GadgetCtx.current = gctx;
    });

    it('can be async loaded', async ()=>{
        let media = await ImageMedia.load('../media/sprite.png');
        expect(media.data instanceof Image).toBeTruthy();
        expect(media.src in GadgetCtx.media).toBeTruthy();
        let media2 = await ImageMedia.load('../media/sprite.png');
        expect(media2.data instanceof Image).toBeTruthy();
        expect(media2.data.height).toEqual(48);
        expect(media2.data.width).toEqual(96);
    });

    it('can be constructed using from helper', async ()=>{
        let media = ImageMedia.from('../media/sprite.png');
        await media.load();
        expect(media.data instanceof Image).toBeTruthy();
    });

    it('can be constructed using constructor', async ()=>{
        let media = new ImageMedia({ src: '../media/sprite.png' });
        await media.load();
        expect(media.data instanceof Image).toBeTruthy();
    });

    it('can be scaled', async ()=>{
        let media = await ImageMedia.load({src: '../media/sprite.png', scale: 2 });
        expect(media.data instanceof Image).toBeTruthy();
        expect(media.data.height).toEqual(96);
        expect(media.data.width).toEqual(192);
    });

    it('can be taken from sheet', async ()=>{
        let media = await ImageMedia.load({ src: '../media/sprite.png', x: 16, y: 16, width: 16, height: 16 });
        expect(media.data instanceof Image).toBeTruthy();
        expect(media.data.height).toEqual(16);
        expect(media.data.width).toEqual(16);
    });

});