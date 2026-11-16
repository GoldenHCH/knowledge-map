import { MasteryByConceptKey } from './knowledge-map.types';

export class ProfileLinkHelper {
  public static encodeProfile(mastery: MasteryByConceptKey, titlesByKey: Record<string, string>): string {
    const known: string[] = [];
    const shaky: string[] = [];
    for (const key of Object.keys(mastery)) {
      const title: string = titlesByKey[key] ?? key.replace(/-/g, ' ');
      if (mastery[key] === 'known') {
        known.push(title);
      } else if (mastery[key] === 'shaky') {
        shaky.push(title);
      }
    }

    const bytes: Uint8Array = new TextEncoder().encode(JSON.stringify({ known, shaky }));
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  public static connectorUrl(origin: string, encodedProfile: string): string {
    return `${origin}/api/mcp?profile=${encodedProfile}`;
  }
}
