import Link from 'next/link';
import { ArrowRight, Leaf, Truck, Gift, HeartHandshake, PackageCheck } from 'lucide-react';
import type { Product, Category } from '@/shared/lib/types';
import { Art } from '@/shared/ui/art';
import { ProductCard } from '@/entities/product/ui/product-card';

function Shelf({
  id,
  title,
  eyebrow,
  description,
  href,
  linkLabel = 'Explore the collection',
  products,
}: {
  id: string;
  title: string;
  eyebrow: string;
  description?: string;
  href: string;
  linkLabel?: string;
  products: Product[];
}) {
  if (!products.length) return null;
  return (
    <section className="section-width home-shelf" id={id} aria-labelledby={id + '-title'}>
      <div className="collection-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={id + '-title'}>{title}</h2>
          {description && <p className="collection-description">{description}</p>}
        </div>
        <Link className="collection-link" href={href}>
          {linkLabel}
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </div>
    </section>
  );
}

export function HomeView({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const byIds = (ids: string[]) =>
    ids.map((id) => products.find((p) => p._id === id)).filter((p): p is Product => !!p);
  const featuredOrder = ['walnut-kernels', 'kashmiri-saffron', 'embroidered-pheran', 'copper-jug'];
  const featured = products
    .filter((p) => p.featured)
    .sort(
      (a, b) =>
        (featuredOrder.indexOf(a._id) < 0 ? 99 : featuredOrder.indexOf(a._id)) -
        (featuredOrder.indexOf(b._id) < 0 ? 99 : featuredOrder.indexOf(b._id)),
    )
    .slice(0, 4);
  const top = products.filter((p) => p.topPick).slice(0, 4);
  const arrivals = products.filter((p) => p.newArrival).slice(0, 4);
  const pantry = byIds(['monj-achaar', 'ver-masala', 'mushqbudji-rice', 'garlic-pickle']);
  const wardrobe = byIds(['tilla-suit', 'cotton-suit', 'wool-pheran']);
  const harvest = byIds(['kashmiri-apples', 'seasonal-pears', 'seasonal-plums', 'golden-quince']);
  const gifts = byIds(['food-gift-box', 'kahwa-gift-set', 'dryfruit-hamper', 'wedding-hamper']);
  return (
    <>
      <section className="home-hero" aria-labelledby="hero-title">
        <Art image="floral" className="hero-floral" />
        <div className="hero-copy">
          <p className="eyebrow">Timeless crafts. Meaningful living.</p>
          <h1 id="hero-title">
            <span>Kashmir.</span>
            <span>Closer to home.</span>
          </h1>
          <p className="hero-description">
            Authentic products, crafted by Kashmiri hands, now at your doorstep, anywhere in India.
          </p>
          <Link className="button gold" href="/products">
            Explore Kashmir
            <ArrowRight size={20} />
          </Link>
          <div className="hero-promises">
            <div>
              <Leaf />
              <span>
                Authentic
                <br />
                Kashmiri Products
              </span>
            </div>
            <div>
              <Truck />
              <span>
                Pan India
                <br />
                Delivery
              </span>
            </div>
            <div>
              <Gift />
              <span>
                Thoughtful
                <br />
                Gifts for Every Occasion
              </span>
            </div>
          </div>
        </div>
        <Art
          image="hero"
          alt="Walnuts, saffron and copper kahwa ware with a view of a shikara on Dal Lake"
          className="hero-photo"
        />
      </section>
      <section className="home-categories" aria-label="Shop by category">
        {categories.slice(0, 8).map((c) => (
          <Link key={c._id} href={'/categories/' + c._id} className="category-tile">
            <Art image={c.image} alt={c.name} />
            <span>
              {c.name}
              <ArrowRight size={16} />
            </span>
          </Link>
        ))}
      </section>
      <section className="featured section-width" aria-labelledby="featured-title">
        <div className="section-title">
          <h2 id="featured-title">Featured Products</h2>
          <span className="title-rule" />
          <Link href="/products">
            View All Products
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>
      <div className="reference-divider">
        <span>From the valley, with love</span>
      </div>
      <Shelf
        id="top-picks"
        title="A few favourites to start with."
        eyebrow="Top picks · Chosen by Kashmir Se"
        description="A little flavour, a little warmth, a little something for your next innings."
        href="/products?collection=top-picks"
        linkLabel="Shop top picks"
        products={top}
      />
      <section className="section-width collection-stories" aria-label="Explore food and clothing">
        <Link href="/categories/saffron-tea" className="collection-story tea-story">
          <Art image="catalog:saffron-tea:3" alt="A golden cup of saffron kahwa" />
          <div>
            <p className="eyebrow">The art of a little pause</p>
            <h2>
              Your next cup,
              <br />a little more Kashmiri.
            </h2>
            <span className="text-link">Discover kahwa & tea →</span>
          </div>
        </Link>
        <Link href="/categories/home-crafts" className="collection-story craft-story">
          <Art image="catalog:home-crafts:3" alt="Floral papier-mâché keepsake box" />
          <div>
            <p className="eyebrow">Beautiful things, made to stay</p>
            <h2>
              A little craft.
              <br />A lot of character.
            </h2>
            <span className="text-link">Bring the craft home →</span>
          </div>
        </Link>
      </section>
      <Shelf
        id="pantry-favourites"
        title="From our kitchen to yours."
        eyebrow="The Kashmiri pantry"
        description="Familiar flavours and little discoveries for your everyday table."
        href="/categories/food-pickles"
        linkLabel="Explore the pantry"
        products={pantry}
      />
      <section className="wardrobe-section">
        <div className="section-width wardrobe-layout">
          <div className="wardrobe-intro">
            <p className="eyebrow">Threads with a sense of place</p>
            <h2>
              Wear a little
              <br />
              of the valley.
            </h2>
            <p>
              Easy silhouettes. Thoughtful embroidery. Pieces with a little Kashmir in every detail.
            </p>
            <Link href="/categories/clothing" className="button secondary">
              Explore clothing
              <ArrowRight size={16} />
            </Link>
            <Link href="/categories/shawls" className="text-link">
              Discover shawls & stoles →
            </Link>
          </div>
          <div className="product-grid wardrobe-products">
            {wardrobe.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      </section>
      <Shelf
        id="new-arrivals"
        title="New little discoveries."
        eyebrow="Just added to the collection"
        description="Fresh colours, floral blends and a few new reasons to explore."
        href="/products?collection=new-arrivals"
        linkLabel="See new arrivals"
        products={arrivals}
      />
      <section className="harvest-section">
        <div className="section-width">
          <div className="collection-heading">
            <div>
              <p className="eyebrow">From the orchards</p>
              <h2>A taste of the season.</h2>
              <p className="collection-description">
                Apples, pears and more. Seasonal availability and delivery vary by destination.
              </p>
            </div>
            <Link className="collection-link" href="/categories/fresh-produce">
              Explore fresh produce
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {harvest.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      </section>
      <section className="section-width gifting-section">
        <div className="gifting-intro">
          <div>
            <p className="eyebrow">For the people who matter</p>
            <h2>
              Send a little Kashmir.
              <br />
              Say a little more.
            </h2>
            <p>Thoughtful boxes for thank-yous, celebrations and just-because moments.</p>
            <div className="gifting-links">
              <Link className="button gold" href="/gifts">
                Find a thoughtful gift
                <Gift size={17} />
              </Link>
              <Link className="text-link" href="/bulk">
                Planning gifts in bulk? →
              </Link>
            </div>
          </div>
          <Art image="catalog:gifts:3" alt="Burgundy celebration gift hamper" />
        </div>
        <div className="product-grid">
          {gifts.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>
      <section className="service-notes section-width" aria-label="Our approach">
        <div>
          <Leaf />
          <h3>Know your source</h3>
          <p>Clear origins and details, without the guesswork.</p>
        </div>
        <div>
          <PackageCheck />
          <h3>Thoughtfully packed</h3>
          <p>Care for what you order, from pantry to precious craft.</p>
        </div>
        <div>
          <HeartHandshake />
          <h3>A little help, always</h3>
          <p>Questions before you buy? We’re here to guide you.</p>
        </div>
      </section>
      <section className="section-width home-journal">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">The Kashmir journal</p>
            <h2>A little more to the story.</h2>
          </div>
          <Link href="/journal" className="collection-link">
            Read the journal
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="journal-grid">
          {[
            {
              slug: 'a-cup-of-kahwa',
              title: 'A little ritual called kahwa.',
              image: 'catalog:saffron-tea:1',
              text: 'Your guide to fragrant blends and slow mornings.',
            },
            {
              slug: 'choosing-your-shawl',
              title: 'Find the shawl that feels like you.',
              image: 'catalog:shawls:2',
              text: 'Materials, measurements and the details worth knowing.',
            },
            {
              slug: 'the-kashmir-pantry',
              title: 'Build a little Kashmir pantry.',
              image: 'catalog:food-pickles:3',
              text: 'From monj achaar to ver masala, start with the flavours.',
            },
          ].map((a) => (
            <Link className="journal-card" key={a.slug} href={'/journal/' + a.slug}>
              <Art image={a.image} alt={a.title} />
              <div>
                <p className="eyebrow">A little guide</p>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
                <span className="text-link small-text">Read the story →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section-width discovery-section">
        <div className="collection-heading">
          <div>
            <p className="eyebrow">Keep exploring</p>
            <h2>Many sides of Kashmir.</h2>
          </div>
          <Link href="/categories" className="collection-link">
            Every category
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="discovery-grid">
          {categories.slice(8).map((c) => (
            <Link href={'/categories/' + c._id} key={c._id}>
              <Art image={c.image} alt={c.name} />
              <div>
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <span className="text-link">Discover more →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <section className="section-width story-and-help">
        <div className="maker-note">
          <p className="eyebrow">Behind every beautiful thing</p>
          <h2>
            A place. A person.
            <br />A story worth sharing.
          </h2>
          <p>
            From orchard growers to patient hands at the loom, explore the traditions that make the
            valley feel like home.
          </p>
          <Link href="/makers" className="button">
            Meet the makers
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="home-faq">
          <p className="eyebrow">A little clarity</p>
          <h2>Before you bring it home.</h2>
          <details>
            <summary>What does Kashmir Se offer?</summary>
            <p>
              Food, clothing, shawls, home crafts, cricket, gifts and seasonal discoveries—all
              together in one store.
            </p>
          </details>
          <details>
            <summary>Can I send a gift directly?</summary>
            <p>
              Yes. Use the recipient’s delivery address at checkout. For multiple recipients or
              custom quantities,{' '}
              <Link href="/bulk" className="text-link">
                send a bulk enquiry
              </Link>
              .
            </p>
          </details>
          <details>
            <summary>Where can I find delivery and return details?</summary>
            <p>
              Read the product page and our{' '}
              <Link href="/shipping" className="text-link">
                delivery
              </Link>{' '}
              and{' '}
              <Link href="/returns" className="text-link">
                returns
              </Link>{' '}
              pages. This local store uses demonstration shipping and payment flows.
            </p>
          </details>
          <Link className="text-link small-text" href="/help">
            More questions? We’re here to help →
          </Link>
        </div>
      </section>
    </>
  );
}
