// TermsPublic — public /terms route. Anyone can read the canonical Terms
// of Use without an account. Linked from the TermsGate, signup screens,
// settings, and the Privacy Policy.
//
// Source: docs/Grounds-Live-Terms-of-Use.docx (Version 2, 2026-06-09).
// Legacy "The Grounds" references in operative clauses (arbitration,
// liability cap, indemnification) were normalized to "Grounds Live" per
// the v0.18.0 rebrand. Legal should spot-check.
import { G } from '../theme.js';
import { CURRENT_TERMS_VERSION, CURRENT_TERMS_DATE } from '../lib/terms.js';
import { PLATFORM_NAME } from '../lib/version.js';
import LegalDocLayout from '../components/LegalDocLayout.jsx';

export default function TermsPublic() {
  return (
    <LegalDocLayout
      brand={PLATFORM_NAME}
      title="Terms of Use"
      versionLabel={`Version ${CURRENT_TERMS_VERSION} · effective ${CURRENT_TERMS_DATE}`}
    >
      <P>
        These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use of the
        member engagement platform operated by Grounds Live
        (&ldquo;Grounds Live,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;), including the websites, mobile and web applications,
        and related services we provide (collectively, the &ldquo;Service&rdquo;).
      </P>
      <P>
        The Service is provided to private clubs and golf courses (each, a
        &ldquo;Club&rdquo;) and made available to their members, guests, and
        authorized users (&ldquo;you&rdquo; or &ldquo;User&rdquo;). Grounds Live
        is the technology provider. Each Club controls its own membership,
        content, and operations.
      </P>
      <Emphatic>
        BY CHECKING THE ACCEPTANCE BOX AT REGISTRATION, OR BY ACCESSING OR USING
        THE SERVICE, YOU AGREE TO THESE TERMS. IF YOU DO NOT AGREE, DO NOT USE
        THE SERVICE. THESE TERMS CONTAIN A BINDING ARBITRATION PROVISION AND
        CLASS ACTION WAIVER IN SECTION 17, AND A LIMITATION OF LIABILITY IN
        SECTION 14, THAT AFFECT YOUR LEGAL RIGHTS.
      </Emphatic>

      <H>1. Eligibility and Accounts</H>
      <P>
        You must be at least 18 years old, or the age of majority in your
        jurisdiction, to create an account. By using the Service, you represent
        that you meet this requirement and that the information you provide is
        accurate and current.
      </P>
      <P>
        Your access depends on your relationship with a Club. The Club determines
        who may join, what content appears, and when access is granted or
        removed. You are responsible for keeping your login credentials
        confidential and for all activity under your account. Notify us and your
        Club promptly if you suspect unauthorized use.
      </P>
      <P>
        We may suspend or terminate any account at any time, with or without
        notice, if we believe these Terms have been violated or if we need to
        protect the Service, a Club, or other users.
      </P>

      <H>2. The Service and Club Content</H>
      <P>
        The Service may include features such as club status updates, news and
        announcements, an events calendar with registration, food and beverage
        menus and ordering, course and pin placement maps, a digital membership
        card, member and partner boards, guest management, push notifications,
        and an optional AI assistant. Features vary by Club and subscription
        tier, and may change, be added, or be removed at any time.
      </P>
      <P>
        Content shown in the Service, including hours, menus, pricing, event
        details, course conditions, and announcements, is supplied and
        controlled by your Club. Grounds Live does not verify this content and
        is not responsible for its accuracy, completeness, or timeliness.
        Decisions you make based on Club content are your own.
      </P>

      <H2>2.1 AI Assistant</H2>
      <P>
        If your Club enables the AI assistant, it generates responses
        automatically and may be inaccurate or incomplete. The Service displays
        a notice advising you to confirm important information with your Club.
        Do not rely on the AI assistant for any decision where accuracy matters
        without confirming with your Club. It is provided &ldquo;as is&rdquo;
        and is subject to the same disclaimers and limitations as the rest of
        the Service.
      </P>

      <H2>2.2 Food and Beverage Ordering</H2>
      <P>
        Where ordering is available, it is offered by your Club, not by
        Grounds Live. Your Club is solely responsible for order fulfillment,
        food preparation, food safety, allergen and ingredient information,
        pricing, and pickup or dining arrangements. Grounds Live provides only
        the software that transmits the order and does not prepare, handle,
        inspect, or deliver any food or beverage. If you have a food allergy
        or dietary restriction, you must confirm details directly with your Club
        before ordering. Any dispute about an order is between you and your Club.
      </P>

      <H>3. User Content</H>
      <P>
        You may be able to post content such as messages, board posts, event
        responses, and profile information (&ldquo;User Content&rdquo;). You
        retain ownership of your User Content. You grant Grounds Live and your
        Club a non-exclusive, worldwide, royalty-free license to host, store,
        display, and use your User Content to operate and provide the Service.
      </P>
      <P>
        You are solely responsible for your User Content and represent that you
        have the rights to post it and that it does not violate any law or these
        Terms. We may remove any User Content at our discretion but are not
        obligated to monitor it.
      </P>

      <H>4. Acceptable Use</H>
      <P>You agree not to:</P>
      <ul style={ulStyle}>
        <li style={liStyle}>Use the Service for any unlawful purpose or in violation of these Terms.</li>
        <li style={liStyle}>Post content that is harassing, defamatory, obscene, infringing, or harmful.</li>
        <li style={liStyle}>Attempt to gain unauthorized access to the Service, other accounts, or any system or data, including content belonging to other Clubs.</li>
        <li style={liStyle}>Interfere with or disrupt the Service, introduce malicious code, or scrape or harvest data.</li>
        <li style={liStyle}>Impersonate any person or misrepresent your affiliation with any person or Club.</li>
        <li style={liStyle}>Reverse engineer, copy, or create derivative works from the Service except as allowed by law.</li>
      </ul>

      <H>5. Electronic Communications, Email, and Text Marketing Consent</H>
      <P>
        When you register, you provide your email address and, optionally, your
        mobile phone number. How we and your Club may contact you depends on
        the consents you give and the preferences you set. Communications fall
        into two categories.
      </P>

      <H2>5.1 Service and Transactional Messages</H2>
      <P>
        You agree to receive messages necessary to operate the Service, such as
        account and security notices, event confirmations, order updates, club
        status changes, and similar operational messages. These are part of
        using the Service. You cannot opt out of essential service messages
        while maintaining an active account, although you can disable
        non-essential push notifications in your device or member settings.
      </P>

      <H2>5.2 Marketing Email and Text Messages: Separate Opt-In</H2>
      <P>
        Marketing and promotional communications are optional and require your
        separate, affirmative opt-in. We do not enroll you in marketing messages
        simply because you created an account or agreed to these Terms.
      </P>
      <P>
        At registration and in your member settings, you can choose, by separate
        and independent controls, whether to receive:
      </P>
      <ul style={ulStyle}>
        <li style={liStyle}>Marketing email from Grounds Live and your Club; and</li>
        <li style={liStyle}>Marketing text messages (SMS and MMS) from Grounds Live and your Club.</li>
      </ul>
      <Emphatic>
        IF, AND ONLY IF, YOU AFFIRMATIVELY OPT IN TO MARKETING TEXT MESSAGES,
        YOU EXPRESSLY CONSENT TO RECEIVE MARKETING AND PROMOTIONAL TEXT MESSAGES
        (SMS AND MMS) FROM GROUNDS LIVE AND YOUR CLUB AT THE MOBILE NUMBER YOU
        PROVIDE, INCLUDING MESSAGES SENT USING AUTOMATED TECHNOLOGY. CONSENT TO
        MARKETING TEXT MESSAGES IS NOT A CONDITION OF CREATING AN ACCOUNT OR
        OF ANY PURCHASE.
      </Emphatic>
      <P>
        Message frequency varies. Message and data rates may apply. We do not
        control and are not responsible for charges from your wireless carrier.
      </P>

      <H2>5.3 How to Change Your Choices or Opt Out</H2>
      <P>You control your marketing preferences and can change them at any time:</P>
      <ul style={ulStyle}>
        <li style={liStyle}>In the Service, open member settings and toggle email marketing and text marketing on or off independently.</li>
        <li style={liStyle}>Reply STOP to any marketing text message to stop marketing texts. Reply HELP for help.</li>
        <li style={liStyle}>Use the unsubscribe link in any marketing email to stop marketing emails.</li>
      </ul>
      <P>
        We will honor opt-out requests within the time required by law. Opting
        out of marketing does not stop service or transactional messages. We
        maintain records of consent and opt-out activity.
      </P>

      <H2>5.4 Scope of Consent; Club Messaging Limits</H2>
      <P>
        Your consent authorizes messages consistent with the choices you make in
        the Service. Grounds Live provides Clubs with tools to send messages
        only to Users who have the matching consent on file, and instructs Clubs
        to send marketing only to Users who have opted in. You acknowledge that
        the content and timing of Club messages are controlled by the Club. If
        you believe a Club has sent you messages outside the preferences you
        set, contact us and your Club, and we will assist in correcting your
        preferences and message routing. Grounds Live is not responsible for a
        Club&rsquo;s use of messaging tools in violation of these Terms, your
        stated preferences, or applicable law, as further described in
        Sections 7 and 13.
      </P>

      <H>6. Privacy and Your Data Rights</H>
      <P>
        Our collection and use of personal information is described in our{' '}
        <a href="/privacy" style={linkStyle}>Privacy Policy</a>, incorporated
        into these Terms by reference. By using the Service, you acknowledge
        that information will be handled as described there. Your Club also
        handles your information under its own practices, which we do not
        control.
      </P>

      <H2>6.1 Your Choices in Member Settings</H2>
      <P>
        The Service provides controls that let you manage your information and
        communications, including email marketing opt-out, text marketing
        opt-out, push notification preferences, profile visibility within your
        Club, and the ability to request access to or deletion of your account
        information. These controls are available to all Users regardless of
        state of residence.
      </P>

      <H2>6.2 California Residents</H2>
      <P>
        If you are a California resident, the California Consumer Privacy Act,
        as amended by the California Privacy Rights Act (the &ldquo;CCPA&rdquo;),
        gives you rights regarding your personal information, including the
        right to know what we collect, the right to delete, the right to
        correct, the right to opt out of any sale or sharing of personal
        information, and the right not to be discriminated against for
        exercising these rights.
      </P>
      <P>
        We do not sell your personal information for money. To the extent any
        sharing qualifies as a &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; under
        the CCPA, you may opt out as described in our Privacy Policy. To
        exercise your rights, follow the instructions in our Privacy Policy or
        contact us using Section 19. We will verify your request as required by
        law before responding.
      </P>

      <H2>6.3 Other State Privacy Laws</H2>
      <P>[Intentionally Blank]</P>

      <H2>6.4 Biometric Information</H2>
      <P>
        The Service does not collect biometric identifiers or biometric
        information as currently designed. If any future feature would collect
        biometric information, including under the Illinois Biometric
        Information Privacy Act (BIPA), Grounds Live will obtain separate
        written consent and provide a compliant biometric policy before any such
        collection. Counsel must review before launching any biometric feature,
        given BIPA&rsquo;s private right of action and statutory damages.
      </P>

      <H>7. Relationship Between You, Your Club, and Grounds Live</H>
      <P>
        Grounds Live provides the Service to Clubs under a separate agreement.
        Your Club is responsible for its own operations and decisions, including
        its content, membership, dues, events, food and beverage, facilities,
        conduct, and how it uses the tools Grounds Live provides, including
        messaging tools. Grounds Live is not a party to your membership
        relationship with any Club, does not operate any Club, and is not
        responsible for any Club&rsquo;s acts or omissions.
      </P>
      <P>
        Grounds Live builds the Service so that Clubs can send communications
        only to Users with matching consent and provides Clubs with each
        User&rsquo;s current preferences. Grounds Live does not direct, and is
        not responsible for, a Club&rsquo;s decision to send any particular
        message, the content of Club messages, or a Club&rsquo;s failure to
        honor a User&rsquo;s preferences. If a Club acts outside the consent a
        User has given or otherwise violates applicable law, that conduct is
        the Club&rsquo;s responsibility.
      </P>
      <P>
        Any dispute you have with a Club, including about membership, billing by
        the Club, events, orders, facilities, conduct, or Club communications,
        is between you and that Club. You agree to direct such disputes to the
        Club and not to Grounds Live.
      </P>

      <H>8. Intellectual Property</H>
      <P>
        The Service, including all software, design, text, graphics, and other
        materials provided by Grounds Live, and all related intellectual
        property rights, are owned by Grounds Live or its licensors and
        protected by law. Club names, logos, and branding belong to the
        respective Clubs. We grant you a limited, non-exclusive, non-transferable,
        revocable license to use the Service for its intended purpose while you
        are an authorized User. No other rights are granted.
      </P>

      <H>9. Third-Party Services and Content</H>
      <P>
        The Service may rely on or link to third-party services, including
        mapping, hosting, messaging, payment, and analytics providers. We do
        not control these third parties and are not responsible for their
        content, practices, or availability. Your use of third-party services is
        governed by their terms.
      </P>

      <H>10. Disclaimer of Warranties</H>
      <Emphatic>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
        WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.
        TO THE FULLEST EXTENT PERMITTED BY LAW, GROUNDS LIVE AND ITS OWNERS,
        MEMBERS, MANAGERS, OFFICERS, PRINCIPALS, FOUNDERS, EMPLOYEES,
        CONTRACTORS, AGENTS, AND AFFILIATES (THE &ldquo;GROUNDS LIVE
        PARTIES&rdquo;) DISCLAIM ALL WARRANTIES, INCLUDING IMPLIED WARRANTIES
        OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND
        NON-INFRINGEMENT.
      </Emphatic>
      <Emphatic>
        THE GROUNDS LIVE PARTIES DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, SECURE, ERROR-FREE, OR ACCURATE, OR THAT ANY CONTENT,
        INCLUDING CLUB CONTENT, AI ASSISTANT OUTPUT, COURSE CONDITIONS, MENUS,
        HOURS, OR EVENT DETAILS, IS CORRECT OR CURRENT. YOU USE THE SERVICE AT
        YOUR OWN RISK.
      </Emphatic>
      <P>
        Some jurisdictions do not allow the exclusion of certain warranties, so
        some of the above may not apply to you.
      </P>

      <H>11. Assumption of Risk; No Reliance for Safety</H>
      <P>
        The Service may display information such as pace of play, course
        conditions, weather, and pin placements for convenience only. This
        information is not a substitute for your own judgment or for
        instructions from your Club or its staff. Golf and club activities
        involve inherent risks. Grounds Live is not responsible for any injury,
        loss, or damage arising from your participation in any activity, your
        presence at any Club, or your reliance on any information in the Service.
      </P>

      <H>12. Data Security and Multi-Club Architecture</H>
      <P>
        The Service uses a multi-tenant architecture in which each Club&rsquo;s
        data is logically separated and access is restricted by club-level
        controls. We take reasonable measures designed to protect data and to
        keep each Club&rsquo;s information separate. No system is perfectly
        secure, and we cannot guarantee that the Service will never experience
        a security incident. To the extent permitted by law, the Grounds Live
        Parties are not liable for unauthorized access, loss, or disclosure of
        data that occurs despite reasonable security measures. We will provide
        any breach notifications required by applicable law.
      </P>

      <H>13. Indemnification</H>
      <P>
        To the fullest extent permitted by law, you agree to defend, indemnify,
        and hold harmless the Grounds Live Parties from and against any and all
        claims, demands, actions, liabilities, damages, losses, judgments,
        settlements, costs, and expenses, including reasonable attorneys&rsquo;
        fees and litigation costs, arising out of or related to:
      </P>
      <ul style={ulStyle}>
        <li style={liStyle}>Your use of or access to the Service.</li>
        <li style={liStyle}>Your violation of these Terms or any applicable law.</li>
        <li style={liStyle}>Your User Content or any content you submit, post, or transmit.</li>
        <li style={liStyle}>Your violation of any right of a third party, including privacy, publicity, or intellectual property rights.</li>
        <li style={liStyle}>Any dispute between you and a Club or between you and another User.</li>
      </ul>
      <P>
        This indemnification runs primarily in favor of the Grounds Live Parties
        and is intended to provide them the broadest protection allowed by law.
      </P>

      <H2>13.1 Claims Arising from Club Conduct</H2>
      <P>
        The Service routes communications according to the preferences and
        consents you set. If a Club sends communications to you that are
        inconsistent with the preferences on file, sends marketing without the
        required opt-in, or otherwise acts outside the scope of your consent or
        in violation of applicable law, that conduct is attributable to the Club
        and not to Grounds Live. Grounds Live Parties are not liable for, and
        you agree not to assert claims against the Grounds Live Parties for, a
        Club&rsquo;s misuse of messaging or other tools, a Club&rsquo;s failure
        to honor your preferences, or a Club&rsquo;s independent violations of
        law. Grounds Live will reasonably cooperate to correct preference and
        routing errors within the Service.
      </P>

      <H2>13.2 Protection for Clubs</H2>
      <P>
        You also agree not to bring claims against the Club through which you
        access the Service, and to hold the Club harmless, for matters arising
        solely from Grounds Live&rsquo;s provision of the Service. This Club
        protection is secondary to the protection of the Grounds Live Parties.
        Because a court may limit a User&rsquo;s obligation to indemnify a Club
        for the Club&rsquo;s own conduct, the primary protections for Clubs
        should also appear in each Club&rsquo;s own membership agreement.
        Counsel should confirm enforceability.
      </P>

      <H>14. Limitation of Liability</H>
      <Emphatic>
        TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL THE GROUNDS
        LIVE PARTIES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
        PROFITS, REVENUE, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING
        OUT OF OR RELATED TO THE SERVICE OR THESE TERMS, WHETHER BASED ON
        CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR ANY OTHER THEORY, AND
        WHETHER OR NOT THE GROUNDS LIVE PARTIES HAVE BEEN ADVISED OF THE
        POSSIBILITY OF SUCH DAMAGES.
      </Emphatic>
      <Emphatic>
        THE TOTAL AGGREGATE LIABILITY OF THE GROUNDS LIVE PARTIES FOR ALL CLAIMS
        ARISING OUT OF OR RELATED TO THE SERVICE OR THESE TERMS WILL NOT EXCEED
        THE GREATER OF (A) THE AMOUNT YOU PAID GROUNDS LIVE, IF ANY, FOR THE
        SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM, OR (B) ONE HUNDRED U.S.
        DOLLARS ($100).
      </Emphatic>
      <P>
        Some jurisdictions do not allow certain limitations, so some of the
        above may not apply to you. In that case, the Grounds Live Parties&rsquo;
        liability is limited to the maximum extent permitted by law.
      </P>

      <H>15. Term and Termination</H>
      <P>
        These Terms apply while you use the Service. You may stop using the
        Service at any time. We or your Club may suspend or terminate your
        access at any time, with or without cause or notice. Sections that by
        their nature should survive termination, including Sections 3, 8, 10,
        11, 12, 13, 14, 16, 17, and 18, will survive.
      </P>

      <H>16. Changes to the Service and These Terms</H>
      <P>
        We may modify the Service or these Terms at any time. If we make
        material changes to these Terms, we will provide notice through the
        Service or by other reasonable means and update the &ldquo;Last
        Updated&rdquo; date. Your continued use after changes take effect means
        you accept the revised Terms. If you do not agree, stop using the Service.
      </P>

      <H>17. Dispute Resolution; Arbitration; Class Action Waiver</H>
      <Emphatic>
        YOU AND GROUNDS LIVE AGREE THAT ANY DISPUTE ARISING OUT OF OR RELATING
        TO THESE TERMS OR THE SERVICE WILL BE RESOLVED BY BINDING INDIVIDUAL
        ARBITRATION, AND NOT IN COURT, EXCEPT THAT EITHER PARTY MAY BRING A
        CLAIM IN SMALL CLAIMS COURT. YOU AND GROUNDS LIVE WAIVE THE RIGHT TO A
        JURY TRIAL AND THE RIGHT TO PARTICIPATE IN A CLASS, COLLECTIVE, OR
        REPRESENTATIVE ACTION.
      </Emphatic>
      <P>
        The arbitration will be administered by an arbitrator chosen by
        Grounds Live or our legal counsel and will take place in Macon County,
        Illinois, or be conducted remotely.
      </P>
      <P>
        You may opt out of this arbitration agreement within 30 days of first
        accepting these Terms by sending written notice to the contact address
        in Section 19, stating your name and that you opt out of arbitration.
        Opting out does not affect the other provisions of these Terms.
      </P>

      <H>18. Governing Law and Venue</H>
      <P>
        These Terms are governed by the laws of the State of Illinois, without
        regard to its conflict of laws rules. Subject to Section 17, any
        dispute not subject to arbitration will be brought exclusively in the
        state or federal courts located in Macon County, Illinois, and you
        consent to their jurisdiction.
      </P>

      <H>19. General; Contact</H>
      <P>
        These Terms, together with the Privacy Policy and any consents and
        terms presented at registration, are the entire agreement between you
        and Grounds Live regarding the Service. If any provision is found
        unenforceable, the rest remains in effect. Our failure to enforce a
        provision is not a waiver. You may not assign these Terms; we may
        assign them. Grounds Live Parties and Clubs are intended third-party
        beneficiaries of the protections written in their favor.
      </P>
      <P>
        Contact: Grounds Live &mdash;{' '}
        <a href="mailto:support@groundslive.com" style={linkStyle}>support@groundslive.com</a>.
      </P>

      <H>Acknowledgment</H>
      <Emphatic>
        BY USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTAND
        THESE TERMS, INCLUDING THE CONSENT AND PREFERENCE PROVISIONS IN
        SECTION 5, THE PRIVACY RIGHTS IN SECTION 6, THE DISCLAIMERS AND
        LIMITATION OF LIABILITY IN SECTIONS 10 AND 14, THE INDEMNIFICATION IN
        SECTION 13, AND THE ARBITRATION AND CLASS ACTION WAIVER IN SECTION 17,
        AND THAT YOU AGREE TO BE BOUND BY THEM.
      </Emphatic>
    </LegalDocLayout>
  );
}

function H({ children }) {
  return (
    <h2 style={{
      fontFamily: '"Playfair Display",serif',
      fontSize: 17,
      fontWeight: 700,
      color: G.text,
      margin: '22px 0 8px',
      lineHeight: 1.25,
    }}>
      {children}
    </h2>
  );
}

function H2({ children }) {
  return (
    <h3 style={{
      fontFamily: '"Playfair Display",serif',
      fontSize: 14,
      fontWeight: 700,
      color: G.text,
      margin: '14px 0 6px',
      letterSpacing: '0.02em',
    }}>
      {children}
    </h3>
  );
}

function P({ children }) {
  return (
    <p style={{
      fontFamily: '"Lora",serif',
      fontSize: 13.5,
      color: G.text,
      margin: '0 0 12px',
      lineHeight: 1.6,
    }}>
      {children}
    </p>
  );
}

function Emphatic({ children }) {
  return (
    <p style={{
      fontFamily: '"Lora",serif',
      fontSize: 12.5,
      color: G.text,
      margin: '0 0 12px',
      lineHeight: 1.55,
      fontWeight: 600,
      letterSpacing: '0.01em',
      padding: '10px 12px',
      background: 'rgba(0,0,0,0.03)',
      borderLeft: `3px solid ${G.green}`,
      borderRadius: 2,
    }}>
      {children}
    </p>
  );
}

const ulStyle = { margin: '0 0 12px 0', padding: '0 0 0 22px' };
const liStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 13.5,
  color: G.text,
  marginBottom: 6,
  lineHeight: 1.55,
};
const linkStyle = { color: G.green, textDecoration: 'underline', textUnderlineOffset: 2 };
