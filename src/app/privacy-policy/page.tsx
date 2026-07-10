"use client";

import styles from "./privacyPolicy.module.css";

/** Static privacy-policy page. Linked from the BookingConfirmDialog
 *  ("refund policy" inline link). Content mirrors the live YP
 *  /privacy-policy page word-for-word — kept inside the app so
 *  the demo flow doesn't have to bounce out to the live site.
 *
 *  Layout matches the live YP reference exactly: NO global navbar,
 *  full-width content with side padding, large title at the top,
 *  body text in a comfortable readable size on a flat dark
 *  background (no glass card / outline). */

export default function PrivacyPolicyPage() {
  return (
    <div className={styles.pagePrivacyPolicy}>
      <main className={styles.main}>
        <h1 className={styles.title}>Privacy Policy</h1>

        <article className={styles.card}>
          <p className={styles.body}>
            Young Professionals Global – Inspiring a New Generation Ltd
            trading as Young Professionals Global take your data rights
            very seriously. The company is compliant with the Data
            Protection Legislation which includes the Data Protection
            Act 2018 and the UK General Data Protection Regulation
            (GDPR) that now binds all UK companies and organisations to
            a standard of performance with respect to any processing of
            personal data including storage, usage and sharing/transmission.
          </p>

          <h2 className={styles.heading}>Scope of Policy</h2>
          <p className={styles.body}>
            This Privacy Policy forms part of our Terms of Use and
            applies to your use of our app and mobile application (the
            App) which is hosted on our private servers. These policies
            come into effect as soon as you provide your personal data
            on our app and / or once you have downloaded and accessed a
            copy of the App onto your mobile device (Device) or
            accessed any of the digital services available through the
            App.
          </p>
          <p className={styles.body}>
            The purpose of this policy is to establish the purpose and
            policies relating to the use of any personal data which we
            collect from you, or that you provide to us in the course
            of your usage.
          </p>
          <p className={styles.body}>
            Young Professionals Global data policies are created to be
            fully compliant with the Data Protection Act 2018 and the
            EU General Data Protection Regulation 2016/679 – &ldquo;GDPR&rdquo;
            (&ldquo;Your Data Protection&rdquo;).
          </p>
          <p className={styles.body}>
            The Data Controller is Young Professionals Global –
            Inspiring a New Generation Ltd (trading as Young
            Professionals Global), registered in the United Kingdom.
          </p>
          <p className={styles.body}>
            <strong>Registered address:</strong>
            <br />
            <a
              className={styles.addressLink}
              href="https://www.google.com/maps/search/?api=1&query=15th+Floor%2C+6+Bevis+Marks%2C+London+EC3A+7BA"
              target="_blank"
              rel="noopener noreferrer"
            >
              15th Floor, 6 Bevis Marks, London EC3A 7BA
            </a>
          </p>
          <p className={styles.body}>
            <strong>Company number:</strong> 09719565
          </p>
          <p className={styles.body}>
            Any employers accessing our services, that we provide your
            data to, may also be considered data controllers for the
            purpose of the Data Protection Legislation. In this
            situation, the use of your personal data will be subject to
            the privacy policy of that employer.
          </p>

          <h2 className={styles.heading}>
            Information We May Collect From You Includes
          </h2>
          <p className={styles.body}>
            All personal data you provided us on our app or in the
            course of use of the App (Submitted information): you may
            provide us with information about you by completing forms
            on the app or the App, or via other communications (for
            example, by email or chat).
          </p>
          <ul className={styles.list}>
            <li>Register to use our App</li>
            <li>Download our App</li>
            <li>Subscribe to or use our interactive services</li>
            <li>Conduct an in-App purchase</li>
            <li>Share or transmit data through the App&apos;s social media links</li>
            <li>Participate in competitions, surveys or promotions</li>
            <li>Reporting user issues within the App</li>
          </ul>

          <p className={styles.body}>
            <strong>The information you give us may include:</strong>
          </p>
          <ul className={styles.list}>
            <li>Your name</li>
            <li>Date of birth</li>
            <li>Ethnicity, Gender, your Socio Economic or Social Mobility status</li>
            <li>Your address or postcode</li>
            <li>Phone number</li>
            <li>Your email</li>
            <li>Your contact telephone number</li>
            <li>Your nationality</li>
            <li>Your preferred work location</li>
            <li>Your education</li>
            <li>Disabilities (if any)</li>
            <li>Previous addresses and postcodes</li>
            <li>Your interests and extra-curricular activities</li>
            <li>Any other skills</li>
            <li>Schools attended</li>
            <li>University attended</li>
            <li>Education stage and timing</li>
            <li>First and acquired languages spoken</li>
            <li>Work visa requirements</li>
            <li>Your prior work experience</li>
            <li>Your high school qualification and results</li>
            <li>Degree subjects studied</li>
            <li>Degree results</li>
            <li>Your interests</li>
            <li>Results of any psychometric testing</li>
            <li>Selected username and password for the App</li>
          </ul>

          <p className={styles.body}>
            We will keep records of any communications with you.
          </p>

          <h2 className={styles.heading}>Special Category Personal Data</h2>
          <p className={styles.body}>
            Special Category personal data is collected for monitoring
            purposes.
          </p>

          <h2 className={styles.heading}>
            Information We May Store About You and Your Device
          </h2>
          <p className={styles.body}>
            Each time you use the App our system automatically collects
            important information about your device which will include
            the type of mobile device you use, your mobile network,
            your mobile device&apos;s operating system, which mobile browser
            is being used and your time zone setting as well as your
            unique device identifier such as your IMEI number, MAC
            address of the Device&apos;s wireless network interface, or
            mobile phone number (Device Information). We may also store
            details of your usage of the App including traffic and
            location data (Log Information).
          </p>

          <h2 className={styles.heading}>How We Use the Information</h2>
          <p className={styles.body}>
            <strong>Submitted Information:</strong>
            <br />
            Your information may be shared with third party employers
            to filter and select potential candidates that they wish to
            contact regarding potential employment or to contact you.
            Prospective employers may send you push notification
            messages through the App.
          </p>
          <p className={styles.body}>
            <strong>Device Information and Log Information:</strong>
            <br />
            Helps us to learn how you use the App, so that we can
            optimise it for your use.
          </p>
          <p className={styles.body}>
            We may combine or associate categories of your information
            with any other category but still treat the information as
            personal data in accordance with this policy for as long as
            it is combined. We do not release or share your personal
            information with anyone other than employers using the App
            or our services. We may analyse group information about
            our users to better understand usage trends. We may use
            your data to target an audience that fits your data
            characteristics.
          </p>
          <p className={styles.body}>
            Your personal data is collated and stored to ensure your
            efficient use of our App and the associated services. In
            using our App you will be required to provide your explicit
            consent to the following use of your personal data:
          </p>
          <ul className={styles.list}>
            <li>
              Contact by us for the administration of the services
              provided by our App, to invite you to events and to
              provide you with information regarding the service and
              its associated services.
            </li>
            <li>
              The provision of your personal data to interested third
              party employers who are advertising job roles via our App.
            </li>
            <li>
              In response to Talent Spots and other tools associated
              with using our App.
            </li>
            <li>
              To aggregate your personal data with others&apos; personal
              data into a non-identifiable form in order to carry out
              analysis of our users for internal business purposes.
            </li>
          </ul>

          <h2 className={styles.heading}>Disclosure of Your Information</h2>
          <p className={styles.body}>
            We may disclose all the Submitted Information we collect
            from you when you register or use our App to the
            third-party employers but also to other third parties in
            the event of a sale, merger or other transfer of ownership
            of Young Professionals Global or to comply with any
            statutory demands, obligations or legal requests.
          </p>
          <p className={styles.body}>
            We may have to disclose your information to enforce or
            reasonably apply our Terms of Services and other agreements
            or to protect the rights, property or safety of our company
            and customers such as for the purposes of fraud protection
            and credit risk prevention or where we have legal grounds
            to do so.
          </p>

          <h2 className={styles.heading}>Where We Store Your Personal Data</h2>
          <p className={styles.body}>
            The data that we collect from you is transferred to, and
            stored at, a destination within the cloud server services
            provided by Amazon AWS. It is processed by staff employed
            by and managed by Amazon as our data processors. By using
            our App and services and providing us with your personal
            data, you agree to the transfer, storage and analysis of
            your personal data.
          </p>

          <h2 className={styles.heading}>Security</h2>
          <p className={styles.body}>
            Young Professionals Global make every effort to comply
            fully with the Data Protection Legislation and to ensure
            that your personal data is managed in accordance with this
            privacy policy.
          </p>
          <p className={styles.body}>
            The transfer of any information via the internet is not
            completely secure. Young Pro Web cannot guarantee the
            security of your data transmitted to the App or app.
            During the actual transfer of the data, data loss or theft
            is at your own risk. Once Young Professionals Global
            receive your information, we follow strict protocols and
            security measures to prevent unauthorised access.
          </p>
          <p className={styles.body}>
            We will collect and store your personal data on your
            Device using various technologies such as application data
            caches and browser web storage.
          </p>
          <p className={styles.body}>
            If you are using a password that enables you to access
            certain parts of our App, you are responsible for the
            security of the password.
          </p>

          <h2 className={styles.heading}>
            Accessing, Correcting and Restricting Your Data
          </h2>
          <p className={styles.body}>
            The Data Protection Legislation clearly provide you with
            the right to access your personal data, amend, erase or
            update it or request that we restrict our processing
            activities of your data. Should you wish to exercise these
            rights or have any concerns about how your data is being
            used please make any request to:
            <br />
            <a
              className={styles.contactLink}
              href="mailto:info@young-professionals.uk"
            >
              info@young-professionals.uk
            </a>
          </p>
          <p className={styles.body}>
            When collecting your data, we state if we intend to use
            your data for any external purposes or if we intend to
            disclose your information to any third party for such
            purposes. You will be required to provide your consent to
            the processing of your Submitted Data by checking certain
            options in our App.
          </p>
          <p className={styles.body}>
            If you follow a link from our app or app to any partner,
            affiliated or advertiser related apps, please note that
            these apps and services that you may access through them
            operate under their own privacy policies. Please check all
            policies before you submit your personal information to
            these apps or use their services and this includes contact
            information, permissions and location information.
          </p>

          <h2 className={styles.heading}>Access to Information</h2>
          <p className={styles.body}>
            The Data Protection Legislation gives you the right to
            access information held about you and Young Professionals
            Global will comply with all data requests within the
            regulated one calendar month.
          </p>
          <p className={styles.body}>
            Please make requests to:
            <br />
            <a
              className={styles.contactLink}
              href="mailto:info@young-professionals.uk"
            >
              info@young-professionals.uk
            </a>
          </p>

          <h2 className={styles.heading}>
            Amendments to the Young Professionals Global Policy
          </h2>
          <p className={styles.body}>
            Amendments will first be updated here in our Privacy Terms.
            If required, we will update our users by email or when you
            next start our App, of significant changes or any impact to
            your privacy interests and rights including requirements to
            obtain revised or additional consent from you regarding
            collection, transfer and processing of your personal data.
            You may be required to read and approve them to continue
            your use of our App or the Services.
          </p>

          <h2 className={styles.heading}>Contact</h2>
          <p className={styles.body}>
            All questions, suggestions and requests concerning the
            Young Professionals Global Privacy Policy are very welcome.
          </p>
          <p className={styles.body}>
            <strong>General contact:</strong>
            <br />
            <a
              className={styles.contactLink}
              href="mailto:info@young-professionals.uk"
            >
              info@young-professionals.uk
            </a>
          </p>

          <p className={styles.footer}>
            Young Professionals Global: Updated December 2025
          </p>
        </article>
      </main>
    </div>
  );
}
