import type { Metadata } from "next";
import {
  LegalPage,
  H2,
  H3,
  P,
  UL,
  LI,
  Callout,
  LegalTable,
  A,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Crenelle",
  description:
    "How Crenelle collects, uses and protects personal data for event organisers and their guests.",
};

const CONTACT = "support@crenelle.org";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="31 July 2026">
      <H2 id="who-we-are">1. Who we are</H2>
      <P>
        Crenelle (&ldquo;Crenelle&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a
        QR-based access control and guest management platform operating from Lagos
        State, Nigeria.
      </P>
      <P>
        For any question about this policy, or to exercise your rights, contact us
        at <A href={`mailto:${CONTACT}`}>{CONTACT}</A>. Data protection enquiries
        are handled by the Crenelle team at that address.
      </P>

      <H2 id="two-roles">2. The two roles we play — please read this first</H2>
      <P>
        Crenelle serves event organisers, who in turn invite guests. We therefore
        handle personal data in two capacities, and your rights differ depending on
        which applies to you.
      </P>
      <P>
        <strong className="text-foreground">If you are an event organiser</strong>{" "}
        (you hold a Crenelle account), we are the <em>data controller</em> for your
        account data, and this policy governs that relationship directly.
      </P>
      <Callout>
        <strong>If you are a guest or attendee</strong> — you were invited to, or
        registered for, an event run on Crenelle — then the{" "}
        <strong>event organiser is the data controller</strong> and Crenelle acts as
        a <strong>data processor</strong> on their instructions. To have your data
        corrected or removed, contact the organiser who invited you. You may also
        contact us and we will assist them.
      </Callout>

      <H2 id="what-we-collect">3. What we collect</H2>

      <H3>If you are an event organiser</H3>
      <UL>
        <LI>
          Email address and password. Passwords are hashed by our authentication
          provider; we never see or store them in readable form.
        </LI>
        <LI>Your name or display name.</LI>
        <LI>
          Organisation name, timezone, currency, and date and time preferences.
        </LI>
        <LI>
          Sender profile details — the display name and reply-to address used on
          emails sent to your guests.
        </LI>
        <LI>
          Bank account name, account number, bank code and payment sub-account
          code, so ticket revenue can be settled to you.
        </LI>
        <LI>
          If you sign in with Google: your email address and basic profile only. We
          do not access any other Google data.
        </LI>
      </UL>

      <H3>If you are a guest or attendee</H3>
      <UL>
        <LI>Your name.</LI>
        <LI>Your email address, to send your entry pass and any reminders.</LI>
        <LI>
          Your phone number, where provided, to send your pass by WhatsApp and to
          locate your booking at the entrance.
        </LI>
        <LI>Party size, and seat or table assignment where applicable.</LI>
        <LI>Ticket type and any associated benefits.</LI>
        <LI>
          A unique entry credential (a QR token). This is a random value and
          contains no personal information.
        </LI>
        <LI>
          Your registration status — pending, accepted, rejected or waitlisted.
        </LI>
      </UL>

      <H3>Attendance and entry records</H3>
      <P>
        When your pass is scanned at an entrance we record that the entry occurred
        and when, which checkpoint scanned it, and whether entry was by camera scan
        or by manual name search at the gate.
      </P>
      <P>
        This is a record of your presence at an event. It exists so organisers can
        manage capacity, prevent duplicate entry, and keep an audit trail.
      </P>
      <Callout>
        We do not collect your device location, and we do not track you between
        events or outside the moment of entry.
      </Callout>

      <H3>Payment data</H3>
      <P>
        Where an event charges for tickets, payment is processed by{" "}
        <strong className="text-foreground">Paystack</strong>.
      </P>
      <Callout>
        Card numbers, CVV codes, PINs and bank credentials are entered on
        Paystack&rsquo;s own secure checkout and never reach Crenelle&rsquo;s
        servers. We do not store, transmit or have access to them.
      </Callout>
      <P>
        We do store: your name, email address, the amount, currency, payment status,
        payment method type, Paystack&rsquo;s transaction reference, and the time of
        payment. We also retain the confirmation Paystack sends us, which may
        include your phone number.
      </P>

      <H3>Technical data</H3>
      <UL>
        <LI>
          <strong className="text-foreground">IP address</strong>, used to
          rate-limit registrations and gate scans to prevent abuse.
        </LI>
        <LI>
          <strong className="text-foreground">Error and diagnostic data</strong>{" "}
          when something fails. For payment problems this can include the name,
          email address and transaction record involved.
        </LI>
        <LI>
          <strong className="text-foreground">Strictly necessary cookies</strong>,
          to keep you signed in. We use no advertising cookies and we do not sell or
          share data for advertising.
        </LI>
      </UL>

      <H3>What we do not do</H3>
      <P>
        We do not sell your personal data, use guest data for our own marketing, use
        it to train machine learning models, or make automated decisions with legal
        effects about you.
      </P>

      <H2 id="lawful-bases">4. Our lawful bases</H2>
      <P>
        Under the Nigeria Data Protection Act 2023, and the UK/EU GDPR where it
        applies:
      </P>
      <LegalTable
        headings={["Purpose", "Lawful basis"]}
        rows={[
          ["Operating an organiser account", "Performance of a contract"],
          [
            "Issuing a pass and admitting you to an event",
            "Performance of a contract, or the organiser's legitimate interest in controlling access",
          ],
          ["Processing ticket payment", "Performance of a contract"],
          [
            "Transactional email — your pass, reminders, changes",
            "Performance of a contract, or legitimate interest",
          ],
          [
            "Retaining payment and entry records",
            "Legal obligation for financial records, and legitimate interest in fraud prevention",
          ],
          [
            "Rate limiting and abuse prevention",
            "Legitimate interest in service security",
          ],
          ["Error monitoring", "Legitimate interest in service reliability"],
        ]}
      />

      <H2 id="processors">5. Third parties who process data for us</H2>
      <LegalTable
        headings={["Provider", "What it receives"]}
        rows={[
          [
            "Supabase — database, authentication, file storage",
            "Account, guest, event, entry and payment records; uploaded banner images",
          ],
          ["Vercel — hosting", "Request data including IP addresses, and server logs"],
          [
            "Paystack — payments",
            "Payer name, email and amount. Card data goes to Paystack directly, not through us",
          ],
          [
            "Resend — transactional email",
            "Recipient name, email address, and email content including your pass",
          ],
          [
            "Meta Platforms (WhatsApp Cloud API) — pass delivery, where enabled",
            "Recipient phone number, name and message content",
          ],
          [
            "Sentry — error monitoring",
            "Diagnostic data. For payment errors this can include payer name, email and the transaction record",
          ],
          [
            "Upstash — rate limiting",
            "Email addresses and IP addresses, held briefly as counters",
          ],
          ["Google — sign-in with Google, where used", "Authentication exchange only"],
        ]}
      />
      <P>
        We may also disclose data to professional advisers, or to a regulator, court
        or law enforcement body where legally required. If we are ever acquired or
        merge, personal data may transfer to the acquiring entity, and we will
        notify organisers before that happens.
      </P>

      <H2 id="transfers">6. International transfers</H2>
      <P>
        Our database, authentication and file storage are hosted by Supabase in the
        European Union (region <code className="font-mono text-xs">eu-west-1</code>,
        Ireland). Other providers above store or process data outside Nigeria,
        including in the United States and the European Union.
      </P>
      <P>
        Where personal data leaves Nigeria we rely on the mechanisms permitted by
        sections 41 to 43 of the Nigeria Data Protection Act 2023: that the
        recipient is subject to a legal framework affording adequate protection, or
        is contractually bound to appropriate safeguards including standard
        contractual clauses. Where the UK/EU GDPR applies we rely on Standard
        Contractual Clauses or an applicable adequacy decision. You may request
        details of the safeguards applying to a specific transfer.
      </P>

      <H2 id="retention">7. How long we keep data</H2>
      <LegalTable
        headings={["Data", "Retention"]}
        rows={[
          [
            "Organiser account and settings",
            "While your account is open, then 90 days after closure unless we must keep it longer",
          ],
          [
            "Guest name, contact details and pass",
            "While the organiser's account and event remain active, or until the organiser removes it",
          ],
          [
            "Entry and attendance records",
            "24 months, as the organiser's audit trail",
          ],
          [
            "Payment records and confirmations",
            "6 years, to meet financial record-keeping and tax obligations and to resolve chargebacks",
          ],
          [
            "Email suppression list — unsubscribed or bounced addresses",
            "Indefinitely. We must keep these to honour your request not to be emailed; deleting the record would cause us to email you again",
          ],
          ["Error and diagnostic logs", "30 days"],
          ["Rate-limiting counters", "Minutes to hours, automatically expired"],
        ]}
      />

      <H2 id="your-rights">8. Your rights</H2>
      <P>
        Subject to the conditions in the Nigeria Data Protection Act 2023, and the
        GDPR where applicable, you have the right to be informed, to access your
        data, to have inaccurate data corrected, to erasure where we have no
        overriding obligation to keep it, to restrict processing, to object to
        processing based on legitimate interests, to data portability, to withdraw
        consent where we relied on it, and not to be subject to solely automated
        decisions.
      </P>
      <P>
        To exercise any of these, email{" "}
        <A href={`mailto:${CONTACT}`}>{CONTACT}</A>. We will respond within{" "}
        <strong className="text-foreground">30 days</strong> and may need to verify
        your identity first.
      </P>

      <H3>How erasure works in practice</H3>
      <P>
        Payment and entry records must be retained for the periods in section 7 for
        tax, audit and dispute purposes. Where we cannot delete a record outright, we
        remove or overwrite the personal details within it so you are no longer
        identifiable from it. Erasure requests are currently handled manually, within
        the 30-day window.
      </P>

      <H3>Guests</H3>
      <P>
        See section 2 — the event organiser is the controller of your data, so
        contact them first where possible.
      </P>

      <H3>Stopping emails</H3>
      <P>
        Use the unsubscribe link in the footer of any email we send. It takes effect
        immediately for all future sends.
      </P>

      <H3>Complaints</H3>
      <P>
        You may complain to us at the address above, and you have the right to lodge
        a complaint with the{" "}
        <strong className="text-foreground">
          Nigeria Data Protection Commission (NDPC)
        </strong>
        . Where the GDPR applies you may complain to your local supervisory
        authority.
      </P>

      <H2 id="security">9. Security</H2>
      <UL>
        <LI>
          All traffic is encrypted in transit using TLS, with HTTP Strict Transport
          Security enforced.
        </LI>
        <LI>
          Data is access-controlled at the database level, so one organiser cannot
          read another organiser&rsquo;s guests, events or revenue.
        </LI>
        <LI>
          Entry credentials are long random values that cannot feasibly be guessed,
          and a pass can only be redeemed once.
        </LI>
        <LI>Payment card data never touches our systems.</LI>
        <LI>
          Payment notifications from Paystack are cryptographically verified before
          we act on them.
        </LI>
        <LI>Access to production systems is limited to Crenelle&rsquo;s founders.</LI>
      </UL>
      <P>
        No system is perfectly secure. If a breach occurs that is likely to risk
        your rights and freedoms, we will notify the NDPC within{" "}
        <strong className="text-foreground">72 hours</strong> and inform those
        affected without undue delay, as the Act requires.
      </P>

      <H2 id="children">10. Children</H2>
      <P>
        Crenelle is not directed at children and we do not knowingly collect data
        from anyone under 18. Organisers running events involving children are
        responsible for obtaining any consent the law requires. If you believe a
        child&rsquo;s data has been provided to us, contact us and we will remove it.
      </P>

      <H2 id="changes">11. Changes to this policy</H2>
      <P>
        We may update this policy. Where changes are material we will notify
        organisers by email and update the date at the top of this page. Continued
        use after the effective date constitutes acceptance.
      </P>

      <H2 id="contact">12. Contact</H2>
      <P>
        Crenelle
        <br />
        Lagos State, Nigeria
        <br />
        <A href={`mailto:${CONTACT}`}>{CONTACT}</A>
      </P>
    </LegalPage>
  );
}
