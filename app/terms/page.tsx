import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { TermsBody, TERMS_LAST_UPDATED } from "@/components/legal/terms-body";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing use of Crenelle by event organisers and their guests.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" lastUpdated={TERMS_LAST_UPDATED}>
      <TermsBody />
    </LegalPage>
  );
}
