import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "WalkTheFloor <notifications@walkthefloor.com>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
  } catch {
    // don't let email failures break the main flow
  }
}

export function workOrderApprovalEmail({
  title,
  priority,
  description,
  locationName,
  createdByName,
  workOrderUrl,
}: {
  title: string;
  priority: string;
  description?: string;
  locationName: string;
  createdByName: string;
  workOrderUrl: string;
}) {
  return {
    subject: `New maintenance request at ${locationName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">New Maintenance Request</h2>
        <p style="color: #666; margin-top: 0;">Pending your approval</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 100px;">Title</td>
            <td style="padding: 8px 0; font-weight: 600;">${title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Priority</td>
            <td style="padding: 8px 0;">${priority}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Location</td>
            <td style="padding: 8px 0;">${locationName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Submitted by</td>
            <td style="padding: 8px 0;">${createdByName}</td>
          </tr>
          ${description ? `<tr><td style="padding: 8px 0; color: #666;">Description</td><td style="padding: 8px 0;">${description.slice(0, 200)}${description.length > 200 ? "..." : ""}</td></tr>` : ""}
        </table>
        <a href="${workOrderUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          Review Work Order
        </a>
      </div>
    `,
  };
}
