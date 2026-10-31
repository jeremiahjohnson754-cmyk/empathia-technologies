# Website fonts

Poppins 4.004 (Regular 400, Medium 500, Bold 700), copyright 2020 The Poppins Project Authors, under the SIL Open Font License 1.1
(`OFL.txt`). Self-hosted: the site requests no font from a third party.

Subsets built with fontTools from the distributed TTFs, covering Latin-1, general punctuation, arrows, the euro sign and the check
mark. Layout features kept: kern, liga, calt, tnum, case.

```
python3 -I -m fontTools.subset Poppins-<Weight>.ttf --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+2713" --layout-features='kern,liga,calt,tnum,case' --flavor=woff --output-file=poppins-<weight>.woff
```

Source TTF SHA-256 (prefix): Regular `7e65201e9b79159e`, Medium `90373e7d838d3246`, Bold `983676516167748b`.
