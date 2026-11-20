/**
 * The End User Success & Training Guide's chapters (founder's directive of 11 Nov 2026, §08, Product B): "Help any employee,
 * executive, visitor, or authorized worker confidently use the technology and services available to them." The room pages
 * (roomGuide.ts) are generated from each room's record; these chapters are the parts that are the same in every room.
 *
 * DRAFT, written by the engineer of this demonstration from the founder's list of contents, and not yet reviewed by a person who
 * supports users for a living. Plain practice only:
 *  - No step-by-step instructions for another company's application are written here. Those change, and an organisation has its
 *    own approved guidance; each chapter says where that guidance would be linked, and that none is recorded in this demonstration.
 *  - Nothing tells anyone to open equipment, move it or reach behind it. When a first step does not help, the next step is to ask.
 *  - What a particular room can do is never stated here: it is on that room's own page, from its record.
 *  - NOT BUILT: short instructional videos, annotated photographs, translations.
 */
export interface Section { heading: string; points: readonly string[] }
/** A place in the product a chapter sends the reader to; shown only when the reader may open it. */
export interface Link { label: string; href: string }
export interface Chapter {
  id: string; title: string; summary: string; /** the founder's contents this chapter covers */ covers: readonly string[]; sections: readonly Section[]; links: readonly Link[];
  /** what an organisation would add of its own; none is recorded in this demonstration */ yours: string | null;
}
export const CHAPTERS: readonly Chapter[] = [
  { id: 'meetings', title: 'Meetings: scheduling, joining and booking a room', summary: 'A meeting that starts on time is mostly decided when it is booked.', covers: ['Calendar and meeting scheduling', 'Room booking', 'Outlook'],
    sections: [
      { heading: 'When you book', points: ['Book the room as well as the people. A room that is not on the invitation is not yours when you arrive.', 'Choose the room for the number of people and for what you will do in it: a room with one small screen is a poor place for a workshop.', 'If anyone joins from elsewhere, say so in the invitation, so the people in the room know to use its camera and microphones.', 'Leave five minutes before the hour. The meeting before yours will run over.'] },
      { heading: 'When you arrive', points: ['Check the panel by the door or on the table: it shows whose meeting the room expects.', 'Start the meeting from the room, not from your laptop, when the room can do it. Two devices in one meeting with their sound on will howl.', 'If the room is taken and it should be yours, do not argue at the door: check the booking together.'] },
      { heading: 'When you finish', points: ['End the meeting on the room’s panel, so the next people do not walk into your call.', 'Take your cable adapter and leave the room’s own cables where they were.'] },
    ],
    links: [{ label: 'Find a time that suits people and a room', href: '#/meet' }, { label: 'The rooms, and what is in each', href: '#/lite' }],
    yours: 'How rooms are booked in your calendar, who may book which rooms, and how long a room is held for a meeting nobody arrives at.' },
  { id: 'rooms', title: 'Meeting rooms: what is in one, and what each part does', summary: 'Five things, in most rooms. Knowing which is which tells you what to check.', covers: ['Conference room capabilities', 'Teams Rooms', 'Displays and touch panels', 'Cameras and microphones', 'Workplace technology', 'Room-specific operating instructions'],
    sections: [
      { heading: 'The parts', points: ['The display shows the far end and whatever is being shared.', 'The camera sends the room to the far end. If it follows people or frames the table by itself, leave it to do so.', 'The microphones are often in the ceiling or on the table. They hear the whole room, including side conversations and crisp packets.', 'The loudspeakers play the far end. If people in the room cannot hear, it is the room’s volume, not your laptop’s.', 'The touch panel asks the room to do things. It is the remote control; it is not where the picture or the sound is made.'] },
      { heading: 'Rooms differ', points: ['A small room may have one bar under the screen that is the camera, the microphones and the loudspeakers in one.', 'A large room may have several screens, several cameras and a lectern. Its own page says what it has.', 'A room that joins the meeting by itself needs no laptop at all: you press Join on its panel.'] },
    ],
    links: [{ label: 'How do I use this room? Every room has its own page', href: '#/guide' }],
    yours: null },
  { id: 'sharing', title: 'Sharing your screen: by cable, without one, and from your own device', summary: 'Three ways in most rooms. All three show everything on your screen.', covers: ['Wireless presentation', 'BYOD', 'Meeting controls'],
    sections: [
      { heading: 'Before you share', points: ['Close what you would not want on a wall: messages, email, another customer’s document. Notifications appear over whatever you share.', 'Share one window instead of the whole screen when you can.'] },
      { heading: 'By cable', points: ['Use the cable on the table. When it is connected the room usually switches to it within a few seconds; give it time before pressing things.', 'If nothing appears, check both ends are pushed home and that your laptop is set to show on a second screen.', 'If your laptop has no matching socket you need an adapter. The room’s page says whether one is kept in the room.'] },
      { heading: 'Without a cable', points: ['Some rooms let you share over the network, from the meeting or from a code shown on the screen. The room’s page says whether this one does.', 'Wireless sharing is fine for slides and documents. For video with sound, a cable is steadier.'] },
      { heading: 'From your own device', points: ['Your own laptop can run the meeting while the room supplies the screen, camera and sound, in rooms that allow it.', 'Mute your laptop’s microphone and loudspeaker when you do this, or the room will echo.'] },
    ],
    links: [{ label: 'Practise on a room’s panel: a simulation, nothing real changes', href: '#/control/R-ATL-4-218' }],
    yours: 'Whether personal devices may connect to room equipment, and to which network.' },
  { id: 'hybrid', title: 'Hybrid meetings: making it work for the people who are not in the room', summary: 'The room is built for the people in it. The people elsewhere need you to make up the difference.', covers: ['Hybrid meetings', 'Video conferencing etiquette', 'Meeting controls'],
    sections: [
      { heading: 'In the room', points: ['One person at a time. Ceiling microphones cannot separate two voices.', 'Face the camera when you speak to the far end, and say who you are if they cannot see you.', 'Do not mute the room to talk among yourselves. The far end sees lips moving and knows.', 'Ask the far end first, sometimes. They wait longest to get a word in.'] },
      { heading: 'Joining from elsewhere', points: ['Sound matters more than picture. A headset in a quiet place beats a good camera in a café.', 'Mute when you are not speaking; unmute a moment before you start.', 'Light your face from the front. A window behind you makes you a silhouette.'] },
      { heading: 'Running one', points: ['Say at the start how people should ask to speak, and keep to it.', 'If you record, say so before you start and say where the recording will be kept. People may ask not to be recorded.'] },
    ],
    links: [], yours: 'Your organisation’s rule on recording meetings, and who may see a recording.' },
  { id: 'help', title: 'When something does not work', summary: 'Three safe things to try, then ask. Asking early is the right call, not a failure.', covers: ['Common troubleshooting', 'How to request assistance', 'Site-specific support', 'QR codes'],
    sections: [
      { heading: 'Three things anyone can try', points: ['Look at the panel. It often says what the room is waiting for: an input, a meeting, a person to press Join.', 'Check the room is not muted and the volume is not at nothing.', 'Reseat the cable at your laptop’s end, and try the other cable if the table has two.'] },
      { heading: 'Then stop', points: ['Do not open a cabinet, reach behind the screen, unplug the room’s equipment or restart things you did not start. That turns a small fault into a visit.', 'If a meeting is about to start, move to another room first and report this one afterwards.'] },
      { heading: 'Asking for help', points: ['Report it from the room. The label by the door opens this room’s own page on your phone, so the report already knows where you are.', 'Say what you see and hear: “the screen is black and the panel shows a red bar”. That is more use than “it is broken”.', 'You get a number. You do not have to chase it; someone will tell you what happens next.', 'Your site champion knows the rooms and the people who look after them. They are a colleague, not the service desk: start with the report.'] },
    ],
    links: [{ label: 'I am in a room and something is wrong', href: '#/here' }, { label: 'Who knows the rooms at my site', href: '#/people' }],
    yours: 'The hours support is staffed, and what to do outside them.' },
  { id: 'finding', title: 'Finding a room and getting there', summary: 'By name, by number, or by what you need it for.', covers: ['Room navigation', 'Room booking'],
    sections: [
      { heading: 'Finding one', points: ['Search by the room’s number or name, or by what it has: a room for twelve with a camera.', 'A room’s number usually holds its floor: 4.218 is on the fourth floor.', 'If you are visiting, your host or the front desk will take you, or tell you the way.'] },
      { heading: 'Getting there', points: ['The way-finding page gives the route from the entrance, and says whether it is step-free.', 'Allow time for lifts in a tall building at the top of the hour.'] },
    ],
    links: [{ label: 'Find the way to a room', href: '#/lite/way' }, { label: 'Search for a room', href: '#/find' }],
    yours: 'Where visitors sign in, and whether they must be accompanied.' },
  { id: 'accessibility', title: 'Accessibility', summary: 'What rooms offer, and how to ask for what you need.', covers: ['Accessibility features'],
    sections: [
      { heading: 'In a meeting', points: ['Most meeting applications offer live captions that each person can turn on for themselves; whether yours does is your organisation’s setting. Where a room can show captions on its screen, its page says so.', 'If you use a hearing aid, ask whether the room has a hearing loop. A room’s page lists what it supports, and says when it does not.', 'Share documents before the meeting, not only on the screen: a screen reader cannot read a wall.'] },
      { heading: 'In the room', points: ['A room’s page says whether the way to it is step-free.', 'Touch panels are usually at table height. If one is out of reach, say so in a report: it is a fault of the room, not of you.'] },
      { heading: 'Asking', points: ['You do not have to explain why you need an adjustment to ask for one.', 'Ask before the meeting when you can. Some things take a day to arrange.'] },
    ],
    links: [{ label: 'What each room supports', href: '#/guide' }],
    yours: 'Who to ask for an adjustment, and how far ahead.' },
  { id: 'remote', title: 'Working from somewhere else', summary: 'The same meeting, without the room doing the work for you.', covers: ['Remote-work collaboration'],
    sections: [
      { heading: 'Being heard and seen', points: ['Use a headset. Laptop microphones pick up the room you are in, and laptop loudspeakers feed back into them.', 'Put the camera at eye level and sit an arm’s length away.', 'Close what is using the network if your sound breaks up: sound needs little, but it needs it steadily.'] },
      { heading: 'Working together', points: ['Work on one shared copy of a document, not on attachments. Two copies become two versions by lunchtime.', 'Say in the chat what you have done, when the others are in another time zone. They will read it before you are awake.'] },
    ],
    links: [], yours: 'Where shared work is kept, and what may be done on a personal device.' },
  { id: 'security', title: 'Security and privacy basics', summary: 'A meeting room is a public place with a very large screen.', covers: ['Security and privacy basics'],
    sections: [
      { heading: 'On the screen', points: ['Everything on a shared screen is seen by everyone in the meeting and by anyone passing a glass wall.', 'Stop sharing when you have finished the point. Do not leave your desktop on the wall while people talk.', 'Sign out of the room’s own computer if you signed in to it. Better, do not sign in to it: share from your own device.'] },
      { heading: 'In the room', points: ['Assume the room’s microphones are on until the panel shows they are muted.', 'Wipe the whiteboard, and take your papers.', 'Do not plug in a memory stick you found, and do not let a stranger plug one in for you.'] },
      { heading: 'When something seems wrong', points: ['A message asking you to approve a sign-in you did not start is someone else trying to sign in as you. Refuse it and report it.', 'If you think you clicked something you should not have, say so at once. Early is cheap.'] },
    ],
    links: [], yours: 'How to report a security concern, and to whom.' },
  { id: 'apps', title: 'Teams, Outlook, SharePoint and OneDrive: which is for what', summary: 'Four names people mix up. One line each.', covers: ['Microsoft Teams', 'Outlook', 'SharePoint', 'OneDrive', 'Document collaboration'],
    sections: [
      { heading: 'Which is for what', points: ['Teams is where you meet, call and chat, and where a team keeps its conversations.', 'Outlook is your email and your calendar. A meeting you are invited to appears there.', 'SharePoint is where a team or a department keeps its shared documents and pages.', 'OneDrive is where your own work files are kept, so they follow you from one device to another.'] },
      { heading: 'Working on a document together', points: ['Share a link to the document, not a copy of it. Everyone then edits the one document.', 'When you share, check who the link works for: the people you named, or anyone who has it.', 'A document for the team belongs in the team’s place, not in yours. When you leave, yours leaves with you.'] },
      { heading: 'In Empathia', points: ['A contact action opens the application you chose with the person and the subject filled in. You still press send yourself; opening it has not sent anything.', 'Where a button opens another application, it says so before you press it, and says which one.'] },
    ],
    links: [{ label: 'People, and the ways to reach each', href: '#/people' }],
    yours: 'Step-by-step instructions for these applications are not written here: they change, and your organisation has its own approved guidance. This is where it would be linked.' },
  { id: 'questions', title: 'Common questions', summary: 'The ones the people who look after rooms hear most.', covers: ['Common technical questions'],
    sections: [
      { heading: 'In a room', points: ['“The far end cannot hear us.” The room is muted, or you joined from a laptop whose microphone is the one in use. Check the panel, then the meeting’s own microphone setting.', '“We can hear an echo.” Two devices in the room are in the meeting with their sound on. Mute every laptop.', '“My screen will not show.” Give it ten seconds, reseat the cable at your end, and check your laptop is set to use a second screen.', '“The camera is pointing at the wall.” If the panel offers camera presets, choose the one for the table. If it does not, report it; do not turn the camera by hand.', '“The panel is frozen.” Report it and use another room. Do not unplug it.'] },
      { heading: 'About the rooms', points: ['“Can I move the furniture?” The camera and the microphones were set for where the furniture is. If you move it, put it back.', '“Can I use the room without a booking?” If it is free, usually yes, until the person who booked it arrives.', '“Who do I tell that a room is always broken?” Report it each time. A room with five reports gets attention that a room with one complaint does not.'] },
    ],
    links: [{ label: 'Report a problem from a room', href: '#/here' }], yours: null },
];
export const chapterById = (id: string): Chapter | null => CHAPTERS.find((c) => c.id === id) || null;
/** The founder's list of required contents for this guide, and where each is answered: a chapter, or the room pages. */
export const CONTENTS: ReadonlyArray<[topic: string, where: string]> = [
  ['Microsoft Teams', 'apps'], ['Outlook', 'apps'], ['Calendar and meeting scheduling', 'meetings'], ['SharePoint', 'apps'], ['OneDrive', 'apps'], ['Document collaboration', 'apps'], ['Workplace technology', 'rooms'], ['Conference room capabilities', 'rooms'],
  ['Teams Rooms', 'rooms'], ['Displays and touch panels', 'rooms'], ['Cameras and microphones', 'rooms'], ['Wireless presentation', 'sharing'], ['BYOD', 'sharing'], ['Hybrid meetings', 'hybrid'], ['Meeting controls', 'hybrid'], ['Room booking', 'meetings'],
  ['Room navigation', 'finding'], ['Video conferencing etiquette', 'hybrid'], ['Common troubleshooting', 'help'], ['How to request assistance', 'help'], ['Site-specific support', 'help'], ['QR codes', 'help'], ['Room-specific operating instructions', 'room pages'],
  ['Short instructional videos', 'not built'], ['Accessibility features', 'accessibility'], ['Remote-work collaboration', 'remote'], ['Security and privacy basics', 'security'], ['Common technical questions', 'questions'],
];
