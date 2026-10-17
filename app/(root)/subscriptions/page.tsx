import { PricingTable } from "@clerk/nextjs";
import { Show } from "@clerk/nextjs";

const SUBSCRIPTION_APPEARANCE = {
  variables: {
    colorPrimary: "#212a3b",
    colorText: "#212a3b",
    colorTextSecondary: "#3d485e",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    rootBox: "w-full",
    pricingTable: "pricing-table",
    card: "pricing-table-card",
    headerTitle: "font-serif font-bold text-[#212a3b]",
    headerSubtitle: "text-[#3d485e]",
    priceTitle: "font-serif font-bold text-[#212a3b]",
    priceDescription: "text-[#3d485e]",
    featuresTitle: "text-[#212a3b] font-medium",
    featureItem: "text-[#3d485e]",
    ctaButton:
      "bg-[#212a3b] hover:bg-[#3d485e] text-white font-medium !border-0 normal-case rounded-xl",
  },
};

const SubscriptionsPage = () => {
  return (
    <main className="wrapper container min-h-screen pt-24 pb-16">
      <div className="flex flex-col items-center text-center gap-4 mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#212a3b]">
          Choose Your Plan
        </h1>
        <p className="max-w-2xl text-lg text-[#3d485e]">
          Unlock more books, longer voice sessions, and full session history.
          Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="clerk-pricing-table-wrapper">
        <Show when="signed-out">
          <p className="text-center text-[#3d485e] mb-8">
            Sign in to subscribe to a plan.
          </p>
        </Show>

        <PricingTable
          appearance={SUBSCRIPTION_APPEARANCE}
          highlightedPlan="pro"
          fallback={
            <div className="text-center text-[#3d485e]">Loading pricing…</div>
          }
        />
      </div>
    </main>
  );
};

export default SubscriptionsPage;
