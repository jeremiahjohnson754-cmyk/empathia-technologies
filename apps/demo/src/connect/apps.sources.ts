/**
 * Where each app-jump format was read, and the vendor's template as published. NOT PART OF THE PAGE.
 *
 * No page imports this file (tests/unit/demo-connect.test.mjs CX-31 checks that, and tests/security/public-sites.test.mjs checks
 * that no documentation host reaches the built site). It exists so that the registry in apps.ts, which ships, can name a source by
 * a short key, while the tests and the two documents still hold every address and every template beside the date it was read.
 */
import { APP_JUMPS, type AppJump, type SourceKey } from './apps.js';

/** The official page behind each key. Each was read on the date its row carries (apps.ts › validated). */
export const SOURCE_URLS: Readonly<Record<SourceKey, string>> = {
  'ms-learn:teams/deep-link-teams': 'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-teams',
  'ms-learn:teams/deep-link-workflow': 'https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-workflow',
  rfc6068: 'https://www.rfc-editor.org/rfc/rfc6068.txt',
  rfc3966: 'https://www.rfc-editor.org/rfc/rfc3966',
};

/** The template of each row, as published, with <tokens>. For an unverified row: the form that was looked for and not found on an official page. */
export const JUMP_TEMPLATES: Readonly<Record<string, string>> = {
  'teams.chat': 'https://teams.microsoft.com/l/chat/0/0?users=<user1>,<user2>,...&topicName=<chat name>&message=<precanned text>',
  'teams.call': 'https://teams.microsoft.com/l/call/0/0?users=<user1>,<user2>',
  'teams.meeting': 'https://teams.microsoft.com/l/meeting/new?subject=<meeting subject>&startTime=<date>&endTime=<date>&content=<content>&attendees=<user1>,<user2>,<user3>,...',
  'mail.compose': 'mailto:<addr-spec>?subject=<hfvalue>&body=<hfvalue>',
  'phone.call': 'tel:<global-number-digits>',
  'outlook.web.compose': 'https://outlook.office.com/mail/deeplink/compose?to=<address>&subject=<subject>&body=<body>',
  'teams.protocol': 'msteams:/l/chat/0/0?users=<user1>',
};

/** A registry row with its page address and template: what the documents print and the tests check. */
export interface DocumentedJump extends AppJump { source: string | null; template: string }
export const JUMP_REGISTER: readonly DocumentedJump[] = APP_JUMPS.map((j) => ({ ...j, source: j.sourceKey ? SOURCE_URLS[j.sourceKey] : null, template: JUMP_TEMPLATES[j.id] || '' }));
