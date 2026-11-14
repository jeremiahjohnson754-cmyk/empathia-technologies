# A work request in under 45 seconds

Founder, 14 Nov 2026: *"make the room/device super seamlessly and easy for people to request any work of room or device … it needs to take
under 45 seconds to submit a full request and extremely good but simple."*

- **From a device**: a device chosen in the Lite room (3D pick, plan list, or `?device=`) shows **Ask for work on this device**. The request
  page opens already knowing the room, the device and the kind (replace or repair). The person writes what is wrong and sends it.
- **From a room**: **Ask for work in this room** on the Lite room page (beside the room's jumps). The request page opens on that room.
  The person picks the kind, adds what is needed, and sends it.
- Nothing else is typed: the room, the building, the device, the tests it affects and where it goes come from the record.

Timed as a person does it, at 60 ms a typed character (`tests/browser/demo-request-45s.test.mjs`), on 14 Nov 2026:
- a device request: 5.4 s and 4 actions;
- a room request: 4.6 s and 5 actions;
- a device request on a phone: 5.3 s.

Each request reaches ServiceHands and names its room, and the device request names the device.
