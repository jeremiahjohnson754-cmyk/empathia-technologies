/**
 * V2.5.3's object cards and device purposes (OBJECT_CARDS, DEVICE_PURPOSE in Empathia-Living-Campus-V2.5.3-live.html), carried word for
 * word on 12 Nov 2026 for Lite's object inspector. Read from the source as text (python3 -I); nothing in it was run. The engineering and
 * troubleshooting document references (DOC-*) are not carried: those documents are not part of this product.
 */
export interface ObjectCard { title: string; what: string; who: string; how: string[]; issues: string[]; chapter?: string; eng?: string; flow?: string }
export const OBJECT_CARDS: Record<string, ObjectCard> = {
 "display": {
  "title": "Display",
  "what": "Shows the people at the far end and whatever is being shared.",
  "who": "Everyone in the room.",
  "how": [
   "It wakes when a meeting starts",
   "Share from the controller or the table cable"
  ],
  "issues": [
   "Stays dark after joining",
   "Shows the wrong source"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-4",
  "flow": "Video arrives from room compute or the video switcher. Control comes from the control system."
 },
 "ledwall": {
  "title": "LED wall",
  "what": "One large image that every seat can read.",
  "who": "A large audience.",
  "how": [
   "Driven from the production position",
   "Content is checked on the confidence displays first"
  ],
  "issues": [
   "A panel shows a color shift",
   "Brightness differs from the commissioned value"
  ],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-4",
  "flow": "Fed by the video switcher. Brightness is part of the commissioning baseline."
 },
 "camera": {
  "title": "Camera",
  "what": "Lets the far end see the room. It moves between saved views called presets.",
  "who": "Remote participants, through everyone in the room.",
  "how": [
   "It frames the table by default",
   "Choose Presenter on the controller for the person at the display"
  ],
  "issues": [
   "Someone is cut off at the edge",
   "It points at the wrong place after being moved by hand"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-2",
  "flow": "Video leaves the camera for the switcher or room compute. Presets are recalled by the control system."
 },
 "bar": {
  "title": "Video bar",
  "what": "A camera, microphones and loudspeakers in one unit under the display.",
  "who": "Small rooms.",
  "how": [
   "Nothing to set up: join from the controller",
   "Sit facing the display"
  ],
  "issues": [
   "People at the far seat sound distant",
   "The picture freezes for a moment"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-2",
  "flow": "Audio and video go straight to room compute or the meeting service."
 },
 "micceil": {
  "title": "Ceiling microphone array",
  "what": "Picks up everyone at the table without anything on the table.",
  "who": "Everyone speaking in the room.",
  "how": [
   "Speak normally, facing the table",
   "The ring is red when the room is muted"
  ],
  "issues": [
   "People at the ends are hard to hear",
   "One zone has stopped picking up"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-3",
  "flow": "Audio goes to the audio processor, which removes echo and sends it to the far end."
 },
 "micwireless": {
  "title": "Wireless microphone",
  "what": "A handheld or clip-on microphone for a presenter who moves.",
  "who": "Presenters and people asking questions.",
  "how": [
   "Take it from the charger and switch it on",
   "Hold it a hand's width from your mouth",
   "Return it to the charger"
  ],
  "issues": [
   "It cuts out in one part of the room",
   "Battery is flat"
  ],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-3",
  "flow": "Radio link to the receivers, then to the audio processor. Channels sit in the campus frequency plan."
 },
 "speaker": {
  "title": "Loudspeakers",
  "what": "Let the room hear the far end and any program sound.",
  "who": "Everyone in the room.",
  "how": [
   "Volume is on the controller"
  ],
  "issues": [
   "Too quiet at the back",
   "The far end hears an echo of itself"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-3",
  "flow": "Driven by the amplifier from the audio processor. Every feed is also sent to the echo reference."
 },
 "touch": {
  "title": "Touch controller",
  "what": "The one place to start, share, mute, change volume and end.",
  "who": "Whoever is running the meeting.",
  "how": [
   "Tap Join beside your booking",
   "Share, Mute and Volume are always along the bottom"
  ],
  "issues": [
   "It does not respond",
   "A button does the wrong thing"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-5",
  "flow": "Sends commands to the control system and the room compute over the network."
 },
 "scheduler": {
  "title": "Scheduling panel",
  "what": "Shows whether the room is free and lets you book it at the door.",
  "who": "Anyone looking for a room.",
  "how": [
   "Green is free: tap Book now",
   "Check in when you arrive"
  ],
  "issues": [
   "It shows an old booking",
   "It is dark"
  ],
  "chapter": "CH-EUG-3",
  "eng": "CH-ENG-5",
  "flow": "Reads the calendar through the booking connector (simulated)."
 },
 "rack": {
  "title": "Equipment",
  "what": "The equipment that makes the room work: processing, control, switching and power. It lives in the credenza or a rack.",
  "who": "Engineers. Room users never need to open it.",
  "how": [
   "Leave the doors closed so air can move as designed"
  ],
  "issues": [
   "It is warm",
   "Something has been unplugged to charge a phone"
  ],
  "chapter": "CH-EUG-8",
  "eng": "CH-ENG-5",
  "flow": "Every signal in the room passes through here. See the signal flow for the order."
 },
 "sensor": {
  "title": "Room sensor",
  "what": "Measures air quality, temperature and whether the room is in use.",
  "who": "Facilities and anyone choosing a room.",
  "how": [
   "Nothing to do: it reports by itself"
  ],
  "issues": [
   "The room feels stuffy in long sessions"
  ],
  "chapter": "CH-EUG-5",
  "eng": "CH-ENG-5",
  "flow": "Readings go to the building management connector (simulated)."
 },
 "table": {
  "title": "Table",
  "what": "Where people sit. Its position decides where cameras and microphones point.",
  "who": "Everyone in the room.",
  "how": [
   "Leave it where it is: the room was set up around it",
   "The cable for sharing is in the center"
  ],
  "issues": [
   "It has been moved and the camera no longer frames everyone"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-6"
 },
 "seat": {
  "title": "Seat",
  "what": "A place at the table that the cameras, microphones and display were designed to serve.",
  "who": "One person.",
  "how": [
   "Sit anywhere: every seat should be seen and heard"
  ],
  "issues": [
   "A seat at the far end is outside the camera view"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-9"
 },
 "lectern": {
  "title": "Presenter position",
  "what": "Where the presenter stands so the camera and microphone find them.",
  "who": "Presenters and instructors.",
  "how": [
   "Stand inside the marked zone",
   "The controller here mirrors the one on the table"
  ],
  "issues": [
   "The camera frames the presenter off-center"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-2"
 },
 "door": {
  "title": "Door",
  "what": "The way in. The scheduling panel is beside it.",
  "who": "Everyone.",
  "how": [
   "Check the panel before you walk in"
  ],
  "issues": [],
  "chapter": "CH-EUG-3",
  "eng": "CH-ENG-9"
 },
 "divider": {
  "title": "Room divider",
  "what": "A folding wall that turns one large room into two.",
  "who": "Instructors and the events crew.",
  "how": [
   "Ask Workplace Experience to open or close it",
   "Both halves must be empty while it moves"
  ],
  "issues": [
   "One half has no sound after the divider is closed"
  ],
  "chapter": "CH-EUG-4",
  "eng": "CH-ENG-5",
  "flow": "A sensor on the divider tells the control system whether to run one room or two."
 },
 "stage": {
  "title": "Stage",
  "what": "The raised area for presenters and panels.",
  "who": "Presenters.",
  "how": [
   "Walk the stage with your microphone before doors open"
  ],
  "issues": [
   "A wireless microphone cuts out at one side"
  ],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-7"
 },
 "seatblock": {
  "title": "Audience seating",
  "what": "Fixed seating for the audience.",
  "who": "The audience.",
  "how": [
   "Fill from the front",
   "Wheelchair positions are at the ends of the front and rear rows"
  ],
  "issues": [
   "Hard to hear in the rear block"
  ],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-7"
 },
 "desk": {
  "title": "Control position",
  "what": "Where the operator runs sound, cameras and the stream.",
  "who": "The media services crew.",
  "how": [
   "Operators only during an event"
  ],
  "issues": [],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-7",
  "flow": "Cameras and microphones arrive here; the mixed program leaves for the room and the stream."
 },
 "antenna": {
  "title": "Wireless microphone antenna",
  "what": "Receives the radio signal from the wireless microphones.",
  "who": "Engineers.",
  "how": [
   "Keep it in line of sight of the stage"
  ],
  "issues": [
   "Dropouts where the signal is weakest"
  ],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-7",
  "flow": "Feeds the receivers. More antennas, spread out, give more margin."
 },
 "cart": {
  "title": "Mobile collaboration cart",
  "what": "A display, a pan-tilt-zoom camera and a touch controller on wheels.",
  "who": "A video meeting in an open space.",
  "how": [
   "Park on a marked spot and plug in at the floor box",
   "Tap Join on the touch controller",
   "Sit inside the marked arc",
   "Return it to its dock"
  ],
  "issues": [
   "It was left unplugged and the battery is flat",
   "People outside the arc are not in the picture"
  ],
  "chapter": "CH-EUG-7",
  "eng": "CH-ENG-7",
  "flow": "Camera and microphones to the cart compute; one network cable and one power cable to the floor box."
 }
};
export const DEVICE_PURPOSE: Record<string, string> = {
 "display": "Shows remote participants and shared content to everyone in the room.",
 "ledwall": "Gives a large audience one image that every seat can read.",
 "camera": "Lets remote participants see who is speaking and the room as a whole.",
 "bar": "Camera, microphones and loudspeakers in one unit for a small room.",
 "micceil": "Picks up every seat without microphones on the table.",
 "micwireless": "Lets a presenter or audience member be heard while moving.",
 "dsp": "Mixes microphones, removes echo and feeds the loudspeakers and the far end.",
 "speaker": "Lets the room hear remote participants and program sound evenly.",
 "amp": "Drives the loudspeakers.",
 "compute": "Runs the meeting and joins the room to the meeting service.",
 "touch": "The one place people start, share and control the room.",
 "scheduler": "Shows whether the room is free and lets people book it at the door.",
 "control": "Ties the devices together so one touch does the right thing.",
 "switcher": "Routes sources to displays and to the far end.",
 "encoder": "Sends the room to people watching elsewhere.",
 "sensor": "Reports air quality and occupancy so comfort and use can be understood.",
 "pdu": "Feeds and meters power to the room equipment."
};
