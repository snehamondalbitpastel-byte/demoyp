"use client";

import { useEffect, useState } from "react";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type {
  Stripe,
  StripeElementChangeEvent,
  StripeCardNumberElementChangeEvent,
} from "@stripe/stripe-js";
import PhoneInput, { type Value as PhoneValue } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import styles from "./PaymentModal.module.css";

/**
 * Payment modal — Stripe PaymentSheet / Link checkout look-alike,
 * now wired through real Stripe Elements (`@stripe/react-stripe-js`).
 *
 * Flow:
 *   1. Parent POSTs `/event/create-booking`, receives a Stripe
 *      `client_secret` + `booking_id`, opens this modal with
 *      `clientSecret={client_secret}`.
 *   2. Card data is collected via Stripe `<CardNumberElement>` /
 *      `<CardExpiryElement>` / `<CardCvcElement>` — the actual card
 *      values never touch our code (PCI scope is Stripe's).
 *   3. On Pay, the modal calls `stripe.confirmCardPayment(clientSecret,
 *      { payment_method: { card, billing_details } })`.
 *   4. On success, the modal fires `onPaymentSuccess()` so the parent
 *      can POST `/event/confirm-payment` with the booking_id it
 *      already has, patch local state to the booked surface, and
 *      close the modal.
 *   5. On failure, the Stripe error message renders inline above
 *      the action row; the modal stays open so the viewer can
 *      retry without losing the rest of their entered info.
 *
 * Visual styling matches the live YP / Stripe PaymentSheet shots
 * exactly: brand badge strip (Visa / MC / Amex / Discover all
 * visible at full opacity, the matched brand gets a cyan ring),
 * collapsible Link checkout strip with email field, country
 * dropdown, gradient Pay pill. Stripe Elements are themed via the
 * `style.base` option so the iframe text reads in the same Plus
 * Jakarta Sans / 14px / white treatment as the rest of the form.
 */

const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

// Singleton — `loadStripe` should run exactly once, so we cache
// the promise at module scope. If the publishable key is missing
// we keep `stripePromise` null and render a config-error inside
// the modal so the viewer isn't dropped onto a blank surface.
const stripePromise: Promise<Stripe | null> | null = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

type PaymentModalProps = {
  open: boolean;
  /** Pre-formatted total amount string ("£1250.00") used in the Pay
   *  button label. */
  totalAmount: string;
  /** Stripe PaymentIntent client_secret returned by
   *  `/event/create-booking`. Required for the in-page card
   *  confirmation. `null` while the create-booking POST is in
   *  flight (the modal renders a loading state). */
  clientSecret: string | null;
  /** While `true`, the form is disabled — used by the parent to
   *  guard against double-submit while `/event/confirm-payment` is
   *  in flight after Stripe resolves. */
  loading?: boolean;
  onCancel: () => void;
  /** Fires once `stripe.confirmCardPayment` returns a succeeded
   *  PaymentIntent. The parent is expected to drive the rest of
   *  the booking lifecycle (POST `/confirm-payment`, patch local
   *  state, close modal). */
  onPaymentSuccess: () => void | Promise<void>;
};

/** Country list — kept short; covers the main YP markets. */
const COUNTRIES: Array<{ code: string; label: string }> = [
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "IN", label: "India" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "IE", label: "Ireland" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" },
  { code: "SG", label: "Singapore" },
  { code: "AE", label: "United Arab Emirates" },
];

type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "unknown";

/** Map Stripe's brand string to the union we render in the badge
 *  strip. Stripe also returns "unionpay" / "jcb" / "diners" — we
 *  collapse those to "unknown" since the badge strip only shows
 *  the four supported brands. */
function normaliseBrand(raw: string | undefined): CardBrand {
  switch (raw) {
    case "visa":
      return "visa";
    case "mastercard":
      return "mastercard";
    case "amex":
      return "amex";
    case "discover":
      return "discover";
    default:
      return "unknown";
  }
}

/** Compact horizontal strip of the four brand badges. Mirrors the
 *  live Stripe PaymentSheet treatment: every supported brand is
 *  visible at full opacity at all times so the viewer always knows
 *  which cards work; the brand the typed digits resolve to gets a
 *  cyan ring + lift. The `active` brand is fed in by the
 *  `CardNumberElement.onChange` handler, which Stripe fires every
 *  keystroke with the resolved `brand` field. */
function CardBrandStrip({ active }: { active: CardBrand }) {
  const brandClass: Record<Exclude<CardBrand, "unknown">, string> = {
    visa: styles.brand_visa,
    mastercard: styles.brand_mastercard,
    amex: styles.brand_amex,
    discover: styles.brand_discover,
  };
  const renderBadge = (key: Exclude<CardBrand, "unknown">) => {
    const isActive = active === key;
    const cls = `${styles.brandBadge} ${brandClass[key]} ${
      isActive ? styles.brandBadgeActive : ""
    }`;
    if (key === "visa") {
      return (
        <span key={key} className={cls} aria-label="Visa">
          <span className={styles.visaWord}>VISA</span>
        </span>
      );
    }
    if (key === "mastercard") {
      return (
        <span key={key} className={cls} aria-label="Mastercard">
          <span className={styles.mcCircles} aria-hidden="true">
            <span className={styles.mcRed} />
            <span className={styles.mcYellow} />
          </span>
        </span>
      );
    }
    if (key === "amex") {
      return (
        <span key={key} className={cls} aria-label="American Express">
          <span className={styles.amexWord}>AMEX</span>
        </span>
      );
    }
    return (
      <span key={key} className={cls} aria-label="Discover">
        <span className={styles.discoverWord}>DISCOVER</span>
      </span>
    );
  };
  return (
    <div className={styles.brandStrip} aria-hidden="true">
      {(["visa", "mastercard", "amex", "discover"] as const).map((k) =>
        renderBadge(k)
      )}
    </div>
  );
}

/** Stripe's official Link wordmark SVG (the green play-button +
 *  white "link" letterform). Inlined verbatim from the live
 *  Stripe assets so we never touch the path data. The size is
 *  controlled by the parent via the `className` we attach — the
 *  SVG itself uses height="100%" so it scales to whatever wrap
 *  it sits inside. */
function LinkLogo({ className }: { className?: string }) {
  return (
    <svg
      overflow="visible"
      viewBox="0 0 72 24"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      focusable="false"
      fill="#fff"
      opacity="0.3"
      className={className}
    >
      <path d="M36.12 3.68a2.07 2.07 0 0 1 4.14 0c0 1.12-.92 2.07-2.07 2.07a2.06 2.06 0 0 1-2.07-2.07M29.98 1.92h3.6v20.16h-3.6zM40 7.68h-3.62v14.4H40zM66.1 14.39a12 12 0 0 0 5.32-6.71h-3.63a8.9 8.9 0 0 1-5.5 5V1.93h-3.63v20.16h3.63v-6c2.77.7 4.96 3.09 5.7 6h3.66c-.56-3.06-2.65-5.91-5.55-7.69M46.44 9.3a5.7 5.7 0 0 1 4.3-2 5 5 0 0 1 5.13 5.14v9.64h-3.63v-8.84c0-1.27-.56-2.74-2.4-2.74-2.16 0-3.4 1.92-3.4 4.16v7.42H42.8V7.7h3.63zM12 24a12 12 0 1 0 0-24 12 12 0 0 0 0 24"></path>
      <path fill="#000" d="M11.45 4.8h-3.7A12 12 0 0 0 13.2 12a12 12 0 0 0-5.45 7.2h3.7a8.6 8.6 0 0 1 6.57-5.7v-3a8.5 8.5 0 0 1-6.57-5.7"></path>
    </svg>
  );
}

/** Colored variant of the Stripe Link wordmark — used in the
 *  LinkInfoModal header where the brand mark renders in full
 *  color: green circle + dark interior arrow + white "link"
 *  letterform. Path geometry is byte-identical to `LinkLogo`
 *  above; we just split the consolidated subpaths so each shape
 *  can carry its own fill (the brand colors aren't expressible
 *  with a single fill on the consolidated path). */
function LinkLogoColored({ className }: { className?: string }) {
  return (
    <svg
      overflow="visible"
      viewBox="0 0 72 24"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      focusable="false"
      className={className}
    >
      {/* Green circle (the "▸" enclosure). */}
      <path
        fill="#00d66f"
        d="M12 24a12 12 0 1 0 0-24 12 12 0 0 0 0 24"
      />
      {/* Dark interior play-arrow shape, sits on top of the circle. */}
      <path
        fill="#011e0f"
        d="M11.45 4.8h-3.7A12 12 0 0 0 13.2 12a12 12 0 0 0-5.45 7.2h3.7a8.6 8.6 0 0 1 6.57-5.7v-3a8.5 8.5 0 0 1-6.57-5.7"
      />
      {/* White "link" letterform — the letter subpaths from the
          original consolidated path. */}
      <path
        fill="#ffffff"
        d="M36.12 3.68a2.07 2.07 0 0 1 4.14 0c0 1.12-.92 2.07-2.07 2.07a2.06 2.06 0 0 1-2.07-2.07M29.98 1.92h3.6v20.16h-3.6zM40 7.68h-3.62v14.4H40zM66.1 14.39a12 12 0 0 0 5.32-6.71h-3.63a8.9 8.9 0 0 1-5.5 5V1.93h-3.63v20.16h3.63v-6c2.77.7 4.96 3.09 5.7 6h3.66c-.56-3.06-2.65-5.91-5.55-7.69M46.44 9.3a5.7 5.7 0 0 1 4.3-2 5 5 0 0 1 5.13 5.14v9.64h-3.63v-8.84c0-1.27-.56-2.74-2.4-2.74-2.16 0-3.4 1.92-3.4 4.16v7.42H42.8V7.7h3.63z"
      />
    </svg>
  );
}

/** Second-layer "Pay quickly, shop confidently" promotional modal.
 *  Opens when the viewer clicks any "▸ link" wordmark inside the
 *  PaymentModal — mirrors Stripe's own info popup that's reachable
 *  from the same affordance on the live PaymentSheet. Surfaces:
 *    • The Link logo (top-left) + an X close (top-right).
 *    • Heading "Pay quickly, shop confidently".
 *    • Three feature bullets (icon + title + body).
 *    • Privacy / Cookies text-links in the footer.
 *  Renders above the parent PaymentModal via a higher z-index so
 *  it sits as an actual second-layer dialog rather than dimming
 *  the form behind it twice. */
function LinkInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className={styles.linkInfoOverlay} onClick={onClose}>
      <div
        className={styles.linkInfoModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="About Link"
      >
        <div className={styles.linkInfoTopRow}>
          <span className={styles.linkInfoLogo}>
            <LinkLogoColored className={styles.linkInfoLogoSvg} />
          </span>
          <button
            type="button"
            className={styles.linkInfoClose}
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <h2 className={styles.linkInfoHeading}>
          Pay quickly,
          <br />
          shop confidently
        </h2>

        <ul className={styles.linkInfoFeatures}>
          <li className={styles.linkInfoFeature}>
            <span className={styles.linkInfoFeatureIcon} aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <div>
              <h4 className={styles.linkInfoFeatureTitle}>Fast and simple</h4>
              <p className={styles.linkInfoFeatureBody}>
                Autofill your payment, contact, and shipping details at
                checkout.
              </p>
            </div>
          </li>
          <li className={styles.linkInfoFeature}>
            <span className={styles.linkInfoFeatureIcon} aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </span>
            <div>
              <h4 className={styles.linkInfoFeatureTitle}>
                Multiple ways to pay
              </h4>
              <p className={styles.linkInfoFeatureBody}>
                Choose from your favorite cards or bank account.
              </p>
            </div>
          </li>
          <li className={styles.linkInfoFeature}>
            <span className={styles.linkInfoFeatureIcon} aria-hidden="true">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 1 1 8 0v4" />
              </svg>
            </span>
            <div>
              <h4 className={styles.linkInfoFeatureTitle}>Protects your data</h4>
              <p className={styles.linkInfoFeatureBody}>
                Shop safely knowing your information is encrypted.
              </p>
            </div>
          </li>
        </ul>

        <div className={styles.linkInfoFooter}>
          <a
            href="https://link.com/in/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkInfoFooterLink}
          >
            Privacy
          </a>
          <a
            href="https://link.com/in/legal/cookies"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkInfoFooterLink}
          >
            Cookies
          </a>
        </div>
      </div>
    </div>
  );
}

/** Style options handed to every Stripe Element — keeps the iframe
 *  text in the same Plus Jakarta Sans / 14px / white treatment as
 *  the surrounding form so the swap from plain inputs to Stripe
 *  iframes is invisible to the viewer. */
const STRIPE_ELEMENT_OPTIONS = {
  style: {
    base: {
      iconColor: "rgba(255, 255, 255, 0.55)",
      color: "#ffffff",
      fontFamily:
        'var(--font-plus-jakarta-sans), "Plus Jakarta Sans", sans-serif',
      fontWeight: "500",
      fontSize: "14px",
      letterSpacing: "0.2px",
      "::placeholder": {
        color: "rgba(255, 255, 255, 0.4)",
      },
    },
    invalid: {
      iconColor: "#ff7575",
      color: "#ff7575",
    },
  },
} as const;

type PaymentFormProps = {
  totalAmount: string;
  clientSecret: string | null;
  loading: boolean;
  onCancel: () => void;
  onPaymentSuccess: () => void | Promise<void>;
};

/** Inner form. Lives inside `<Elements>` so it can call the
 *  `useStripe` / `useElements` hooks. Holds all the per-field
 *  validation state, brand detection, link-strip toggle, and
 *  drives the actual `confirmCardPayment` call on Pay. */
function PaymentForm({
  totalAmount,
  clientSecret,
  loading,
  onCancel,
  onPaymentSuccess,
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  // Field-level state. Stripe Elements handle input formatting +
  // validation natively; we just track whether each field is
  // "complete" (a synonym for valid + non-empty), the resolved
  // card brand, and any error text Stripe pushed into onChange so
  // the form can disable Pay until the whole card section is good.
  const [country, setCountry] = useState("GB");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");

  // Second-layer "Pay quickly, shop confidently" modal — opens
  // when the viewer clicks any "▸ link" wordmark inside the form.
  const [linkInfoOpen, setLinkInfoOpen] = useState(false);

  // Optional Link signup form — auto-opens the moment the security
  // code becomes complete. Mirrors Stripe PaymentSheet's
  // "Save my information for faster checkout" panel: email + mobile
  // number (international, UK default) + full name. All three
  // fields are optional and forwarded to Stripe as
  // billing_details on `confirmCardPayment` for receipt purposes
  // when filled, ignored when blank.
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState<string>("");
  const [signupFullName, setSignupFullName] = useState("");

  const [numberComplete, setNumberComplete] = useState(false);
  const [expiryComplete, setExpiryComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);
  const [brand, setBrand] = useState<CardBrand>("unknown");

  // Stripe Elements load asynchronously (each iframe needs to
  // boot inside the modal). Track each Element's `onReady` and
  // only consider the form "ready" once all three card-related
  // Elements have signalled. While !ready, we render a skeleton
  // overlay so the viewer never sees half-mounted card fields
  // for the brief boot window. The real form is mounted in the
  // background the whole time so the iframes can finish loading
  // — we just hide it visually with opacity until ready.
  const [numberReady, setNumberReady] = useState(false);
  const [expiryReady, setExpiryReady] = useState(false);
  const [cvcReady, setCvcReady] = useState(false);
  const elementsReady = numberReady && expiryReady && cvcReady;

  // Auto-open the optional signup section the first time CVC
  // becomes complete (matches the live Stripe PaymentSheet
  // behaviour). Once the viewer has dismissed it (or it's been
  // manually closed) we don't keep re-opening it on every
  // CVC re-validation — the trigger is just the FIRST completion.
  useEffect(() => {
    if (cvcComplete) setSignupOpen(true);
  }, [cvcComplete]);

  const [numberError, setNumberError] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [cvcError, setCvcError] = useState("");

  // Manual focus state per field — Stripe's iframes don't trigger
  // the parent's :focus-within reliably across browsers, so we
  // toggle a class via the Element's focus/blur events to render
  // the same cyan focus ring the rest of the form uses.
  const [numberFocused, setNumberFocused] = useState(false);
  const [expiryFocused, setExpiryFocused] = useState(false);
  const [cvcFocused, setCvcFocused] = useState(false);

  // Top-line error from `confirmCardPayment` — surfaces things like
  // "Your card was declined." or "Your card has insufficient
  // funds." above the action row. Cleared on next submit attempt.
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleNumberChange = (e: StripeCardNumberElementChangeEvent) => {
    setNumberComplete(e.complete);
    setBrand(normaliseBrand(e.brand));
    setNumberError(e.error?.message ?? "");
  };
  const handleExpiryChange = (e: StripeElementChangeEvent) => {
    setExpiryComplete(e.complete);
    setExpiryError(e.error?.message ?? "");
  };
  const handleCvcChange = (e: StripeElementChangeEvent) => {
    setCvcComplete(e.complete);
    setCvcError(e.error?.message ?? "");
  };

  // The Email + linkEmail fields are optional — only validated if
  // the viewer expanded the Link section AND typed a non-empty
  // value. Stops the form from blocking on a hint-text-only
  // collapsed strip.
  const linkEmailValid =
    !linkOpen ||
    linkEmail.length === 0 ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(linkEmail);

  const allFieldsValid =
    numberComplete && expiryComplete && cvcComplete && linkEmailValid;

  // Pay is gated on:
  //   • Stripe.js loaded + Elements mounted
  //   • A clientSecret to confirm against
  //   • All required fields filled correctly
  //   • Not already mid-submit / parent not in /confirm-payment
  const canPay =
    !!stripe &&
    !!elements &&
    !!clientSecret &&
    allFieldsValid &&
    !submitting &&
    !loading;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canPay) return;

    setSubmitError("");
    setSubmitting(true);

    const cardNumberElement = elements!.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setSubmitError("Payment form isn't ready. Please retry.");
      setSubmitting(false);
      return;
    }

    try {
      // Prefer the optional-signup email when filled (it's the
      // newer, more prominent field); fall back to the top
      // Link-strip email when only that one is filled. Same
      // pattern for phone + name — only sent when non-empty so
      // Stripe doesn't reject blank strings.
      const billingEmail =
        signupEmail.trim() ||
        (linkOpen && linkEmail ? linkEmail.trim() : "");
      const billingPhone = signupPhone.trim();
      const billingName = signupFullName.trim();

      const result = await stripe!.confirmCardPayment(clientSecret!, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            email: billingEmail || undefined,
            phone: billingPhone || undefined,
            name: billingName || undefined,
            address: {
              country,
            },
          },
        },
      });

      if (result.error) {
        setSubmitError(
          result.error.message ?? "We couldn't process your card. Please try again."
        );
        setSubmitting(false);
        return;
      }

      const intent = result.paymentIntent;
      if (intent && (intent.status === "succeeded" || intent.status === "processing")) {
        // Hand off to the parent — it'll POST /confirm-payment
        // with the booking_id it stashed from create-booking, then
        // patch the page state and close the modal.
        await onPaymentSuccess();
        // Don't reset `submitting` here — the modal is about to
        // unmount on the parent's close, and a flicker back to
        // "Pay" between the await + unmount would look broken.
        return;
      }

      setSubmitError(
        `Payment status is ${intent?.status ?? "unknown"}. Please try again or contact support.`
      );
    } catch {
      setSubmitError("We couldn't process your card. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formDisabled = submitting || loading;
  const payInFlight = submitting || loading;

  return (
    <div className={styles.formContainer}>
      {/* Skeleton placeholder — covers the form area while Stripe
          Elements boot. The real form is mounted in the
          background (opacity 0) so the iframes can finish loading
          underneath; once all three card Elements signal `onReady`
          we drop the skeleton and fade the form in. */}
      {!elementsReady ? (
        <div className={styles.skeleton} aria-hidden="true">
          <div className={styles.skeletonStrip} />
          <div className={styles.skeletonLabel} />
          <div className={styles.skeletonInput} />
          <div className={styles.skeletonRow}>
            <div className={styles.skeletonCol}>
              <div className={styles.skeletonLabel} />
              <div className={styles.skeletonInput} />
            </div>
            <div className={styles.skeletonCol}>
              <div className={styles.skeletonLabel} />
              <div className={styles.skeletonInput} />
            </div>
          </div>
          <div className={styles.skeletonLabel} />
          <div className={styles.skeletonInput} />
        </div>
      ) : null}
    <form
      className={`${styles.form} ${
        elementsReady ? styles.formReady : styles.formLoading
      }`}
      onSubmit={handleSubmit}
    >
      {/* ── Link checkout strip ── (collapsible, matches SS) */}
      <div
        className={`${styles.linkStrip} ${
          linkOpen ? styles.linkStripOpen : ""
        }`}
      >
        {linkOpen ? (
          <div className={styles.linkHeader}>
            <span className={styles.linkLockIcon} aria-hidden="true">
              <svg
                width="16"
                height="16"
                className="p-Icon p-Icon--lock Icon p-Icon--md p-LinkAutofillPromptIcon"
                fill="currentColor"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 7V5C3 2.23858 5.23858 0 8 0C10.7614 0 13 2.23858 13 5V7H13.5C14.0523 7 14.5 7.44772 14.5 8V14C14.5 15.1046 13.6046 16 12.5 16H3.5C2.39543 16 1.5 15.1046 1.5 14V8C1.5 7.44772 1.94772 7 2.5 7H3ZM8 9.5C7.44772 9.5 7 9.94771 7 10.5V12.5C7 13.0523 7.44772 13.5 8 13.5C8.55228 13.5 9 13.0523 9 12.5V10.5C9 9.94771 8.55228 9.5 8 9.5ZM11 7V5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5V7H11Z"
                ></path>
              </svg>
            </span>
            <span
              id="payment-modal-title"
              className={styles.linkHeaderLabel}
            >
              Secure, fast checkout with{" "}
              <span className={styles.linkBrand}>Link</span>
            </span>
            <button
              type="button"
              className={styles.linkClose}
              onClick={() => setLinkOpen(false)}
              disabled={formDisabled}
              aria-label="Close Link checkout"
              aria-expanded={true}
              aria-controls="payment-link-body"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`${styles.linkHeader} ${styles.linkHeaderBtn}`}
            onClick={() => setLinkOpen(true)}
            disabled={formDisabled}
            aria-expanded={false}
            aria-controls="payment-link-body"
          >
            <span className={styles.linkLockIcon} aria-hidden="true">
              <svg
                width="16"
                height="16"
                className="p-Icon p-Icon--lock Icon p-Icon--md p-LinkAutofillPromptIcon"
                fill="currentColor"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 7V5C3 2.23858 5.23858 0 8 0C10.7614 0 13 2.23858 13 5V7H13.5C14.0523 7 14.5 7.44772 14.5 8V14C14.5 15.1046 13.6046 16 12.5 16H3.5C2.39543 16 1.5 15.1046 1.5 14V8C1.5 7.44772 1.94772 7 2.5 7H3ZM8 9.5C7.44772 9.5 7 9.94771 7 10.5V12.5C7 13.0523 7.44772 13.5 8 13.5C8.55228 13.5 9 13.0523 9 12.5V10.5C9 9.94771 8.55228 9.5 8 9.5ZM11 7V5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5V7H11Z"
                ></path>
              </svg>
            </span>
            <span
              id="payment-modal-title"
              className={styles.linkHeaderLabel}
            >
              Secure, fast checkout with{" "}
              <span className={styles.linkBrand}>Link</span>
            </span>
            <span className={styles.linkChevron} aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
        )}
        {linkOpen ? (
          <div id="payment-link-body" className={styles.linkBody}>
            <p className={styles.linkBodyText}>
              Securely pay with your saved info, or create a Link
              account for faster checkout next time.
            </p>
            <label className={styles.fieldLabel} htmlFor="link-email">
              Email
            </label>
            <div className={styles.linkEmailWrap}>
              <input
                id="link-email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                disabled={formDisabled}
                autoFocus
              />
            </div>
            <button
              type="button"
              className={styles.linkContinueLink}
              onClick={() => setLinkInfoOpen(true)}
              disabled={formDisabled}
              aria-label="About Link"
            >
              <span className={styles.linkLogoWrap} aria-hidden="true">
                <LinkLogo className={styles.linkLogoSvg} />
              </span>
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Card number ── */}
      <label className={styles.fieldLabel} htmlFor="card-number">
        Card number
      </label>
      <div
        className={`${styles.inputWrap} ${
          numberFocused ? styles.inputWrapFocus : ""
        } ${numberError ? styles.inputWrapError : ""}`}
      >
        <span className={styles.stripeField}>
          <CardNumberElement
            id="card-number"
            options={{
              ...STRIPE_ELEMENT_OPTIONS,
              placeholder: "1234 1234 1234 1234",
              showIcon: false,
            }}
            onChange={handleNumberChange}
            onFocus={() => setNumberFocused(true)}
            onBlur={() => setNumberFocused(false)}
            onReady={() => setNumberReady(true)}
          />
        </span>
        <CardBrandStrip active={brand} />
      </div>
      {numberError ? (
        <p id="card-number-error" className={styles.errorText}>
          {numberError}
        </p>
      ) : null}

      {/* ── Expiration + CVC row ── */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label className={styles.fieldLabel} htmlFor="card-exp">
            Expiration date
          </label>
          <div
            className={`${styles.inputWrap} ${
              expiryFocused ? styles.inputWrapFocus : ""
            } ${expiryError ? styles.inputWrapError : ""}`}
          >
            <span className={styles.stripeField}>
              <CardExpiryElement
                id="card-exp"
                options={{
                  ...STRIPE_ELEMENT_OPTIONS,
                  placeholder: "MM / YY",
                }}
                onChange={handleExpiryChange}
                onFocus={() => setExpiryFocused(true)}
                onBlur={() => setExpiryFocused(false)}
                onReady={() => setExpiryReady(true)}
              />
            </span>
          </div>
          {expiryError ? (
            <p id="card-exp-error" className={styles.errorText}>
              {expiryError}
            </p>
          ) : null}
        </div>

        <div className={styles.col}>
          <label className={styles.fieldLabel} htmlFor="card-cvc">
            Security code
          </label>
          <div
            className={`${styles.inputWrap} ${
              cvcFocused ? styles.inputWrapFocus : ""
            } ${cvcError ? styles.inputWrapError : ""}`}
          >
            <span className={styles.stripeField}>
              <CardCvcElement
                id="card-cvc"
                options={{
                  ...STRIPE_ELEMENT_OPTIONS,
                  placeholder: "CVC",
                }}
                onChange={handleCvcChange}
                onFocus={() => setCvcFocused(true)}
                onBlur={() => setCvcFocused(false)}
                onReady={() => setCvcReady(true)}
              />
            </span>
            <span className={styles.cvcHint} aria-hidden="true">
              <svg
                width="20"
                height="14"
                viewBox="0 0 24 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect x="1" y="1" width="22" height="14" rx="2" />
                <line x1="1" y1="5" x2="23" y2="5" />
                <text
                  x="13"
                  y="13"
                  fill="currentColor"
                  stroke="none"
                  fontSize="6"
                  fontFamily="sans-serif"
                >
                  123
                </text>
              </svg>
            </span>
          </div>
          {cvcError ? (
            <p id="card-cvc-error" className={styles.errorText}>
              {cvcError}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Country / Territory ── */}
      <label className={styles.fieldLabel} htmlFor="card-country">
        Country/Territory
      </label>
      <div className={styles.inputWrap}>
        <select
          id="card-country"
          className={`${styles.input} ${styles.selectInput}`}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          disabled={formDisabled}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <span className={styles.selectChevron} aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {/* ── Optional Link signup ──
          Auto-opens the first time the CVC field becomes complete.
          Email + Mobile (international, UK default) + Full name —
          all optional, forwarded to Stripe as billing_details
          when filled. Closing it via the X dismisses it for the
          rest of the modal session. */}
      {signupOpen ? (
        <div className={styles.signupCard}>
          <div className={styles.signupHeader}>
            <span className={styles.optionalPill}>Optional</span>
            <h4 className={styles.signupTitle}>
              Save my information for faster checkout
            </h4>
            <button
              type="button"
              className={styles.signupClose}
              onClick={() => setSignupOpen(false)}
              disabled={formDisabled}
              aria-label="Close"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <label className={styles.fieldLabel} htmlFor="signup-email">
            Email
          </label>
          <div className={styles.linkEmailWrap}>
            <input
              id="signup-email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
              disabled={formDisabled}
            />
          </div>

          <label className={styles.fieldLabel} htmlFor="signup-phone">
            Mobile number
          </label>
          <div className={styles.phoneWrap}>
            <PhoneInput
              international
              defaultCountry="GB"
              value={signupPhone as PhoneValue | undefined}
              onChange={(v) => setSignupPhone((v as string) ?? "")}
              placeholder="07400 123456"
              disabled={formDisabled}
              className={styles.phoneInput}
              id="signup-phone"
            />
          </div>

          <label className={styles.fieldLabel} htmlFor="signup-name">
            Full name
          </label>
          <div className={styles.inputWrap}>
            <input
              id="signup-name"
              type="text"
              className={styles.input}
              placeholder="First and last name"
              value={signupFullName}
              onChange={(e) => setSignupFullName(e.target.value)}
              disabled={formDisabled}
              autoComplete="name"
            />
          </div>

          <p className={styles.signupTerms}>
            <button
              type="button"
              className={styles.signupLinkBrand}
              onClick={() => setLinkInfoOpen(true)}
              disabled={formDisabled}
              aria-label="About Link"
            >
              <span className={styles.linkLogoWrap} aria-hidden="true">
                <LinkLogo className={styles.linkLogoSvgInline} />
              </span>
            </button>
            <span className={styles.signupTermsBody}>
              {" "}
              · By providing phone number and email, you agree to
              create an account subject to{" "}
              <a
                href="https://stripe.com/legal/end-users#linked-financial-account-terms"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.signupTermsLink}
              >
                Terms
              </a>{" "}
              and{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.signupTermsLink}
              >
                Privacy Policy
              </a>
              .
            </span>
          </p>
        </div>
      ) : null}

      {/* ── Submission error banner ── */}
      {submitError ? (
        <p className={styles.submitError} role="alert">
          {submitError}
        </p>
      ) : null}

      {/* ── Actions ── */}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.cancelBtn}
          onClick={onCancel}
          disabled={formDisabled}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={styles.payBtn}
          disabled={!canPay}
          aria-label={
            payInFlight ? "Processing payment" : `Pay ${totalAmount}`
          }
        >
          {payInFlight ? (
            <span className={styles.payBtnSpinner} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </span>
          ) : (
            `Pay ${totalAmount}`
          )}
        </button>
      </div>

      {/* Second-layer "Pay quickly, shop confidently" promo modal.
          Lives inside the form so it shares state — opens whenever
          the viewer clicks any "▸ link" wordmark inside the form. */}
      <LinkInfoModal
        open={linkInfoOpen}
        onClose={() => setLinkInfoOpen(false)}
      />
    </form>
    </div>
  );
}

export default function PaymentModal({
  open,
  totalAmount,
  clientSecret,
  loading = false,
  onCancel,
  onPaymentSuccess,
}: PaymentModalProps) {
  if (!open) return null;

  // Configuration error path — render the modal shell with a
  // helpful note so the developer notices the missing env var.
  // Without `stripePromise` we can't mount the Elements provider.
  if (!stripePromise) {
    return (
      <div className={styles.overlay} onClick={onCancel}>
        <div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <p className={styles.configError}>
            Payment is not configured. Please set
            <code> NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY </code>
            in your environment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.overlay}
      onClick={loading ? undefined : onCancel}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onCancel}
          disabled={loading}
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <Elements stripe={stripePromise}>
          <PaymentForm
            totalAmount={totalAmount}
            clientSecret={clientSecret}
            loading={loading}
            onCancel={onCancel}
            onPaymentSuccess={onPaymentSuccess}
          />
        </Elements>
      </div>
    </div>
  );
}
