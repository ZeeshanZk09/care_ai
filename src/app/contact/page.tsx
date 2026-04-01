import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendEmail } from "@/lib/mail";
import { buildMetadata } from "@/lib/seo";
import { buildContactPageSchema } from "@/lib/structured-data";

const escapeHtml = (value: string) => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const readFormTextField = (formData: FormData, fieldName: string) => {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
};

export const metadata = buildMetadata({
  title: "Contact Us | MediVoice AI Support",
  description:
    "Get in touch with MediVoice AI for support, billing help, or partnership enquiries.",
  path: "/contact",
  type: "website",
});

export default function ContactPage() {
  const contactSchema = buildContactPageSchema();

  const sendMessage = async (formData: FormData) => {
    "use server";

    const data = {
      firstName: readFormTextField(formData, "first-name"),
      lastName: readFormTextField(formData, "last-name"),
      email: readFormTextField(formData, "email"),
      message: readFormTextField(formData, "message"),
    };

    if (!data.firstName || !data.lastName || !data.email || !data.message) {
      return;
    }

    const destinationEmail = process.env.EMAIL_USER ?? "support@medivoice.ai";

    try {
      await sendEmail(
        destinationEmail,
        `New contact message from ${data.firstName} ${data.lastName}`,
        `
        <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(data.message)}</p>
        `,
        {
          templateName: "contact_message",
          metadata: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
          },
        },
      );
    } catch {
      // Prevent contact form delivery failures from crashing the page render in production.
    }
  };

  return (
    <div className="section-container">
      <script type="application/ld+json" suppressHydrationWarning>
        {JSON.stringify(contactSchema)}
      </script>

      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="heading-1">Contact Us</h1>
          <p className="subtext mx-auto mt-4">
            Have questions? We would love to hear from you. Send us a message
            and our support team will respond as soon as possible.
          </p>
        </div>

        <form action={sendMessage} className="card-responsive space-y-6 p-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="first-name" className="text-sm font-medium">
                First name
              </label>
              <Input
                id="first-name"
                name="first-name"
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="last-name" className="text-sm font-medium">
                Last name
              </label>
              <Input
                id="last-name"
                name="last-name"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="message"
              name="message"
              placeholder="How can we help you?"
              rows={5}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}
