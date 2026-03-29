import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <div className="section-container">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="heading-1">Contact Us</h1>
          <p className="subtext mx-auto mt-4">Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
        </div>

        <form className="card-responsive p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="first-name" className="text-sm font-medium">First name</label>
              <Input id="first-name" placeholder="John" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="last-name" className="text-sm font-medium">Last name</label>
              <Input id="last-name" placeholder="Doe" required />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email address</label>
            <Input id="email" type="email" placeholder="john@example.com" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">Message</label>
            <Textarea id="message" placeholder="How can we help you?" rows={5} required />
          </div>

          <Button type="submit" className="w-full">Send Message</Button>
        </form>
      </div>
    </div>
  );
}
