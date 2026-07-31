import { H2, H3, P, UL, LI, Callout, A } from "@/components/legal/legal-page";

/**
 * The body of the Terms & Conditions, with no page chrome.
 *
 * Extracted so it can be rendered in two places without duplication:
 *   1. /terms — the canonical public page
 *   2. the consent modal on signup
 *
 * If these ever diverge, a user could agree to different wording from what is
 * published, so there is deliberately only one copy of this text.
 */

export const TERMS_LAST_UPDATED = "31 July 2026";
export const TERMS_CONTACT = "support@crenelle.org";

export function TermsBody() {
  return (
    <>
      <H2 id="parties">1. Who these terms are between</H2>
      <P>
        These terms form an agreement between you and{" "}
        <strong className="text-foreground">Crenelle</strong>, operating from Lagos
        State, Nigeria (&ldquo;Crenelle&rdquo;, &ldquo;we&rdquo;,
        &ldquo;us&rdquo;).
      </P>
      <P>They apply to two groups:</P>
      <UL>
        <LI>
          <strong className="text-foreground">Organisers</strong> — anyone who
          creates a Crenelle account to run an event. Sections 3 to 11 apply to you.
        </LI>
        <LI>
          <strong className="text-foreground">Guests</strong> — anyone who registers
          for, or receives a pass to, an event run on Crenelle. Sections 12 and 13
          apply to you.
        </LI>
      </UL>
      <P>
        Sections 14 onwards apply to everyone. By creating an account, registering
        for an event, or using a pass issued through Crenelle, you accept these
        terms.
      </P>

      <H2 id="what-crenelle-is">2. What Crenelle is</H2>
      <P>
        Crenelle is a platform that lets organisers issue verifiable digital entry
        credentials, deploy browser-based scanners at entrances, manage guest lists,
        sell tickets, and keep a record of who entered an event.
      </P>
      <Callout>
        Crenelle is not the organiser of any event. We provide the software. The
        organiser is solely responsible for the event itself — whether it happens,
        its content, its safety, its venue, its lawfulness, and every representation
        made about it.
      </Callout>

      <H2 id="organisers">Part A — Terms for organisers</H2>

      <H3>3. Your account</H3>
      <P>
        You must be at least 18 and have authority to bind any organisation you
        register on behalf of. You are responsible for the accuracy of your account
        details, for keeping your credentials secure, and for all activity under your
        account. Tell us promptly at{" "}
        <A href={`mailto:${TERMS_CONTACT}`}>{TERMS_CONTACT}</A> if you believe your
        account has been compromised.
      </P>

      <H3>4. Your responsibilities for guest data</H3>
      <P>
        When you upload, import or collect guest data through Crenelle,{" "}
        <strong className="text-foreground">you are the data controller</strong> for
        that data and we act as your <strong>data processor</strong>. You warrant
        that:
      </P>
      <UL>
        <LI>
          you have a lawful basis to collect each guest&rsquo;s personal data and to
          pass it to us for processing;
        </LI>
        <LI>
          you have given your guests the privacy information the law requires,
          including that a third-party platform processes their data on your behalf;
        </LI>
        <LI>
          you will not upload guest data obtained unlawfully, or use Crenelle to
          contact people who have not agreed to hear from you;
        </LI>
        <LI>
          you will respond to your guests&rsquo; data protection requests and
          cooperate with us where we need your instruction.
        </LI>
      </UL>
      <P>A Data Processing Addendum is available on request.</P>
      <P>
        <strong className="text-foreground">Bulk imports.</strong> Crenelle lets you
        import guest lists and email every address on them. You are solely
        responsible for having the right to email those addresses. Uploading a
        purchased or scraped list is a material breach of these terms.
      </P>

      <H3>5. Acceptable use</H3>
      <P>
        You must not: use Crenelle for any unlawful event or purpose; send
        unsolicited bulk email; attempt to circumvent our access controls, rate
        limits or the entry credential system; probe or test the security of the
        platform without our prior written consent; resell or sublicense access
        without our agreement; upload malware or unlawful, defamatory or infringing
        content; misrepresent yourself, your organisation or your event; or sell
        tickets to an event you do not have the right to run.
      </P>
      <Callout>
        <strong>Scanner links.</strong> Crenelle lets you generate shareable scanner
        links so gate staff can admit guests without logging in. Anyone holding such
        a link can view guest names and admit guests. You are responsible for who you
        share these links with, and for deactivating them when they are no longer
        needed. Treat them as you would a key to the door.
      </Callout>

      <H3>6. Tickets, fees and payouts</H3>
      <P>
        <strong className="text-foreground">How money flows.</strong> Where you
        charge for tickets, payments are collected by Paystack. Crenelle does not
        hold customer funds as a deposit-taking institution, and card details never
        pass through our systems. To receive revenue you must connect a bank account,
        which creates a Paystack sub-account in your name. You warrant that the
        account belongs to you or to the organisation you represent.
      </P>
      <P>
        <strong className="text-foreground">Our fee.</strong> We deduct a platform
        commission of 5% from each paid transaction. The rate applicable to your
        account is shown in your payment settings. We may change our fees on 30
        days&rsquo; written notice; changes do not apply to tickets already sold.
      </P>
      <P>
        <strong className="text-foreground">Payouts.</strong> The balance after our
        commission is settled to your connected bank account on Paystack&rsquo;s
        settlement schedule, which we do not control. We are not liable for delays
        caused by Paystack, your bank, or incorrect bank details you provided.
      </P>
      <P>
        <strong className="text-foreground">Refunds and chargebacks.</strong> Refunds
        to guests are your responsibility. You set your own refund policy and must
        publish it to your guests. Where you agree a refund, you authorise us to
        recover the corresponding amount, including our commission, from your balance
        or by other lawful means. If a guest raises a chargeback, you are responsible
        for the disputed amount and for providing evidence to defend it, and we will
        pass on any fee the payment processor charges us for the dispute.
      </P>
      <Callout>
        <strong>Overselling.</strong> Capacity limits are enforced when a ticket is
        issued. If a tier fills between the moment a guest begins payment and the
        moment it completes, a payment may succeed for which no place can be issued.
        Where that happens we will alert you, and you are responsible for refunding
        that guest promptly.
      </Callout>
      <P>
        <strong className="text-foreground">Taxes.</strong> You are responsible for
        determining, charging and remitting any tax due on your ticket sales,
        including VAT where applicable. Our commission is exclusive of tax unless
        stated otherwise.
      </P>

      <H3>7. Your content</H3>
      <P>
        You keep ownership of everything you upload — event details, branding, banner
        images, guest lists. You grant us a non-exclusive, worldwide, royalty-free
        licence to host, reproduce and transmit that content strictly as needed to
        operate the service for you. That licence ends when you delete the content or
        close your account, subject to the retention periods in our{" "}
        <A href="/privacy">Privacy Policy</A>. You warrant that you hold the rights
        to everything you upload, including any image supplied by URL.
      </P>

      <H3>8. Availability</H3>
      <P>
        We aim to keep Crenelle available and reliable, but we do not guarantee
        uninterrupted service and, unless separately agreed in writing, we offer no
        uptime commitment. You acknowledge specifically that the scanner requires a
        working internet connection and a device with a camera; that venue
        connectivity is outside our control; and that email and WhatsApp delivery
        depend on third parties and on the recipient&rsquo;s provider, and cannot be
        guaranteed.
      </P>
      <Callout>
        You should have a fallback plan for admitting guests — for example an
        exported guest list — for any event where entry is critical.
      </Callout>

      <H3>9. Suspension and termination</H3>
      <P>
        You may close your account at any time. Doing so does not refund commission
        already deducted, and does not remove your obligations for events already
        sold. We may suspend or terminate your account, with notice where
        practicable, if you materially breach these terms, if we are required to by
        law, if your use threatens the security of the platform, or if we reasonably
        believe you are using Crenelle for fraud. Where we suspend an account with
        tickets already sold, we will use reasonable efforts to allow existing guests
        to be admitted and to settle amounts properly owed to you, subject to any
        legal restriction.
      </P>

      <H3>10. Limitation of liability</H3>
      <P>
        Nothing in these terms limits liability for death or personal injury caused
        by negligence, for fraud or fraudulent misrepresentation, or for anything
        that cannot lawfully be limited. Subject to that:
      </P>
      <UL>
        <LI>
          we are not liable for indirect, consequential, special or punitive loss,
          nor for loss of profit, revenue, goodwill, anticipated savings or data;
        </LI>
        <LI>
          we are not liable for any loss arising from the conduct of an event, the
          acts or omissions of an organiser, or a dispute between an organiser and a
          guest;
        </LI>
        <LI>
          we are not liable for failures of third-party services including Paystack,
          Resend, WhatsApp, or your venue&rsquo;s connectivity;
        </LI>
        <LI>
          our total aggregate liability arising out of or in connection with these
          terms is limited to the total commission we charged you in the 6 months
          before the claim arose.
        </LI>
      </UL>

      <H3>11. Indemnity</H3>
      <P>
        You will indemnify us against any claim, loss, liability or cost, including
        reasonable legal fees, arising from: your event; your breach of these terms;
        your breach of data protection law in relation to your guests; any content
        you upload; or any claim by a guest relating to refunds, admission or the
        conduct of your event.
      </P>

      <H2 id="guests">Part B — Terms for guests</H2>

      <H3>12. Your pass</H3>
      <P>
        When you register for or are invited to an event, you receive a unique
        digital entry pass containing a QR code.
      </P>
      <UL>
        <LI>
          Your pass is <strong className="text-foreground">personal to you</strong>{" "}
          and admits the number of people stated on it. Do not share, copy, sell or
          publish it — anyone holding it may be able to use it.
        </LI>
        <LI>
          A pass can normally be{" "}
          <strong className="text-foreground">redeemed once</strong>. If someone else
          uses it first, you may be refused entry.
        </LI>
        <LI>
          The organiser controls admission and may refuse entry in line with their
          own terms, venue rules, or the law.
        </LI>
      </UL>
      <Callout>
        Crenelle does not run the event. Questions about the event itself, refunds,
        cancellation, timing or access should go to the organiser.
      </Callout>

      <H3>13. Payments, refunds and cancellation</H3>
      <P>Where you paid for a ticket:</P>
      <UL>
        <LI>
          your contract for the ticket is{" "}
          <strong className="text-foreground">
            with the organiser, not with Crenelle
          </strong>
          ;
        </LI>
        <LI>
          refunds are handled by the organiser under the refund policy they
          published. Crenelle cannot issue a refund on an organiser&rsquo;s behalf
          without their instruction;
        </LI>
        <LI>
          if the event is cancelled, moved or changed, the organiser is responsible
          for telling you and for any refund due;
        </LI>
        <LI>
          payment is processed by Paystack, and their terms apply to the payment
          transaction itself.
        </LI>
      </UL>
      <P>
        If you were charged but did not receive your pass, contact the organiser
        first, and contact us at{" "}
        <A href={`mailto:${TERMS_CONTACT}`}>{TERMS_CONTACT}</A> if they do not
        resolve it.
      </P>

      <H2 id="general">Part C — General</H2>

      <H3>14. Intellectual property</H3>
      <P>
        Crenelle, its name, logo, software and documentation are owned by us or our
        licensors. These terms grant you a limited right to use the service and no
        ownership in it. You may not copy, reverse-engineer, or create derivative
        works from the platform except to the extent that restriction is
        unenforceable by law.
      </P>

      <H3>15. Changes to these terms</H3>
      <P>
        We may amend these terms. For material changes affecting organisers we will
        give at least 30 days&rsquo; notice by email or in-product. Continued use
        after the effective date constitutes acceptance. If you do not accept the
        change, you may close your account.
      </P>

      <H3>16. Privacy</H3>
      <P>
        Our handling of personal data is governed by our{" "}
        <A href="/privacy">Privacy Policy</A>, which forms part of these terms.
      </P>

      <H3>17. Third-party services</H3>
      <P>
        Crenelle depends on third parties including Supabase, Vercel, Paystack,
        Resend, Meta (WhatsApp), Sentry and Upstash. Their availability and their own
        terms may affect the service. We are not responsible for their acts or
        omissions beyond our obligations under applicable data protection law.
      </P>

      <H3>18. Force majeure</H3>
      <P>
        Neither party is liable for failure to perform caused by events beyond its
        reasonable control, including internet or telecommunications failure, power
        failure, government action, civil unrest, epidemic or natural disaster.
      </P>

      <H3>19. General</H3>
      <UL>
        <LI>
          <strong className="text-foreground">Entire agreement.</strong> These terms,
          together with the Privacy Policy and any Data Processing Addendum, are the
          whole agreement between us.
        </LI>
        <LI>
          <strong className="text-foreground">Severance.</strong> If any provision is
          unenforceable, the rest remains in force.
        </LI>
        <LI>
          <strong className="text-foreground">No waiver.</strong> Failure to enforce
          a right is not a waiver of it.
        </LI>
        <LI>
          <strong className="text-foreground">Assignment.</strong> You may not assign
          these terms without our written consent. We may assign them to a successor
          in connection with a merger or sale.
        </LI>
        <LI>
          <strong className="text-foreground">No partnership.</strong> Nothing here
          creates a partnership, agency or employment relationship.
        </LI>
        <LI>
          <strong className="text-foreground">Notices.</strong> We will send notices
          to the email on your account. Send notices to us at{" "}
          <A href={`mailto:${TERMS_CONTACT}`}>{TERMS_CONTACT}</A>.
        </LI>
      </UL>

      <H3>20. Governing law and disputes</H3>
      <P>
        These terms are governed by the laws of the{" "}
        <strong className="text-foreground">Federal Republic of Nigeria</strong>. The
        parties will first attempt to resolve any dispute in good faith. If they
        cannot within 30 days, the dispute will be submitted to the exclusive
        jurisdiction of the courts of Lagos State, Nigeria.
      </P>

      <H3>21. Contact</H3>
      <P>
        Crenelle
        <br />
        Lagos State, Nigeria
        <br />
        <A href={`mailto:${TERMS_CONTACT}`}>{TERMS_CONTACT}</A>
      </P>
    </>
  );
}
