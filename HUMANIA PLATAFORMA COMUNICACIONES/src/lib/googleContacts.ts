import { Contact } from "../types";

export interface GoogleContactRaw {
  resourceName: string;
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
  phoneNumbers?: { value?: string }[];
  photos?: { url?: string; default?: boolean }[];
  organizations?: { name?: string; title?: string }[];
}

export async function fetchGoogleContacts(accessToken: string): Promise<Contact[]> {
  try {
    const response = await fetch(
      "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,organizations&pageSize=100",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Google People API responded with status ${response.status}`);
    }

    const data = await response.json();
    const connections: GoogleContactRaw[] = data.connections || [];

    return connections.map((conn) => {
      const id = conn.resourceName.replace("people/", "g_");
      const name = conn.names?.[0]?.displayName || "Google Contact";
      const email = conn.emailAddresses?.[0]?.value || "";
      const phone = conn.phoneNumbers?.[0]?.value || "";
      const avatar = conn.photos?.[0]?.url || "/src/assets/images/sophia_avatar_1784421072262.jpg";
      const orgName = conn.organizations?.[0]?.name || "";
      const jobTitle = conn.organizations?.[0]?.title || "";
      
      const role = jobTitle || orgName || "Custom Professional";
      const tagline = orgName 
        ? `Personal contact from ${orgName}. Registered in Google Contacts.` 
        : "Imported Google Contact. Ready for smart conversational session simulation.";

      return {
        id,
        name,
        avatar,
        role,
        tagline,
        statusText: "Google Contact (Imported)",
        isActive: true,
        category: "creacion_contenido",
        personalityStyle: "friendly",
        voiceTone: "medium",
        avatarStyle: "classic",
        hasMemory: false,
        isGoogleContact: true,
        googleContactId: conn.resourceName,
        email,
        phone,
      } as Contact;
    });
  } catch (error) {
    console.error("Error fetching Google Contacts:", error);
    throw error;
  }
}
