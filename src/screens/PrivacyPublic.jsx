// PrivacyPublic — public /privacy route. Anyone can read the canonical
// Privacy Policy without an account. Linked from the Terms of Use, the
// TermsGate, signup screens, and Settings.
//
// Source: docs/Grounds-Live-Privacy-Policy.docx (Version 1, 2026-06-09).
import { G } from '../theme.js';
import { CURRENT_PRIVACY_VERSION, CURRENT_PRIVACY_DATE } from '../lib/terms.js';
import { PLATFORM_NAME } from '../lib/version.js';
import LegalDocLayout from '../components/LegalDocLayout.jsx';

export default function PrivacyPublic() {
  return (
    <LegalDocLayout
      brand={PLATFORM_NAME}
      title="Privacy Policy"
      versionLabel={`Version ${CURRENT_PRIVACY_VERSION} · effective ${CURRENT_PRIVACY_DATE}`}
    >
      <H>1. Introduction</H>
      <P>
        This Privacy Policy explains how Grounds Live (&ldquo;Grounds Live,&rdquo;
        &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects,
        uses, shares, and protects personal information when you use our member
        engagement platform (the &ldquo;Service&rdquo;).
      </P>
      <P>
        The Service is provided to private clubs and golf courses (each, a
        &ldquo;Club&rdquo;) and made available to their members, guests, and
        authorized users (&ldquo;you&rdquo;). This Policy works alongside our{' '}
        <a href="/terms" style={linkStyle}>Terms of Use</a>, which it is part
        of by reference.
      </P>
      <P>
        Please read this Policy together with Section 3 below, which explains
        the roles of Grounds Live and your Club. Your Club also handles your
        information under its own practices.
      </P>

      <H>2. A Quick Summary</H>
      <P><i>This summary is for convenience. The full Policy controls.</i></P>
      <ul style={ulStyle}>
        <li style={liStyle}>We collect the information you provide (like your name, email, and optional phone number), information about how you use the Service, and content you post.</li>
        <li style={liStyle}>We use it to operate the Service, support your Club, keep accounts secure, and, only with your opt-in, send marketing.</li>
        <li style={liStyle}>Your Club can see its own members&rsquo; information. That is how the Service works.</li>
        <li style={liStyle}>We do not sell your personal information for money.</li>
        <li style={liStyle}>Marketing email and text messages are opt-in. You can change your choices any time in member settings.</li>
        <li style={liStyle}>You have privacy rights depending on where you live, including in California. Section 9 explains how to use them.</li>
      </ul>

      <H>3. The Roles of Grounds Live and Your Club</H>
      <P>
        The Service is multi-tenant: each Club&rsquo;s data is separated, and a
        Club can access information about its own members, guests, and their
        activity within the Club.
      </P>
      <P>
        For information processed to run the platform as a whole, Grounds Live
        acts as the controller, meaning we decide how that information is
        handled at the platform level. For information specific to a Club&rsquo;s
        relationship with its members, your Club is a controller of that
        information and makes its own decisions about how it uses it. In some
        cases Grounds Live and a Club act as joint or independent controllers
        of the same information.
      </P>
      <P>
        Grounds Live is not responsible for how a Club uses information once
        the Club accesses it, including a Club&rsquo;s own communications,
        record-keeping, or decisions. Questions about a Club&rsquo;s specific
        practices should be directed to that Club. This allocation of roles is
        described further in our Terms of Use.
      </P>

      <H>4. Information We Collect</H>

      <H2>4.1 Information you provide</H2>
      <ul style={ulStyle}>
        <li style={liStyle}><b>Account information:</b> name, email address, and, if you choose to provide it, mobile phone number. The phone number is optional.</li>
        <li style={liStyle}><b>Profile information:</b> any details you add to your member profile.</li>
        <li style={liStyle}><b>Content you submit:</b> messages, board posts, event responses, and similar User Content.</li>
        <li style={liStyle}><b>Transactions within the Service:</b> food and beverage orders, event registrations, and related details. No payment information is exchanged by or through Grounds Live. Your club handles all payments independently.</li>
        <li style={liStyle}><b>Communications with us:</b> support requests and related correspondence.</li>
      </ul>

      <H2>4.2 Information collected automatically</H2>
      <ul style={ulStyle}>
        <li style={liStyle}><b>Usage data:</b> features used, pages viewed, actions taken, and timestamps.</li>
        <li style={liStyle}><b>Device and technical data:</b> device type, operating system, browser, IP address, and similar identifiers.</li>
        <li style={liStyle}><b>Approximate location:</b> derived from your device or IP, and, where you use mapping or course features, location relevant to that feature.</li>
        <li style={liStyle}><b>Cookies and similar technologies:</b> as described in Section 8.</li>
      </ul>

      <H2>4.3 Information from your Club</H2>
      <P>
        Your Club may provide information about you to set up or manage your
        access, such as your membership status and contact details.
      </P>

      <H>5. How We Use Information</H>
      <P>We use personal information to:</P>
      <ul style={ulStyle}>
        <li style={liStyle}>Provide, operate, and maintain the Service.</li>
        <li style={liStyle}>Create and manage your account and authenticate access.</li>
        <li style={liStyle}>Enable Club features, including letting your Club manage its members and communicate with them consistent with your preferences.</li>
        <li style={liStyle}>Process food orders and event registrations through the Service.</li>
        <li style={liStyle}>Send service and transactional messages, such as security, account, order, and event notices.</li>
        <li style={liStyle}>Send marketing email and text messages, only if you have opted in, and honor your opt-out choices.</li>
        <li style={liStyle}>Maintain security, prevent fraud and abuse, and enforce our Terms.</li>
        <li style={liStyle}>Analyze and improve the Service.</li>
        <li style={liStyle}>Comply with legal obligations and respond to lawful requests.</li>
      </ul>
      <P>
        We rely on the lawful bases of performing our agreement with you, your
        consent (for marketing and any optional features), our legitimate
        interests in operating and securing the Service, and compliance with
        law, as applicable.
      </P>

      <H>6. How We Share Information</H>
      <P>We share personal information in these circumstances:</P>
      <ul style={ulStyle}>
        <li style={liStyle}><b>With your Club.</b> Your Club can access information about its own members and guests, including profile details, activity in the Service, orders, and event participation. This is a core function of the Service.</li>
        <li style={liStyle}><b>With service providers (processors).</b> We use vendors that process information on our behalf, such as hosting and database infrastructure, content delivery, mapping, email and text message delivery, and analytics. They may process information only to provide services to us.</li>
        <li style={liStyle}><b>For legal and safety reasons.</b> When required by law, legal process, or to protect the rights, safety, or property of Grounds Live, our users, the Clubs, or the public.</li>
        <li style={liStyle}><b>In a business transfer.</b> In connection with a merger, acquisition, financing, or sale of assets, subject to this Policy.</li>
        <li style={liStyle}><b>With your direction or consent.</b> When you ask us to share information or otherwise consent.</li>
      </ul>
      <P>
        We do not sell your personal information for money. To the extent any
        sharing is considered a &ldquo;sale&rdquo; or &ldquo;sharing&rdquo;
        under certain state laws, Section 9 explains your right to opt out.
      </P>

      <H>7. Communications and Your Choices</H>
      <P>
        Service and transactional messages are necessary to operate the Service
        and cannot be turned off while your account is active, although you can
        manage non-essential push notifications in your device or member
        settings.
      </P>
      <P>Marketing email and text messages are opt-in. You can change your choices at any time:</P>
      <ul style={ulStyle}>
        <li style={liStyle}>In member settings, toggle email marketing and text marketing on or off independently.</li>
        <li style={liStyle}>Reply STOP to any marketing text to stop marketing texts. Reply HELP for help.</li>
        <li style={liStyle}>Use the unsubscribe link in any marketing email.</li>
      </ul>
      <P>
        Marketing text consent is never a condition of creating an account,
        making a purchase, or using the Service. Message and data rates may
        apply. We keep records of consent and opt-out activity.
      </P>

      <H>8. Cookies and Similar Technologies</H>
      <P>
        We use cookies and similar technologies to keep you logged in, remember
        preferences, maintain security, and understand how the Service is used.
        You can control cookies through your browser settings. Some features
        may not work properly without certain cookies.
      </P>

      <H>9. Your Privacy Rights</H>
      <P>
        The rights available to you depend on where you live. To exercise any
        right, use the controls in member settings or contact us using
        Section 13. We will verify your request as required by law before
        responding, and we will not discriminate against you for exercising your
        rights.
      </P>

      <H2>9.1 Controls available to everyone</H2>
      <P>
        Regardless of where you live, you can access and update your account
        information, manage your marketing choices, and request access to or
        deletion of your account information through member settings or by
        contacting us.
      </P>

      <H2>9.2 California residents</H2>
      <P>
        Under the California Consumer Privacy Act, as amended by the California
        Privacy Rights Act (&ldquo;CCPA&rdquo;), California residents have the
        right to:
      </P>
      <ul style={ulStyle}>
        <li style={liStyle}>Know and access the personal information we collect, use, and disclose.</li>
        <li style={liStyle}>Request deletion of personal information, subject to exceptions.</li>
        <li style={liStyle}>Correct inaccurate personal information.</li>
        <li style={liStyle}>Opt out of the sale or sharing of personal information.</li>
        <li style={liStyle}>Limit the use of sensitive personal information, where applicable.</li>
        <li style={liStyle}>Not be discriminated against for exercising these rights.</li>
      </ul>
      <P>
        We do not sell personal information for money. To the extent any sharing
        qualifies as a &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; under the
        CCPA, you may opt out by contacting us as described in Section 13 or
        using any opt-out control we provide. You may use an authorized agent
        to submit requests.
      </P>

      <H2>9.3 Other U.S. state privacy laws</H2>
      <P>
        Residents of Virginia, Colorado, Connecticut, Utah, and other states
        with comprehensive privacy laws, as they take effect, may have similar
        rights to access, correct, delete, and opt out of certain processing,
        and to appeal a denied request. We honor applicable rights.
      </P>

      <H>10. Age Requirement; No Use by Minors</H>
      <P>
        The Service is intended only for adults. You must be at least 18 years
        old to create an account or use the Service. During registration, we
        require you to confirm that you are 18 or older.
      </P>
      <P>
        We do not knowingly collect personal information from anyone under 18.
        Where a Club has junior members under 18 (for example, a junior
        golfer), an adult parent or legal guardian holds and manages the
        account, and the minor does not have a separate account or login.
      </P>
      <P>
        If we learn that we have collected personal information from someone
        under 18, we will delete that information and close any associated
        account. If you believe a minor has provided us personal information,
        contact us using Section 13.
      </P>

      <H>11. Data Retention and Security</H>
      <P>
        We retain personal information for as long as your account is active
        and as needed to provide the Service, comply with legal obligations,
        resolve disputes, and enforce our agreements. When information is no
        longer needed, we take steps to delete or de-identify it.
      </P>
      <P>
        We use a multi-tenant architecture in which each Club&rsquo;s data is
        separated and access is restricted by club-level controls, along with
        other reasonable administrative and technical measures designed to
        protect personal information. No system is perfectly secure, and we
        cannot guarantee absolute security. We will provide any breach
        notifications required by applicable law.
      </P>

      <H>12. International Users and Data Location</H>
      <P>
        The Service is operated from the United States, and information is
        processed and stored in the United States and in locations used by our
        service providers. If you access the Service from outside the United
        States, you understand that your information will be processed in the
        United States, where privacy laws may differ from those in your
        location.
      </P>

      <H>13. How to Contact Us and Exercise Rights</H>
      <P>To ask a question about this Policy or to exercise a privacy right, contact us at:</P>
      <P>
        Grounds Live &mdash;{' '}
        <a href="mailto:contactus@groundslive.com" style={linkStyle}>contactus@groundslive.com</a>.
      </P>
      <P>For requests about how a specific Club uses your information, contact that Club directly.</P>

      <H>14. Changes to This Policy</H>
      <P>
        We may update this Policy from time to time. If we make material
        changes, we will provide notice through the Service or by other
        reasonable means and update the &ldquo;Last Updated&rdquo; date. Your
        continued use of the Service after changes take effect means you accept
        the updated Policy.
      </P>
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

const ulStyle = { margin: '0 0 12px 0', padding: '0 0 0 22px' };
const liStyle = {
  fontFamily: '"Lora",serif',
  fontSize: 13.5,
  color: G.text,
  marginBottom: 6,
  lineHeight: 1.55,
};
const linkStyle = { color: G.green, textDecoration: 'underline', textUnderlineOffset: 2 };
