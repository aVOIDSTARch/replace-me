import type { Palette } from './types';

// Light Steel — cool industrial grays
// Indices: 0=lightest, 8=darkest
// 0: #f8f9fa  Bright Snow
// 1: #e9ecef  Platinum
// 2: #dee2e6  Alabaster Grey
// 3: #ced4da  Pale Slate
// 4: #adb5bd  Pale Slate (mid)
// 5: #6c757d  Slate Grey
// 6: #495057  Iron Grey
// 7: #343a40  Gunmetal
// 8: #212529  Carbon Black

export const lightSteel: Palette = [
  {"name":"Bright Snow","hex":"f8f9fa","rgb":[248,249,250],"cmyk":[1,0,0,2],"hsb":[210,1,98],"hsl":[210,17,98],"lab":[98,0,-1]},
  {"name":"Platinum","hex":"e9ecef","rgb":[233,236,239],"cmyk":[3,1,0,6],"hsb":[210,3,94],"hsl":[210,16,93],"lab":[93,0,-2]},
  {"name":"Alabaster Grey","hex":"dee2e6","rgb":[222,226,230],"cmyk":[3,2,0,10],"hsb":[210,3,90],"hsl":[210,14,89],"lab":[90,-1,-2]},
  {"name":"Pale Slate","hex":"ced4da","rgb":[206,212,218],"cmyk":[6,3,0,15],"hsb":[210,6,85],"hsl":[210,14,83],"lab":[85,-1,-4]},
  {"name":"Pale Slate Mid","hex":"adb5bd","rgb":[173,181,189],"cmyk":[8,4,0,26],"hsb":[210,8,74],"hsl":[210,11,71],"lab":[73,-1,-5]},
  {"name":"Slate Grey","hex":"6c757d","rgb":[108,117,125],"cmyk":[14,6,0,51],"hsb":[208,14,49],"hsl":[208,7,46],"lab":[49,-2,-6]},
  {"name":"Iron Grey","hex":"495057","rgb":[73,80,87],"cmyk":[16,8,0,66],"hsb":[210,16,34],"hsl":[210,9,31],"lab":[34,-1,-5]},
  {"name":"Gunmetal","hex":"343a40","rgb":[52,58,64],"cmyk":[19,9,0,75],"hsb":[210,19,25],"hsl":[210,10,23],"lab":[24,-1,-5]},
  {"name":"Carbon Black","hex":"212529","rgb":[33,37,41],"cmyk":[20,10,0,84],"hsb":[210,20,16],"hsl":[210,11,15],"lab":[14,-1,-3]},
];
