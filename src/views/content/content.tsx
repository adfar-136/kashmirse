import Link from 'next/link';
import { Art } from '@/shared/ui/art';
import { EnquiryForm } from './forms';
import type { Settings } from '@/shared/lib/types';
import { money } from '@/shared/lib/commerce';
export const articles = [
  {
    slug: 'a-cup-of-kahwa',
    title: 'A little ritual called kahwa.',
    image: 'saffron-tea',
    intro: 'A warm cup, a few quiet minutes, and a little taste of the valley.',
    body: [
      'Kahwa is a fragrant tea associated with Kashmiri hospitality. Blends vary: read the ingredients on your pack to understand the tea, spices and additions it contains.',
      'To prepare a cup, follow the directions on the blend. Use gently heated water, allow the flavour to infuse, and sweeten to taste. Sliced almonds can be added if they suit your preferences and dietary needs.',
      'Make a small ritual of it: a favourite cup, a little pause, and someone to share it with.',
    ],
  },
  {
    slug: 'choosing-your-shawl',
    title: 'Find the shawl that feels like you.',
    image: 'shawls',
    intro: 'Start with the material, then discover the details.',
    body: [
      'Choose a shawl for how you will wear it. A smaller stole can be easy to carry; a larger shawl offers more coverage. Check the dimensions rather than relying on the product photograph.',
      'Material and workmanship are separate things. Read the fibre composition, weaving description and embroidery method. A pattern name alone does not establish the material or a certification.',
      'Ask for evidence behind authenticity claims, and follow the care instructions supplied with the actual piece.',
    ],
  },
  {
    slug: 'the-kashmir-pantry',
    title: 'Build a little Kashmir pantry.',
    image: 'pickles',
    intro: 'Flavours for everyday meals and small discoveries.',
    body: [
      'Start with what you enjoy eating: walnuts for a handful at breakfast, a pickle with lunch, and a kahwa blend for the afternoon.',
      'Discover local names at your own pace. Monj refers to kohlrabi, while nadru is lotus stem. Products vary by maker, so read ingredients, allergens and storage instructions.',
      'Buy quantities you will use, keep packs properly sealed, and follow the physical label for shelf life. Clear origin information is more useful than broad marketing promises.',
    ],
  },
];
export const validPages = [
  'about',
  'contact',
  'bulk',
  'makers',
  'help',
  'shipping',
  'returns',
  'privacy',
  'terms',
  'journal',
];
export function ContentView({ slug, settings }: { slug: string; settings: Settings }) {
  if (slug === 'about')
    return (
      <div className="content-width">
        <div className="content-hero">
          <div>
            <p className="eyebrow">Our little story</p>
            <h1>
              It started with,
              <br />
              “Bring me something
              <br />
              from Kashmir.”
            </h1>
            <p>
              A familiar request from friends became a simple idea: make the things people love
              about Kashmir easier to discover, understand and bring home.
            </p>
          </div>
          <Art image="hero" alt="Kashmiri food and craft with a view of Dal Lake" />
        </div>
        <div className="prose">
          <h2>From a trusted connection to a thoughtful store.</h2>
          <p>
            Kashmir Se brings food, clothing, craft and gifts together in one place. The aim is
            simple shopping, clear information and a connection to the people behind the products.
          </p>
          <h2>Know what you’re bringing home.</h2>
          <p>
            Grown in Kashmir, made in Kashmir and sourced through Kashmir are different things. Our
            product descriptions are designed to explain origin, materials, quantities and options
            clearly.
          </p>
          <p>
            This local version contains demonstration products and reference imagery. Supplier
            verification, real product photographs and final commercial policies are required before
            launch.
          </p>
          <Link className="button spaced" href="/products">
            Explore Kashmir →
          </Link>
        </div>
      </div>
    );
  if (slug === 'contact' || slug === 'bulk')
    return (
      <div className="content-width">
        <div className="page-heading">
          <p className="eyebrow">
            {slug === 'bulk' ? 'Gifts that mean a little more' : 'A little help, always'}
          </p>
          <h1>
            {slug === 'bulk' ? 'A thoughtful gesture. At any scale.' : 'We’re here to listen.'}
          </h1>
          <p>
            {slug === 'bulk'
              ? 'Wedding favours, team gifts, family celebrations or something made especially for you. Tell us your quantity, budget and date.'
              : 'A product question, an order issue or a little guidance—send us a note.'}
          </p>
        </div>
        <div className="split-layout" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
          <EnquiryForm type={slug === 'bulk' ? 'bulk' : 'support'} />
          <aside className="panel">
            <h2>{slug === 'bulk' ? 'Made personal.' : 'Keep it simple.'}</h2>
            <p className="muted small-text">
              {slug === 'bulk'
                ? 'Tell us the occasion, quantity, preferred products, approximate budget, delivery cities and required date. A submitted enquiry is not a confirmed order.'
                : 'For order help, include your order number and a clear description of the issue. Never share a password, card number or payment OTP.'}
            </p>
            <p className="small-text spaced">
              Support email: {settings.supportEmail}
              {settings.phone && (
                <>
                  <br />
                  Phone: {settings.phone}
                </>
              )}
            </p>
            <div className="demo-note">
              This is a local demonstration. Messages are stored for review in the admin dashboard.
              The example email is not a monitored mailbox.
            </div>
            <Link className="text-link small-text" href="/help">
              Common questions →
            </Link>
          </aside>
        </div>
      </div>
    );
  if (slug === 'makers')
    return (
      <div className="content-width">
        <div className="page-heading">
          <p className="eyebrow">The hands behind the beautiful</p>
          <h1>Good things begin with people.</h1>
          <p>
            Our maker pages will introduce the growers, artisans and local businesses behind each
            collection. The profiles below describe the crafts; they are not claims of current
            supplier partnerships.
          </p>
        </div>
        <div className="journal-grid">
          {[
            {
              name: 'The orchard growers',
              image: 'dry-fruits',
              text: 'Walnuts, almonds and seasonal fruit begin with a place, a harvest and careful handling.',
            },
            {
              name: 'The needle & the loom',
              image: 'clothing',
              text: 'Embroidery and textiles carry the character of Kashmir. We describe materials and methods separately.',
            },
            {
              name: 'The craft workshops',
              image: 'crafts',
              text: 'Copperware, painted pieces and carved objects bring patience and detail into everyday spaces.',
            },
          ].map((m) => (
            <article className="journal-card" key={m.name}>
              <Art image={m.image} />
              <div>
                <h2>{m.name}</h2>
                <p>{m.text}</p>
              </div>
            </article>
          ))}
        </div>
        <Link className="button spaced" href="/contact">
          Talk to us about your craft →
        </Link>
      </div>
    );
  if (slug === 'journal')
    return (
      <div className="content-width">
        <div className="page-heading">
          <p className="eyebrow">Notes from the valley</p>
          <h1>The Kashmir journal.</h1>
          <p>Little guides to the flavours, threads and rituals you bring home.</p>
        </div>
        <div className="journal-grid">
          {articles.map((a) => (
            <Link className="journal-card" href={'/journal/' + a.slug} key={a.slug}>
              <Art image={a.image} />
              <div>
                <p className="eyebrow">A little guide</p>
                <h2>{a.title}</h2>
                <p>{a.intro}</p>
                <span className="text-link small-text">Read the story →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  if (slug === 'help') {
    const faqs = [
      [
        'Where do you deliver?',
        'The intended store serves India. This local demonstration accepts Indian address formats but does not verify postcode coverage with a courier or book actual deliveries.',
      ],
      [
        'Are the products ready for commercial sale?',
        'This version contains seeded products, sample stock, demonstration claims and reference imagery. Final specifications, sourcing evidence, photographs and policies must be verified before launch.',
      ],
      [
        'How much is shipping?',
        `Standard shipping is ${money(settings.shippingFee)}. Orders with a product subtotal of ${money(settings.freeShippingAt)} or more receive free shipping in this demo.`,
      ],
      [
        'Can I pay online?',
        'Live payments are not connected. Choose cash on delivery or the labelled demo prepaid option to test order placement. Demo prepaid never charges money.',
      ],
      [
        'How do I track my order?',
        'Sign in and open My Orders, or enter your order number on the tracking page. Sign-in is required to place new orders. Demo order updates are managed in the admin dashboard.',
      ],
      [
        'Can I cancel an order?',
        'Orders can be cancelled while confirmed or processing. Cancellation restores reserved stock. Orders already shipped cannot be cancelled through the account.',
      ],
      [
        'Can I request a return?',
        'After delivery, submit a request from the order page within 7 days. The store team reviews requests; product-specific eligibility applies.',
      ],
      [
        'How do I choose a size?',
        'Read the option labels and product specifications. The seeded sizes are examples. Real garment measurements need to be added before selling.',
      ],
      [
        'Can I order gifts in bulk?',
        'Yes, use the bulk order enquiry form to share the occasion, quantity, budget and date.',
      ],
    ];
    return (
      <div className="content-width">
        <div className="page-heading">
          <p className="eyebrow">A little clarity</p>
          <h1>How can we help?</h1>
        </div>
        <div className="faq">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
        <Link href="/contact" className="button spaced">
          Still have a question? →
        </Link>
      </div>
    );
  }
  const policies: Record<string, { title: string; sections: [string, string][] }> = {
    shipping: {
      title: 'From the valley to your doorstep.',
      sections: [
        [
          'Delivery & availability',
          'Enter an Indian address at checkout. Postcode availability and transit estimates are demonstration information until a courier integration is configured. Fresh produce and fragile products require route-specific handling.',
        ],
        [
          'Shipping charges',
          `The current standard fee is ${money(settings.shippingFee)}. Shipping is free on product subtotals of ${money(settings.freeShippingAt)} or more. The final amount appears before order placement.`,
        ],
        [
          'Dispatch & separate packages',
          'The sample estimate is 2–3 working days to dispatch and 4–8 working days in transit. These are not guaranteed service levels. Items may ship separately based on handling needs and source.',
        ],
        [
          'Problems with a delivery',
          'Use the order page or contact form to report missing, damaged or incorrect goods. Include your order number and retain packaging where possible. No actual courier is booked by this local app.',
        ],
      ],
    },
    returns: {
      title: 'A little care when things go wrong.',
      sections: [
        [
          'Tell us promptly',
          'For this demonstration, the account allows a help or return request within 7 days after the order is marked delivered. Explain the problem clearly. A request does not automatically approve a return.',
        ],
        [
          'Different products need different rules',
          'Food, fresh produce, custom work, clothing and crafts need product-specific conditions. Damaged, incorrect or unsafe goods require appropriate remedies. Final sale policies must be reviewed before launch.',
        ],
        [
          'Cancellation',
          'You can cancel an order while it is confirmed or processing. Reserved stock is restored. After dispatch, contact support rather than cancelling through your account.',
        ],
        [
          'Refunds',
          'An administrator can review a request and record a manual refund. The app does not transfer money or call a payment gateway. A refund status is a record, not proof that funds have moved.',
        ],
      ],
    },
    privacy: {
      title: 'Your details, handled with care.',
      sections: [
        [
          'What this local app stores',
          'Accounts store your name, email and a hashed password. Orders store items, delivery details, totals and status history. Saved addresses, wishlists, reviews and enquiries are also stored in local MongoDB.',
        ],
        [
          'Sessions & browser storage',
          'An HTTP-only cookie keeps you signed in. Bag contents and guest favourites are stored in browser local storage. No advertising or analytics service is integrated.',
        ],
        [
          'Access & requests',
          'Administrators can access the records needed to manage the store. Contact the store operator for account or data requests. The demo support form saves messages locally.',
        ],
        [
          'Before a public launch',
          'The operator must publish final privacy details, retention periods, contact information and any external processors actually used. This page describes the local implementation and is not a final legal policy.',
        ],
      ],
    },
    terms: {
      title: 'A few clear expectations.',
      sections: [
        [
          'Local demonstration',
          'Kashmir Se currently runs as a local demonstration. Products, stock, prices, origins, reviews and orders include seeded examples. Reference images do not establish actual product appearance or certification.',
        ],
        [
          'Your order',
          'The server verifies prices, discounts and available stock when an order is placed. The app records the order in MongoDB and reserves stock. The local demo does not create a binding fulfilment arrangement with a supplier or courier.',
        ],
        [
          'Payments',
          'Cash-on-delivery orders are recorded as pending. Demo prepaid orders are clearly labelled and do not charge money. Never enter financial credentials into a support message.',
        ],
        [
          'Accounts & reviews',
          'Keep account credentials private. Reviews require a delivered purchase and are moderated before publication. Submit accurate information and do not post private details about others.',
        ],
        [
          'Commercial readiness',
          'Before real selling, verify product claims, supplier permissions, food and product compliance, payment and delivery services, taxes and final consumer policies.',
        ],
      ],
    },
  };
  const policy = policies[slug];
  return (
    <div className="content-width">
      <div className="page-heading">
        <p className="eyebrow">
          {slug === 'shipping'
            ? 'Shipping & delivery'
            : slug === 'returns'
              ? 'Returns & refunds'
              : slug === 'privacy'
                ? 'Privacy'
                : 'Terms of purchase'}
        </p>
        <h1>{policy.title}</h1>
      </div>
      <div className="prose">
        {policy.sections.map(([h, p]) => (
          <section key={h}>
            <h2>{h}</h2>
            <p>{p}</p>
          </section>
        ))}
        <Link href="/contact" className="button spaced">
          Contact the store →
        </Link>
      </div>
    </div>
  );
}
