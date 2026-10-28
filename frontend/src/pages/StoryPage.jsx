import { Link } from 'react-router-dom';
import { StoreLayout } from '../components/StoreLayout.jsx';

const principles = [
  { number: '01', title: 'Comfort comes first', text: 'The best pair is the one you forget you are wearing. We look for thoughtful fit and everyday ease.' },
  { number: '02', title: 'Made for real life', text: 'Workdays, long walks, last-minute plans. Good footwear should feel at home wherever the day goes.' },
  { number: '03', title: 'Less, but better', text: 'Clear choices, useful details, and styles that work with more of the things you already own.' }
];

export default function StoryPage() {
  return (
    <StoreLayout>
      <main className="our-story-page">
        <section className="story-page-hero">
          <div className="story-page-intro">
            <p className="eyebrow">A NOTE FROM TREAD&amp;CO</p>
            <h1>Good shoes make room for <em>a better day.</em></h1>
            <p className="story-page-lede">We believe getting dressed should feel easy. That starts with footwear made to move with you, wherever the day leads.</p>
            <Link className="story-page-link" to="/products">Find your next pair <span aria-hidden="true">↗</span></Link>
            <span className="story-page-index">OUR POINT OF VIEW <b>—</b> 01 / 03</span>
          </div>
          <figure className="story-page-portrait">
            <img src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=85" alt="A carefully designed sneaker, viewed up close" />
            <figcaption>Everyday footwear, considered from the ground up.</figcaption>
          </figure>
        </section>

        <section className="story-page-belief">
          <p className="eyebrow">THE IDEA IS SIMPLE</p>
          <div className="story-page-belief-copy">
            <h2>It should feel right from the <em>first step.</em></h2>
            <p>tread&amp;co is built around a simple idea: the shoes you reach for most should balance comfort, considered design, and the freedom to get on with your day. We bring together styles for the everyday moments that make up a life.</p>
          </div>
        </section>

        <section className="story-principles" aria-label="Our principles">
          {principles.map((principle) => <article className="story-principle" key={principle.number}>
            <span>{principle.number}</span>
            <h3>{principle.title}</h3>
            <p>{principle.text}</p>
          </article>)}
        </section>

        <section className="story-page-close">
          <p className="eyebrow">WHEREVER YOU’RE HEADED</p>
          <h2>Start with a good step.</h2>
          <Link to="/products">Shop the collection <span aria-hidden="true">↗</span></Link>
        </section>
      </main>
    </StoreLayout>
  );
}
