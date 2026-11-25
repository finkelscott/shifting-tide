import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'

// Still picture: shown on mobile, under Reduce Motion, or wherever the shader
// does not play. Its top-left corner doubles as the shader's light/dark probe.
const TIDE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
.sky0 { stop-color: #f6f6f6 } .sky1 { stop-color: #d9d9db }
.sea0 { stop-color: #c9c9cb } .sea1 { stop-color: #9e9ea0 }
.crest { stroke: #ffffff; stroke-opacity: 0.35 }
.probe { fill: #ffffff }
.stars { opacity: 0 }
.clouds { opacity: 0.6 }
@media (prefers-color-scheme: dark) {
  .sky0 { stop-color: #08090d } .sky1 { stop-color: #14161c }
  .sea0 { stop-color: #15171c } .sea1 { stop-color: #08090c }
  .crest { stroke: #8a8f9c; stroke-opacity: 0.25 }
  .probe { fill: #000000 }
  .stars { opacity: 0.9 }
  .clouds { opacity: 0 }
}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky0"/><stop offset="1" class="sky1"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sea0"/><stop offset="1" class="sea1"/></linearGradient>
</defs>
<rect width="1600" height="420" fill="url(#sky)"/>
<g class="clouds" fill="#b4b4b8">
<ellipse cx="267" cy="126" rx="70" ry="24"/>
<ellipse cx="234" cy="118" rx="73" ry="16"/>
<ellipse cx="282" cy="119" rx="83" ry="16"/>
<ellipse cx="237" cy="109" rx="81" ry="17"/>
<ellipse cx="217" cy="115" rx="68" ry="16"/>
<ellipse cx="279" cy="113" rx="82" ry="25"/>
<ellipse cx="594" cy="88" rx="36" ry="18"/>
<ellipse cx="608" cy="71" rx="61" ry="14"/>
<ellipse cx="642" cy="74" rx="46" ry="18"/>
<ellipse cx="666" cy="78" rx="42" ry="19"/>
<ellipse cx="673" cy="83" rx="67" ry="12"/>
<ellipse cx="610" cy="80" rx="49" ry="15"/>
<ellipse cx="1073" cy="160" rx="51" ry="23"/>
<ellipse cx="1049" cy="156" rx="88" ry="25"/>
<ellipse cx="1012" cy="150" rx="51" ry="28"/>
<ellipse cx="958" cy="144" rx="54" ry="21"/>
<ellipse cx="954" cy="155" rx="78" ry="28"/>
<ellipse cx="954" cy="151" rx="95" ry="22"/>
<ellipse cx="1341" cy="94" rx="49" ry="23"/>
<ellipse cx="1310" cy="102" rx="74" ry="15"/>
<ellipse cx="1326" cy="88" rx="68" ry="17"/>
<ellipse cx="1357" cy="93" rx="76" ry="16"/>
<ellipse cx="1394" cy="94" rx="45" ry="22"/>
<ellipse cx="1343" cy="99" rx="64" ry="15"/>
<ellipse cx="841" cy="239" rx="38" ry="10"/>
<ellipse cx="826" cy="241" rx="56" ry="13"/>
<ellipse cx="802" cy="241" rx="53" ry="15"/>
<ellipse cx="852" cy="229" rx="40" ry="10"/>
<ellipse cx="829" cy="228" rx="55" ry="16"/>
<ellipse cx="801" cy="236" rx="36" ry="12"/>
</g>
<g class="stars" fill="#ffffff">
<circle cx="1286" cy="30" r="0.7" opacity="0.78"/>
<circle cx="1317" cy="16" r="0.8" opacity="0.85"/>
<circle cx="1241" cy="50" r="1.15" opacity="1.0"/>
<circle cx="1323" cy="25" r="0.8" opacity="0.85"/>
<circle cx="512" cy="289" r="0.6" opacity="0.68"/>
<circle cx="381" cy="315" r="1.15" opacity="1.0"/>
<circle cx="505" cy="309" r="0.6" opacity="0.68"/>
<circle cx="504" cy="217" r="0.5" opacity="0.5"/>
<circle cx="532" cy="223" r="0.95" opacity="0.93"/>
<circle cx="466" cy="252" r="0.7" opacity="0.78"/>
<circle cx="539" cy="302" r="0.55" opacity="0.6"/>
<circle cx="477" cy="288" r="0.7" opacity="0.78"/>
<circle cx="143" cy="322" r="0.7" opacity="0.78"/>
<circle cx="183" cy="348" r="0.95" opacity="0.93"/>
<circle cx="104" cy="370" r="0.8" opacity="0.85"/>
<circle cx="194" cy="396" r="0.8" opacity="0.85"/>
<circle cx="145" cy="306" r="0.7" opacity="0.78"/>
<circle cx="130" cy="325" r="0.95" opacity="0.93"/>
<circle cx="180" cy="342" r="0.6" opacity="0.68"/>
<circle cx="222" cy="379" r="1.15" opacity="1.0"/>
<circle cx="118" cy="337" r="1.15" opacity="1.0"/>
<circle cx="673" cy="261" r="0.7" opacity="0.78"/>
<circle cx="616" cy="308" r="0.8" opacity="0.85"/>
<circle cx="768" cy="314" r="0.8" opacity="0.85"/>
<circle cx="750" cy="286" r="0.55" opacity="0.6"/>
<circle cx="693" cy="267" r="0.6" opacity="0.68"/>
<circle cx="908" cy="26" r="0.55" opacity="0.6"/>
<circle cx="954" cy="94" r="0.5" opacity="0.5"/>
<circle cx="932" cy="61" r="0.8" opacity="0.85"/>
<circle cx="882" cy="71" r="0.5" opacity="0.5"/>
<circle cx="942" cy="58" r="0.6" opacity="0.68"/>
<circle cx="961" cy="109" r="0.8" opacity="0.85"/>
<circle cx="654" cy="54" r="0.55" opacity="0.6"/>
<circle cx="559" cy="153" r="1.15" opacity="1.0"/>
<circle cx="651" cy="204" r="0.6" opacity="0.68"/>
<circle cx="615" cy="99" r="1.15" opacity="1.0"/>
<circle cx="1001" cy="254" r="0.7" opacity="0.78"/>
<circle cx="1049" cy="294" r="1.15" opacity="1.0"/>
<circle cx="1114" cy="209" r="0.5" opacity="0.5"/>
<circle cx="1068" cy="191" r="0.95" opacity="0.93"/>
<circle cx="1066" cy="235" r="0.95" opacity="0.93"/>
<circle cx="1042" cy="286" r="0.7" opacity="0.78"/>
<circle cx="1032" cy="235" r="0.8" opacity="0.85"/>
<circle cx="244" cy="77" r="0.6" opacity="0.68"/>
<circle cx="320" cy="64" r="0.8" opacity="0.85"/>
<circle cx="279" cy="80" r="0.6" opacity="0.68"/>
<circle cx="398" cy="102" r="0.7" opacity="0.78"/>
<circle cx="286" cy="64" r="1.15" opacity="1.0"/>
<circle cx="257" cy="105" r="1.15" opacity="1.0"/>
<circle cx="306" cy="129" r="1.15" opacity="1.0"/>
<circle cx="1171" cy="105" r="0.8" opacity="0.85"/>
<circle cx="1160" cy="54" r="0.7" opacity="0.78"/>
<circle cx="1172" cy="72" r="0.5" opacity="0.5"/>
<circle cx="1162" cy="107" r="0.5" opacity="0.5"/>
<circle cx="977" cy="202" r="0.8" opacity="0.85"/>
<circle cx="1038" cy="216" r="1.15" opacity="1.0"/>
<circle cx="949" cy="236" r="0.55" opacity="0.6"/>
<circle cx="983" cy="210" r="0.55" opacity="0.6"/>
<circle cx="971" cy="198" r="0.7" opacity="0.78"/>
<circle cx="939" cy="138" r="0.5" opacity="0.5"/>
<circle cx="825" cy="326" r="0.5" opacity="0.5"/>
<circle cx="780" cy="227" r="0.55" opacity="0.6"/>
<circle cx="752" cy="304" r="0.5" opacity="0.5"/>
<circle cx="810" cy="280" r="1.15" opacity="1.0"/>
<circle cx="785" cy="293" r="1.15" opacity="1.0"/>
<circle cx="808" cy="173" r="0.95" opacity="0.93"/>
<circle cx="818" cy="219" r="0.7" opacity="0.78"/>
<circle cx="1266" cy="297" r="0.8" opacity="0.85"/>
<circle cx="1235" cy="310" r="0.55" opacity="0.6"/>
<circle cx="1298" cy="253" r="0.8" opacity="0.85"/>
<circle cx="1294" cy="300" r="0.8" opacity="0.85"/>
<circle cx="1275" cy="344" r="0.6" opacity="0.68"/>
<circle cx="1365" cy="312" r="0.6" opacity="0.68"/>
<circle cx="1298" cy="286" r="0.7" opacity="0.78"/>
<circle cx="1288" cy="260" r="0.8" opacity="0.85"/>
<circle cx="1483" cy="119" r="0.6" opacity="0.68"/>
<circle cx="1521" cy="70" r="0.5" opacity="0.5"/>
<circle cx="378" cy="119" r="0.7" opacity="0.78"/>
<circle cx="416" cy="193" r="0.7" opacity="0.78"/>
<circle cx="368" cy="106" r="0.6" opacity="0.68"/>
<circle cx="316" cy="220" r="0.5" opacity="0.5"/>
<circle cx="321" cy="176" r="0.95" opacity="0.93"/>
<circle cx="352" cy="174" r="0.6" opacity="0.68"/>
<circle cx="380" cy="83" r="1.15" opacity="1.0"/>
<circle cx="318" cy="129" r="1.15" opacity="1.0"/>
<circle cx="371" cy="78" r="0.55" opacity="0.6"/>
<circle cx="823" cy="313" r="0.7" opacity="0.78"/>
<circle cx="764" cy="377" r="0.7" opacity="0.78"/>
<circle cx="832" cy="356" r="0.5" opacity="0.5"/>
<circle cx="828" cy="283" r="0.95" opacity="0.93"/>
<circle cx="747" cy="339" r="0.95" opacity="0.93"/>
<circle cx="785" cy="379" r="0.7" opacity="0.78"/>
<circle cx="867" cy="302" r="1.15" opacity="1.0"/>
<circle cx="851" cy="340" r="0.8" opacity="0.85"/>
<circle cx="776" cy="340" r="0.95" opacity="0.93"/>
<circle cx="777" cy="143" r="0.7" opacity="0.78"/>
<circle cx="801" cy="192" r="0.6" opacity="0.68"/>
<circle cx="795" cy="143" r="0.5" opacity="0.5"/>
<circle cx="767" cy="110" r="0.7" opacity="0.78"/>
<circle cx="734" cy="118" r="1.15" opacity="1.0"/>
<circle cx="737" cy="125" r="0.8" opacity="0.85"/>
<circle cx="770" cy="182" r="0.6" opacity="0.68"/>
<circle cx="799" cy="168" r="0.6" opacity="0.68"/>
<circle cx="799" cy="130" r="0.8" opacity="0.85"/>
<circle cx="430" cy="97" r="0.7" opacity="0.78"/>
<circle cx="108" cy="79" r="0.6" opacity="0.68"/>
<circle cx="373" cy="323" r="0.55" opacity="0.6"/>
<circle cx="1168" cy="180" r="0.6" opacity="0.68"/>
<circle cx="144" cy="301" r="0.5" opacity="0.5"/>
<circle cx="1061" cy="307" r="0.6" opacity="0.68"/>
<circle cx="441" cy="220" r="0.55" opacity="0.6"/>
<circle cx="438" cy="365" r="0.55" opacity="0.6"/>
<circle cx="518" cy="266" r="0.7" opacity="0.78"/>
<circle cx="589" cy="212" r="0.55" opacity="0.6"/>
<circle cx="1449" cy="358" r="0.7" opacity="0.78"/>
<circle cx="661" cy="241" r="0.5" opacity="0.5"/>
<circle cx="603" cy="290" r="0.5" opacity="0.5"/>
<circle cx="1397" cy="333" r="0.55" opacity="0.6"/>
<circle cx="627" cy="21" r="0.55" opacity="0.6"/>
<circle cx="678" cy="40" r="0.5" opacity="0.5"/>
<circle cx="1477" cy="83" r="0.7" opacity="0.78"/>
<circle cx="513" cy="201" r="0.6" opacity="0.68"/>
<circle cx="1034" cy="58" r="0.55" opacity="0.6"/>
<circle cx="690" cy="155" r="0.55" opacity="0.6"/>
<circle cx="94" cy="41" r="0.7" opacity="0.78"/>
<circle cx="683" cy="383" r="0.5" opacity="0.5"/>
<circle cx="931" cy="123" r="0.5" opacity="0.5"/>
<circle cx="1513" cy="113" r="0.7" opacity="0.78"/>
<circle cx="1382" cy="149" r="0.6" opacity="0.68"/>
<circle cx="1533" cy="94" r="0.6" opacity="0.68"/>
<circle cx="250" cy="27" r="0.7" opacity="0.78"/>
<circle cx="1130" cy="393" r="0.5" opacity="0.5"/>
<circle cx="1038" cy="168" r="0.55" opacity="0.6"/>
<circle cx="1565" cy="286" r="0.6" opacity="0.68"/>
<circle cx="523" cy="153" r="0.6" opacity="0.68"/>
<circle cx="1072" cy="205" r="0.55" opacity="0.6"/>
<circle cx="520" cy="284" r="0.6" opacity="0.68"/>
<circle cx="465" cy="35" r="0.5" opacity="0.5"/>
</g>
<rect y="420" width="1600" height="580" fill="url(#sea)"/>
<g fill="none" class="crest" stroke-width="2">
<path d="M0 470 Q100 462 200 470 T400 470 T600 470 T800 470 T1000 470 T1200 470 T1400 470 T1600 470"/>
<path d="M0 540 Q120 526 240 540 T480 540 T720 540 T960 540 T1200 540 T1440 540 T1680 540"/>
<path d="M0 650 Q160 628 320 650 T640 650 T960 650 T1280 650 T1600 650"/>
<path d="M0 810 Q200 776 400 810 T800 810 T1200 810 T1600 810"/>
</g>
<rect class="probe" width="40" height="40"/>
</svg>`

// Cool, near-neutral grays to sit on the monochrome sea.
const { theme, problems } = makeColors({
  label: 'Shifting Tide',
  roles: { accent: '#3f5f7f', danger: '#a8443a', success: '#4f7a55', warning: '#9a7426', pro: '#6a5a8c' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e7e7e9',
        'surface-1': '#efeff1',
        'surface-2': '#f6f6f7',
        'text-primary': '#1c1d20',
        'text-secondary': '#45474d',
        'text-muted': '#5d6067',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d0e12',
        'surface-1': '#15171c',
        'surface-2': '#1c1e24',
        'surface-3': '#22252c',
        'text-primary': '#eceef2',
        'text-secondary': '#c4c7ce',
        'text-muted': '#9da1aa',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  backdrop: { scene: 'tide', glass: { blur: 18, opacity: 0.55 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    // Clear anything an earlier load left on the status line, then say only what
    // still needs saying.
    $.ui.status(undefined)
    const set = await $.theme.set(LOOK)
    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }
    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    if (e.props.plugin !== 'shifting-tide' || e.props.scene !== 'tide') return next(e)
    const { Shader, Svg } = $.ui.resolve(e)
    return (
      <Shader module="./ocean.ts">
        <Svg source={TIDE_SVG} alt="A gray sea rolling under a pale sky, or a starlit one at night" />
      </Shader>
    )
  })
}
