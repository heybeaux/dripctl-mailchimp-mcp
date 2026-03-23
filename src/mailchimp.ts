import mailchimp from "@mailchimp/mailchimp_marketing";

export function createMailchimpClient() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  if (!apiKey) throw new Error("MAILCHIMP_API_KEY env var required");

  // Extract datacenter from API key (format: key-dc)
  const dc = apiKey.split("-").pop();

  mailchimp.setConfig({
    apiKey,
    server: dc,
  });

  return mailchimp;
}
