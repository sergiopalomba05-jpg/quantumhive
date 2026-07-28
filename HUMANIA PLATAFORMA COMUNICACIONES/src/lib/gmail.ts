export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body?: string;
}

export async function fetchGmailMessages(accessToken: string): Promise<GmailMessage[]> {
  try {
    const listResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!listResponse.ok) {
      throw new Error(`Gmail API list responded with status ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    const messages = listData.messages || [];
    
    // Fetch details for each message in parallel
    const detailedMessages = await Promise.all(
      messages.map(async (msg: { id: string }) => {
        try {
          const detailResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
              },
            }
          );
          if (!detailResponse.ok) return null;
          
          const detailData = await detailResponse.json();
          const headers = detailData.payload?.headers || [];
          
          const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
          const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
          const to = headers.find((h: any) => h.name.toLowerCase() === "to")?.value || "me";
          const date = headers.find((h: any) => h.name.toLowerCase() === "date")?.value || "";

          // Simple body extraction
          let body = "";
          if (detailData.payload?.parts) {
            // Check for plain text part first
            const part = detailData.payload.parts.find((p: any) => p.mimeType === "text/plain") || detailData.payload.parts[0];
            if (part && part.body?.data) {
              body = decodeBase64Url(part.body.data);
            }
          } else if (detailData.payload?.body?.data) {
            body = decodeBase64Url(detailData.payload.body.data);
          }

          return {
            id: detailData.id,
            threadId: detailData.threadId,
            snippet: detailData.snippet || "",
            subject,
            from,
            to,
            date,
            body: body || detailData.snippet || ""
          } as GmailMessage;
        } catch (err) {
          console.error(`Error fetching Gmail message detail for ${msg.id}:`, err);
          return null;
        }
      })
    );

    return detailedMessages.filter((m): m is GmailMessage => m !== null);
  } catch (error) {
    console.error("Error in fetchGmailMessages:", error);
    throw error;
  }
}

export async function sendGmailMessage(
  accessToken: string,
  emailData: {
    to: string;
    subject: string;
    body: string;
  }
): Promise<any> {
  try {
    // Construct the standard RFC 2822 email format
    const emailContent = [
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Mime-Version: 1.0',
      '',
      emailData.body
    ].join('\r\n');

    // Safe UTF-8 Base64 conversion
    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          raw: encodedEmail
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to send email: ${response.statusText} (${errText})`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in sendGmailMessage:", error);
    throw error;
  }
}

function decodeBase64Url(base64Url: string): string {
  try {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (err) {
    console.error("Base64Url decoding error:", err);
    return "";
  }
}
