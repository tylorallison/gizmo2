import { Mathf } from '../js/math.js';

describe('a multi point lerp function', () => {
    for (const test of [
        {args: [.5, 0, 0], xrslt: NaN},
        {args: [.5, 0, 0, 1, 2], xrslt: 1},
        {args: [-.5, 0, 0, 1, 2], xrslt: -1},
        {args: [1, 0, 0, 1, 2], xrslt: 2},
        {args: [1.5, 0, 0, 1, 2], xrslt: 3},
        {args: [-.25, 0, 0, .5, 1, 1, 4], xrslt: -.5},
        {args: [0, 0, 0, .5, 1, 1, 4], xrslt: 0},
        {args: [.25, 0, 0, .5, 1, 1, 4], xrslt: .5},
        {args: [.5, 0, 0, .5, 1, 1, 4], xrslt: 1},
        {args: [.75, 0, 0, .5, 1, 1, 4], xrslt: 2.5},
        {args: [1, 0, 0, .5, 1, 1, 4], xrslt: 4},
        {args: [1.25, 0, 0, .5, 1, 1, 4], xrslt: 5.5},
    ]) {
        it('can check interp for ' + test.args, ()=>{
            const rslt = Mathf.mlerp(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }
});

describe('a rect/segment intersect function', () => {

    // intersects
    let intersectTests = [
        {args: [0, 0, 2, 2, 1, 1, 3, 3], xrslt: true},
        {args: [0, 0, 2, 2, -1, 1, 3, 3], xrslt: true},
        {args: [0, 0, 2, 2, -1.1, 1, 1, -1.1], xrslt: false},
        {args: [0, 0, 2, 2, -.9, 1, 1, -.9], xrslt: true},
        {args: [0, 0, 2, 2, .5, 1, 1.5, 1], xrslt: true},
        {args: [0, 0, 2, 2, -.5, 1, 2.5, 1], xrslt: true},
        {args: [0, 0, 2, 2, 1, .5, 1, 1.5], xrslt: true},
        {args: [0, 0, 2, 2, 1, -.5, 1, 2.5], xrslt: true},
    ]
    for (const test of intersectTests) {
        it('can check intersects ' + test.args, ()=>{
            const rslt = Mathf.checkIntersectRectSegment(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }

});

describe('an overlap function', () => {
    // intersects
    let tests = [
        {args: [0, 2, 1, 3], xrslt: 1},
        {args: [1, 3, 0, 2], xrslt: 1},
        {args: [0, 1, 2, 3], xrslt: 0},
        {args: [2, 3, 0, 1], xrslt: 0},
        {args: [0, 3, 1, 2], xrslt: 1},
        {args: [1, 2, 0, 3], xrslt: 1},
    ]
    for (const test of tests) {
        it('can check intersects ' + test.args, ()=>{
            const rslt = Mathf.overlap(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }
});

describe('a segment projection function', () => {
    // intersects
    let tests = [
        {args: [0, 2, 1, 3], xrslt: [1,2]},
        {args: [1, 3, 0, 2], xrslt: [1,2]},
        {args: [0, 1, 2, 3], xrslt: [1,1]},
        {args: [2, 3, 0, 1], xrslt: [2,2]},
        {args: [0, 3, 1, 2], xrslt: [1,2]},
        {args: [1, 2, 0, 3], xrslt: [1,2]},
    ]
    for (const test of tests) {
        it('can transform ' + test.args, ()=>{
            const rslt = Mathf.projectSegment(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }
});

describe('a segment inv projection function', () => {
    // intersects
    let tests = [
        {args: [0, 4, 2, 4], xrslt: [0,2]},
        {args: [0, 4, 2, 6], xrslt: [0,2]},
        {args: [0, 4, 4, 6], xrslt: [0,4]},
        {args: [0, 4, 0, 2], xrslt: [2,4]},
        {args: [0, 4, -2, 2], xrslt: [2,4]},
        {args: [0, 4, -2, 0], xrslt: [0,4]},
        {args: [0, 4, -2, 6], xrslt: [4,0]},
    ]
    for (const test of tests) {
        it('can transform ' + test.args, ()=>{
            const rslt = Mathf.invProjectSegment(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }
});

describe('a towards function', () => {
    // intersects
    let tests = [
        {args: [0, 0, 2, 2, 1], xrslt: [Math.sqrt(2)/2,Math.sqrt(2)/2]},
        {args: [0, 0, 3, 3, 1], xrslt: [Math.sqrt(2)/2,Math.sqrt(2)/2]},
        {args: [0, 0, -2, -2, 1], xrslt: [-Math.sqrt(2)/2,-Math.sqrt(2)/2]},
    ]
    for (const test of tests) {
        it('can move towards ' + test.args, ()=>{
            const rslt = Mathf.towards(...test.args);
            expect(rslt[0]).toBeCloseTo(test.xrslt[0]);
            expect(rslt[1]).toBeCloseTo(test.xrslt[1]);
        });
    }
});

describe('a rounding function', () => {
    // intersects
    let tests = [
        {args: [1.005, 2], xrslt: 1.01},
        {args: [1.005, 1], xrslt: 1.0},
        {args: [-1.005, 2], xrslt: -1},
        {args: [-1.006, 2], xrslt: -1.01},
    ]
    for (const test of tests) {
        it('can round ' + test.args, ()=>{
            const rslt = Mathf.round(...test.args);
            expect(rslt).toBeCloseTo(test.xrslt);
        });
    }
});

describe('a angle normalization function', () => {
    // intersects
    for (const test of [
        {args: [90, 0, false], xrslt: 90},
        {args: [-90, 0, false], xrslt: 270},
        {args: [-90, -180, false], xrslt: -90},
        {args: [-360, -180, false], xrslt: 0},
        {args: [270, -180, false], xrslt: -90},
        {args: [180, -180, false], xrslt: -180},
        {args: [-360, 0, false], xrslt: 0},
        {args: [-450, 0, false], xrslt: 270},
        {args: [-450, -180, false], xrslt: -90},
    ]) {
        it(`can normalize ${test.args}`, ()=>{
            const rslt = Mathf.normalizeAngle(...test.args);
            expect(rslt).toBeCloseTo(test.xrslt);
        });
    }
});

describe('a line distance function', () => {
    // intersects
    for (const test of [
        {args: [1,1, 2,2, 2,1], xrslt: Math.sqrt(2)/2},
        {args: [1,1, 2,1, 2,2], xrslt: 1},
        {args: [1,1, 1,2, 2,2], xrslt: 1},
        {args: [10,0, 0,10, 10,10], xrslt: Math.sqrt(2)*5},
    ]) {
        it(`can compute ${test.args}`, ()=>{
            const rslt = Mathf.lineDistance(...test.args);
            expect(rslt).toBeCloseTo(test.xrslt);
        });
    }
});

describe('a roundto function', () => {
    // intersects
    for (const test of [
        {args: [5.019, 2], xrslt: 5.02},
        {args: [5.0151, 2], xrslt: 5.02},
        {args: [5.011, 2], xrslt: 5.01},
        {args: [-5.011, 2], xrslt: -5.01},
    ]) {
        it(`can compute ${test.args}`, ()=>{
            const rslt = Mathf.roundTo(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }
});

describe('a floorto function', () => {
    // intersects
    for (const test of [
        {args: [5.019, 2], xrslt: 5.01},
        {args: [5.0151, 2], xrslt: 5.01},
        {args: [5.011, 2], xrslt: 5.01},
        {args: [-5.011, 2], xrslt: -5.02},
    ]) {
        it(`can compute ${test.args}`, ()=>{
            const rslt = Mathf.floorTo(...test.args);
            expect(rslt).toEqual(test.xrslt);
        });
    }
});