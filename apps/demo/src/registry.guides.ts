/**
 * The End User Success & Training Guide's room chapter (founder's directive of 11 Nov 2026, §08): "How do I use this room?" for every
 * room, from the room's own record. It is for everyone who can stand in a room, so it opens for whoever Lite opens for.
 */
import type { PageDef } from './registry.types.js';

export const GUIDE_PAGES: readonly PageDef[] = [
  {
    id: 'guide', title: 'How do I use this room?', purpose: 'A room’s own guide: what is in it, how to start a meeting, share, be heard and seen, finish, and get help', product: 'lite',
    path: '/guide', alias: ['/guide/room/:room', '/guide/topic/:topic'], authority: { area: 'lite.guides' },
    load: () => import('./guides/RoomGuidePage.js'),
    search: { keywords: 'how do i use this room guide instructions start a meeting share screen microphone camera end user training help hybrid meetings booking accessibility security privacy teams outlook sharepoint onedrive wireless byod', aliases: ['how do i use this room', 'room guide', 'how to use the room', 'user guide'] },
  },
];
