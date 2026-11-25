# Shifting Tide

A theme mod for the Claude desktop app that plays a slowly rolling, monochrome
raymarched ocean behind the conversation, following the app's light/dark mode:
a pale sky with a thin, slowly drifting deck of cloud by day, and a dark sea
under a clustered field of small stars by night. Static film grain over both.

The stars are fixed rather than twinkling, and both they and the cloud ride the
direct sky alone, never the water's reflection: a bright shape against a moving
normal reads as a sparkle, and a shader that flickers gets frozen by the
renderer.

The pointer drags a heat field behind it, after the backdrop on
radar.cloudflare.com/bfcm/2026: a tight core over a wider halo, splatted along
the cursor's travel each frame over a decay, so the field trails the cursor
rather than tracking it. A response curve cuts the gaussian's faint tail, which
is what Radar gets for free by quantising its field into stripe bands.
It lifts the sea by night and shadows it by day, since light mode has no
headroom above the sky to brighten into.

The wave technique is afl_ext's MIT-licensed "Very fast procedural ocean".
On mobile or with Reduce Motion on, a still vector seascape shows instead.

## Install

Register this repository as a plugin marketplace, then install the mod from it:

```
/plugin marketplace add finkelscott/shifting-tide
```

```
/plugin install shifting-tide@finkelscott
```

Both steps are needed: the first tells Claude Code where to look, the second
installs the mod it finds there.

## Developing

`.claude-plugin/types/` holds generated type stubs and is not committed, so
`tsc -p tsconfig.json --noEmit` only runs once those are regenerated locally.

