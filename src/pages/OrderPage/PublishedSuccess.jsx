import { useId } from "react";
import { Link } from "react-router";
import ShareLinks from "../../components/ShareLinks/ShareLinks.jsx";
import { formatAmount } from "../../editor/config/plans.js";
import { publishingApi } from "../../services/publishingApi.js";
import { longDate } from "../AccountPage/publicationState.js";

const NGN = { code: "NGN", minorUnit: 100 };

/**
 * The approved order whose page the server reports as live (publication.publiclyVisible): the page's
 * real address (publication.url, from the server), sharing, plan and expiry; the payment details stay
 * available underneath. Shown only for a live page; other states keep the plain order view.
 */
export default function PublishedSuccess({ order }) {
  const ids = useId();
  const pub = order.publication;
  const local = Boolean(order.site?.local);
  return (
    <main className="order-page">
      <title>{`Your page is live · MyLinnnk`}</title>
      <div
        className="order-card order-success"
        aria-labelledby={`${ids}-title`}
      >
        <div className="order-success__burst" aria-hidden="true">
          <span /> <span /> <span /> <span /> <span /> <span />
        </div>
        <p className="order-eyebrow">Payment confirmed</p>
        <h1 id={`${ids}-title`} className="order-success__title">
          Congratulations! Your page is live! <span aria-hidden="true"></span>
        </h1>
        <p className="order-success__lead">
          Your payment has been confirmed and your page is officially published.
          It’s time to share your special moment with the world!
        </p>

        <div className="order-success__address">
          <span className="order-success__label">Your page’s address</span>
          <a
            className="order-success__url"
            href={pub.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {pub.url}
          </a>
        </div>

        <ShareLinks url={pub.url} title={pub.title} local={local} />

        <dl className="order-facts order-success__facts">
          <div>
            <dt>Plan</dt>
            <dd>{pub.planName ?? order.plan.name}</dd>
          </div>
          <div>
            <dt>Live until</dt>
            <dd>{longDate(pub.expiresAt)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className="order-success__live">Live</span>
            </dd>
          </div>
        </dl>

        <details className="order-success__details">
          <summary>Payment details</summary>
          <dl className="order-facts">
            <div>
              <dt>Order reference</dt>
              <dd className="order-mono">{order.reference}</dd>
            </div>
            <div>
              <dt>Amount paid</dt>
              <dd>{formatAmount(order.plan.amountMinor, NGN)}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>
                {order.plan.name} · {order.plan.validityDays} days
                {order.kind === "renewal" ? " (renewal)" : ""}
              </dd>
            </div>
          </dl>
          {order.receipts.length > 0 && (
            <ul className="order-receipts" aria-label="Your receipts">
              {order.receipts.map((r, i) => (
                <li key={r.receiptId}>
                  <a
                    href={publishingApi.receiptUrl(
                      order.reference,
                      r.receiptId,
                    )}
                    target="_blank"
                    rel="noopener"
                  >
                    Receipt {i + 1} · {Math.max(1, Math.round(r.bytes / 1024))}{" "}
                    KB
                  </a>
                </li>
              ))}
            </ul>
          )}
        </details>

        <div className="order-actions">
          <Link to="/dashboard/publications" className="order-link">
            Go to my account
          </Link>
        </div>
      </div>
    </main>
  );
}
