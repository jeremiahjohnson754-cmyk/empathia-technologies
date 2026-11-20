/**
 * V2.5.3's Scouter anatomy (SCA_CLASSES, SCA_LAYERS, SCA_CAT in Empathia-Living-Campus-V2.5.3-live.html), carried word for word on
 * 12 Nov 2026. Read from the source as text (python3 -I); nothing in it was run. An educational functional model of each device class,
 * never a maker's disassembly instructions. A block: [id, label, layer, does, fails as, the test that tells, upstream, downstream].
 */
export type Block = [string, string, string, string, string, string, string, string];
export const SCA_CLASSES: Record<string, { label: string; blocks: Block[] }> = {
 "camera": {
  "label": "PTZ camera",
  "blocks": [
   [
    "lens",
    "Lens and sensor",
    "signal",
    "Gathers light; the sensor turns it into a picture",
    "Soft or dark picture, wrong colour",
    "Point at a lit chart: focus, exposure, white balance",
    "light",
    "encoder"
   ],
   [
    "encoder",
    "Image processor and encoder",
    "signal",
    "Scales, encodes and timestamps the picture",
    "Picture freezes or tears; latency grows",
    "Compare the raw output with the encoded stream",
    "lens",
    "out"
   ],
   [
    "out",
    "Outputs: SDI / HDMI / IP",
    "signal",
    "Carries the picture to the switcher, compute or network",
    "No picture on one output while another works",
    "Swap the cable, then the port, one at a time",
    "encoder",
    "—"
   ],
   [
    "ptz",
    "Pan, tilt and zoom motors",
    "control",
    "Moves the head to a preset",
    "Presets drift or the head hunts",
    "Recall a preset twice and compare the framing",
    "ctl",
    "lens"
   ],
   [
    "ctl",
    "Control interface (IP / serial)",
    "control",
    "Takes preset and tally commands",
    "Camera ignores the panel but streams fine",
    "Send one command from a second controller",
    "net",
    "ptz"
   ],
   [
    "net",
    "Network interface",
    "network",
    "Carries control and IP video; takes PoE",
    "Unreachable; no link light",
    "Reachability probe outside a meeting; link light",
    "poe",
    "ctl"
   ],
   [
    "poe",
    "Power: PoE+ or 12 V",
    "power",
    "Powers everything; PoE+ needs a class-4 port",
    "Reboots under load; no power at all",
    "Measure the PoE class the switch granted",
    "—",
    "net"
   ],
   [
    "fw",
    "Firmware",
    "firmware",
    "The behaviour of every block above",
    "A feature stops after an update",
    "Compare the version with the commissioned one",
    "—",
    "—"
   ],
   [
    "mount",
    "Mount and aim",
    "mounting",
    "Holds the camera where the presets were set",
    "Every preset off by the same amount",
    "Check the mount and the pan limit stops",
    "—",
    "ptz"
   ]
  ]
 },
 "dsp": {
  "label": "Audio processor (DSP)",
  "blocks": [
   [
    "in",
    "Inputs: microphones and network audio",
    "signal",
    "Takes the room and the far end in",
    "One array silent on its channel meter",
    "Talker at the array; watch the input meter",
    "—",
    "aec"
   ],
   [
    "aec",
    "Echo canceller",
    "signal",
    "Removes the loudspeakers from the microphones",
    "The far end hears itself",
    "Reference level and convergence check",
    "in",
    "mix"
   ],
   [
    "mix",
    "Mixer and routing",
    "signal",
    "Decides which input reaches which output",
    "Sound in the wrong zone",
    "Route one input, listen at each output",
    "aec",
    "out"
   ],
   [
    "out",
    "Outputs to amplifier and far end",
    "signal",
    "Sends the mix to the room and the call",
    "Room fine, far end silent (or the reverse)",
    "Meter each output with a known tone",
    "mix",
    "—"
   ],
   [
    "ctl",
    "Control and presets",
    "control",
    "Takes the panel’s commands and recalls",
    "Panel volume does nothing",
    "Send one command from a second controller",
    "net",
    "mix"
   ],
   [
    "net",
    "Network audio and management",
    "network",
    "Carries the audio streams and the management page",
    "Streams drop; clock unlocked",
    "Clock status and stream subscriptions",
    "pwr",
    "ctl"
   ],
   [
    "pwr",
    "Power supply",
    "power",
    "One supply, no redundancy in this class",
    "Dead unit; fans off",
    "Mains present at the outlet; the unit’s own indicator",
    "—",
    "net"
   ],
   [
    "fw",
    "Firmware and configuration",
    "firmware",
    "The design file and the version it runs on",
    "Settings differ from the commissioned export",
    "Compare the running configuration with the export",
    "—",
    "—"
   ],
   [
    "mount",
    "Rack position and ventilation",
    "mounting",
    "Keeps the unit cool and its cables strain-free",
    "Thermal warnings; intermittent inputs",
    "Temperature and the cable dressing",
    "—",
    "pwr"
   ]
  ]
 },
 "switch": {
  "label": "Room network switch",
  "blocks": [
   [
    "ports",
    "Access ports",
    "network",
    "One per endpoint; VLAN per service",
    "An endpoint on the wrong VLAN",
    "Show the port’s VLAN and link state",
    "fab",
    "—"
   ],
   [
    "fab",
    "Switching fabric",
    "network",
    "Moves frames between ports",
    "Everything slow at once",
    "Throughput and error counters",
    "uplink",
    "ports"
   ],
   [
    "uplink",
    "Uplink to the floor switch",
    "network",
    "The room’s one road to the core",
    "Whole room unreachable at once",
    "Link state and the far end’s view of the port",
    "—",
    "fab"
   ],
   [
    "poe",
    "PoE budget",
    "power",
    "Powers the endpoints within a budget",
    "The last endpoints to boot stay dark",
    "Sum the classes granted against the budget",
    "pwr",
    "ports"
   ],
   [
    "pwr",
    "Power supply",
    "power",
    "Mains in; the budget comes from here",
    "Dead switch; everything dark",
    "Mains at the outlet; the unit’s indicator",
    "—",
    "poe"
   ],
   [
    "mgmt",
    "Management",
    "control",
    "Where the configuration lives",
    "Cannot log in; config lost after power cut",
    "Reach the management address; compare the running config",
    "fab",
    "—"
   ],
   [
    "fw",
    "Firmware",
    "firmware",
    "The switch’s behaviour",
    "A protocol stops after an update",
    "Version against the commissioned one",
    "—",
    "—"
   ],
   [
    "mount",
    "Rack position",
    "mounting",
    "Airflow and cable dressing",
    "Thermal shutdown; a cable pulled",
    "Temperature and strain relief",
    "—",
    "pwr"
   ]
  ]
 },
 "micceil": {
  "label": "Ceiling microphone array",
  "blocks": [
   [
    "caps",
    "Capsules",
    "signal",
    "Dozens of capsules on one plate",
    "A quiet sector of the room",
    "Talker in each sector; watch the lobe meter",
    "mount",
    "beam"
   ],
   [
    "beam",
    "Beamformer",
    "signal",
    "Steers lobes toward talkers",
    "Lobes stuck on the wrong seat",
    "Reset the lobes; talk from a marked seat",
    "caps",
    "aud"
   ],
   [
    "aud",
    "Network audio out",
    "network",
    "Sends lobes or a mix to the processor",
    "Processor channel meter silent",
    "Stream subscription on the processor side",
    "beam",
    "—"
   ],
   [
    "net",
    "Network and PoE",
    "network",
    "One cable: data and power",
    "Unreachable; LED off",
    "Reachability outside a meeting; PoE class granted",
    "poe",
    "aud"
   ],
   [
    "poe",
    "Power over Ethernet",
    "power",
    "A class-3 or class-4 port, depending on the model",
    "Array reboots when the lobes work hardest",
    "The class the switch granted",
    "—",
    "net"
   ],
   [
    "fw",
    "Firmware",
    "firmware",
    "The array’s behaviour and its lobe presets",
    "Presets gone after an update",
    "Version against the commissioned one",
    "—",
    "—"
   ],
   [
    "mount",
    "Mounting height and position",
    "mounting",
    "Pickup falls with height and distance",
    "The far seats faint",
    "Measure the height and the offset against the drawing",
    "—",
    "caps"
   ]
  ]
 },
 "display": {
  "label": "Display",
  "blocks": [
   [
    "panel",
    "Panel and backlight",
    "signal",
    "Shows the picture",
    "Dim, uneven or dead panel",
    "Brightness against the commissioned reading",
    "scaler",
    "—"
   ],
   [
    "scaler",
    "Scaler and inputs",
    "signal",
    "Takes HDMI and the wireless share, scales them",
    "No signal on one input; wrong aspect",
    "A known source on each input",
    "in",
    "panel"
   ],
   [
    "in",
    "Input cables",
    "signal",
    "HDMI from compute and the switcher",
    "Flicker; HDCP errors",
    "Swap one cable at a time",
    "—",
    "scaler"
   ],
   [
    "ctl",
    "Control (IP / RS-232 / CEC)",
    "control",
    "Power and input from the panel",
    "Panel cannot wake it",
    "Send one command from a second controller",
    "net",
    "scaler"
   ],
   [
    "net",
    "Network",
    "network",
    "Control and monitoring",
    "Unreachable but shows a picture",
    "Reachability probe; link light",
    "—",
    "ctl"
   ],
   [
    "pwr",
    "Power",
    "power",
    "Mains; the largest load in the room",
    "Dead; breaker tripped",
    "Mains at the outlet; the circuit’s load",
    "—",
    "panel"
   ],
   [
    "fw",
    "Firmware",
    "firmware",
    "Input behaviour and standby rules",
    "Standby ignores the schedule",
    "Version against the commissioned one",
    "—",
    "—"
   ],
   [
    "mount",
    "Mount height and tilt",
    "mounting",
    "Where the sightlines were drawn",
    "Marginal seats become blocked",
    "Height and tilt against the drawing",
    "—",
    "panel"
   ]
  ]
 },
 "compute": {
  "label": "Room compute",
  "blocks": [
   [
    "app",
    "Meeting application",
    "firmware",
    "Joins the call; owns the peripherals",
    "Call joins, no audio or video",
    "Device selection in the application",
    "os",
    "usb"
   ],
   [
    "usb",
    "USB to the peripherals",
    "signal",
    "Camera, audio and the touch controller",
    "A peripheral vanishes mid-call",
    "Device manager; swap the cable",
    "app",
    "—"
   ],
   [
    "hdmi",
    "HDMI to the display",
    "signal",
    "The picture out",
    "Black display with the call running",
    "A known source on the display input",
    "app",
    "—"
   ],
   [
    "net",
    "Network",
    "network",
    "The call itself",
    "Call drops; link lost six times",
    "Reachability and the port’s error counters",
    "pwr",
    "app"
   ],
   [
    "os",
    "Operating system and updates",
    "firmware",
    "Everything the application depends on",
    "Reboots at 9 on a Monday",
    "Update schedule against the bookings",
    "—",
    "app"
   ],
   [
    "pwr",
    "Power",
    "power",
    "A small supply, easily unplugged",
    "Dead; the display shows no input",
    "Mains and the supply’s indicator",
    "—",
    "net"
   ],
   [
    "mount",
    "Mounting behind the display",
    "mounting",
    "Cable strain and ventilation",
    "Overheats; USB intermittent",
    "Temperature and cable dressing",
    "—",
    "usb"
   ]
  ]
 },
 "amp": {
  "label": "Amplifier",
  "blocks": [
   [
    "in",
    "Inputs from the processor",
    "signal",
    "Line level in",
    "One zone silent, the processor meter alive",
    "A tone at the input; listen at the output",
    "—",
    "stage"
   ],
   [
    "stage",
    "Amplifier stages",
    "signal",
    "Makes the power",
    "Distortion at level; thermal shutdown",
    "Level sweep with a tone; temperature",
    "in",
    "out"
   ],
   [
    "out",
    "Outputs: 70 V lines",
    "signal",
    "One line per zone, each a sum of taps",
    "A zone quiet or a line short",
    "Line impedance per zone",
    "stage",
    "—"
   ],
   [
    "prot",
    "Protection and limiting",
    "control",
    "Keeps the stages inside their rating",
    "Drops out when the room is loud",
    "Reduce the taps; watch the protect indicator",
    "stage",
    "—"
   ],
   [
    "pwr",
    "Mains power",
    "power",
    "The room’s second largest load",
    "Dead; breaker tripped with the displays",
    "Mains at the outlet; the circuit’s load",
    "—",
    "stage"
   ],
   [
    "fw",
    "Firmware and DSP presets",
    "firmware",
    "Crossovers and limiters per zone",
    "A zone lost its limiter after an update",
    "Preset against the commissioned export",
    "—",
    "prot"
   ],
   [
    "mount",
    "Rack position and ventilation",
    "mounting",
    "Heat out the back",
    "Thermal shutdown on a warm day",
    "Temperature; airflow front to back",
    "—",
    "pwr"
   ]
  ]
 }
};
export const SCA_LAYERS: Array<[string, string, string]> = [['signal', 'Signal', '#45cfc1'], ['power', 'Power', '#f5b942'], ['network', 'Network', '#7aa7ff'], ['control', 'Control', '#a68cff'], ['firmware', 'Firmware', '#3ddc97'], ['mounting', 'Mounting', '#d9c9a3']];
export const SCA_CAT: Record<string, string> = { camera: 'camera', bar: 'camera', dsp: 'dsp', switch: 'switch', micceil: 'micceil', display: 'display', ledwall: 'display', compute: 'compute', amp: 'amp', speaker: 'amp', control: 'dsp', touch: 'compute', encoder: 'camera' };
/** scaDownstream: every block a fault here reaches, following each block's downstream link. */
export function downstream(cls: string, id: string): string[] {
  const C = SCA_CLASSES[cls]; const out: string[] = []; if (!C) return out;
  const walk = (x: string) => { const b = C.blocks.find((q) => q[0] === x); if (!b) return; const d = b[7]; if (d && d !== '—' && !out.includes(d)) { out.push(d); walk(d); } };
  walk(id); return out;
}
